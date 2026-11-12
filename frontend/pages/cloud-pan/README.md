# cloud-pan — 基德盘搜 1:1 复刻

原站：基德盘搜 - 网盘资源搜索引擎（原站地址见 scripts/refresh.py 的 BASE 常量）

本项目按原站页面结构与视觉 1:1 复刻，纯静态多页站：

| 路径 | 页面 |
| --- | --- |
| `index.html` | 搜索首页（Hero 搜索、公告、每日更新、热门搜索、热播榜） |
| `discover/` | 热播榜（电影/剧集/动漫/综艺/短剧分频道） |
| `today/` | 每日更新（分页） |
| `hot/` | 热搜榜（含搜索次数） |
| `app/` | APP（PWA 添加主屏幕说明） |
| `search/?q=` | 搜索结果（在快照内检索） |
| `resource/?id=` | 资源详情（快照内信息 + 去原站获取） |
| `friend-links/apply/` | 申请友情链接 |

## 数据（实时优先，快照兜底）

- 页面运行时经 Cloudflare Worker 中转实时请求原站公开接口 `https://naspt.vip/api/public/*`：站点配置、每日更新（可翻页到全部）、热搜榜 50 条、热播榜（TMDB 口径 39 条）、搜索（`/resources?q=`，支持网盘筛选）、资源详情、友链设置、APP 版本。后端服务部署在 Cloudflare，Worker 名 `backend-proxy`，绑定域名 `api.xxxxx.asia`（打码写法：完整域名不写入本仓库，xxxxx 代指站长自有域名）；它的源码留档副本在仓库根目录的 `backend/backend-proxy.js.back`（全部后端留档统一放 `backend/`，方便随时查看后端代码，后端改代码后同步回来）。
- 中转地址写在 `assets/app.js` 的 `RELAY` 常量；中转不可用或请求失败时，自动回退到 `data/` 快照渲染。
- `data/` 快照由 `python3 scripts/refresh.py` 生成（零依赖；失败保留旧数据），口径与实时一致。
- 海报与联系二维码为原站公开图片地址直引，未入库二进制文件。
- 写接口（求片、友链申请）不经中转转发，复刻版为本地模拟提交。

## PWA（2026-11-06 接入）

- `manifest.webmanifest` + `sw.js` + `icons/`（192 / 512 / maskable 512，图案与 `favicon.svg` 同版：蓝底白色九宫格），全站 8 个页面统一挂 manifest 与 theme-color，可安装到主屏幕、standalone 打开
- Service Worker 策略：页面外壳与数据一律网络优先（在线永远最新版），断网回落缓存；实时搜索流与资源获取接口不拦截
- 顶栏带「安装」钮：浏览器给出安装提示时才出现（iOS 为分享菜单说明），已安装不显示
- 改版发版时同步升 `assets/style.css` / `assets/app.js` 的 `?v=` 版本号，并升 `sw.js` 的缓存名 `pan-vN`

## 说明

复刻范围为页面结构、布局与视觉样式；资源链接的实际获取（网盘地址投递）在原站完成。

## Cookie A 实现细则

cloud-pan 是单槽（2026-11-06 接入）：localStorage 键为 `pan-theme-idx` / `pan-dark` / `pan-lang`，与 `A` 双写；读 `A` 后主题号 1–12 直接作为本站主题，语言、日夜也全部跟 `A` 走；主题色值与 ai-shop 线上 12 套逐值一致、另加第三光斑 orb3；只有在主题面板真正点选 / 滑选、单击主题钮切换日夜或切换语言时才写 `A`；接入前本站无 localStorage 存量、无种子可迁，`A` 与本站记录都不存在时用本站默认值（第 12 套、中文、浅色）；顶栏不放安装钮（安装入口收进 APP 页）、胶囊按 34px 规格、右侧控件组 flex:none、主题钮固定尺寸、品牌名可省略，保证主题钮在窄屏与系统大字体下不被挤出屏

## 移动端专属口径

cloud-pan 的具体口径：左右间距收紧（外层 8px、卡片内 12px）；顶栏「求片」按钮手机端隐藏；「保持联系」浮钮手机端缩小并贴右边吸附
