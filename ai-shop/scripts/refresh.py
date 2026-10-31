#!/usr/bin/env python3
"""AI账号商铺 · 数据刷新（纯代码，零依赖）

数据源：AI价网 aiprice.club 分类「全部渠道」页（?all=1，需完整浏览器请求头）。
口径与 Muse 版「AI账号商铺」一致：只走 AI价网单一源，按固定 7 分组取有货最低 10 条，
同标题铺货合并只取最低；链接均为商品详情页。
另把同目录 data/shops.csv（店铺总目录）转成 data/shops.json 供页面目录页使用。

用法：python3 scripts/refresh.py
产出：data/board.json、data/shops.json
"""
import csv, html, io, json, os, re, sys, time, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
HEADERS = {'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml',
           'Accept-Language': 'zh-CN,zh;q=0.9'}

# ---------------- AI价网分类页解析（行级） ----------------
tr_re = re.compile(r'<tr>(.*?)</tr>', re.S)
shop_re = re.compile(r'href="[^"]*/market/shop/([^"/]+)"[^>]*>(.*?)</a>', re.S)
plat_re = re.compile(r'(链动小铺|16688|云猫寄售|自建站) / (\S+)')
price_re = re.compile(r'cx-price">¥\s*([\d,]+\.?\d*)')
buy_re = re.compile(r'class="cx-buy" href="([^"]+)"')
umami_re = re.compile(r'data-umami-event-name="([^"]*)"')
stock_re = re.compile(r'库存\s*(\d+)')

def strip_tags(s):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', s)).split())

def fetch(url, retries=2):
    last = None
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'fetch failed {url}: {last}')

def parse_page(text):
    offers = []
    for m in tr_re.finditer(text):
        row = m.group(1)
        bm = buy_re.search(row)
        if not bm:
            continue
        um = umami_re.search(row)
        title = html.unescape(um.group(1)) if um else ''
        sm = shop_re.search(row)
        shop_name = strip_tags(sm.group(2)) if sm else ''
        pm = plat_re.search(strip_tags(row))
        platform, code = (pm.group(1), pm.group(2)) if pm else ('', '')
        prm = price_re.search(row)
        price = float(prm.group(1).replace(',', '')) if prm else None
        km = stock_re.search(row)
        stock = int(km.group(1)) if km else (0 if ('缺货' in row or '售罄' in row) else None)
        if price is None or not title:
            continue
        offers.append(dict(title=title, price=price, stock=stock, shop=shop_name,
                           platform=platform, url=html.unescape(bm.group(1))))
    return offers

# ---------------- 分组口径（ken 2026-10-31 拍板，固定 7 组） ----------------
def has(t, *words):
    return any(w in t for w in words)

def is_bound(t):
    # 只认明确的「已接马/已接码/已绑定手机号」（含卖家错字「已接吗」）；
    # 「未接马」「需接马」不算已接马。
    if has(t, '未接马', '未绑定手机号'):
        return False
    return has(t, '已接马', '已接码', '已绑定手机号', '已接🐎', '已接吗')

def is_weekly(t):
    if has(t, '无5小时', '无 5 小时', '无5h', '无 5h', '没有5小时'):
        return True
    return has(t, '周限', '周额度')

def gpt_groups(rows):
    g1, g2, g3 = [], [], []
    for o in rows:
        t = o['title']
        if has(t, 'Team', 'TEAM', 'team', '席位'):
            continue
        if is_weekly(t):
            g3.append(o)
            continue
        if has(t, '代充', '直充', '充值'):
            continue
        (g2 if is_bound(t) else g1).append(o)
    return g1, g2, g3

def ag_type(t):
    if has(t, '人机'):
        return '人机号'
    if has(t, '兑换'):
        return '兑换链接'
    if has(t, '激活'):
        return '激活链接·需绑卡' if (has(t, '绑卡') and not has(t, '免绑卡', '无需绑卡')) else '激活链接·免绑卡'
    if has(t, '成品号'):
        return '成品号'
    if has(t, '代充'):
        return '代充'
    return '成品号'

def ag_groups(rows):
    g4, g5 = [], []
    for o in rows:
        t = o['title']
        if not (has(t, '反重力') or 'ntigravity' in t):
            continue
        if has(t, '不可使用反重力', '不可用反重力', '不包反重力', '不支持反重力', '无反重力'):
            continue
        if has(t, '验证') and not has(t, '已过验证', '成品号', '激活', '会员', '个月', 'Pro', 'pro'):
            continue  # 纯验证服务，不是账号商品
        g4.append(o)
        if has(t, '已过验证', '带凭证', '可直接登录', '已验证') and not has(t, '人机验证'):
            g5.append(o)
    return g4, g5

