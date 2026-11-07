# 微信桥整体搭建说明（2026-11-07 现状）

## 一句话

ken 的微信 ↔ 腾讯 iLink（ClawBot 官方通道）↔ 这台虚拟机上的网关 ↔ 逗包（Muse）。
全部跑在逗包自己的虚拟机上，不占 ken 的服务器；新增成本 0 元。

## 组件（4 个常驻件 + 1 组数据文件）

| 组件 | 是什么 | 跑法 |
|---|---|---|
| 网关 gateway.py | 唯一核心程序（约 15KB Python），照腾讯官方 openclaw-weixin 的 iLink 协议自写：扫码登录、长轮询收消息、发送、媒体下载解密 | systemd 服务 wechat-gateway.service 托管，开机自启、崩溃自动重启；经运行时代理出口访问 ilinkai.weixin.qq.com |
| 收件检查 wechat-inbox | 每 10 秒数一次 inbox 行数的脚本，有新消息才唤醒 agent 处理 | hook 轮询，纯脚本零 token |
| 守护检查 wechat-gateway-guard | 每 30 秒查网关死活的脚本：服务文件丢了自己重装、进程停了自己拉起、登录过期标记出现时唤醒 agent 报告 | hook 轮询，纯脚本零 token |
| 逗包（agent） | 被唤醒时读消息、办事、写回复；分自动值班与主对话亲手两种 | 每次唤醒独立一轮，带同一套记忆 |
| 数据文件 | 全部在 ~/workspace/wechat-bridge/gateway/ 下，见下表 | — |

## 脚本读写表（谁写、谁读）

| 文件 | 写 | 读 | 内容 |
|---|---|---|---|
| creds.json（权限 600） | 登录流程（扫码确认后） | 网关每次启动 | bot_token、bot/user ID、baseurl；凭据值从不进对话与记忆 |
| state.json | 网关每轮长轮询后 | 网关 | get_updates_buf 游标（消息取到哪了） |
| inbox.jsonl | 网关（每条新消息追一行） | 收件检查（数行数）、agent（读全文处理） | 每行一条消息：ts、message_id、from_user_id、context_token、text、raw_item_types、media_paths |
| media/ | 网关（收到媒体时下载解密落盘） | agent（muse.read 看图/读文件） | 图片/文件/视频/语音原件，如 7524788612283384712_0.jpg |
| processed.json | agent（处理完追加） | agent（判重） | 已处理 message_id 列表，防止重复回复 |
| outbox/*.json | agent 或 gateway.py send 子命令（排队） | 网关（每轮先扫、发完移走） | 待发回复：to_user_id、text、context_token |
| sent/*.json | 网关（发送成功后从 outbox 移入） | 事后核查 | 已发记录存档 |
| gateway.log | 网关 | 守护检查（查 SESSION_EXPIRED）、排障 | 运行日志：收发、媒体落盘、网络错误、登录过期 |
| wechat-gateway.service（家目录副本） | 人工维护 | 守护检查（/etc 里那份丢了时拿它重装） | systemd 单元的真源副本 |
| hooks/state/wechat-inbox.lines | 收件检查脚本 | 收件检查脚本 | 上次看到的 inbox 行数 |
| hooks/state/wechat-guard-expired.count | 守护脚本 | 守护脚本 | 已上报过的 SESSION_EXPIRED 次数（防重复报告） |

## 一条消息的生命周期

1. ken 在微信发消息 → 腾讯 iLink 暂存
2. 网关长轮询（约 35 秒一轮）拉到消息 → 文字直存、媒体先下载解密落盘 → inbox.jsonl 追加一行 → state.json 推进游标
3. 10 秒内收件检查发现行数变了 → 唤醒 agent
4. agent 对照 processed.json 找出未处理消息 → 读文字/看图办事 → 回复写进 outbox → message_id 记入 processed.json
5. 网关下一轮先扫 outbox → 带该消息的 context_token 发回微信 → 文件移入 sent/
6. 全程约一分钟；主动推送借最近一条消息的 context_token，窗口过期则发不出（见边界）

## 故障自愈

- 进程崩溃 → systemd 自动重启
- 机器换代清掉 /etc 里的服务文件 → 守护脚本 30 秒内用家目录副本重装并拉起（2026-11-07 17:03 实发过一次，当时靠手动，守护即为此而建）
- 登录过期 → 网关写 SESSION_EXPIRED 并停 → 守护检测到 → 唤醒 agent 向 ken 报告 → ken 扫码（gateway.py login 生成新二维码）重新登录
- 网关停机期间的消息不丢：iLink 暂存，恢复后按游标补拉

## 边界与未接部分

- 主动推送受 context_token 窗口限制（社区口径约 24 小时/约 10 条一轮，需 ken 再互动刷新）；比特币 5 小时推送已改双投（微信 + 本对话），微信发不出时本对话照常
- 企业微信兜底未接：等 ken 注册企业微信（个人团队）建自建应用并给出参数后接入，届时冷启动推送不受窗口限制
- 无转写文字的语音（SILK）暂不能听；带腾讯转写文字的语音可直接读
- 网关头像/昵称改不了：iLink 无改资料接口，微信侧显示由 ken 在本机资料页自改（名字已改「逗包」，头像图已发他）

## 当前实测状态（2026-11-07 19:05）

- 服务 active、自启 enabled；inbox 累计 16 条；文字收发、报价点单、图片下载识别（陈都灵照片）均已实测通过
