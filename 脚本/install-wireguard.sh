#!/usr/bin/env bash
set -euo pipefail
# WireGuard for UCloud Singapore 128.1.x.x, Ubuntu 24.04, run via sudo
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y wireguard qrencode iptables
sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-wireguard.conf
umask 077
mkdir -p /etc/wireguard
[ -f /etc/wireguard/server.key ] || wg genkey > /etc/wireguard/server.key
wg pubkey < /etc/wireguard/server.key > /etc/wireguard/server.pub
[ -f /etc/wireguard/client1.key ] || wg genkey > /etc/wireguard/client1.key
wg pubkey < /etc/wireguard/client1.key > /etc/wireguard/client1.pub
[ -f /etc/wireguard/client1.psk ] || wg genpsk > /etc/wireguard/client1.psk
IFACE=$(ip route get 1.1.1.1 | awk '{print $5; exit}')
cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $(cat /etc/wireguard/server.key)
PostUp = iptables -t nat -A POSTROUTING -o $IFACE -j MASQUERADE
PostDown = iptables -t nat -D POSTROUTING -o $IFACE -j MASQUERADE
[Peer]
PublicKey = $(cat /etc/wireguard/client1.pub)
PresharedKey = $(cat /etc/wireguard/client1.psk)
AllowedIPs = 10.8.0.2/32
EOF
cat > /root/client1.conf <<EOF
[Interface]
PrivateKey = $(cat /etc/wireguard/client1.key)
Address = 10.8.0.2/24
DNS = 1.1.1.1
[Peer]
PublicKey = $(cat /etc/wireguard/server.pub)
PresharedKey = $(cat /etc/wireguard/client1.psk)
Endpoint = 128.1.x.x:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF
systemctl enable --now wg-quick@wg0
qrencode -t ansiutf8 < /root/client1.conf || true
echo "DONE: client config at /root/client1.conf"
