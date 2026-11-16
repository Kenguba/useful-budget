#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cloud-phone 价格脚本刷新（零依赖，纯标准库）

每周两次由根 workflow 在北京时间周一/周四运行（门控在 workflow 步骤里）。
职责边界（诚实口径）：
- 只抓能可靠解析的官网价：目前为甘甘云官网（Nuxt 服务端渲染，价格在
  __NUXT_DATA__ 中结构化给出，含 7/30/90 天全档）。解析或校验失败时
  非零退出且不覆盖旧数据，绝不编造价格。
- 其余品牌官网只做可用性检查（HTTP 状态），不从 JS 渲染页硬抠价格；
  它们的价格由每周一 agent 全量复核维护。
输出：
- data/prices.json  结构化数据（人看/留档）
- data/prices.js    window.CP_PRICES = 同一份数据（页面同步加载）
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CST = timezone(timedelta(hours=8))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Accept-Language": "zh-CN",
           "Accept": "text/html,application/xhtml+xml"}

GANGAN_URL = "https://www.ggyphone.com/"
EXPECTED_TIERS = {"VIP", "GVIP", "KVIP", "XVIP"}

# 只做可用性检查的官网（不抠价格）
CHECK_SITES = [
    ("红手指", "https://www.gc.com.cn/"),
    ("川川云", "https://www.ccynice.com/"),
    ("VMOS国内", "https://shouji.vmos.cn/"),
    ("多多云", "https://www.ddyun.com/"),
    ("章鱼云", "https://zy.16163.com/"),
    ("掌派云", "https://palmpai.com/"),
    ("雷电云海外", "https://www.ldcloud.net/"),
]


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="ignore")


def parse_gangan(html):
    """从甘甘官网 __NUXT_DATA__（devalue 扁平数组）解出四档全时长价格。

    devalue 里 dict 的整数值是数组下标引用，按下标取值即真实值。
    只取每档第一个系统（安卓10，官网默认）的时长表。
    """
    m = re.search(r'id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise ValueError("no __NUXT_DATA__ found")
    arr = json.loads(m.group(1))

    def ref(v):
        return arr[v] if isinstance(v, int) and 0 <= v < len(arr) else v

    tiers = {}
    for v in arr:
        if not (isinstance(v, dict) and "systemPricing" in v and "name" in v):
            continue
        name = ref(v["name"])
        if name not in EXPECTED_TIERS:
            continue
        specs = ref(v["specs"]) if "specs" in v else ""
        pricing = ref(v["systemPricing"])
        first = ref(pricing[0])
        system = ref(first["system"])
        prices = {}
        for dref in ref(first["durations"]):
            d = ref(dref)
            days = ref(d["days"])
            price = ref(d["price"])
            prices[str(days)] = price
        tiers[name] = {"specs": specs, "system": system, "prices": prices}

    if set(tiers) != EXPECTED_TIERS:
        raise ValueError(f"tier set mismatch: {sorted(tiers)}")
    for name, t in tiers.items():
        for days in ("7", "30"):
            p = t["prices"].get(days)
            if not isinstance(p, (int, float)) or not (0 < p < 2000):
                raise ValueError(f"bad price {name} {days}d: {p!r}")
    return tiers


def main():
    now = datetime.now(CST).strftime("%Y-%m-%dT%H:%M:%S+08:00")
    status, html = fetch(GANGAN_URL)
    if status != 200:
        print(f"gangan fetch http {status}", file=sys.stderr)
        return 1
    try:
        tiers = parse_gangan(html)
    except Exception as e:
        print(f"gangan parse failed: {e}", file=sys.stderr)
        return 1

    checks = []
    for name, url in CHECK_SITES:
        try:
            st, _ = fetch(url, timeout=15)
        except Exception as e:
            checks.append({"name": name, "url": url, "http": None,
                           "error": type(e).__name__})
        else:
            checks.append({"name": name, "url": url, "http": st})

    data = {
        "updated_at": now,
        "source_note": "脚本抓取甘甘云官网公开套餐数据；其余品牌仅做官网可用性检查，价格以每周一全量复核为准。",
        "gangan": {
            "site": GANGAN_URL,
            "operator": "湖南威红科技有限公司",
            "tiers": tiers,
        },
        "site_checks": checks,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "prices.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA_DIR / "prices.js").write_text(
        "window.CP_PRICES = " + json.dumps(data, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    vip = tiers["VIP"]["prices"]
    print(f"OK gangan VIP 7d={vip.get('7')} 30d={vip.get('30')} 90d={vip.get('90')}; "
          f"checks: " + ", ".join(f"{c['name']}={c['http']}" for c in checks))
    return 0


if __name__ == "__main__":
    sys.exit(main())
