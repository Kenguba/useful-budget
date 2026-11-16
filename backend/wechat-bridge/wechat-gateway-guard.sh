#!/usr/bin/env bash
set -euo pipefail
source "$HATCH_HOOK_RUNTIME"

UNIT=/etc/systemd/system/wechat-gateway.service
SRC="$HOME/workspace/wechat-bridge/gateway/wechat-gateway.service"
LOGF="$HOME/workspace/wechat-bridge/gateway/gateway.log"
STATE="$HOME/hooks/state/wechat-guard-expired.count"
mkdir -p "$HOME/hooks/state"
DRY="${HATCH_HOOK_DRY_RUN:-0}"

# 1) unit missing -> reinstall (VM replacement wipes /etc)
if [ ! -f "$UNIT" ]; then
  if [ "$DRY" = "1" ]; then
    log "unit missing (dry run, no repair)" '{}'
    silent "dry run: unit missing" "{}"
  fi
  cp "$SRC" "$UNIT"
  systemctl daemon-reload
  systemctl enable --now wechat-gateway.service >/dev/null 2>&1 || true
  sleep 2
  if systemctl is-active --quiet wechat-gateway.service; then
    wake "wechat gateway unit was missing and has been reinstalled" '{"repair":"unit_reinstalled"}'
  fi
  wake "wechat gateway unit missing and reinstall did not recover it" '{"repair":"unit_reinstall_failed"}'
fi

# 2) service down -> start it
if ! systemctl is-active --quiet wechat-gateway.service; then
  if [ "$DRY" = "1" ]; then
    log "service inactive (dry run, no repair)" '{}'
    silent "dry run: service inactive" "{}"
  fi
  systemctl start wechat-gateway.service || true
  sleep 3
  if systemctl is-active --quiet wechat-gateway.service; then
    wake "wechat gateway service was down and has been restarted" '{"repair":"service_restarted"}'
  fi
  wake "wechat gateway service is down and restart failed" '{"repair":"service_restart_failed"}'
fi

# 3) login expired -> report once per occurrence
expired=0
if [ -f "$LOGF" ]; then
  expired=$(grep -c "SESSION_EXPIRED" "$LOGF" || true)
fi
reported=0
if [ -f "$STATE" ]; then
  reported=$(cat "$STATE")
fi
if [ "$expired" -gt "$reported" ]; then
  if [ "$DRY" != "1" ]; then
    echo "$expired" > "$STATE"
  fi
  wake "wechat clawbot login expired (SESSION_EXPIRED in gateway log)" '{"alert":"session_expired"}'
fi

silent "gateway healthy" "{}"
