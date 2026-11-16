#!/usr/bin/env python3
"""最简静态服务器（标准库）：python3 server.py [端口，默认 7890，支持 .env 及 PORT 环境变量]"""
import http.server, os, sys
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
print(f"Serving on http://0.0.0.0:{port}")
try:
    http.server.ThreadingHTTPServer(("0.0.0.0", port), http.server.SimpleHTTPRequestHandler).serve_forever()
except OSError as e:
    if e.errno == 48:
        print(f"提示：端口 {port} 已被占用（如本地代理软件 Clash/V2Ray 等）。可在 .env 设置 PORT、通过环境变量或命令行参数指定其他端口：python3 server.py 7891")
    raise
