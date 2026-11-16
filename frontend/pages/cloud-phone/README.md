# 云手机横向对比（cloud-phone）

云手机比价与真机核查页：https://kenguba.github.io/useful-budget/frontend/pages/cloud-phone/

- `index.html` — 页面（30 家云手机横评：特点、资费、改机支持、底层真机/ARM虚拟/模拟器判定，可按底层筛选、按品牌搜索；含甘甘云专章、按用途推荐、8 步自测真机清单）
- `scripts/refresh.py` — 纯代码刷新脚本（零依赖）：抓甘甘云官网结构化套餐数据（7/30/90 天全档价）生成 `data/prices.json` 与 `data/prices.js`，并对另外 7 家官网做可用性检查；解析失败不覆盖旧数据
- `data/prices.json` / `data/prices.js` — 脚本刷新数据，页面同步加载 prices.js 更新甘甘专章表格、柱状图与总表卡片价格

更新方式（ken 2026-11-01 定）：
1. 脚本刷新：根 workflow 每周两次（北京时间周一、周四，门控在 workflow 步骤内）跑 `scripts/refresh.py` 更新甘甘官网价并发布。
2. 全量复核：每周一由 agent 复核全部 30 家（资费/改机/底层/口碑）并更新页面正文，口径与脚本数据冲突时以官网实测为准。

口径说明：无一家主流套餐能以公开证据确认为整机真机托管，市场主体为 ARM 服务器/板卡虚拟化；其余品牌官网多为 JS 渲染或价格只在 App 内，脚本不硬抓、绝不编造，靠每周一全量复核维护。

## Cookie A 实现细则

cloud-phone 是单槽（2026-11-06 接入）：localStorage 键为 `phone-theme-idx` / `phone-dark` / `phone-lang`，与 `A` 双写；读 `A` 后主题号 1–12 直接作为本站主题，语言、日夜也全部跟 `A` 走；切页签不写 `A`，只有在主题面板真正点选 / 滑选、点刷新主题、单击主题钮切换日夜或切换语言时才写 `A`；接入前本站无 localStorage 存量、无种子可迁，`A` 与本站记录都不存在时用本站默认值（第 12 套、中文、浅色）
