# 实战笔记 · 博客（blog）

公开版博客文档站：https://kenguba.github.io/useful-budget/frontend/pages/blog/

- 类别（2026-11-15 ken 点选）：仅子域名 `blog.xxxxx.asia`，不进总汇——不加总汇短路径、不上首页卡片（与 wechat 同类）；子域名经 site-router 转发，留档改动见 `backend/site-router.js.back`
- 形态（2026-11-17 ken 定）：排版、设计、UI 与逻辑全照 ken 提供的 Oil Book 全站 SPA 新版复刻稿重做，内容换成博客现有的文章与分工数据；SPA 单页，hash 路由 `#/`、`#/articles`、`#/curated`、`#/routes`、`#/articles/<slug>`
- 版式：米纸底色加网格线、金色点缀、纸卡；顶栏左标志与站名加域名胶囊、中导航（首页 / 原创 / 精选收录 / 全站路由）、右主题钮与投稿 / 登录 / 订阅 Pro 钮；深浅两套配色由顶栏钮切换（新版逻辑自带，不再走 12 色主题与 Cookie A）
- 首页三段：我平时使用的模型（左四类紧凑网格加右选中模型详情大卡，左右联动）、原创预览、精选收录预览；文章以竖版 3:4 实体书封卡陈列（桌面 4 列 / 平板 3 列 / 手机 2 列）
- 列表页：标题行加搜索框，分类筛选胶囊按数据分类生成，计数按数据实数
- 阅读页：桌面左目录右正文（目录吸顶，手机收成正文上方折叠手风琴），字体衬线 / 非衬线与字号三档可切，带语音伴读条、反馈组件与延伸阅读；目录与 § 编号在数据里同源（toc 与 sections）
- 全站路由页：主导航路由加全部文章子路由一览，计数按数据实数生成
- `index.html` — 页面本体（视图与逻辑层）：顶栏、各视图渲染、路由、弹窗（投稿 / 登录 / Pro）、主题切换；数据经 `data/articles.js` 与 `data/roles.js` 注入组装，视图不写死文章内容
- `data/articles.js` — 文章数据（数据层）：`window.BLOG_ARTICLES = { siteMeta, originalCategories, curatedCategories, articles }`；加文章只改这个文件，不动视图代码
- `data/roles.js` — 分工区数据（数据层）：`window.BLOG_ROLES = { modelCategories }`；每个分类含 models 档案数组

## 数据结构

- `modelCategories[]`：`{ id, num, title, models: [{ id, name, badge, shortTag, quote, pros, cons, scenarios }] }`；现行四类为 01 主 Agent 沟通规划 [muse, claude, gemini]、02 高性价比执行 [codex, claude]、03 前端审美与疑难定位 [gpt, claude, gemini]、04 图片生成 [gemini]，默认选中 muse；只写公开的模型名与角色，不编造版本号与价格
- `originalCategories[]` / `curatedCategories[]`：`{ id, num, title, badge?, count }`，count 与实际文章数一致
- `articles[]`：`{ slug, type（original / curated）, categoryId, chapter, isPro, homeFeatured, title, coverLines[3], coverStyle, author, date（YYYY.MM.DD）, readTime, audioTime, themeHue, summary, toc[], sections[{ heading, paragraphs[], bullets? }], relatedSlugs[], externalLinks?, oilNote? }`
  - `slug` 是网址里的文章标识，定了不要改（改 = 链接失效）
  - `coverStyle` 取值：warm-yellow-wave / charcoal-rays / charcoal-vintage / parchment-blueprint / sage-nodes / terracotta-sun / teal-hyperbolic
  - `toc` 与 `sections` 的 heading 同源：toc 是小标题原文，heading 带 `§ NN` 前缀
  - 精选文章必须带 `author` 与 `externalLinks`（原文链接），只写摘要、不转载全文；`oilNote` 写精选说明

## 加一篇文章

1. 在 `data/articles.js` 的 `articles` 里加一项，`slug` 用全小写英文 + 连字符，原创按顺序续章号，并同步对应分类的 count
2. 正文写实内容，不写占位；`readTime` 按正文字数约 400 字 / 分钟估算，`audioTime` 按约 280 字 / 分钟估算
3. 过一遍脱敏红线与全站文案规范（见下），本地打开页面核对首页、列表与阅读视图，再推送

## 脱敏红线（公开版，入库前必查）

- 禁止出现：真实邮箱、完整 IP、手机号、账号标识、带 ID 的控制台直达链接、服务器细节、密钥类任何信息
- 精选收录只写摘要 + 作者 + 原文链接，不转载全文
- 其余文档与文案按仓库根 README 的隐私保护口径

## 部署留名

豆包 → GitHub 直推（2026-11-15 建站）
豆包 → GitHub 直推（2026-11-15 改 Oil Book 同款左右结构）
豆包 → GitHub 直推（2026-11-15 按画面复核改三处：阅读页左目录右正文、首页顶栏与计数标题行、分工区多模型一排与书封式封面）
豆包 → GitHub 直推（2026-11-17 按 ken 提供的新版复刻稿整套换排版/设计/UI/逻辑，内容换回博客现有文章与分工数据）
