# ip-check — IP 纯净度检测（IPPure 风格复刻）

单文件静态页 `index.html`；除 DNS 泄露检测的权威服务外无后端。

- **首屏排版 1:1 复刻 IPPure**：搜索圆角条 + My IP 行 + 白色大卡片（IP / ASN 折叠块 / 多源位置 / IP来源 / IP属性 / IPPure系数彩虹刻度）。
- **展开区融合 ping0 字段**（保持 IPPure 卡片排版，不用 ping0 的表格）：主机名（反查 PTR）、探测时间、置信度、经度 / 纬度、ASN 所有者、企业、IP类型、风控值（胶囊 + 五色圆点）、原生 IP、大模型检测（点击检测 ChatGPT / Claude / Gemini / Grok 可用性）、IP 地址（数字，眼睛切换明文）、共享人数、适用场景（TikTok / 跨境电商 / 社媒运营 / AI 应用星级）。
- **展开区续段（ping0 长页字段）**：ASN 历史 / 企业历史 / 注册地历史 / IP 位置历史（可展开非活跃记录）、地图定位（OpenStreetMap 嵌入）、BGP 拓扑图（SVG 按当前 ASN 生成）、同机房供应商 / 客户（显示所有 / 显示 IDC 双 Tab）。
- **ping0 之外追加**：第二张卡「本机环境」——浏览器指纹（UA / 语言 / 时区 / 屏幕 / 平台，真实读取）与 WebRTC 候选地址实测（RTCPeerConnection 真检测）。
- **无广告**：不放任何广告位、浮窗机器人或第三方追踪脚本；地图为 OSM 官方嵌入。
- **手机排版**：≤560px 与 ≤380px 两档适配——胶囊按钮改为自适应宽、历史卡片换行、邻居列表域名独占一行、地图降高、BGP 图横向滚动、场景星字号收紧。
- **数据（全实时，无写死示例、无编造数值）**：定位 = ipwho.is / ipinfo.io / ipapi.co 三源实时结果逐行展示 + 共识定位；ASN / 前缀 / 持有人 / WHOIS / 路由历史 / BGP 邻居 / 地理库 = RIPEstat 实时接口；主机名 = ipinfo.io 实时 rDNS（缺失时 dns.google PTR 补查）；黑名单 = 经 dns.google 实时查 Spamhaus ZEN / Barracuda / SpamCop 三个 DNSBL。纯净度 / 风控值 = 本站按真实信号透明计算（类型基线 + 黑名单命中 + 注册地与定位一致性 + rDNS），公式逐项写在展开区「检测说明」；纯净 / 风险比、网段规模（前缀地址数）均由实时数据换算。大模型检测 = 实时定位国家与各厂商官方支持地区名单核对。
- **示例锚点**：`172.105.*.*` 与 `1.170.*.*` 两组数据与参考截图逐字段对齐；也支持 `?ip=1.2.*.*` 直查、`?demo=1` 只看示例不自动检测。
- 子域名：`ip.xxxxx.asia`（经 site-router 转发，ROUTES 加 `ip: "ip-check"` 一行）。

## Cookie A 实现细则

ip-check 是单槽：主题只有一个槽，读 `A` 后主题号 1–12 直接作为本站主题，语言、日夜也全部跟 `A` 走；ip-check 的 localStorage 键为 `ip-theme-idx` / `ip-dark` / `ip-lang`，与 `A` 双写

## DNS 泄露检测服务（dnsleak）

- 主检测（权威日志法）：页面生成随机令牌，触发浏览器解析 t<令牌>-<序号>.leak.jpedu.asia 共 6 个子域名；leak 子域名经 Cloudflare NS 委派到新加坡机的权威服务，服务记录来查询的解析器出口 IP 与 EDNS 子网；页面经 https://word.jpedu.asia/dnsleak/result?token= 取回结果（cloudflared 隧道按 /dnsleak/* 路径转发到本机 8053 端口）
- 判定：任一解析器带 EDNS 子网 → 「EDNS 子网已暴露」；解析器归属国家与出口 IP 国家不一致 → 「检测到泄露」；其余 → 「未检测到泄露」
- 兜底：6.5 秒内无权威记录（委派未生效、服务不可用等）自动回退原 DoH 法（dns.google 查 o-o.myaddr.l.google.com），字段与口径不变
- 部署：源码 scripts/dnsleak_server.py、单元 scripts/dnsleak.service（仓库版 IP 只写前两段，完整值只在服务器单元里）；服务器 /home/deploy/dnsleak（deploy 用户），systemd 服务 dnsleak，绑 eth0 内网地址 53 端口（公网经优刻得 NAT 映射），应答 A 记录为服务器公网 IP；只应答本 zone、其余 REFUSED
