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

## 子域名（Cloudflare 转发）

**主域名（`xxxxx.asia`，无前缀）= 全站总体预览页**：打开主域名就是根目录导航页 `index.html`（「便宜、有用的，都在这」），与 `kenguba.github.io/useful-budget/` 内容一致，不给任何单个项目占用。主域名不走通配，须单独配 DNS 与路由（见 `backend/README.md` 迁移清单）。

六个项目各有一个子域名入口，经 Cloudflare Worker 转发到本仓库对应的 Pages 目录，与 `kenguba.github.io/useful-budget/frontend/<project>/` 内容一致：

| 项目 | 子域名 |
| --- | --- |
| （全站入口）`index.html` | `xxxxx.asia`（主域名） |
| `frontend/skill-board/` | `skill.xxxxx.asia` |
| `frontend/ai-shop/` | `ai.xxxxx.asia` |
| `frontend/cloud-phone/` | `phone.xxxxx.asia` |
| `frontend/cloud-pan/` | `pan.xxxxx.asia` |
| `frontend/ip-check/` | `ip.xxxxx.asia` |
| `frontend/2fa-auth/` | `2fa.xxxxx.asia` |

完整域名不写入本仓库（公开仓库，避免暴露站长域名）；解析与 Worker 配置在站长的 Cloudflare 账号里维护。全部后端 Worker 的源码留档统一放在仓库根目录的 `backend/` 里（说明见 `backend/README.md`）（`backend-proxy.js.back`、`site-router.js.back`、`jpcard.js.back`），迁移时直接取用，配套的通配 DNS/路由配置清单写在 site-router 留档的文件头。

## 约定

- 链接与仓库名绑定：Pages 地址为 `kenguba.github.io/useful-budget/frontend/<project>/`，项目目录名即网址路径段，改目录名 = 改网址，慎重。
- **xxxx 占位命名**：文件名与文档中连续 3 个以上 x（`xxxx`）表示占位，代替真实或未定的部分；需要占位的文件直接以占位名命名，如 `xxxxx.md`。
- 数据文件与代码分开提交：自动刷新只提交 `data/` 变更，提交信息形如 `data: refresh YYYY-MM-DD`。
- 脚本一致性：仓库内脚本必须与线上实际运行的版本保持一致。项目脚本（如各项目 `scripts/refresh.py`）以仓库 main 为准，本地镜像/工作副本改完必须推送，禁止只改本地；后端 Worker 以 Cloudflare 已部署版为准，先部署、再把源码同步回 `backend/` 留档。发现不一致时以线上为准，并立即对齐。
- 本规范有变更时，先改本文件，再改实际结构，保持两者一致。

## 页面规范

- **列表触底加载（2026-11-03 定，全站适用）**：凡是分页 / 分批展示的列表，一律做成滚动触底自动加载下一批，不做「加载更多」按钮、不做「上一页 / 下一页」分页。实现借鉴 `frontend/ai-shop/` 店铺目录的哨兵模式：`IntersectionObserver` 哨兵元素 + `rootMargin` 提前约 300px 触发 + 在途锁防重复触发 + 加载中转圈提示；全部加载完显示「已展示全部 N 条」；拉取失败不得空转自动重试，给一次点击重试即可。参考实现：`frontend/ai-shop/index.html`（店铺目录哨兵）、`frontend/cloud-pan/assets/app.js`（每日更新页）。
- **移动端适配（2026-11-03 定）**：所有页面必须在手机宽度（≤860px）下正常可用——顶栏 / 工具栏等固定区域不得横向溢出撑宽页面（放不下就换行或横滚），内容区满宽显示；新页面或改版上线前须按手机宽度核对一遍再发布。每个界面都要单独考虑手机端，不是一处改完就算完。cloud-pan 的具体口径：左右间距收紧（外层 8px、卡片内 12px）；顶栏「求片」按钮手机端隐藏；「保持联系」浮钮手机端缩小并贴右边吸附。
- **筛选条（2026-11-03 定）**：筛选条放搜索框上方；单行横滚，不换行、不显示滚动条。
- **行末无句号（2026-11-03 定，全站适用）**：页面可见文案每行末尾默认不加句号（。）；一行内有多句时用分号分隔。
- **侧边浮钮低层级（2026-11-03 定，cloud-pan「保持联系」）**：辅助入口不抢主内容层级——白底（半透）灰字、细边框、弱阴影的贴边竖排标签，禁止饱和色块底 + 白色粗体 + 彩色光晕阴影；全站统一默认位置（贴右边缘无间隔，距底桌面 40px / 手机 36px），位置固定不可拖拽，避免各页位置漂移、滑动时被误拖走。
- **点击高亮跟随形状（2026-11-04 定，全站适用）**：可点击元素的点按高亮须与元素自身形状一致；圆形、胶囊形等非矩形元素不得出现矩形高亮，仅矩形元素本身可用矩形高亮。
- **跨子域名共享偏好（2026-11-04 定，全站适用）**：主题 / 语言 / 日夜偏好用 Cookie `A` 在 jpedu.asia 各子域名间共享（`Domain=jpedu.asia; Path=/`），不走后端存储；格式为 `A=` 后接三段数字：第 1 位语言（0 中文、1 英语，后续可扩展）、第 2 位日夜（0 黑色、1 浅色）、其余为主题号 1–12 不补零，如 `A=0112` 表示中文、浅色、第 12 套，`A=009` 表示中文、黑色、第 9 套；各站读写 `A` 时须保留自己不管理的段位，并与原有 localStorage 同步双写。
