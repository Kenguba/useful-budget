# AI账号商铺（ai-shop）

AI 账号比价与店铺目录页：https://kenguba.github.io/useful-budget/frontend/ai-shop/

- `index.html` — 页面（报价单 + 店铺目录，店名可点击进店铺主页）
- `scripts/refresh.py` — 纯代码刷新脚本（零依赖）：抓 AI价网公开分类「全部渠道」页，按固定 7 分组（GPT 日抛未接马/已接马、GPT 周限、反重力最便宜/已过验证、Codex 接码单次、Grok Heavy）取有货最低 10 条，同标题铺货合并；并把 `data/shops.csv` 转成 `data/shops.json`
- `data/board.json` — 报价数据（自动刷新提交）
- `data/shops.csv` — 店铺总目录源数据（人工/周报更新后替换此文件）
- `data/shops.json` — 目录页数据（由 refresh.py 生成）

更新方式：根 workflow 每 12 小时自动跑刷新并发布。本地手动刷新：`python3 scripts/refresh.py`。
口径说明（v2）：按商家遍历——AI价网全量商家商品库（/api/shop-products.json，2052 家店每店全部分类与全部商品）+ cardnav 同格式全量库（966 家）按商品链接去重合并，再叠加 PriceAI 商品页最低价段（按价升序前 12 条）；随后按固定 7 分组标题规则分类取有货最低 10 条。不再只看聚合分类榜单页（有「只看标准商品」过滤与快照滞后）。

## Cookie A 实现细则

ai-shop 是单槽（2026-11-04 晚改定，全站一套主题）：localStorage `aishop.theme.v1` 存 `{t, d}`，t 为全站唯一主题位（0–11 对应 1–12 套）、d 为日夜；报价单与店铺目录两个页签共用同一套主题，切页签不换色、也不写 `A`；读 `A` 时主题号直接就是全站主题；只有在主题面板里真正点选 / 滑选了颜色、或单击主题钮切换日夜时才写 `A`；旧版双槽存量 `{q, s, d}` 首次打开时按 q（原报价单槽）迁移为 t，`A` 存在时以 `A` 为准
