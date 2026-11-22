# use — 仓库总纲与入口分流

ken 的个人站点仓库：GitHub Pages 发布，入口为根 `index.html`。
- 仓库：`https://github.com/Kenguba/useful-budget` · 网站：`https://kenguba.github.io/useful-budget/`

**读取口径（先分流，严禁通读）**：先按任务所属端/场景从下表选**唯一入口**，沿链接只读一层到能办事为止，不逐个打开、不链式通读。

## 一、任务分流（先选一路）

| 任务属于 | 入口文档 | 说明与边界 |
| --- | --- | --- |
| **前端 · 页面 / UI / 交互** | [`frontend/README.md`](frontend/README.md) → 再进 `frontend/pages/<project>/README.md` | 改前端结构、交互、样式或新页面时必读；视觉细节按需进 `frontend/docs/` |
| **前端 · 仅改数据或刷新脚本** | [`规范/现有项目.md`](规范/现有项目.md)（只看对应项目一行） | 只改 `data/` 或 `scripts/refresh.py` 时，**不必读取 `frontend/README.md` 视觉规范** |
| **后端 · Worker / 接口 / 微信桥** | [`backend/README.md`](backend/README.md) | 动 Cloudflare Worker 留档（`*.js.back`）或 `backend/wechat-bridge/` 时读 |
| **总汇壳 / 管线集成** | `hub/modules/<name>/audit.md` | 仅动根总汇整合外壳时读对应模块审查清单 |
| **运维 · 服务器 / Tunnel / 免费机** | [`脚本/README.md`](脚本/README.md) | 仅做部署、守卫、迁移、Cloudflare Tunnel 或免费机派发时读 |
| **新建或下线项目** | [`规范/新增项目规范.md`](规范/新增项目规范.md) | 目录命名、根 `index.html` 卡片、workflow 及下线同步删两处 |
| **子域名 / 路由 / 首页收录** | [`规范/子域名.md`](规范/子域名.md) | 仅动域名、Cloudflare 转发或首页 7 站收录规则时读 |

## 二、目录规范

根目录只保留下列顶层项，其余一律进项目目录：

| 路径 | 用途 |
| --- | --- |
| `.github/workflows/` | 自动化（定时刷新 + 发布 Pages） |
| `index.html` | 全站入口导航页，只放项目卡片链接，不放具体业务 |
| `README.md` | 本总纲与分流入口 |
| `frontend/` | 全部前端项目与 UI 规范（`frontend/pages/<project>/` 内含 `index.html`、`data/`、`scripts/`、`icons/`） |
| `backend/` | Cloudflare Worker 源码留档（`*.js.back`）与 `wechat-bridge/` |
| `规范/` | 按需规范（新增项目、现有项目清单、子域名） |
| `脚本/` | 服务器部署、守卫、Tunnel 与免费机文档 |

## 三、全仓通用硬规范（每次必守）

1. **网址即目录名**：Pages 为 `kenguba.github.io/useful-budget/frontend/<project>/`，目录名即网址路径段，改目录名等于改网址，慎重。
2. **数据与脚本同步**：自动刷新只提交 `data/`（`data: refresh YYYY-MM-DD`）。项目脚本（如 `scripts/refresh.py`）以仓库 `main` 为准，本地镜像改完必推；发现与线上不一致时以线上为准并立即对齐（后端 Worker 一致性见 [`backend/README.md`](backend/README.md)）。
3. **代码克制**：防过度防御（低概率边界/并发先报概率、确认后再加）；入口单次校验（内部不层层重判）；拒绝提前抽象（单次逻辑就近内联，重复再抽 helper）；非必要不用 `try/catch`（能单函数写完不硬拆）。
4. **隐私与凭据**：敏感原文（邮箱、真实地址、手机号、完整 IP、账号标识、带 ID 控制台链接）一律脱敏后进仓（邮箱保留可认前段+`***` 如 `cyber***@gmail.com`、IP 只留前两段、域名写作 `xxxxx.asia`）；真密钥/凭据只存保险库或私密仓 `ops-vault`，仓内只留条目/路径指针不写值；自用副本可留原文，进仓或公开副本必须脱敏；发现已入库敏感信息先列清单报 ken，不擅自改历史。
5. **运维与部署红线（涉服务器/发布必守）**：服务器拉仓一律用只读 Deploy key（只拉不推）；**新加坡生产机**未经 ken 同意严禁任何计划外用途（仅跑现行生产/既定部署/每日巡检）；**谁部署谁签名**（`名字 → 方式`），汇报与部署记录缺一不算完成。
6. **写作、占位与授权边界**：文件名/文档连续 3 个以上 `x`（如 `xxxxx.md`）表示占位；有冲突需人工定夺时按「1a / 2C」编号选项列给 ken；改结构前先同步改本规范；规范短语须简洁省 token 但意思完整；未经明确要求不提交、推送、合并或部署。
