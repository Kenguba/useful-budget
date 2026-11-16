#!/usr/bin/env bash
set -euo pipefail
source "$HATCH_HOOK_RUNTIME"

INBOX="$HOME/workspace/wechat-bridge/gateway/inbox.jsonl"
STATE="$HOME/hooks/state/wechat-inbox.lines"
mkdir -p "$HOME/hooks/state"

count=0
if [ -f "$INBOX" ]; then
  count=$(wc -l < "$INBOX" | tr -d ' ')
fi
seen=0
if [ -f "$STATE" ]; then
  seen=$(cat "$STATE")
fi

if [ "$count" -gt "$seen" ]; then
  if [ "${HATCH_HOOK_DRY_RUN:-0}" != "1" ]; then
    echo "$count" > "$STATE"
  fi
  wake "wechat inbox has new messages" "{\"new_lines\": $((count - seen)), \"total_lines\": $count}"
fi

silent "no new wechat messages" "{}"
