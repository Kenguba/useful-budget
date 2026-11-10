#!/usr/bin/env bash
# install-server-guards.sh — 服务器守护一键安装（流量守卫 + fail2ban）
# 配套说明：同目录《服务器守护图文说明.md》
#
# 在一台新的 Ubuntu 服务器上一次装好两层服务器内守护：
#   1) 流量守卫 traffic-guard：systemd timer 每 5 分钟统计 eth0 出向流量
#      到 T1（默认 780GB）停 Hysteria2 + WireGuard（网站继续）
#      到 T2（默认 790GB）再封全部对外（只留 SSH 与 lo），新周期自动恢复
#   2) fail2ban：只守 sshd，10 分钟内失败 5 次封 24 小时，再犯翻倍、最长 1 周
#      密码登录保持开启（本脚本不改 sshd 配置）
#
# 第三层「每日检测看门狗」在 Muse 侧（cron sg-server-daily-check），
# 不随本脚本安装，规格见配套说明，换机时由 Muse 照说明重建。
#
# 可选环境变量（不给就用现行新加坡机的定版值）：
#   GUARD_IFACE=eth0        统计的网卡
#   GUARD_ANCHOR_DAY=8      流量周期起始日（套餐购买日）
#   GUARD_T1_GB=780         一级阈值（停 VPN）
#   GUARD_T2_GB=790         二级阈值（封对外）
#   GUARD_OWN_IP=服务器公网IP  fail2ban 白名单（不给则自动探测，探测不到只留本机）
#
# 用法：sudo bash install-server-guards.sh
# 幂等：可重复运行，配置会被同内容覆盖；注意重跑会重启 fail2ban、清空当前封禁名单。
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 运行：sudo bash install-server-guards.sh" >&2
  exit 1
fi

GUARD_IFACE="${GUARD_IFACE:-eth0}"
GUARD_ANCHOR_DAY="${GUARD_ANCHOR_DAY:-8}"
GUARD_T1_GB="${GUARD_T1_GB:-780}"
GUARD_T2_GB="${GUARD_T2_GB:-790}"

echo "== [1/2] 流量守卫 traffic-guard =="
install -d /var/lib/traffic-guard
cat > /usr/local/sbin/traffic-guard.py <<'TRAFFIC_GUARD_PY_EOF'
#!/usr/bin/env python3
"""Traffic guard for UCloud ULightHost Singapore instance.

Counts outbound (tx) bytes on eth0 for the current billing cycle
(cycle starts on the 8th of each month, matching the purchase date).
- At 780 GB: stop Hysteria2 and WireGuard (the traffic hogs). Website stays up.
- At 790 GB: additionally block all outbound traffic except SSH (tcp/22 replies)
  and loopback, via a dedicated iptables chain TRAFFIC_GUARD.
- On cycle rollover: remove the block, restart the VPN services, reset counters.

State persists in /var/lib/traffic-guard/state.json so interface counter
resets (reboots) are folded into an offset instead of losing traffic.
Thresholds use decimal GB (1 GB = 1e9 bytes), matching cloud billing units
and keeping a safety margin under the 800 GB package limit.
"""
import json
import os
import subprocess
import sys
from datetime import date, timedelta

IFACE = "eth0"
TX_PATH = f"/sys/class/net/{IFACE}/statistics/tx_bytes"
STATE_DIR = "/var/lib/traffic-guard"
STATE_FILE = os.path.join(STATE_DIR, "state.json")
ANCHOR_DAY = 8
T1 = 780_000_000_000  # stop VPN
T2 = 790_000_000_000  # block outbound except SSH
VPN_SERVICES = ["hysteria-server.service", "wg-quick@wg0.service"]
CHAIN = "TRAFFIC_GUARD"


def run(*args):
    return subprocess.run(args, capture_output=True, text=True)


def cycle_start(today: date) -> date:
    if today.day >= ANCHOR_DAY:
        return date(today.year, today.month, ANCHOR_DAY)
    first = date(today.year, today.month, 1)
    prev_month_last = first - timedelta(days=1)
    return date(prev_month_last.year, prev_month_last.month, ANCHOR_DAY)


def read_tx() -> int:
    with open(TX_PATH) as f:
        return int(f.read().strip())


def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def save_state(state):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, STATE_FILE)


def block_outbound():
    # Create chain if missing, rebuild its rules, hook it into OUTPUT once.
    run("iptables", "-N", CHAIN)
    run("iptables", "-F", CHAIN)
    run("iptables", "-A", CHAIN, "-o", "lo", "-j", "ACCEPT")
    run("iptables", "-A", CHAIN, "-p", "tcp", "--sport", "22", "-j", "ACCEPT")
    run("iptables", "-A", CHAIN, "-j", "DROP")
    out = run("iptables", "-S", "OUTPUT").stdout
    if CHAIN not in out:
        run("iptables", "-I", "OUTPUT", "1", "-j", CHAIN)


