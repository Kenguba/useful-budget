# use — 仓库规范

ken 的个人站点仓库：收集便宜、有用的技能与资源。GitHub Pages 发布，入口为根目录导航页。

- 仓库：https://github.com/Kenguba/useful-budget
- 网站：https://kenguba.github.io/useful-budget/

**读取口径（先看这条）**：本文件是索引，不是全文。每次先读「目录规范」与「约定」；其余各节按任务读——「新增项目规范」只在新建或下线项目时读，「子域名」只在动域名、路由、首页收录时读，页面规范（即 UI 规范，在 frontend/README.md）只在做页面时读，后端规范（在 backend/README.md）只在动 Worker、路由、迁移时读，「现有项目」只查当前项目那一行。各子目录文档（如 backend 与各项目 README）按需沿链接只读一层，读到能办事为止，不逐个打开、不链式通读

## 目录规范

根目录就保留下面几样，其余一律进项目目录：

| 路径 | 用途 |
| --- | --- |
| `.github/workflows/` | 自动化（定时刷新 + 发布 Pages），必须在根目录，GitHub 的硬性要求 |
| `index.html` | 全站入口导航页，只放项目卡片链接，不放具体业务内容 |
| `README.md` | 本规范文件 |
| `frontend/` | 全部前端项目与 UI 规范（入口 [frontend/README.md](frontend/README.md)） |
| `backend/` | 后端 Worker 源码留档与后端规范（入口 [backend/README.md](backend/README.md)） |

每个项目 = 一级目录一个，自带全套文件（页面、数据、脚本、图标等），互不引用、互不依赖：

```
frontend/<project>/           # 例：frontend/skill-board/
  index.html         # 项目页面（通过 /useful-budget/frontend/<project>/ 访问）
  data/              # 项目数据（如有）
  scripts/           # 项目脚本（如有）
  icons/             # 项目图标 / PWA 资源（如有）
```

## 新增项目规范

1. 目录名：全小写英文 + 连字符（如 `ai-links`），不使用中文、空格、下划线。
2. 在根 `index.html` 导航页加一张卡片：项目名、一句话说明、状态标签，链接指向 `frontend/<project>/`（相对路径）。
3. 项目需要定时更新的，在 `.github/workflows/` 里处理：脚本路径写全（含项目目录前缀，如 `frontend/skill-board/scripts/refresh.py`），数据提交范围写明项目目录（如 `git add frontend/skill-board/data/`）。
4. 发布方式全局统一：workflow 用 `actions/upload-pages-artifact` 上传仓库根目录（`path: .`），根导航与所有项目一次发布，不给单个项目单独建发布流程。
5. 项目下线：删其目录 + 删导航页对应卡片，两处缺一不可。

## 现有项目

| 目录 | 内容 | 更新方式 |
| --- | --- | --- |
| `frontend/skill-board/` | 全球 Skills 使用量排行榜（安装量双榜 + GitHub 星标榜） | workflow 每 12 小时跑 `scripts/refresh.py` 自动刷新数据并发布；自带 PWA，可添加到手机主屏幕 |
| `frontend/ai-shop/` | AI账号商铺（AI 账号比价 7 分组 + 店铺目录） | workflow 每 12 小时跑 `scripts/refresh.py` 自动刷新数据并发布 |
| `frontend/cloud-phone/` | 云手机横向对比（30 家资费/改机/底层真机核查） | 脚本每周两次（周一/周四）刷甘甘官网价（`scripts/refresh.py`）+ 每周一 agent 全量复核 30 家更新正文 |
| `frontend/cloud-pan/` | 基德盘搜（pan）1:1 复刻：搜索首页 / 热播榜 / 每日更新 / 热搜榜 / APP / 申请友链 / 资源详情 | 手动跑 `scripts/refresh.py` 拉原站公开接口快照（`data/`），页面纯静态渲染 |
| `frontend/ip-check/` | IP 纯净度检测（IPPure 风格 1:1 复刻，融合 ping0 字段）：ASN / 多源位置 / 人机流量比 / 来源 / 属性 / 纯净度系数 + 风控值 / 原生 IP / 大模型检测 / 共享人数 / 适用场景 | 纯静态单文件，浏览器端直查公开 IP 情报接口，无后端、无定时刷新 |
| `frontend/2fa-auth/` | 2FA 验证码工具（2fa.fun 1:1 复刻）：谷歌验证器网页版，批量粘贴 2FA 密钥生成 6 位 TOTP 动态验证码，30 秒自动刷新、一键复制，毛玻璃侧边栏 + 深浅主题 + 中英切换 | 纯静态单文件，浏览器端本地计算（Web Crypto HMAC-SHA1），密钥不上传，无后端、无定时刷新 |
| `frontend/ui-design/` | Designeer 设计目录复刻站（设计资源目录 + Finds 海报，署名 Designeer 并链回原页） | 手动跑 `scripts/refresh.py` 重拉官方目录数据，页面纯静态渲染 |
| `frontend/wechat-bridge/` | 微信接入可行方案（调研报告页） | 静态页，手动维护 |
| `frontend/motion-prompt/` | Motion Prompt 动效画廊（192 条命名动效/运镜/UI/网页特效，原画廊原样复刻，署名原作者 Shohei Ohtaki，MIT） | 纯静态站，手动维护（数据随上游原仓同步） |

