#!/usr/bin/env python3
"""AI账号商铺 · 数据刷新 v2（纯代码，零依赖）

方法（按商家遍历，不再只看聚合分类榜单页）：
- AI价网全量商家商品库 aiprice.club/api/shop-products.json（2052 家店、每店全部分类与全部商品）
- cardnav 同格式全量库 cardnav.xyz/api/shop-products.json（966 家店）
两库按商品链接去重合并；再用 PriceAI 商品页（按价升序前 12 条）补最低价段。
随后按固定 7 分组（ken 2026-10-31 拍板）用标题规则分类，取有货最低 30 条，
同标题铺货合并只取最低。链接均为商品详情页。
店铺目录由 data/shops.csv 转 data/shops.json。

用法：python3 scripts/refresh.py
产出：data/board.json、data/shops.json
"""
import csv, html, io, json, os, re, sys, time, urllib.parse, urllib.request

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

# ---------------- 分组口径（ken 2026-10-31 拍板 7 组；2026-11-02 增 Claude 组，共 8 组） ----------------
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
        t = o.get('ctitle') or o['title']
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

AG_WORD = re.compile(r'anti[-\s]?gravity', re.I)
AG_ARGON = re.compile(r'argon\s?4', re.I)
AG_OPUS = re.compile(r'opus\s?5', re.I)

def ag_hit(t):
    """反重力命中（ken 2026-11-03 优先规则）：反重力 / antigravity（大小写、连字符、空格可变）/
    argon 4（空格可有可无）任一命中即算；opus 5 须同时带 Gemini/谷歌/argon/antigravity 语境才算——
    裸 opus5.5 在全量库里绝大多数是 Notion/Cursor 的「可用 Opus 5.5」模型卖点，与反重力无关，
    裸放行会把 Notion 订阅冲进反重力组前排（2026-11-03 全量实测）。"""
    if has(t, '反重力') or AG_WORD.search(t) or AG_ARGON.search(t):
        return True
    return bool(AG_OPUS.search(t) and (has(t, 'emini', 'EMINI', '谷歌', 'Google', 'google', 'GOOGLE')
                                       or AG_WORD.search(t) or AG_ARGON.search(t)))

AG_VERIFIED_PASS = re.compile(r'已过\s*(反重力)?\s*(antigravity)?\s*验证', re.I)

def ag_verified(t):
    """已过验证识别（ken 2026-11-03 补变体）：卖家写法多变——「已经过验证」多一个经字、
    「已过Antigravity验证」中间隔着词、「带rt凭证」不是「带凭证」，旧词表都漏。
    否定写法（没验证过/未过验证）与人机验证号一律排除（人机号不算已过验证）。"""
    if has(t, '人机验证'):
        return False
    if has(t, '没验证过', '未过验证', '没过验证', '未验证', '没通过验证'):
        return False
    if has(t, '已过验证', '已经过验证', '已通过验证', '已验证', '验证通过',
           '带凭证', '带rt凭证', '带RT凭证', '可直接登录', '已完成验证'):
        return True
    return bool(AG_VERIFIED_PASS.search(t))

AG_FIN_NEG = ('没验证过', '未过验证', '没过验证', '未验证', '没通过验证')
AG_FIN_BLOCK = ('半成品', '人机',
                '代开通', '代过', '代办', '代刷', '代实名', '代注册',
                '助手', '工具', '软件', '插件', '脚本', '捕获', '提取器')
AG_FIN_MARK = ('成品号', '成品账号', '成品', '已开通', '开箱即用', '设置好', '已设置',
               '可直接登录', '直接登录', '直登')
AG_RT = re.compile(r'(?<![A-Za-z])RT(?![A-Za-z])')

