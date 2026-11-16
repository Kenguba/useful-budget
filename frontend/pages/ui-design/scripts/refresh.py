#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ui-design 数据刷新脚本

数据源：Designeer 官方开放接口（见 https://designeer.xyz/ai.txt ，Allowed API: /api/catalog）
- 正式目录 670 条：GET https://designeer.xyz/api/catalog?collection=<inspiration|resources|tools|portfolios>
  接口按 nextCursor 分页，每页约 24 条，循环拉到 nextCursor 为 null
- Finds 157 条：https://designeer.xyz/index.md 按 Next page 链接分页解析
产物：frontend/pages/ui-design/data/data.json（结构与线上一致，失败时不覆盖旧文件）
署名要求（站方 ai.txt）：须署名 Designeer 并链回原页，简介为原文引用，权利归原作者
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

BASE = "https://designeer.xyz"
COLLECTIONS = ["inspiration", "resources", "tools", "portfolios"]
EXPECTED = {"inspiration": 137, "resources": 205, "tools": 158, "portfolios": 170, "finds": 157}
OUT = Path(__file__).resolve().parent.parent / "data" / "data.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; ui-design-refresh/1.0)"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def fetch_collection(name):
    items, cursor = [], None
    while True:
        url = f"{BASE}/api/catalog?collection={name}"
        if cursor:
            url += f"&cursor={cursor}"
        payload = json.loads(fetch(url))
        for it in payload.get("items", []):
            poster = it.get("poster") or {}
            cat = it.get("category") or {}
            items.append({
                "name": it.get("name"),
                "url": it.get("url"),
                "host": it.get("host"),
                "tagline": it.get("tagline"),
                "category": cat.get("name"),
                "pricing": it.get("pricing"),
                "poster": poster.get("url"),
                "slug": it.get("slug"),
            })
        cursor = payload.get("nextCursor")
        if not cursor:
            return items


def fetch_finds():
    finds, url = [], f"{BASE}/index.md"
    pat = re.compile(r"- \[Find by ([^\]]+)\]\((https://designeer\.xyz/finds/[^)]+)\.md\)(?: - (.*))?")
    next_pat = re.compile(r"\[Next page\]\((https://designeer\.xyz/index\.md\?cursor=[^)]+)\)")
    while url:
        text = fetch(url)
        for m in pat.finditer(text):
            author, link, desc = m.group(1), m.group(2), (m.group(3) or "").strip()
            title = desc.split(" - ", 1)[-1] if desc.lower().startswith(author.lower()) else desc
            finds.append({"author": author.strip(), "title": title.strip(), "url": link, "snippet": title.strip()})
        nxt = next_pat.search(text)
        url = nxt.group(1) if nxt else None
    return finds


def main():
    data = {"source": "Designeer", "source_url": BASE, "collections": {}}
    for name in COLLECTIONS:
        items = fetch_collection(name)
        if len(items) != EXPECTED[name]:
            print(f"[abort] {name} 期望 {EXPECTED[name]} 条，实际 {len(items)} 条，不覆盖旧数据", file=sys.stderr)
            return 1
        data["collections"][name] = items
    finds = fetch_finds()
    if len(finds) != EXPECTED["finds"]:
        print(f"[abort] finds 期望 {EXPECTED['finds']} 条，实际 {len(finds)} 条，不覆盖旧数据", file=sys.stderr)
        return 1
    data["finds"] = finds
    from datetime import date
    data["updated"] = date.today().isoformat()
    data["counts"] = {n: len(data["collections"][n]) for n in COLLECTIONS}
    data["counts"]["finds"] = len(finds)
    data["counts"]["listings"] = sum(len(data["collections"][n]) for n in COLLECTIONS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(OUT)
    print(f"[ok] listings={data['counts']['listings']} finds={len(finds)} -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
