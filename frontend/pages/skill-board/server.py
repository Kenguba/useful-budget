#!/usr/bin/env python3
"""最简静态服务器（标准库）：python3 server.py [端口，默认 7890，支持 .env 及 PORT 环境变量]"""
import datetime, email.utils, gzip, http.server, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
if os.path.exists(".env"):
    try:
        with open(".env") as f:
            for line in f:
                if line.strip().startswith("PORT="):
                    os.environ.setdefault("PORT", line.strip().split("=", 1)[1].strip("'\""))
    except Exception:
        pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 7890))


class GzipStaticHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
    }
    _GZIP_EXTS = {".html", ".htm", ".js", ".css", ".json", ".svg", ".webmanifest", ".txt", ".xml"}
    _STATIC_EXTS = {".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff2", ".woff", ".webmanifest"}

    def send_response(self, code, message=None):
        self._resp_code = code
        super().send_response(code, message)

    def end_headers(self):
        code = getattr(self, "_resp_code", None)
        self._resp_code = None
        if code in (200, 304):
            ext = os.path.splitext(self.path.split("?", 1)[0])[1].lower()
            self.send_header(
                "Cache-Control",
                "public, max-age=86400" if ext in self._STATIC_EXTS else "no-cache",
            )
            if not ext or ext in self._GZIP_EXTS:
                self.send_header("Vary", "Accept-Encoding")
        super().end_headers()

    def do_GET(self):
        ae = self.headers.get("Accept-Encoding", "").lower()
        if "gzip" in ae and "Range" not in self.headers:
            path = self.translate_path(self.path)
            if os.path.isdir(path):
                if not self.path.split("?", 1)[0].endswith("/"):
                    return super().do_GET()
                for index in ("index.html", "index.htm"):
                    cand = os.path.join(path, index)
                    if os.path.isfile(cand):
                        path = cand
                        break
            ext = os.path.splitext(path)[1].lower()
            if os.path.isfile(path) and ext in self._GZIP_EXTS:
                try:
                    st = os.stat(path)
                    if 512 < st.st_size <= 16 * 1024 * 1024:
                        ims = self.headers.get("If-Modified-Since")
                        if ims and "If-None-Match" not in self.headers:
                            try:
                                dt = email.utils.parsedate_to_datetime(ims)
                                if dt.tzinfo is None:
                                    dt = dt.replace(tzinfo=datetime.timezone.utc)
                                if int(st.st_mtime) <= int(dt.timestamp()):
                                    self.send_response(304)
                                    self.end_headers()
                                    return
                            except (TypeError, ValueError, OverflowError):
                                pass
                        with open(path, "rb") as f:
                            raw = f.read()
                        gz = gzip.compress(raw, compresslevel=6)
                        if len(gz) < len(raw):
                            self.send_response(200)
                            self.send_header("Content-type", self.guess_type(path))
                            self.send_header("Content-Encoding", "gzip")
                            self.send_header("Content-Length", str(len(gz)))
                            self.send_header("Last-Modified", self.date_time_string(st.st_mtime))
                            self.end_headers()
                            self.wfile.write(gz)
                            return
                except OSError:
                    pass
        return super().do_GET()


if __name__ == "__main__":
    print(f"Serving on http://0.0.0.0:{port}")
    try:
        http.server.ThreadingHTTPServer(("0.0.0.0", port), GzipStaticHandler).serve_forever()
    except OSError as e:
        if e.errno == 48:
            print(f"提示：端口 {port} 已被占用（如本地代理软件 Clash/V2Ray 等）。可在 .env 设置 PORT、通过环境变量或命令行参数指定其他端口：python3 server.py 7891")
        raise
