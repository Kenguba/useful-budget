# use — 仓库规范

ken 的个人站点仓库：收集便宜、有用的技能与资源。GitHub Pages 发布，入口为根目录导航页。

- 仓库：https://github.com/Kenguba/useful-budget
- 网站：https://kenguba.github.io/useful-budget/

## 目录规范

根目录只保留三样东西，其余一律进项目目录：

| 路径 | 用途 |
| --- | --- |
| `.github/workflows/` | 自动化（定时刷新 + 发布 Pages），必须在根目录，GitHub 的硬性要求 |
| `index.html` | 全站入口导航页，只放项目卡片链接，不放具体业务内容 |
| `README.md` | 本规范文件 |

每个项目 = 一级目录一个，自带全套文件（页面、数据、脚本、图标等），互不引用、互不依赖：

```
<project>/           # 例：skill-board/
  index.html         # 项目页面（通过 /useful-budget/<project>/ 访问）
  data/              # 项目数据（如有）
  scripts/           # 项目脚本（如有）
  icons/             # 项目图标 / PWA 资源（如有）
```

## 新增项目规范

1. 目录名：全小写英文 + 连字符（如 `ai-links`），不使用中文、空格、下划线。
2. 在根 `index.html` 导航页加一张卡片：项目名、一句话说明、状态标签，链接指向 `<project>/`（相对路径）。
3. 项目需要定时更新的，在 `.github/workflows/` 里处理：脚本路径写全（含项目目录前缀，如 `skill-board/scripts/refresh.py`），数据提交范围写明项目目录（如 `git add skill-board/data/`）。
4. 发布方式全局统一：workflow 用 `actions/upload-pages-artifact` 上传仓库根目录（`path: .`），根导航与所有项目一次发布，不给单个项目单独建发布流程。
5. 项目下线：删其目录 + 删导航页对应卡片，两处缺一不可。

## 现有项目

| 目录 | 内容 | 更新方式 |
| --- | --- | --- |
| `skill-board/` | 全球 Skills 使用量排行榜（安装量双榜 + GitHub 星标榜） | workflow 每 12 小时跑 `scripts/refresh.py` 自动刷新数据并发布；自带 PWA，可添加到手机主屏幕 |
| `ai-shop/` | AI账号商铺（AI 账号比价 7 分组 + 店铺目录） | workflow 每 12 小时跑 `scripts/refresh.py` 自动刷新数据并发布 |
| `cloud-phone/` | 云手机横向对比（30 家资费/改机/底层真机核查） | 脚本每周两次（周一/周四）刷甘甘官网价（`scripts/refresh.py`）+ 每周一 agent 全量复核 30 家更新正文 |
| `cloud-pan/` | 基德盘搜（naspt.vip）1:1 复刻：搜索首页 / 热播榜 / 每日更新 / 热搜榜 / APP / 申请友链 / 资源详情 | 手动跑 `scripts/refresh.py` 拉原站公开接口快照（`data/`），页面纯静态渲染 |

## 子域名（Cloudflare 转发）

四个项目各有一个子域名入口，经 Cloudflare Worker 转发到本仓库对应的 Pages 目录，与 `kenguba.github.io/useful-budget/<project>/` 内容一致：

| 项目 | 子域名 |
| --- | --- |
| `skill-board/` | `skill.xxxxx.asia` |
| `ai-shop/` | `ai.xxxxx.asia` |
| `cloud-phone/` | `phone.xxxxx.asia` |
| `cloud-pan/` | `pan.xxxxx.asia` |

完整域名不写入本仓库（公开仓库，避免暴露站长域名）；解析与 Worker 配置在站长的 Cloudflare 账号里维护。全部后端 Worker 的源码留档统一放在仓库根目录的 `backend/` 里（说明见 `backend/README.md`）（`backend-proxy.js.back`、`site-router.js.back`、`jpcard.js.back`），迁移时直接取用，配套的通配 DNS/路由配置清单写在 site-router 留档的文件头。

## 约定

- 链接与仓库名绑定：Pages 地址为 `kenguba.github.io/useful-budget/<project>/`，项目目录名即网址路径段，改目录名 = 改网址，慎重。
- 数据文件与代码分开提交：自动刷新只提交 `data/` 变更，提交信息形如 `data: refresh YYYY-MM-DD`。
- 脚本一致性：仓库内脚本必须与线上实际运行的版本保持一致。项目脚本（如各项目 `scripts/refresh.py`）以仓库 main 为准，本地镜像/工作副本改完必须推送，禁止只改本地；后端 Worker 以 Cloudflare 已部署版为准，先部署、再把源码同步回 `backend/` 留档。发现不一致时以线上为准，并立即对齐。
- 本规范有变更时，先改本文件，再改实际结构，保持两者一致。
