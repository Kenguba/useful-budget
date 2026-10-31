#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全球 Skills 使用量排行榜 — 自托管刷新脚本（纯标准库，零依赖，零模型 token）

数据源（与 Muse 版同口径）：
  1. LinklyAI/best-skills 每日 CSV（CC BY 4.0）
     https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/<latest|YYYY-MM-DD>/rankings/<list>.csv
     9 张榜：best-100 / top-installs / trending-7d / social-buzz / most-active /
             official-100 / official-vendors / top-repos / rising-stars
     合并 skills.sh / ClawHub / 腾讯 SkillHub 三个注册中心。
  2. GitHub API 直查 top-repos 前 10 仓的实时 star（可选 GITHUB_TOKEN 环境变量提额）。

口径铁律：跨平台数字并列展示，绝不相加；空值 = 未测量，不是 0。

用法：
  python3 scripts/refresh.py                 # 抓最新一期
  python3 scripts/refresh.py --date 2026-10-30   # 抓指定历史期
  python3 scripts/refresh.py --backfill 2026-10-27 2026-10-28  # 批量补历史
输出：
  data/boards/<date>.json  每期快照
  data/board.json          最新一期副本（前端默认读它）
  data/dates.json          全部期数日期（倒序）
"""
import argparse, csv, io, json, os, re, sys, urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = "https://raw.githubusercontent.com/LinklyAI/best-skills/main"
LISTS = ["best-100", "top-installs", "trending-7d", "social-buzz",
         "most-active", "official-vendors", "top-repos", "rising-stars"]

CAT_ZH = {"ai-agent": "AI 智能体", "dev-programming": "编程开发",
          "design-media": "设计媒体", "knowledge": "知识管理",
          "knowledge-management": "知识管理", "office-efficiency": "办公效率",
          "data": "数据工具", "other": "其他"}
PLATFORM_ZH = {"skills.sh": "skills.sh", "skillhub-cn": "SkillHub CN",
               "clawhub": "ClawHub", "skillhub": "SkillHub CN"}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "skills-board-selfhost/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

def fetch_csv(day, name):
    return list(csv.DictReader(io.StringIO(fetch(f"{RAW}/data/{day}/rankings/{name}.csv"))))

def latest_date():
    m = re.search(r"Last updated:\s*\*\*(\d{4}-\d{2}-\d{2})\*\*", fetch(f"{RAW}/README.md"))
    if not m:
        raise RuntimeError("无法从上游 README 解析最新日期")
    return m.group(1)

def num(v):
    try:
        return int(float(v)) if str(v).strip() not in ("", "—", "-") else None
    except Exception:
        return None

def fnum(v):
    try:
        return float(v) if str(v).strip() not in ("", "—", "-") else None
    except Exception:
        return None

def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def build_glossary():
    """词条优先级：手工词条 scripts/glossary.json > 历史快照里已沉淀的 blurb。"""
    g = {}
    boards_dir = os.path.join(ROOT, "data", "boards")
    if os.path.isdir(boards_dir):
        for fn in sorted(os.listdir(boards_dir)):
            if fn.endswith(".json"):
                b = load_json(os.path.join(boards_dir, fn), {})
                for item in b.get("glossary", []):
                    if item.get("blurb") and item["blurb"] != "暂无说明":
                        g[item["skill"]] = item["blurb"]
    g.update(load_json(os.path.join(ROOT, "scripts", "glossary.json"), {}))
    return g

def make_blurb(glossary, skill, row):
    if skill in glossary:
        return glossary[skill]
    desc = (row.get("description_zh") or row.get("description") or "").strip()
    desc = re.sub(r"\s+", " ", desc)
    if desc:
        return desc[:57] + "…" if len(desc) > 60 else desc
    return "暂无说明"

def gh_stars(repo, token):
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{repo}",
                                     headers={"User-Agent": "skills-board-selfhost/1.0",
                                              **({"Authorization": f"Bearer {token}"} if token else {})})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.load(r).get("stargazers_count")
    except Exception:
        return None

def build_board(day, token="", is_latest=None):
    if is_latest is None:
        is_latest = (day == latest_date())
    src_day = "latest" if is_latest else day
    data = {name: fetch_csv(src_day, name) for name in LISTS}
    glossary = build_glossary()
    repo_meta = load_json(os.path.join(ROOT, "scripts", "repo_meta.json"), {})
    vendor_notes = load_json(os.path.join(ROOT, "scripts", "vendor_notes.json"), {})
    prev_boards = {}
    boards_dir = os.path.join(ROOT, "data", "boards")
    if os.path.isdir(boards_dir):
        for fn in os.listdir(boards_dir):
            if fn.endswith(".json"):
                b = load_json(os.path.join(boards_dir, fn), {})
                if b.get("date") and b["date"] < day:
                    prev_boards[b["date"]] = b
    prev = prev_boards[max(prev_boards)] if prev_boards else {}
    prev_stars = {r["repo"]: r["stars"] for r in prev.get("repos", [])}

    def blurb(skill, row):
        return make_blurb(glossary, skill, row)

    installs = []
    for r in data["top-installs"][:8]:
        installs.append({
            "rank": num(r["rank"]), "skill": r["skill"],
            "category": CAT_ZH.get(r.get("category", ""), r.get("category", "")),
            "platform": PLATFORM_ZH.get(r.get("platform", ""), r.get("platform", "")),
            "blurb": blurb(r["skill"], r), "installCmd": r.get("install", ""),
            "url": r.get("url", ""), "repoUrl": r.get("repo_url", ""),
            "installsSkillssh": num(r.get("installs_skillssh")),
            "downloadsClawhub": num(r.get("downloads_clawhub")),
            "downloadsSkillhub": num(r.get("downloads_skillhub_cn"))})

    repos = []
    if is_latest:
        # 最新一期：固定观察名单 10 仓（与 Muse 版同口径），GitHub API 直查实时 star，
        # 日增 = 与上一期快照的差。这样从今天起每一期历史都是当天真实快照。
        watchlist = list(repo_meta.keys()) or [r["repo"] for r in data["top-repos"][:10]]
        csv_by_repo = {r["repo"]: r for r in data["top-repos"]}
        for repo in watchlist:
            crow = csv_by_repo.get(repo, {})
            stars = gh_stars(repo, token) or num(crow.get("stars"))
            delta = num(crow.get("stars_1d"))
            if delta is None and repo in prev_stars and stars:
                delta = stars - prev_stars[repo]
            meta = repo_meta.get(repo, {})
            repos.append({"rank": 0, "repo": repo, "stars": stars,
                          "starsDelta1d": delta, "blurb": meta.get("blurb", "GitHub 热门技能仓库"),
                          "maintainer": meta.get("maintainer", "社区"),
                          "url": f"https://github.com/{repo}"})
    else:
        # 历史期：只用上游当天 CSV 的 top-repos（可复现，不拿今天的 star 冒充历史）
        for r in data["top-repos"][:10]:
            repo = r["repo"]
            meta = repo_meta.get(repo, {})
            repos.append({"rank": num(r["rank"]), "repo": repo, "stars": num(r.get("stars")),
                          "starsDelta1d": num(r.get("stars_1d")),
                          "blurb": meta.get("blurb", "GitHub 热门技能仓库"),
                          "maintainer": meta.get("maintainer", "社区"),
                          "url": f"https://github.com/{repo}"})
    repos.sort(key=lambda x: -(x["stars"] or 0))
    for i, r in enumerate(repos, 1):
        r["rank"] = i

    pool = {}
    for lst in ("top-installs", "best-100"):
        for r in data[lst]:
            e = pool.setdefault(r["skill"], {"skill": r["skill"], "url": r.get("url", ""),
                                             "installCmd": r.get("install", ""), "row": r,
                                             "ss": None, "ch": None, "sh": None})
            for key, field in (("ss", "installs_skillssh"), ("ch", "downloads_clawhub"), ("sh", "downloads_skillhub_cn")):
                v = num(r.get(field))
                if v is not None and (e[key] is None or v > e[key]):
                    e[key] = v
    def platform_top(key):
        rows = [e for e in pool.values() if e[key] is not None]
        rows.sort(key=lambda e: -e[key])
        return [{"rank": i, "skill": e["skill"], "value": e[key],
                 "blurb": blurb(e["skill"], e["row"]), "url": e["url"], "installCmd": ""}
                for i, e in enumerate(rows[:6], 1)]
    platforms = {"skillssh": platform_top("ss"), "clawhub": platform_top("ch"),
                 "skillhub": platform_top("sh")}

    wis = [{"rank": num(r["rank"]), "skill": r["skill"], "wis": fnum(r.get("wis")),
            "popularity": fnum(r.get("popularity")), "momentum": fnum(r.get("momentum")),
            "buzz": fnum(r.get("buzz")), "maintenance": fnum(r.get("maintenance")),
            "trust": fnum(r.get("trust")), "coverage": r.get("coverage", ""),
            "category": CAT_ZH.get(r.get("category", ""), r.get("category", "")),
            "platform": PLATFORM_ZH.get(r.get("platform", ""), r.get("platform", "")),
            "blurb": blurb(r["skill"], r), "installCmd": r.get("install", ""),
            "url": r.get("url", "")} for r in data["best-100"][:10]]

    trending = [{"rank": num(r["rank"]), "skill": r["skill"],
                 "growthPct": fnum(r.get("growth_pct")),
                 "installs": num(r.get("installs_skillssh")),
                 "blurb": blurb(r["skill"], r), "installCmd": r.get("install", ""),
                 "url": r.get("url", "")} for r in data["trending-7d"][:6]]

    buzz = [{"rank": num(r["rank"]), "skill": r["skill"], "score": fnum(r.get("buzz_score")),
             "x": num(r.get("x_mentions_7d")), "xTruncated": str(r.get("x_truncated")).lower() == "true",
             "hn": num(r.get("hn_hits_7d")), "bsky": num(r.get("bsky_hits_7d")),
             "gh": num(r.get("gh_mentions_7d")), "blurb": blurb(r["skill"], r),
             "installCmd": r.get("install", ""), "url": r.get("url", "")}
            for r in data["social-buzz"][:6]]

    rising = []
    for r in data["rising-stars"][:6]:
        ss, ch, sh = num(r.get("installs_skillssh")), num(r.get("downloads_clawhub")), num(r.get("downloads_skillhub_cn"))
        value, label = (sh, "SkillHub CN 安装") if sh is not None else (ss, "skills.sh 安装") if ss is not None else (ch, "ClawHub 下载")
        rising.append({"rank": num(r["rank"]), "skill": r["skill"],
                       "ageDays": num(r.get("first_seen_days")), "heat": fnum(r.get("pop_score")),
                       "value": value, "valueLabel": label,
                       "platform": PLATFORM_ZH.get(r.get("platform", ""), r.get("platform", "")),
                       "blurb": blurb(r["skill"], r), "installCmd": r.get("install", ""),
                       "url": r.get("url", "")})

    active = [{"rank": num(r["rank"]), "skill": r["skill"],
               "lastUpdate": r.get("last_update", ""), "versions": num(r.get("versions_clawhub")),
               "blurb": blurb(r["skill"], r), "installCmd": r.get("install", ""),
               "url": r.get("url", "")} for r in data["most-active"][:6]]

    vendors = [{"rank": num(r["rank"]), "vendor": r["vendor"], "platform": r.get("platform", ""),
                "skillsCount": num(r.get("skills_count")), "total": num(r.get("total_installs_or_downloads")),
                "note": vendor_notes.get(r["vendor"], "")} for r in data["official-vendors"][:8]]

    highlights = []
    tg = max((t for t in trending if t["growthPct"] is not None), key=lambda t: t["growthPct"], default=None)
    if tg:
        highlights.append(f"7 日动能最强：{tg['skill']} 周涨幅 {tg['growthPct']:+.1f}%，安装量 {(tg['installs'] or 0):,}")
    if buzz:
        b = buzz[0]
        highlights.append(f"社交声量第一：{b['skill']}，近 7 天 X 提及 {b['x']}{'+' if b['xTruncated'] else ''} 次、GitHub 提及 {b['gh']} 次")
    if rising:
        highlights.append(f"30 天新星第一：{rising[0]['skill']} 首次上榜仅 {rising[0]['ageDays']} 天，热度 {rising[0]['heat']}")
    rd = max((r for r in repos if r["starsDelta1d"]), key=lambda r: r["starsDelta1d"], default=None)
    if rd:
        highlights.append(f"星标日增最高：{rd['repo']} 单日 +{rd['starsDelta1d']:,}★")

    all_vals = [(v, e["skill"]) for e in installs
                for v in (e["installsSkillssh"], e["downloadsClawhub"], e["downloadsSkillhub"]) if v]
    max_v, max_s = max(all_vals) if all_vals else (None, "")
    used = {}
    for sec in (installs, wis, trending, buzz, rising, active):
        for e in sec:
            if e.get("blurb") and e["blurb"] != "暂无说明":
                used[e["skill"]] = e["blurb"]
    for p in platforms.values():
        for e in p:
            if e.get("blurb") and e["blurb"] != "暂无说明":
                used[e["skill"]] = e["blurb"]

    return {"date": day, "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "stats": {"trackedSkills": "10,000+", "dataSources": 4, "boards": 9,
                      "maxInstalls": max_v, "maxInstallsSkill": max_s},
            "highlights": highlights, "installs": installs, "repos": repos,
            "platforms": platforms, "wis": wis, "trending": trending, "buzz": buzz,
            "rising": rising, "active": active, "vendors": vendors,
            "glossary": [{"skill": k, "blurb": v} for k, v in used.items()]}

def save(board):
    boards_dir = os.path.join(ROOT, "data", "boards")
    os.makedirs(boards_dir, exist_ok=True)
    with open(os.path.join(boards_dir, board["date"] + ".json"), "w", encoding="utf-8") as f:
        json.dump(board, f, ensure_ascii=False, indent=1)
    dates = sorted((fn[:-5] for fn in os.listdir(boards_dir) if fn.endswith(".json")), reverse=True)
    with open(os.path.join(ROOT, "data", "dates.json"), "w", encoding="utf-8") as f:
        json.dump(dates, f)
    if dates and board["date"] == dates[0]:
        with open(os.path.join(ROOT, "data", "board.json"), "w", encoding="utf-8") as f:
            json.dump(board, f, ensure_ascii=False, indent=1)
    print(f"[ok] {board['date']} 已生成：安装榜首 {board['installs'][0]['skill']}，"
          f"星标榜首 {board['repos'][0]['repo']} {board['repos'][0]['stars']:,}★")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="指定期数 YYYY-MM-DD，默认最新")
    ap.add_argument("--backfill", nargs="*", default=[], help="批量补抓的历史日期")
    a = ap.parse_args()
    token = os.environ.get("GITHUB_TOKEN", "")
    days = a.backfill or [a.date or latest_date()]
    latest = latest_date()
    for day in days:
        save(build_board(day, token, is_latest=(day == latest)))

if __name__ == "__main__":
    main()
