#!/usr/bin/env bash
# word.xxxxx.asia —— Cloudflare Tunnel 一键部署脚本（v2，支持迁移）
# 目标机：腾讯云 Ubuntu（nginx 80 端口跑着「日背单词」应用）
#
# 全新部署：在新服务器上执行  bash word-tunnel-setup.sh
# 迁移部署（换服务器/换 IP）：先把老服务器 /etc/cloudflared/ 里的三个文件
#   cert.pem、<隧道UUID>.json、config.yml 拷到新服务器的 ~/.cloudflared/，
#   再执行本脚本——它会识别已有凭据、跳过建隧道，直接装服务并接管流量。
#   全程没有任何一处要填 IP：域名、DNS、CF 侧配置一律不动。
#
# 过程中登录授权步会打印一个链接，需在浏览器打开、登录 Cloudflare 选 xxxxx.asia
# （老服务器拷过来的 cert.pem 已存在时，这一步会自动跳过）
set -e

echo "== 1/6 安装 cloudflared =="
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
fi
cloudflared --version

mkdir -p ~/.cloudflared

echo "== 2/6 登录授权（已有 cert.pem 则跳过） =="
if [ -f ~/.cloudflared/cert.pem ]; then
  echo "检测到 cert.pem 已存在，跳过授权"
else
  cloudflared tunnel login
fi

echo "== 3/6 隧道凭据（已有则复用，没有才新建） =="
EXISTING_JSON=$(ls -t ~/.cloudflared/*.json 2>/dev/null | head -1 || true)
if [ -n "$EXISTING_JSON" ]; then
  echo "检测到已有隧道凭据 $EXISTING_JSON，复用（迁移模式）"
else
  cloudflared tunnel create word-tencent
fi
UUID=$(ls -t ~/.cloudflared/*.json 2>/dev/null | head -1 | xargs -r basename | sed 's/\.json$//')
if [ -z "$UUID" ]; then echo "没找到隧道凭据 json，请把上面输出发给我看"; exit 1; fi
echo "隧道 UUID = $UUID"

echo "== 4/6 写配置到 /etc/cloudflared =="
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/cert.pem ~/.cloudflared/"$UUID".json /etc/cloudflared/
sudo tee /etc/cloudflared/config.yml >/dev/null <<EOF
tunnel: $UUID
credentials-file: /etc/cloudflared/$UUID.json
ingress:
  - hostname: word.xxxxx.asia
    service: http://localhost:80
  - service: http_status:404
EOF

echo "== 5/6 解析指向隧道（已指向会提示 already configured，属正常） =="
cloudflared tunnel route dns --overwrite-dns word-tencent word.xxxxx.asia || true

echo "== 6/6 安装/重启系统服务 =="
sudo cloudflared --config /etc/cloudflared/config.yml service install || true
sudo systemctl restart cloudflared || true
sudo systemctl status cloudflared --no-pager | head -12

echo "完成。迁移模式下：确认新服务器打开域名正常后，再关掉老服务器的 cloudflared 即完成切换。"
