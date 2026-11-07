# 微信桥（WeChat Bridge）

ken 的微信与 Muse（逗包）之间的双向通道，2026-11-07 接通。

## 链路

微信（ClawBot 官方插件）→ 腾讯 iLink → Muse 虚拟机上的网关 gateway.py（长轮询收、队列发）→ 逗包被唤醒处理 → 原路回微信。细节见 ARCHITECTURE.md；为什么选这条路见 可行方案.md。

## 本目录文件

- gateway.py — 网关本体留档（扫码登录、长轮询收消息、发送、媒体下载解密）
- wechat-gateway.service — systemd 单元留档（开机自启、崩溃自拉）
- ARCHITECTURE.md — 整体搭建说明（组件、脚本读写、故障自愈、边界）
- 可行方案.md — 接入前的选型调研报告（14 条路线对比）
- 可行方案.html — 上述方案的网页版（Muse 页面导出，单文件可直接打开）

## 同步约定

- 真源在 Muse 虚拟机 ~/workspace/wechat-bridge/，以运行版为准；改完把 gateway.py、wechat-gateway.service、ARCHITECTURE.md 同步回本目录留档
- 凭据（creds.json）、收件箱（inbox.jsonl）、已处理清单、收到的图片文件只存在虚拟机上，永不进仓库
