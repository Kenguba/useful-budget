#!/usr/bin/env python3
"""AI账号商铺 · 数据刷新 v2（纯代码，零依赖）

方法（按商家遍历，不再只看聚合分类榜单页）：
- AI价网全量商家商品库 aiprice.club/api/shop-products.json（2052 家店、每店全部分类与全部商品）
- cardnav 同格式全量库 cardnav.xyz/api/shop-products.json（966 家店）
两库按商品链接去重合并；再用 PriceAI 商品页（按价升序前 12 条）补最低价段。
随后按固定 7 分组（ken 2026-10-31 拍板）用标题规则分类，取有货最低 10 条，
同标题铺货合并只取最低。链接均为商品详情页。
店铺目录由 data/shops.csv 转 data/shops.json。

用法：python3 scripts/refresh.py
产出：data/board.json、data/shops.json
"""
import csv, html, io, json, os, re, sys, time, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
HEADERS = {'User-Agent': UA, 'Accept': 'text/html,application/json',
           'Accept-Language': 'zh-CN,zh;q=0.9'}

def fetch(url, retries=2):
    last = None
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'fetch failed {url}: {last}')

def strip_tags(s):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', s or '')).split())

# ---------------- 全量商家商品库（shop-products.json 格式） ----------------
def load_shop_products(url):
    """返回 offers: title/price/stock/shop/platform/url/category/ts"""
    d = json.loads(fetch(url).decode('utf-8', 'ignore'))
    shops = d.get('s', [])
    out = []
    for p in d.get('p', []):
        try:
            srow = shops[p[0]]
            title, price, link = p[2], p[3], p[5]
            stock = p[6] if len(p) > 6 else None
            ts = p[8] if len(p) > 8 else None
            cat = p[11] if len(p) > 11 else ''
            if price is None or not title or not link:
                continue
            out.append(dict(title=title, price=float(price),
                            stock=stock if isinstance(stock, int) else None,
                            shop=srow[1], platform=srow[8], url=link,
                            category=cat or '', ts=ts or 0))
        except Exception:
            continue
    return out

# ---------------- PriceAI 商品页（服务端渲染，前 12 条按价升序） ----------------
def parse_priceai(text):
    mb = re.search(r'<tbody.*?</tbody>', text, re.S)
    if not mb:
        return []
    offers = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', mb.group(0), re.S):
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
        if len(tds) < 7:
            continue
        buy = re.search(r'href="([^"]+)"', tds[6])
        if not buy:
            continue
        url = html.unescape(buy.group(1)).split('?')[0]
        status = strip_tags(tds[0])
        if '缺货' in status or '售罄' in status:
            stock = 0
        else:
            km = re.search(r'库存\s*(\d+)', status)
            stock = int(km.group(1)) if km else None
        shop_m = re.search(r'<span class="truncate">(.*?)</span>', tds[1], re.S)
        shop = strip_tags(shop_m.group(1)) if shop_m else ''
        title = strip_tags(tds[2])
        same = 1
        sm2 = re.search(r'同名报价\s*(\d+)\s*条', title)
        if sm2:
            same = int(sm2.group(1))
            title = re.sub(r'\s*同名报价\s*\d+\s*条.*$', '', title)
        pm = re.search(r'¥\s*([\d,]+\.?\d*)', strip_tags(tds[3]))
        if not pm or not title:
            continue
        host = re.sub(r'^https?://(www\.)?', '', url).split('/')[0]
        platform = ('16688' if '16688.com.cn' in host else
                    '链动小铺' if ('wzyp.cn' in host or 'ldxp.cn' in host) else
                    '云猫寄售' if 'catfk.com' in host else '自建站')
        offers.append(dict(title=title, price=float(pm.group(1).replace(',', '')),
                           stock=stock, shop=shop, platform=platform, url=url,
                           category='', ts=0, same_source=same))
    return offers

def fetch_priceai(slug):
    try:
        return parse_priceai(fetch(f'https://priceai.cc/products/{slug}').decode('utf-8', 'ignore'))
    except Exception as e:
        print(f'priceai {slug} failed: {e}', file=sys.stderr)
        return []

# ---------------- 分组口径（ken 2026-10-31 拍板，固定 7 组） ----------------
def has(t, *words):
    return any(w in t for w in words)

def is_bound(t):
    if has(t, '未接马', '未绑定手机号'):
        return False
    return has(t, '已接马', '已接码', '已绑定手机号', '已接🐎', '已接吗')

def is_weekly(t):
    if has(t, '无5小时', '无 5 小时', '无5h', '无 5h', '没有5小时'):
        return True
    return has(t, '周限', '周额度')

