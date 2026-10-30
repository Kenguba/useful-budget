#!/bin/sh
# 容器入口：先刷一次，之后每 REFRESH_HOURS 小时刷一次；前台跑静态服务
set -e
cd /app
python3 scripts/refresh.py || true
( while true; do sleep "${REFRESH_HOURS:-12}h"; python3 scripts/refresh.py || true; done ) &
exec python3 server.py "${PORT:-8080}"