def unblock_outbound():
    out = run("iptables", "-S", "OUTPUT").stdout
    if CHAIN in out:
        run("iptables", "-D", "OUTPUT", "-j", CHAIN)
    run("iptables", "-F", CHAIN)
    run("iptables", "-X", CHAIN)


def stop_vpn():
    run("systemctl", "stop", *VPN_SERVICES)


def start_vpn():
    run("systemctl", "start", *VPN_SERVICES)


def main():
    today = date.today()
    cur_cycle = cycle_start(today).isoformat()
    tx = read_tx()
    state = load_state()

    if state is None:
        state = {"cycle": cur_cycle, "offset": 0, "last_tx": tx, "stage": 0}

    if state["cycle"] != cur_cycle:
        # New billing cycle: lift any block, restart VPN, reset accounting.
        if state.get("stage", 0) >= 2:
            unblock_outbound()
        if state.get("stage", 0) >= 1:
            start_vpn()
        state = {"cycle": cur_cycle, "offset": 0, "last_tx": tx, "stage": 0}
        print(f"[{today}] new cycle {cur_cycle}: counters reset, services restored")

    if tx < state["last_tx"]:
        # Interface counter reset (reboot): fold previous total into offset.
        state["offset"] += state["last_tx"]
    state["last_tx"] = tx
    total = state["offset"] + tx

    if total >= T2 and state["stage"] < 2:
        stop_vpn()
        block_outbound()
        state["stage"] = 2
        print(f"[{today}] STAGE2: total {total/1e9:.2f} GB >= 790 GB, outbound blocked except SSH")
    elif total >= T1 and state["stage"] < 1:
        stop_vpn()
        state["stage"] = 1
        print(f"[{today}] STAGE1: total {total/1e9:.2f} GB >= 780 GB, VPN stopped")

    save_state(state)
    print(
        f"cycle={state['cycle']} used={total/1e9:.3f} GB "
        f"stage={state['stage']} tx_now={tx} offset={state['offset']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
TRAFFIC_GUARD_PY_EOF
chmod 755 /usr/local/sbin/traffic-guard.py

# 按环境变量调整网卡 / 周期日 / 阈值（默认值即文件内定版，不触发替换）
sed -i "s/^IFACE = \".*\"/IFACE = \"${GUARD_IFACE}\"/" /usr/local/sbin/traffic-guard.py
sed -i "s/^ANCHOR_DAY = .*/ANCHOR_DAY = ${GUARD_ANCHOR_DAY}/" /usr/local/sbin/traffic-guard.py
sed -i "s/^T1 = .*/T1 = $((GUARD_T1_GB * 1000000000))  # stop VPN/" /usr/local/sbin/traffic-guard.py
sed -i "s/^T2 = .*/T2 = $((GUARD_T2_GB * 1000000000))  # block outbound except SSH/" /usr/local/sbin/traffic-guard.py
python3 -m py_compile /usr/local/sbin/traffic-guard.py

cat > /etc/systemd/system/traffic-guard.service <<'EOF'
[Unit]
Description=Traffic guard (780G stop VPN, 790G block outbound, cycle resets on the 8th)
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/sbin/traffic-guard.py
EOF

cat > /etc/systemd/system/traffic-guard.timer <<'EOF'
[Unit]
Description=Run traffic guard every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now traffic-guard.timer
systemctl start traffic-guard.service
echo "流量守卫已装：timer 每 5 分钟跑一次，当前读数："
grep -E '"(cycle|stage)"' /var/lib/traffic-guard/state.json || true

echo "== [2/2] fail2ban（只守 sshd） =="
if ! command -v fail2ban-client >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y fail2ban
fi

OWN_IP="${GUARD_OWN_IP:-}"
if [ -z "$OWN_IP" ]; then
  OWN_IP="$(curl -s --max-time 8 https://api.ipify.org || true)"
fi
IGNOREIP="127.0.0.1/8 ::1"
if [ -n "$OWN_IP" ]; then
  IGNOREIP="${IGNOREIP} ${OWN_IP}"
fi

install -d /etc/fail2ban/jail.d
cat > /etc/fail2ban/jail.d/sshd-ken.conf <<EOF
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 24h
bantime.increment = true
bantime.factor = 2
bantime.maxtime = 1w
ignoreip = ${IGNOREIP}
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban
sleep 2
fail2ban-client status sshd || true

echo "== 完成 =="
echo "流量守卫：systemctl status traffic-guard.timer"
echo "fail2ban：fail2ban-client status sshd"
echo "解封某个 IP：fail2ban-client set sshd unbanip <IP>"