def ag_finished_verified(t):
    """成品号默认已过验证（ken 2026-11-03 精修版）：反重力成品号本身就是已过验证的账号，
    标题没写「已过验证」也进已过验证组；精修排除三类——卖家明说没过/未过的、
    人机号与半成品号、工具/服务/纯令牌类（卖软件、代开通代过、只卖 RT 的不是成品号）。
    另：ag_type 靠兜底标成成品号、无任何成品标记的标题不默认放行，避免把杂项放进来。"""
    if ag_type(t) != '成品号':
        return False
    if has(t, *AG_FIN_NEG) or has(t, *AG_FIN_BLOCK):
        return False
    if not has(t, *AG_FIN_MARK):
        return False
    if (AG_RT.search(t) or has(t, '令牌', 'token', 'Token')) \
            and not has(t, '成品', '账号', '帐号', '账密', '会员', '谷歌号'):
        return False  # 纯令牌：卖的是 RT/令牌本身，不是账号
    return True

def ag_groups(rows):
    g4, g5 = [], []
    for o in rows:
        t = o['title']
        if not ag_hit(t):
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
        if ag_verified(t) or ag_finished_verified(t):
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
        spec = o.get('spec') or ''
        if spec and has(spec, '10次', '十次', '多次', '长效'):
            continue  # 多次/长效规格不是单次接码（ken 2026-11-02 多规格处理）
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

def split_spec(title):
    """多规格商品：cardnav 把每个规格拆成一条，标题形如「基名 · 规格名」，
    价格/库存都是该规格自己的；无后缀的基名条价格=最低规格价、库存=各规格总量，不可归属。"""
    parts = re.split(r'\s+·\s+', title)
    if len(parts) >= 2 and parts[-1].strip():
        return ' · '.join(parts[:-1]), parts[-1].strip()
    return title, ''

SPEC_WEEKLY = ('周限', '周额度', '无5h', '无 5h', '无5小时', '无 5 小时', '没有5小时')
SPEC_BOUND = ('已接码', '已接马', '已接🐎', '已绑定')
SPEC_UNBOUND = ('未接', '未绑')

def prepare_offers(rows):
    """算每条的 spec 与分类用标题 ctitle：分类轴（日抛/周限、已接/未接）以规格为准，
    基名里的同轴冲突词剔除后另附规格结论标签，排除词仍查全文（规格里的「非plus/资格」也要拦）。
    同一商品链接下只要有带规格的条目，无规格基名条丢弃（价格/库存不可归属，挂哪组都是错的）。"""
    fam = {}
    for o in rows:
        base, spec = split_spec(o['title'])
        o['base_title'], o['spec'] = base, spec
        fam.setdefault(urllib.parse.unquote(o['url'].split('?')[0]), set()).add(spec)
    out = []
    for o in rows:
        spec = o['spec']
        if not spec and any(s and s != '默认规格' for s in fam[urllib.parse.unquote(o['url'].split('?')[0])]):
            continue
        if spec and spec != '默认规格':
            base, tags = o['base_title'], ''
            sw = has(spec, *SPEC_WEEKLY); sd = '日抛' in spec
            if sw or sd:
                for w in ('周限', '周额度', '无5小时', '无 5 小时', '无5h', '无 5h', '没有5小时'):
                    base = base.replace(w, '')
                if sw:
                    tags += ' 周限'
            sb = has(spec, *SPEC_BOUND); su = has(spec, *SPEC_UNBOUND)
            if sb or su:
                for w in ('已接马', '未接马', '已接码', '未接码', '已绑定手机号', '未绑定手机号', '已接🐎', '未接🐎'):
                    base = base.replace(w, '')
                tags += ' 已接马' if (sb and not su) else (' 未接马' if su else '')
            o['ctitle'] = spec + '｜' + base + tags
        else:
            o['ctitle'] = o['title']
        out.append(o)
    return out

def claude_kind(t):
    tier = 'Max 20x' if has(t, '20x', '20X') else 'Max 5x' if has(t, '5x', '5X') else 'Max' if has(t, 'Max', 'MAX') else 'Pro' if has(t, 'Pro', 'PRO') else ''
    form = '代充' if has(t, '代充', '直充', '充值', '官冲', '卡冲') else '成品号'
    return (tier + '·' if tier else '') + form

