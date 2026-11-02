# backend/ — 后端服务源码留档

这里放的是 Cloudflare Workers 的**源码留档副本**（`.js.back` 后缀，表示后端代码的备份留档，不会被当作普通 js 执行）。

- **真身在 Cloudflare 控制台**：每个 Worker 的代码直接写在 CF 的 Worker 配置里（在线编辑器 → Deploy 生效），本目录的副本不参与运行。
- **本目录的用途**：在前端仓库这边就能快速查看后端代码；迁移时直接取用，不用去控制台翻。
- **同步规则**：线上代码有任何改动 → 先在 Cloudflare 部署 → 再把源码同步回这里对应的 `.js.back`，保持两边一致。此为仓库规范（见根 `README.md`「约定 · 脚本一致性」）：本目录脚本必须与服务器（Cloudflare）中实际运行的脚本一致，发现不一致时以线上为准并立即对齐。

## 清单

| 留档文件 | 对应 Worker | 域名 | 作用 | 留档对应版本 |
| --- | --- | --- | --- | --- |
| `backend-proxy.js.back` | `backend-proxy` | `api.xxxxx.asia` | 盘搜站的后端中转：给原站公开接口加跨域头、边缘缓存、搜索流与资源链接转发 | 8b6f1e92 |
| `site-router.js.back` | `site-router` | `*.xxxxx.asia`（通配）+ `xxxxx.asia`（主域名） | 按子域名前缀分发四个项目到 GitHub Pages 对应目录；pan 的接口请求同域转发给后端；主域名（无前缀）转发到仓库根导航页（总体预览页） | 45957365 |
| `jpcard.js.back` | `jpcard` | `img.xxxxx.asia` | 日语教学图库供图：图片存 GitHub 三个仓库，三路容灾取图（jsDelivr → GitHub Raw → 镜像），边缘缓存 30 天 | 8737b21b |
| `ai-refresh.js.back` | `ai-refresh` | `ai.xxxxx.asia/api/*`（路由） | AI 商铺后端：手动全量刷新（5 分钟冷却、KV 为主 + GitHub 运行记录兜底）、进站库存现核 stock-check（60 秒节流）、访客核对结果 stock-status 供服务器采用、库存数据超 10 分钟自动触发全量拉取 | 2026-11-02 建 |

另外：旧中转 `pan-proxy` 已无域名绑定，保留在账号里当备用，没有留档（代码与 backend-proxy 相同）。

子域名与项目的对照（skill / ai / phone / pan）见仓库根 `README.md` 的「子域名」一节。

## 迁移清单（换账号/换域名时照这个顺序配）

1. **建 Worker**：在 Cloudflare 新建四个 Worker，分别把四份 `.js.back` 的代码贴入并 Deploy（贴的时候去掉文件头那段留档说明注释也行，不影响运行）。
2. **配 DNS**（域名在 Cloudflare 托管）：
   - 通配：`*` AAAA `100::`，代理开启；
   - 主域名：须有一条**已代理**的记录让请求先到达 Cloudflare（通配 `*` 不覆盖主域名）；记录内容不限——现行是 `@` A 记录指向站长服务器（已代理），也可用 `@` AAAA `100::` 占位。主域名实际返回什么由第 3 步的主域名路由决定：请求被 Worker 拦截、不会真打到记录指向的源站；没有这条已代理记录，主域名会解析不到 Cloudflare 而打不开；
   - `api`、`img` 的解析随第 3 步的自定义域绑定自动生成，不用手填。
3. **配绑定与路由**（顺序别错）：
   - `backend-proxy` 绑自定义域 `api.xxxxx.asia`，另加精确路由 `api.xxxxx.asia/*`；
   - `jpcard` 绑自定义域 `img.xxxxx.asia`，另加精确路由 `img.xxxxx.asia/*`；
   - `site-router` 绑通配路由 `*.xxxxx.asia/*`，另绑主域名路由 `xxxxx.asia/*`（通配同样不覆盖主域名，须单独加，指向同一个 `site-router`）；
   - `ai-refresh` 另加路由 `ai.xxxxx.asia/api/*`，并绑 KV 命名空间（变量名 `REFRESH_KV`，键含 last、stock:<分组>、stock:lastcheck）与 secret `GH_TOKEN`（细粒度 PAT，仅本仓库 Actions 读写），细则见其留档文件头。
4. **逐项验证**：主域名 `https://xxxxx.asia/` 应打开根导航页（总体预览页「便宜、有用的，都在这」）；四个项目子域名首页、`pan` 首页与它的 `/api/public/hot-searches?limit=1`、`api` 的同一接口、`img` 根路径应返回 `JP-EDU Image Server is Active.`；`ai` 的 `/api/refresh-board` 用 GET 访问应返回 405、POST 返回 `{ok:true,...}` JSON。

### 为什么 api / img 必须另加精确路由（2026-11-02 的教训）

通配路由 `*.xxxxx.asia/*` 会**盖掉**同域名下 Worker 自定义域的请求（自定义域不参与路由优先级排序）。只绑自定义域、不补精确路由时，api / img 会被 site-router 截走回 404。精确路由（写死完整主机名）优先级高于通配路由，补上后各归其位。规则一句话：**越具体，优先级越高。**

## 约定

- 本仓库公开，文档与注释里的真实域名一律打码写作 `xxxxx.asia`（如 `api.xxxxx.asia`）；功能代码里必须出现的真实地址不打码（打码即断站）。
- 加新项目子域名：只改 site-router 代码里 `ROUTES` 表加一行并重新 Deploy，不用再动 DNS 和路由。
- 主域名固定为总体预览页（根导航页 `index.html`），不给单个项目占用；换域名时主域名的 DNS 与路由按迁移清单第 2、3 步单独配。
