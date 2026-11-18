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


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    done = []

    # 站点配置（含公告、弹窗、友链、网盘列表）
    try:
        site = fetch("/site")
        pres = site.get("presentation") or {}
        if pres.get("contact_image"):
            pres["contact_image"] = absolutize(pres["contact_image"])
        write_json("site.json", site)
        done.append("site")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] site: {e}", file=sys.stderr)

    # 热搜榜（热搜页展示 50 条，首页取前若干条）
    try:
        hot = fetch("/hot-searches?limit=50")
        write_json("hot.json", hot)
        done.append(f"hot({len(hot)})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] hot: {e}", file=sys.stderr)

    # 每日更新（分页合并）
    try:
        items, total = [], None
        for page in range(1, UPDATE_PAGES + 1):
            data = fetch(f"/updates?page={page}")
            total = data.get("total", total)
            items.extend(data.get("items") or [])
            if len(data.get("items") or []) < 24:
                break
        write_json("updates.json", {"total": total, "items": items})
        done.append(f"updates({len(items)}/{total})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] updates: {e}", file=sys.stderr)

    # 热播榜（原站前端同款口径：source=tmdb、limit=40，分类靠 metadata 类型前端过滤）
    try:
        discovery = fetch("/discovery?limit=40&source=tmdb")
        for row in discovery.get("items") or []:
            row["poster_url"] = absolutize(row.get("poster_url"))
        write_json("discovery.json", discovery)
        done.append(f"discovery(tmdb:{len(discovery.get('items') or [])})")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] discovery: {e}", file=sys.stderr)

    # 友链申请设置
    try:
        friend = fetch("/friend-link-settings")
        write_json("friend.json", friend)
        done.append("friend")
    except Exception as e:  # noqa: BLE001
        print(f"[warn] friend: {e}", file=sys.stderr)

    # APP 版本信息（原站静态 JSON，不在 /api 下）
    try:
        req = urllib.request.Request(
            "https://ik.naspt.vip/app/android/latest.json",
            headers={"User-Agent": UA, "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            app = json.loads(resp.read().decode("utf-8"))
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