def claude_group(rows):
    out = []
    for o in rows:
        t = o['title']; c = o.get('category', '')
        # Claude 必须是标题主角：标记词出现在标题前段（去掉开头符号后 15 字内），
        # 或店铺分类本身就是 claude 类；仅在标题后段「支持/可用 Claude」的其他商品不算。
        stripped = re.sub(r'^[^0-9A-Za-z\u4e00-\u9fff]+', '', t).lower()
        pos = [x for x in (stripped.find('claude'), stripped.find('克劳德')) if x >= 0]
        cat_ok = c in ('claude-pro', 'claude-max-5x', 'claude-max-20x') and has(t, 'Pro', 'PRO', 'Max', 'MAX')
        if not ((pos and min(pos) <= 15) or cat_ok):
            continue
        if c in ('claude-free', 'api-gateway', 'phone-verification', 'kyc', 'outlook'):
            continue
        if has(t, '接码', '接马', '验证码', '短信', '邮箱', 'Outlook', 'Hotmail', '令牌',
               'API', 'api', '中转', '号池', '卡密', '镜像', '教程', '方法', '普号', '免费',
               'free', 'Free', 'FREE', '白号', 'KYC', 'kyc', '速刷', '按量', '余额', '注册号',
               '拼车', '软件', '窗口', 'Notion', 'notion', 'Cursor', 'cursor', 'Perplexity',
               'Kling', 'kling', '防封'):
            continue
        if not has(t, '成品号', '成品账号', '账号', '帐号', '代充', '直充', '充值', '订阅',
                   '月卡', 'CDK', '兑换码', '礼品卡', '会员', '官冲', '卡冲'):
            continue
        out.append(o)
    return out

def muse_kind(t):
    tier = '310亿' if '310亿' in t else '10亿' if '10亿' in t else ''
    form = '充值' if '充值' in t else '成品号'
    return (tier + '·' if tier else '') + form

def muse_group(rows):
    # Muse（Meta 的 AI）成品号：主流形态是带 Token 额度（10亿/310亿）的成品号。
    # 聚合类目里同名的大头其实是接码（phone-verification）与 API 网关，先按类目剔除，
    # 再按标题剔除服务类（接码接马、CDK 自助刷量、卡类、中转、教程），只留成品号/账号。
    out = []
    for o in rows:
        t = o['title']; c = o.get('category', '')
        if 'muse' not in t.lower():
            continue
        if c in ('api-gateway', 'phone-verification', 'vcc', 'kyc'):
            continue
        if has(t, '接码', '接马', '短信', '验证码', 'CDK', 'cdk', '自助', '刷满', '刷量',
               'visa', 'Visa', 'VISA', '虚拟卡', '实体卡', 'API', 'api', '中转', '教程',
               '方法', '邀请码', '下线', '代理价'):
            continue
        if not has(t, '成品号', '成品账号', '账号', '帐号'):
            continue
        out.append(o)
    return out

def vcc_kind(t):
    brand = 'Visa' if has(t, 'visa', 'Visa', 'VISA', 'vasa') else '万事达' if has(t, '万事达', 'master', 'Master', 'MASTER') else ''
    zero = '0刀' if has(t, '0刀', '0美元', '0美金') else ''
    return '·'.join(x for x in (brand, zero) if x) or '虚拟卡'

def vcc_group(rows):
    # 虚拟银行卡（ken 2026-11-05）：聚合类目 vcc 为主信号；类目没标的靠标题认
    # （含「虚拟卡」，或含「0刀卡」且不是让买家自己绑卡的别的商品链接）。
    # 剔除实体卡、接码、教程、测试/虚假商品与充值卡/礼品卡类。
    out = []
    for o in rows:
        t = o['title']; c = o.get('category', '')
        by_cat = c == 'vcc'
        by_title = has(t, '虚拟卡') or (has(t, '0刀卡') and not has(t, '绑卡', '绑定'))
        if not (by_cat or by_title):
            continue
        if has(t, '实体卡', '接码', '接马', '短信', '教程', '方法', '测试商品', '虚假',
               '充值卡', '礼品卡', '兑换卡'):
            continue
        if not has(t, '卡', 'visa', 'Visa', 'VISA', 'vasa', 'master', 'Master', '万事达'):
            continue
        out.append(o)
    return out