## 子域名（Cloudflare 转发）

**主域名（`xxxxx.asia`，无前缀）= 全站总体预览页**：打开主域名就是根目录导航页 `index.html`（「便宜、有用的，都在这」），与 `kenguba.github.io/useful-budget/` 内容一致，不给任何单个项目占用。主域名不走通配，须单独配 DNS 与路由（见 [backend/README.md](backend/README.md) 迁移清单）。

各项目各有一个子域名入口，经 Cloudflare Worker 转发到本仓库对应的 Pages 目录，与 `kenguba.github.io/useful-budget/frontend/<project>/` 内容一致：

| 项目 | 子域名 |
| --- | --- |
| （全站入口）`index.html` | `xxxxx.asia`（主域名） |
| `frontend/skill-board/` | `skill.xxxxx.asia` |
| `frontend/ai-shop/` | `ai.xxxxx.asia` |
| `frontend/cloud-phone/` | `phone.xxxxx.asia` |
| `frontend/cloud-pan/` | `pan.xxxxx.asia` |
| `frontend/ip-check/` | `ip.xxxxx.asia` |
| `frontend/2fa-auth/` | `2fa.xxxxx.asia` |
| `frontend/ui-design/` | `ui.xxxxx.asia` |
| `frontend/wechat-bridge/` | `wechat.xxxxx.asia`（仅子域名，不进总汇） |
| `frontend/motion-prompt/` | `motion.xxxxx.asia`（仅子域名，不进总汇） |

**首页（总汇）收录规则（2026-11-07 ken 定）**：进总汇首页的只有 7 个——ai、skill、phone、pan、ip、2fa、ui。wechat 只开子域名 `wechat.xxxxx.asia`，不进总汇：不加短路径、不上首页卡片。以后新增项目先定类别：进首页的，子域名、总汇短路径、首页卡片三样一起加；不进首页的，只加子域名，并在子域名清单里登记注明，免得误加。

完整域名不写入本仓库（公开仓库，避免暴露站长域名）；解析与 Worker 配置在站长的 Cloudflare 账号里维护。后端 Worker 的留档、迁移与配置清单统一见 [backend/README.md](backend/README.md)

## 约定

- 链接与仓库名绑定：Pages 地址为 `kenguba.github.io/useful-budget/frontend/<project>/`，项目目录名即网址路径段，改目录名 = 改网址，慎重。
- **xxxx 占位命名**：文件名与文档中连续 3 个以上 x（`xxxx`）表示占位，代替真实或未定的部分；需要占位的文件直接以占位名命名，如 `xxxxx.md`。
- 数据文件与代码分开提交：自动刷新只提交 `data/` 变更，提交信息形如 `data: refresh YYYY-MM-DD`。
- 脚本一致性：仓库内脚本必须与线上实际运行的版本保持一致。项目脚本（如各项目 `scripts/refresh.py`）以仓库 main 为准，本地镜像/工作副本改完必须推送，禁止只改本地；发现不一致时以线上为准，并立即对齐。后端 Worker 的一致性规则见 [backend/README.md](backend/README.md)
- 本规范有变更时，先改本文件，再改实际结构，保持两者一致。
- **冲突选择**：有冲突需要人工决定时，先标序号：每个冲突一个系列号（1、2、3…），每个冲突下的方案用字母 a、b、c 标出；回复「系列号+字母」（如 1a、2C）即为选定，大小写不敏感
- **规范写法**：写入本规范的条目，短语要简洁、节省 token，但意思必须完整、能看懂；不为压缩而省略关键信息
- **服务器只拉不推**：任何服务器拉取 GitHub 仓库，一律用该仓库的只读 Deploy key，只授予拉取，不授予推送
- 防过度防御：低概率边界/并发先报概率、经确认再加，不为「理论上更稳」膨胀代码
- 入口单次校验：外部数据只在入口校验一次，内部不再层层重复判断
- 拒绝提前抽象：单次使用的逻辑就近内联，重复出现后再抽 helper
- 控制复杂度：非必要不用 try/catch，能单函数清晰写完的不硬拆

## 页面规范

页面与 UI 的通用规范（即 UI 规范，含加载顺序、列表触底、移动端、Cookie A 总框架、图标与主题高亮等）统一放在 [frontend/README.md](frontend/README.md)，做页面时读那一份；各站实现细则在各站 README
