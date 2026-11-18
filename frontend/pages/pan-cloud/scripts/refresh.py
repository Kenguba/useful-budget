#!/usr/bin/env python3
"""pan（基德盘搜复刻）数据快照脚本：零依赖，纯代码刷新。

从原站公开 API 拉取站点配置、每日更新、热搜榜、热播榜（分频道），
写入 ../data/*.json。任何一步失败都保留旧数据、不覆盖。
海报与联系二维码在快照里改写为原站绝对地址（页面 <img> 直引，不入库二进制）。
"""
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

BASE = "https://naspt.vip/api/public"
ORIGIN = "https://naspt.vip"
HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
UPDATE_PAGES = 5          # 每日更新快照页数（每页 24 条）
CHANNELS = ["movie", "tv", "anime", "variety", "short"]


def fetch(path):
    req = urllib.request.Request(
        BASE + path,
        headers={"User-Agent": UA, "Accept": "application/json",
                 "Accept-Language": "zh-CN,zh;q=0.9"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("code") != 0:
        raise RuntimeError(f"{path} -> code={payload.get('code')}")
    return payload["data"]


def absolutize(url):
    if isinstance(url, str) and url.startswith("/"):
        return ORIGIN + url
    return url


def write_json(name, obj):
    path = os.path.join(DATA_DIR, name)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def _fetch_updates():
    items, total = [], None
    first = fetch("/updates?page=1")
    total = first.get("total")
    first_items = first.get("items") or []
    items.extend(first_items)
    if len(first_items) >= 24 and UPDATE_PAGES > 1:
        with ThreadPoolExecutor(max_workers=UPDATE_PAGES - 1) as ex:
            for data in ex.map(lambda p: fetch(f"/updates?page={p}"), range(2, UPDATE_PAGES + 1)):
                total = data.get("total", total)
                items.extend(data.get("items") or [])
    return {"total": total, "items": items}


def _fetch_app():
    req = urllib.request.Request(
        "https://ik.naspt.vip/app/android/latest.json",
        headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    done = []

    with ThreadPoolExecutor(max_workers=6) as ex:
        fut_site = ex.submit(fetch, "/site")
        fut_hot = ex.submit(fetch, "/hot-searches?limit=50")
        fut_upd = ex.submit(_fetch_updates)
        fut_disc = ex.submit(fetch, "/discovery?limit=40&source=tmdb")
        fut_friend = ex.submit(fetch, "/friend-link-settings")
        fut_app = ex.submit(_fetch_app)

    # 站点配置（含公告、弹窗、友链、网盘列表）
    try:
        site = fut_site.result()
        pres = site.get("presentation") or {}
        if pres.get("contact_image"):
            pres["contact_image"] = absolutize(pres["contact_image"])
        write_json("site.json", site)
        done.append("site")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] site: {e}", file=sys.stderr)

    # 热搜榜（热搜页展示 50 条，首页取前若干条）
    try:
        hot = fut_hot.result()
        write_json("hot.json", hot)
        done.append(f"hot({len(hot)})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] hot: {e}", file=sys.stderr)

    # 每日更新（分页合并）
    try:
        upd = fut_upd.result()
        write_json("updates.json", upd)
        done.append(f"updates({len(upd['items'])}/{upd['total']})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] updates: {e}", file=sys.stderr)

    # 热播榜（原站前端同款口径：source=tmdb、limit=40，分类靠 metadata 类型前端过滤）
    try:
        discovery = fut_disc.result()
        for row in discovery.get("items") or []:
            row["poster_url"] = absolutize(row.get("poster_url"))
        write_json("discovery.json", discovery)
        done.append(f"discovery(tmdb:{len(discovery.get('items') or [])})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] discovery: {e}", file=sys.stderr)

    # 友链申请设置
    try:
        friend = fut_friend.result()
        write_json("friend.json", friend)
        done.append("friend")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] friend: {e}", file=sys.stderr)

    # APP 版本信息（原站静态 JSON，不在 /api 下）
    try:
        app = fut_app.result()
        write_json("app.json", app)
        done.append(f"app(v{app.get('versionName', '?')})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] app: {e}", file=sys.stderr)

    write_json("meta.json", {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": BASE,
        "done": done,
    })
    print("refreshed:", "; ".join(done))


if __name__ == "__main__":
    main()