def codex_group(rows):
    out = []
    for o in rows:
        t = o['title']
        if not has(t, 'odex', 'penAI', 'penai', 'GPT', 'gpt'):
            continue
        if has(t, '邮箱', 'PayPal', 'paypal', '平台', '谷歌账号', 'Gmail', 'gmail'):
            continue
        out.append(o)
    return out

def norm_title(t):
    t = html.unescape(t).lower()
    t = re.sub(r'[\s【】\[\]（）()·|｜/\\,，。、:：;；!！?？\-—_~`\'"“”‘’*#@]+', '', t)
    return t

def top10(rows, kind):
    merged = {}
    for o in rows:
        if o['stock'] is not None and o['stock'] <= 0:
            continue
        k = norm_title(o['title'])
        cur = merged.get(k)
        if cur is None:
            merged[k] = dict(o, same_source=1)
        else:
            cur['same_source'] += 1
            if o['price'] < cur['price']:
                keep = cur['same_source']
                merged[k] = dict(o, same_source=keep)
    out = sorted(merged.values(), key=lambda x: x['price'])[:10]
    for o in out:
        o['kind'] = kind(o['title']) if kind else ''
    return out

def slim(rows):
    return [dict(price=o['price'], shop=o['shop'], platform=o['platform'],
                 stock=o['stock'], title=o['title'], url=o['url'],
                 kind=o.get('kind', ''), same_source=o.get('same_source', 1))
            for o in rows]

def main():
    cats = {}
    for slug in ('gpt-plus', 'gemini', 'gemini-pro', 'phone-verification', 'supergrok-heavy'):
        text = fetch(f'https://aiprice.club/market/category/{slug}?all=1')
        cats[slug] = parse_page(text)
        print(f'{slug}: {len(cats[slug])} rows', file=sys.stderr)

    g1, g2, g3 = gpt_groups(cats['gpt-plus'])
    g4, g5 = ag_groups(cats['gemini'] + cats['gemini-pro'])
    g6 = codex_group(cats['phone-verification'])
    g7 = cats['supergrok-heavy']

    groups = [
        dict(id='gpt-unbound', name='GPT 日抛/Plus 成品号 — 未接马', items=slim(top10(g1, None))),
        dict(id='gpt-bound', name='GPT 日抛/Plus 成品号 — 已接马', items=slim(top10(g2, None))),
        dict(id='gpt-weekly', name='GPT 周限号', items=slim(top10(g3, lambda t: '已接马' if is_bound(t) else ('未接马' if has(t, '未接马', '未绑定') else '未注明')))),
        dict(id='ag-cheapest', name='Antigravity 反重力 — 最便宜', items=slim(top10(g4, ag_type))),
        dict(id='ag-verified', name='Antigravity 反重力 — 已过验证成品号', items=slim(top10(g5, ag_type))),
        dict(id='codex-sms', name='Codex 接码 — 单次', items=slim(top10(g6, None))),
        dict(id='grok-heavy', name='Grok Heavy（SuperGrok Heavy/Ultra）', items=slim(top10(g7, lambda t: '代充' if has(t, '代充', '直充') else '成品号'))),
    ]
    board = dict(updated_at=time.strftime('%Y-%m-%d %H:%M', time.localtime()),
                 source='AI价网 aiprice.club（单一源口径，与每日推送的多源口径不同）',
                 groups=groups)
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, 'board.json'), 'w', encoding='utf-8') as f:
        json.dump(board, f, ensure_ascii=False, indent=1)
    print('leaders:', [(g['name'][:12], g['items'][0]['price'] if g['items'] else None) for g in groups], file=sys.stderr)

    csv_path = os.path.join(DATA, 'shops.csv')
    if os.path.exists(csv_path):
        rows = list(csv.DictReader(io.open(csv_path, encoding='utf-8')))
        best = {}
        for r in rows:
            key = (r['platform'], r['shop_code']) if r['shop_code'] else (r['platform'], 'name:' + r['shop_name'])
            cur = best.get(key)
            score = (2 if r['shop_url'] else 0) + (0 if '店名未记录' in r['shop_name'] else 1)
            if cur is None or score > cur[0]:
                best[key] = (score, dict(platform=r['platform'], name=r['shop_name'],
                                         url=r['shop_url'], code=r['shop_code']))
        shops = sorted((v[1] for v in best.values()), key=lambda x: (x['platform'], x['name']))
        with open(os.path.join(DATA, 'shops.json'), 'w', encoding='utf-8') as f:
            json.dump(dict(updated_at=board['updated_at'], total=len(shops), shops=shops),
                      f, ensure_ascii=False, indent=1)
        print(f'shops: {len(shops)}', file=sys.stderr)

if __name__ == '__main__':
    main()