GPT_CATS = {'gpt-plus', 'gpt', 'gpt-go'}
def gpt_groups(rows):
    g1, g2, g3 = [], [], []
    for o in rows:
        t = o['title']
        low = t.lower()
        if o['category'] and o['category'] not in GPT_CATS:
            continue
        if 'plus' not in low:
            continue
        if 'free' in low:
            continue  # Free 普号不是 Plus 成品号
        if has(t, 'Team', 'TEAM', 'team', '席位', '教程', '资格', '学生优惠',
               '不含plus', '不含Plus', '非plus', '非Plus', '普通账号', '送plus', '送Plus'):
            continue
        if 'chatgpt-api' in low or '微软-chatgpt' in low:
            continue
        if not has(t, '成品号', '成品账号', '账号', '帐号', '账密', '张密', '已接马', '未接马'):
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
    if has(t, '激活'):
        return '激活链接·需绑卡' if (has(t, '绑卡') and not has(t, '免绑卡', '无需绑卡')) else '激活链接·免绑卡'
    if has(t, '兑换'):
        return '兑换链接'
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
        if has(t, '教程', '盲盒'):
            continue
        if has(t, '接码', '接马') and not has(t, '激活', '成品号', '兑换'):
            continue  # 接码服务不是反重力账号商品
        if has(t, '验证') and not has(t, '已过验证', '成品号', '激活', '会员', '个月', 'Pro', 'pro'):
            continue
        g4.append(o)
        if has(t, '已过验证', '带凭证', '可直接登录', '已验证') and not has(t, '人机验证'):
            g5.append(o)
    return g4, g5

def codex_group(rows):
    out = []
    for o in rows:
        t = o['title']
        if o['category'] and o['category'] not in ('phone-verification',):
            continue
        if not has(t, 'odex', 'penAI', 'penai', 'GPT', 'gpt'):
            continue
        if has(t, '邮箱', 'PayPal', 'paypal', '平台', '谷歌账号', 'Gmail', 'gmail'):
            continue
        out.append(o)
    return out

def grok_group(rows):
    out = []
    for o in rows:
        t = o['title']
        low = t.lower()
        if has(t, '号池', '额度', '速刷'):
            continue  # API 号池/额度包不是会员；速刷号不算正价 Heavy
        if o['category'] == 'supergrok-heavy':
            if grok_marker(t) or 'heavy' in low:
                out.append(o)
            continue
        if o['category']:
            continue
        if grok_marker(t) and has(t, 'Heavy', 'HEAVY', 'heavy', 'Ultra', 'ULTRA', 'ultra'):
            out.append(o)
    return out

def grok_marker(t):
    squashed = re.sub(r'[^a-z0-9]', '', t.lower())
    return 'grok' in squashed or 'gr0k' in squashed or 'supergro' in squashed

def norm_title(t):
    t = html.unescape(t).lower()
    t = re.sub(r'[\s【】\[\]（）()·|｜/\\,，。、:：;；!！?？\-—_~`\'"“”‘’*#@]+', '', t)
    return t

def top10(rows, kind):
    merged = {}
    for o in rows:
        if o['price'] is None or o['price'] <= 0:
            continue
        if o['stock'] is not None and (o['stock'] <= 0 or o['stock'] > 1000000):
            continue  # 缺货，或库存为无限占位数（数据噪声）
        k = norm_title(o['title'])
        cur = merged.get(k)
        if cur is None:
            merged[k] = dict(o, same_source=o.get('same_source', 1))
        else:
            cur['same_source'] += o.get('same_source', 1)
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
    all_offers = {}
    for name, url in (('aiprice', 'https://aiprice.club/api/shop-products.json'),
                      ('cardnav', 'https://cardnav.xyz/api/shop-products.json')):
        try:
            rows = load_shop_products(url)
            print(f'{name}: {len(rows)} products', file=sys.stderr)
            for o in rows:
                key = o['url'].split('?')[0]
                cur = all_offers.get(key)
                if cur is None or (o['ts'] or 0) > (cur['ts'] or 0):
                    o['url'] = key
                    all_offers[key] = o
        except Exception as e:
            print(f'{name} failed: {e}', file=sys.stderr)
    rows = list(all_offers.values())
    print(f'merged unique products: {len(rows)}', file=sys.stderr)

    pai = []
    for slug in ('chatgpt-plus', 'gemini-pro-year', 'gemini-ultra',
                 'openai-phone-verification', 'super-grok-heavy'):
        r = fetch_priceai(slug)
        print(f'priceai {slug}: {len(r)} rows', file=sys.stderr)
        pai += r

    g1, g2, g3 = gpt_groups(rows + [o for o in pai if o['url']])
    # PriceAI 的 GPT 行 category 为空，已在 gpt_groups 内按标题判断；其余分组同理合并
    g4, g5 = ag_groups(rows + pai)
    g6 = codex_group(rows) + [o for o in pai if has(o['title'], 'odex', 'penAI') and not has(o['title'], '邮箱', 'PayPal', '平台')]
    g7 = grok_group(rows) + [o for o in pai if grok_marker(o['title']) and has(o['title'], 'Heavy', 'HEAVY', 'Ultra', 'ULTRA') and not has(o['title'], '号池', '额度', '速刷')]

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
                 source='按商家遍历：AI价网全量商家库（2052 家）+ cardnav 全量商家库（966 家）+ PriceAI 最低价段',
                 groups=groups)
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, 'board.json'), 'w', encoding='utf-8') as f:
        json.dump(board, f, ensure_ascii=False, indent=1)
    print('leaders:', [(g['name'][:12], g['items'][0]['price'] if g['items'] else None) for g in groups], file=sys.stderr)

    csv_path = os.path.join(DATA, 'shops.csv')
    if os.path.exists(csv_path):
        srows = list(csv.DictReader(io.open(csv_path, encoding='utf-8')))
        best = {}
        for r in srows:
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
