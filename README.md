# 全球 Skills 使用量排行榜 — 自托管完整版

和 Muse 里那个榜（artifact `skills`）同版式、同口径的独立版本：脱离 Muse 也能跑，
页面是纯静态文件，数据由一个零依赖的 Python 脚本定时刷新（不烧任何模型 token）。

## 包里有什么

| 路径 | 说明 |
|---|---|
| `index.html` | 前端单文件（报纸版式、黄色标记标题、五大板块、期数切换、技能名搜索过滤、安装命令点按复制） |
| `data/board.json` | 最新一期数据（前端默认读它） |
| `data/boards/<日期>.json` | 历史快照，已预置 2026-10-27 ~ 2026-10-30 四期 |
| `data/dates.json` | 期数列表 |
| `scripts/refresh.py` | 刷新脚本：抓上游 CSV + GitHub API，生成上面所有 JSON |
| `scripts/glossary.json` | 技能中文一句话说明词条（可自己增改；新技能先用上游描述，再回落「暂无说明」） |
| `scripts/repo_meta.json` | GitHub 星标榜固定观察名单 10 仓 + 说明/维护者标注 |
| `scripts/vendor_notes.json` | 厂商榜备注 |
| `server.py` | 最简静态服务器（标准库，测试/小机自用） |
| `Dockerfile` / `docker-compose.yml` | 容器部署（自带 12h 刷新循环） |
| `.github/workflows/refresh.yml` | GitHub Pages 方案：每 12h 自动刷新+提交+发布 |
| `deploy/systemd/`、`deploy/crontab.example` | VPS 裸机方案 |
| `vercel.json` / `netlify.toml` | 纯静态托管（刷新靠 GitHub Actions 提交数据） |

## 数据口径（和 Muse 版一致）

- 数据源：LinklyAI/best-skills 每日 CSV（CC BY 4.0，约 01:00 UTC 更新，含
  top-installs / trending-7d / rising-stars / social-buzz / top-repos / best-100 等 9 张榜，
  合并 skills.sh / ClawHub / 腾讯 SkillHub）+ GitHub API 直查观察名单 10 仓的实时 star。
- **跨平台数字并列展示，绝不相加**；空值 = 未测量，不是 0。
- 星标榜：最新一期用观察名单 + GitHub 实时 star（日增优先用上游 CSV 的 stars_1d，
  缺失时用与上一期快照的差）；历史期只用上游当天 CSV 的 top-repos，保证可复现。
  注意：上游 CSV 的历史 top-repos 名单与观察名单略有出入（个别仓某些日期不在 CSV 里），
  所以历史期的星标榜名单可能和 Muse 版不完全相同；从部署之日起的新快照都走观察名单口径。
- 已验证：本包生成的 2026-10-30 期安装榜与 Muse 版逐项一致
  （find-skills 4,113,808 / dev-god 10,609,938 / grill-me 1,461,544 …），
  星标日增也一致（obra/superpowers +1,101）；star 绝对值是抓取时刻的实时值，会略高于旧快照。

## 快速开始（本地先跑起来）

```bash
python3 scripts/refresh.py     # 抓最新一期（需要联网，约 10 秒）
python3 server.py 8080         # 打开 http://localhost:8080
```

手动补历史期：`python3 scripts/refresh.py --backfill 2026-10-25 2026-10-26`
（上游历史从 2026-08-16 起都有。）

## 部署方案（三选一）

### A. Docker（最省事，自带自动刷新）
```bash
docker compose up -d --build
# 打开 http://<服务器>:8080 ；data/ 挂载在宿主机，历史快照不丢
```
可选：在 compose 里放开 `GITHUB_TOKEN`（未认证 60 次/小时也够一轮刷新用，
观察名单只有 10 个仓；高频手动刷新才需要 token）。

### B. VPS 裸机（systemd 或 cron）
```bash
sudo cp -r . /opt/skills-board
sudo cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl enable --now skills-board.service skills-board-refresh.timer
# 或不用 systemd：把 deploy/crontab.example 那行加进 crontab，并用任意静态服务器/Nginx 指向目录
```

### C. GitHub Pages（免费，零服务器）
1. 把整个包推到一个 GitHub 仓库；
2. 仓库 Settings → Pages → Source 选 **GitHub Actions**；
3. 包里自带的 workflow 每 12 小时自动：刷新数据 → 提交回仓库 → 发布 Pages。
   也可以在 Actions 页手动 Run 一次立即发布。
   Vercel / Netlify / Cloudflare Pages 同理：发布目录设为仓库根目录，
   刷新交给同一个 GitHub Actions 提交数据触发重新部署。

## 日常维护

- 想改某个技能的一句话说明：改 `scripts/glossary.json` 后重跑刷新即可（历史快照里的
  说明也会被后续快照继承，不会被覆盖成空）。
- 想换星标榜观察名单：改 `scripts/repo_meta.json` 的键（仓库全名），保持 10 个左右。
- 刷新频率：上游 CSV 每天约 01:00 UTC 更新一次，12 小时一刷与 Muse 版一致；
  改频率只需改 timer / cron / workflow 的周期 ± Docker 的 `REFRESH_HOURS`。

## 许可与署名

页面结构与脚本为本包原创；榜单数据来自 Best Skills
（https://github.com/LinklyAI/best-skills ），CC BY 4.0，转载请保留该署名
（页面底部已自带）。
