# 微信桥（WeChat Bridge）

ken 的微信与 Muse（逗包）之间的双向通道，2026-11-07 接通。

## 链路

微信（ClawBot 官方插件）→ 腾讯 iLink → Muse 虚拟机上的网关 gateway.py（长轮询收、队列发）→ 逗包被唤醒处理 → 原路回微信。细节见 [ARCHITECTURE.md](ARCHITECTURE.md)；为什么选这条路见 [可行方案.md](%E5%8F%AF%E8%A1%8C%E6%96%B9%E6%A1%88.md)。

## 本目录文件

- gateway.py — 网关本体留档（扫码登录、长轮询收消息、发送、媒体下载解密）
- wechat-gateway.service — systemd 单元留档（开机自启、崩溃自拉）
- run-gateway.sh — 网关启动脚本（服务单元调用它拉起 gateway.py）
- wechat-inbox.sh — 收件检查 hook 脚本留档（10 秒轮询，有新消息才唤醒 agent）
- wechat-gateway-guard.sh — 守护 hook 脚本留档（30 秒轮询，重装丢失的服务单元、拉起停掉的网关、报告登录过期）
- [ARCHITECTURE.md](ARCHITECTURE.md) — 整体搭建说明（组件、脚本读写、故障自愈、边界、迁移重建步骤）
- [可行方案.md](%E5%8F%AF%E8%A1%8C%E6%96%B9%E6%A1%88.md) — 接入前的选型调研报告（14 条路线对比）
- 可行方案的网页版在仓库 [frontend/pages/wechat-bridge/](../../frontend/pages/wechat-bridge/)（GitHub Pages 可直接打开，本目录只留文字版）

## 值班处理流程（agent 被唤醒时照此执行）

1. 读 gateway/inbox.jsonl 全部行，再读 gateway/processed.json（不存在就当空列表），找出 message_id 未处理的新消息
2. 以逗包本人身份理解 ken 的话，需要时动用记忆和工具把事情办了
3. 记录带 media_paths 的：图片（.jpg/.png/.gif/.webp）用 muse.read 打开看清内容再回应，不要假装没看见；文档类文件用 muse.read 读；语音 .silk 若 text 里只有占位、没有转写文字，如实告诉他这条语音暂时听不了、请他打字或发文字版
4. 回复发回微信：在 gateway/ 目录运行 .venv/bin/python gateway.py send --to <该消息的 from_user_id> --text <回复> --context-token <该消息的 context_token>；回复用平常跟 ken 聊天的简洁中文风格，不要提队列、网关、唤醒等内部机制
5. 处理完，把这些 message_id 追加保存进 gateway/processed.json
6. gateway.log 里出现 SESSION_EXPIRED（登录失效）时，在执行总结里明确报告，需要重新扫码
7. 绝不要把任何凭据、token 写进微信回复或总结

## 同步约定

- 真源在 Muse 虚拟机 ~/workspace/wechat-bridge/，以运行版为准；改完把 gateway.py、wechat-gateway.service、run-gateway.sh、两个 hook 脚本、ARCHITECTURE.md 同步回本目录留档
- 凭据（creds.json）、收件箱（inbox.jsonl）、已处理清单、收到的图片文件只存在虚拟机上，永不进仓库