def top30(rows, kind, limit=30):
    merged = {}
    srcs = {}
    for o in rows:
        if o['price'] is None or o['price'] <= 0:
            continue
        if o['stock'] is not None and (o['stock'] <= 0 or o['stock'] > 1000000):
            continue  # 缺货，或库存为无限占位数（数据噪声）
        k = norm_title(o['title'])
        srcs.setdefault(k, []).append(dict(price=o['price'], shop=o['shop'],
                                           platform=o['platform'], stock=o['stock'],
                                           url=o['url']))
        cur = merged.get(k)
        if cur is None:
            merged[k] = dict(o, same_source=o.get('same_source', 1))
        else:
            cur['same_source'] += o.get('same_source', 1)
            if o['price'] < cur['price']:
                keep = cur['same_source']
                merged[k] = dict(o, same_source=keep)
    out = sorted(merged.values(), key=lambda x: x['price'])[:limit]
    for o in out:
        o['kind'] = kind(o.get('ctitle') or o['title']) if kind else ''
        seen, lst = set(), []
        for s in sorted(srcs.get(norm_title(o['title']), []), key=lambda x: x['price']):
            u = s['url'].split('?')[0]
            if u in seen:
                continue
            seen.add(u)
            lst.append(s)
            if len(lst) >= 80:
                break
        o['sources'] = lst
    return out

def slim(rows):
    out = []
    for o in rows:
        d = dict(price=o['price'], shop=o['shop'], platform=o['platform'],
                 stock=o['stock'], title=o['title'], url=o['url'],
                 kind=o.get('kind', ''), same_source=o.get('same_source', 1))
        src = o.get('sources') or []
        if len(src) > 1:
            d['sources'] = src
        out.append(d)
    return out

