#!/usr/bin/env python3
"""最简静态服务器（标准库）：python3 server.py [端口，默认 8080]"""
import http.server, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
print(f"Serving on http://0.0.0.0:{port}")
http.server.ThreadingHTTPServer(("0.0.0.0", port), http.server.SimpleHTTPRequestHandler).serve_forever()
