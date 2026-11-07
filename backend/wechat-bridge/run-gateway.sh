#!/bin/sh
# WeChat ClawBot gateway launcher (used by the systemd unit and for manual runs).
cd "$(dirname "$0")" || exit 1
exec .venv/bin/python gateway.py run