def main():
    all_offers = {}
    for name, url in (('aiprice', 'https://aiprice.club/api/shop-products.json'),
                      ('cardnav', 'https://cardnav.xyz/api/shop-products.json')):
        try:
            rows = load_shop_products(url)
            print(f'{name}: {len(rows)} products', file=sys.stderr)
            for o in rows:
                _b, _s = split_spec(o['title'])
                key = (urllib.parse.unquote(o['url'].split('?')[0]), norm_title(_s))
                cur = all_offers.get(key)
                if cur is None or (o['ts'] or 0) > (cur['ts'] or 0):
                    o['url'] = o['url'].split('?')[0]
                    all_offers[key] = o
        except Exception as e:
            print(f'{name} failed: {e}', file=sys.stderr)
    # 定点剔除（ken 2026-11-02 裁定）：异次元店铺 ¥1.85 为引流价（单源、库存未显示），从看板剔除
    BLOCKED_URLS = {'https://fk.rupap.cn/item/10'}
    rows = [o for o in list(all_offers.values()) if o['url'].split('?')[0] not in BLOCKED_URLS]
    print(f'merged unique products: {len(rows)}', file=sys.stderr)

    pai = []
    for slug in ('chatgpt-plus', 'gemini-pro-year', 'gemini-ultra',
                 'openai-phone-verification', 'super-grok-heavy'):
        r = fetch_priceai(slug)
        print(f'priceai {slug}: {len(r)} rows', file=sys.stderr)
        pai += [o for o in r if o['url'] not in BLOCKED_URLS]

    _full_rows = list(rows)  # prepare 前的全量原始行（价格日志全量维护用）
    _full_pai = list(pai)
    rows = prepare_offers(rows)
    pai = prepare_offers(pai)
    g1, g2, g3 = gpt_groups(rows + [o for o in pai if o['url']])
    # PriceAI 的 GPT 行 category 为空，已在 gpt_groups 内按标题判断；其余分组同理合并
    g4, g5 = ag_groups(rows + pai)
    g6 = codex_group(rows) + [o for o in pai if has(o['title'], 'odex', 'penAI') and not has(o['title'], '邮箱', 'PayPal', '平台')]
    g7 = grok_group(rows) + [o for o in pai if grok_marker(o['title']) and has(o['title'], 'Heavy', 'HEAVY', 'Ultra', 'ULTRA') and not has(o['title'], '号池', '额度', '速刷')]

    groups = [
        dict(id='gpt-unbound', name='GPT 日抛/Plus 成品号 — 未接马', items=slim(top30(g1, None, 45))),
        dict(id='gpt-bound', name='GPT 日抛/Plus 成品号 — 已接马', items=slim(top30(g2, None, 45))),
        dict(id='gpt-weekly', name='GPT 周限号', items=slim(top30(g3, lambda t: '已接马' if is_bound(t) else ('未接马' if has(t, '未接马', '未绑定') else '未注明'), 45))),
        dict(id='ag-cheapest', name='Antigravity 反重力 — 最便宜', items=slim(top30(g4, ag_type, 45))),
        dict(id='ag-verified', name='Antigravity 反重力 — 已过验证成品号', items=slim(top30(g5, ag_type, 45))),
        dict(id='codex-sms', name='Codex 接码 — 单次', items=slim(top30(g6, None, 45))),
        dict(id='grok-heavy', name='Grok Heavy（SuperGrok Heavy/Ultra）', items=slim(top30(g7, lambda t: '代充' if has(t, '代充', '直充') else '成品号', 45))),
        dict(id='claude', name='Claude — 最便宜', items=slim(top30(claude_group(rows + pai), claude_kind, 45))),
        dict(id='muse', name='Muse — 最便宜', items=slim(top30(muse_group(rows + pai), muse_kind, 45))),
        dict(id='vcc', name='虚拟卡 — 最便宜', items=slim(top30(vcc_group(rows + pai), vcc_kind, 45))),
    ]
    from datetime import datetime, timezone, timedelta
    bj_now = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
    board = dict(updated_at=bj_now,
                 source='AI价网 + cardnav + PriceAI 按商家遍历合并',
                 groups=groups)
    # 详情页库存核验（ken 2026-11-02）：能读到详情页实时库存的平台逐条核验，
    # 详情页库存为 0 / 已售罄的剔除，读到的实时库存同时回填展示；
    # 读不到的平台（wzyp 被阿里云验证挡、catfk 连不上、/products/ 系 JS 空壳）不在此列，只能靠聚合库库存。
    def detail_stock(it):
        url = it['url']
        try:
            if '16688.com.cn' in url:
                m = re.search(r'/goods/(G\d+)', url)
                if not m:
                    return None
                req = urllib.request.Request(
                    'https://www.16688.com.cn/shopApi/goods/detail',
                    data=json.dumps({'goods_no': m.group(1)}).encode(),
                    headers={**HEADERS, 'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=20) as r:
                    d = json.loads(r.read().decode('utf-8', 'ignore'))
                q = (d.get('data') or {}).get('stock_available_quantity')
                return int(q) if isinstance(q, (int, float)) else None
            if 'aicdks.com' in url or '/item/' in url:
                txt = strip_tags(fetch(url, retries=0).decode('utf-8', 'ignore'))
                if '售罄' in txt or '已售完' in txt:
                    return 0
                km = re.search(r'库存\s*[:：]?\s*(\d+)', txt)
                return int(km.group(1)) if km else None
        except Exception:
            return None
        return None

    def verify_detail_stock(items):
        # 候选池为每组前 45 条：并发核验（单条慢不阻塞整体），剔除售罄后回填截断到 30 条
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=12) as ex:
            stocks = list(ex.map(detail_stock, items))
        kept = []
        for it, st in zip(items, stocks):
            if st == 0:
                print(f'soldout-drop: {it["url"]}', file=sys.stderr)
                continue
            if st is not None:
                it['stock'] = st
            kept.append(it)
        return kept[:30]
    for g in groups:
        g['items'] = verify_detail_stock(g['items'])

    # 防覆盖保险（ken 2026-11-02）：新数据总条数不足上一版一半时，判定上游大面积失败，
    # 直接报错退出、不覆盖旧 board.json，网站保持上一版好数据。
    new_total = sum(len(g['items']) for g in groups)
    board_path = os.path.join(DATA, 'board.json')
    if os.path.exists(board_path):
        try:
            with open(board_path, encoding='utf-8') as f:
                old_total = sum(len(g.get('items', [])) for g in json.load(f).get('groups', []))
        except Exception:
            old_total = 0
        if old_total > 0 and new_total < old_total * 0.5:
            print(f'GUARD: new total {new_total} < 50% of previous {old_total}; refusing to overwrite board.json', file=sys.stderr)
            sys.exit(1)
    # 价格变动日志（ken 2026-11-04 定版，2026-11-05 改定全量入库）：时间戳错位增量
    # 编码——每件商品只存首条 [完整时间戳(epoch 分钟), 首价]，之后每次变价只追加
    # [距上次分钟数, 新价]，价格不变不追加。维护对象是两家聚合库合并去重后的全部
    # 商品（prepare 前的原始行，含库存 0 的失效件与没进任何分组的品类）+ PriceAI
    # 补充行，不再只是 8 个分组的候选；表只增不删，商品掉出全量库记录保留、回来
    # 接着记。board 的 pc 只做派生：记录出现第 2 个价位点（真变价）才标，pc 为
    # 最近一次变价日期（北京时间）。
    # 比对算法（单遍哈希直查，全程线性）：本轮全量先一次性建成 key->价 的 dict，
    # 旧表本身也是 dict，每件商品一次 O(1) 查表比对，没有两两比对。精确键 =
    # 链接（去参数）+ 归一标题；精确未命中时走同链接兜底：同链接只有一条旧记录、
    # 或多规格里规格后缀能唯一对上时，认定同一商品（卖家改了标题），把旧记录改名
    # 到新键续记（改名不断历史），对不上才新建账；被认领的旧键本轮不再二次认领。
    try:
        import time as _time
        from datetime import datetime as _dt, timezone as _tz, timedelta as _td
        _t0 = _time.time()
        _bj = _tz(_td(hours=8))
        _now = _dt.now(_bj)
        _now_min = int(_now.timestamp() // 60)
        _log_path = os.path.join(DATA, 'price-log.json')
        try:
            with open(_log_path, encoding='utf-8') as f:
                _log = json.load(f).get('items', {})
        except Exception:
            _log = {}
        _pool = {}
        _spec_of = {}
        for _o in _full_rows + _full_pai:
            if _o['price'] is None or _o['price'] <= 0:
                continue
            _k = _o['url'].split('?')[0] + '|' + norm_title(_o['title'])
            _pool[_k] = _o['price']
            _spec_of[_k] = norm_title(split_spec(_o['title'])[1])
        _by_url = {}
        for _k in _log:
            _by_url.setdefault(_k.split('|', 1)[0], []).append(_k)
        _claimed = set()
        _n_new = _n_chg = _n_ren = 0
        _default_spec = norm_title('默认规格')
        for _key, _price in _pool.items():
            _rec = _log.get(_key)
            if _rec is not None:
                _claimed.add(_key)
            else:
                _url, _ntitle = _key.split('|', 1)
                _cands = [c for c in _by_url.get(_url, []) if c not in _claimed]
                _hit = None
                if len(_cands) == 1:
                    _hit = _cands[0]
                elif len(_cands) > 1:
                    _spec = _spec_of.get(_key) or ''
                    if _spec and _spec != _default_spec and len(_spec) >= 2:
                        _m = [c for c in _cands if c.split('|', 1)[1].endswith(_spec)]
                        if len(_m) == 1:
                            _hit = _m[0]
                if _hit is not None:
                    _log[_key] = _log.pop(_hit)
                    _claimed.add(_hit)
                    _claimed.add(_key)
                    _rec = _log[_key]
                    _n_ren += 1
                else:
                    # 首次出现只建账，不算变价（ken 2026-11-04：真的变了才显示变价）
                    _log[_key] = [_now_min, _price]
                    _n_new += 1
                    continue
            if _price != _rec[-1]:
                _last_ts = _rec[0] + sum(_rec[2::2])
                _delta = _now_min - _last_ts
                _rec += [_delta if _delta > 0 else 0, _price]
                _n_chg += 1
        for g in groups:
            for it in g['items']:
                _rec = _log.get(it['url'].split('?')[0] + '|' + norm_title(it['title']))
                if _rec and len(_rec) > 2:
                    _last_ts = _rec[0] + sum(_rec[2::2])
                    it['pc'] = _dt.fromtimestamp(_last_ts * 60, _bj).strftime('%Y-%m-%d')
        with open(_log_path, 'w', encoding='utf-8') as f:
            json.dump(dict(v=1, items=_log), f, ensure_ascii=False, separators=(',', ':'))
        print(f'price-log: {len(_log)} keys (pool {len(_pool)}, new {_n_new}, renamed {_n_ren}, changed {_n_chg}, {int((_time.time() - _t0) * 1000)}ms)', file=sys.stderr)
        # 前端弹窗专用小表（ken 2026-11-05）：只含当前 board 条目的价格记录，
        # 页面点「价格变动」只拉这份（约 230 条、几十 KB），不拉全量 price-log
        # （8 万多条、约 10MB，手机上打开弹窗要等很久）。全量表只做后台维护。
        _sub = {}
        for g in groups:
            for it in g['items']:
                _k = it['url'].split('?')[0] + '|' + norm_title(it['title'])
                _rec = _log.get(_k)
                if _rec:
                    _sub[_k] = _rec
        with open(os.path.join(DATA, 'board-prices.json'), 'w', encoding='utf-8') as f:
            json.dump(dict(v=1, items=_sub), f, ensure_ascii=False, separators=(',', ':'))
        print(f'board-prices: {len(_sub)} keys', file=sys.stderr)
    except Exception as e:
        print(f'price-log skipped: {e}', file=sys.stderr)
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, 'board.json'), 'w', encoding='utf-8') as f:
        json.dump(board, f, ensure_ascii=False, indent=1)

    # 把最新报价内嵌进 index.html：页面一打开就渲染价格/库存，不必等 board.json 下载（ken 2026-11-02「立马就给出」）。
    # 只替换 INLINE-BOARD 标记之间的内容，其余页面内容不动；失败不影响 board.json 已落盘的结果。
    try:
        index_path = os.path.join(BASE, 'index.html')
        with open(index_path, encoding='utf-8') as f:
            page = f.read()
        inline_json = json.dumps(board, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
        block = '<!--INLINE-BOARD-START--><script>window.INLINE_BOARD=' + inline_json + ';</script><!--INLINE-BOARD-END-->'
        new_page, n = re.subn(r'<!--INLINE-BOARD-START-->.*?<!--INLINE-BOARD-END-->', lambda m: block, page, flags=re.S)
        if n == 0:
            i = page.rfind('<script>')
            new_page = (page[:i] + block + '\n' + page[i:]) if i >= 0 else page
        if new_page != page:
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(new_page)
            print('inline board injected into index.html', file=sys.stderr)
    except Exception as e:
        print(f'inline inject skipped: {e}', file=sys.stderr)
    print('leaders:', [(g['name'][:12], g['items'][0]['price'] if g['items'] else None) for g in groups], file=sys.stderr)

    csv_path = os.path.join(DATA, 'shops.csv')
    if os.path.exists(csv_path):
        srows = list(csv.DictReader(io.open(csv_path, encoding='utf-8')))
        best = {}
        for r in srows:
            if '失效' in (r.get('note') or ''):
                continue
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
