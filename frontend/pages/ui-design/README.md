# ui-design · UI 设计资源目录

线上：https://ui.jpedu.asia （Pages 版：https://kenguba.github.io/useful-budget/frontend/pages/ui-design/）

## 内容
- 数据来自 Designeer（https://designeer.xyz），由其官方开放接口 /api/catalog 拉取，站方 ai.txt 明确允许该接口
- 正式目录 670 条：灵感 137、资源 205、工具 158、作品集 170；另收 Finds 157 条，共 827 条
- 每条保留英文原文简介（站方无官方中文版，按 ken 2026-11-06 口径：先找站方自己的中文，没有就直接用英文原文）
- 站内按站方许可署名 Designeer 并链回每条原页，简介权利归原作者

## 结构
- index.html：单页应用，12 色主题 + 日夜 + 中英，偏好走全站共享 Cookie A（本站 localStorage 键 ui-theme-idx / ui-dark / ui-lang 作回退）
- data/data.json：全量数据快照，页面直接读它渲染
- scripts/refresh.py：刷新脚本，走官方接口重拉全量并校验条数（对不上期望条数不覆盖旧数据），手动或在 workflow 里运行

## 交互规范（与全站一致）
- 筛选条在搜索框上方，单行横向滚动、不换行、不显示滚动条
- 列表滚动触底自动加载下一批（每批 30 条），不做分页与「加载更多」按钮，到底显示已展示全部 N 条
- 页头与各集合条数先行呈现，加载中用灰色骨架加流光原地替换
- 总览卡点过高亮互斥，只亮最近点过的一张，刷新即消失、不存本地
- 可见文案每行末尾不加句号
