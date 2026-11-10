#!/usr/bin/env python3
"""AI账号商铺 · 数据刷新 v2（纯代码，零依赖）

方法（按商家遍历，不再只看聚合分类榜单页）：
- AI价网全量商家商品库 aiprice.club/api/shop-products.json（2052 家店、每店全部分类与全部商品）
- cardnav 同格式全量库 cardnav.xyz/api/shop-products.json（966 家店）
两库按商品链接去重合并；再用 PriceAI 商品页（按价升序前 12 条）补最低价段。
随后按固定 7 分组（ken 2026-10-31 拍板）用标题规则分类，取有货最低 30 条，
同标题铺货合并只取最低。链接均为商品详情页。
店铺目录由 data/shops.csv 转 data/shops.json（独立文件，不进映射表）。

用法：python3 scripts/refresh.py
产出：data/board.json（含 prices 价格史段）、data/shops.json、data/maps.json（仅平台映射）、data/price-log.json
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

def gpt_groups(rows):
    g1, g2, g3 = [], [], []
    for o in rows:
        t = o.get('ctitle') or o['title']
        low = t.lower()
        # 不再用聚合站的分类做准入否决（2026-11-06 ken 质疑后审计）：AI价网把「已接马 Plus 成品号」
        # 归进 phone-verification 类，旧的分类白名单把 ¥14.8/¥15.29 的真货整批挡在门外；
        # 分类只作参考，分组一律以标题口径为准，误入的杂品靠下面的标题排除词挡
        if 'plus' not in low:
            continue
        if 'free' in low:
            continue  # Free 普号不是 Plus 成品号
        if has(t, 'Team', 'TEAM', 'team', '席位', '教程', '资格', '学生优惠',
               '不含plus', '不含Plus', '非plus', '非Plus', '普通账号', '送plus', '送Plus',
               'Gemini', 'gemini', 'TextPlus', 'textplus', '非成品号',
               'Notion', 'notion', 'Facebook', 'facebook', '共享', '镜像', '非会员', '有限使用'):
            continue  # Gemini/TextPlus 不是 GPT Plus；「非成品号」是激活链接类、不是成品号；
            # Notion/Facebook 是别家产品（plus 来自其产品名/邮箱域名）；共享/镜像不是独享成品号；
            # 「非会员」「有限使用Plus」是免费号蹭 Plus 功能
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
        spec = o.get('spec') or ''
        full = t + ' ' + spec
        # 权重第一（ken 2026-11-06）：标题/规格带成品号/普号的是账号商品，永远不进接码组，
        # 哪怕同时带 Codex 字样；标题明说不适用 Codex 的（如「除Codex」）同样不进
        if has(full, '成品号', '成品账号', '普号'):
            continue
        if has(full, '除Codex', '除codex', '非Codex', '不支持codex', '不支持Codex'):
            continue
        if o['category'] and o['category'] not in ('phone-verification',):
            continue
        if not has(t, 'odex', 'penAI', 'penai', 'GPT', 'gpt'):
            continue
        # 权重第二：必须有接码类信号才算接码服务；卖家常用分隔符与谐音字规避
        # （接-码、接🐎），先把标题压平再查。「已接马/已接码」是账号状态不是服务，
        # 查信号前先摘掉，只剩它一个信号的账号商品进不来
        flat = re.sub(r'[\s\-—|/·•]+', '', full).replace('已接马', '').replace('已接码', '')
        if not has(flat, '接码', '接马', '接🐎', '短信', '验证码', '收码', '号码', '手机验证'):
            continue
        if has(t, '邮箱', 'PayPal', 'paypal', '平台', '谷歌账号', 'Gmail', 'gmail'):
            continue
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
        # 标题明写起购量的兜底标注（链动等无结构化字段的平台）：如「10个起购」「5件起批」
        if not o.get('minq'):
            mq = re.search(r'(\d+)\s*[个件份]\s*起[购买批售]', o['title'])
            if mq and int(mq.group(1)) > 1:
                o['minq'] = int(mq.group(1))
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
               '充值卡', '礼品卡', '兑换卡', '渠道推荐', '渠道介绍'):
            continue  # 渠道推荐/介绍 = 只卖引流介绍、真卡另付费（ken 2026-11-06 同族剔除）
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
        if o.get('minq') and o['minq'] <= 1000:
            d['minq'] = o['minq']  # 起购量（>1 才有）：价格是单价，但必须买满 minq 个；>1000 视为卖家乱填的假值（如 9999）丢弃
        src = o.get('sources') or []
        if len(src) > 1:
            d['sources'] = src
        out.append(d)
    return out

# ---------------- 16688 直拉（ken 2026-11-05 拍板接入） ----------------
# 店铺 1 对多商品：按店铺目录里的 16688 店逐家调 goods/list 拉全目录，
# 价格/标题用一手数据覆盖聚合库同链接条目，聚合没收的商品一并补进池；
# 库存列表接口偶有 -1 占位，无效时回退用聚合库存，详情现核照旧兜底。
# 接口慢（实测约 20 秒/店），单轮拉不完 543 家：结果存 data/direct16688.json 缓存，
# 每轮从最旧的店开始滚动更新，缓存 5 小时内有效、且不比聚合快照旧太多才覆盖，
# 接口整体故障时缓存自然过期失效、回退纯聚合，不让单点故障拖垮刷新。
DIRECT_16688_BUDGET = 420            # 单轮直拉总预算（秒，与聚合抓取并行）
DIRECT_16688_MAX_AGE = 5 * 3600      # 缓存可用年龄上限（秒）
DIRECT_16688_PRUNE_AGE = 24 * 3600   # 缓存文件保留上限（秒）

def load_direct_cache():
    try:
        with open(os.path.join(DATA, 'direct16688.json'), encoding='utf-8') as f:
            return json.load(f).get('items') or {}
    except Exception:
        return {}

def post_json(url, payload, timeout=40, retries=1):
    last = None
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'),
                                         headers={**HEADERS, 'Content-Type': 'application/json'},
                                         method='POST')
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'post failed {url}: {last}')

def fetch_16688_shop(code, name):
    items, seen = [], set()
    for page in range(1, 6):
        d = post_json('https://www.16688.com.cn/shopApi/goods/list',
                      {'shop_no': code, 'page_num': page, 'page_size': 200,
                       'goods_category_no': '', 'keyword': ''}, timeout=30, retries=0)
        lst = ((d or {}).get('data') or {}).get('list') or []
        if not lst:
            break
        new = 0
        for it in lst:
            gno = it.get('goods_no')
            if not gno or gno in seen:
                continue
            seen.add(gno)
            price = it.get('price')
            if price is None or float(price) <= 0 or not it.get('name'):
                continue
            stock = it.get('stock_available_quantity')
            lq = it.get('limit_quantity')
            items.append(dict(title=it['name'].strip(), price=float(price),
                              stock=stock if isinstance(stock, int) and stock >= 0 else None,
                              shop=name, platform='16688',
                              url=f'https://www.16688.com.cn/goods/{gno}',
                              category='', ts=int(time.time() * 1000),
                              minq=lq if isinstance(lq, int) and lq > 1 else None))
            new += 1
        if new == 0:
            break
    return items

def fetch_16688_direct(deadline):
    """从缓存最旧（或从未拉过）的店开始拉，deadline 到点即停；返回 (本轮新拉 {url: row}, 完成店数)。"""
    csv_path = os.path.join(DATA, 'shops.csv')
    shops = []
    if os.path.exists(csv_path):
        for r in csv.DictReader(io.open(csv_path, encoding='utf-8')):
            if r.get('platform') == '16688' and r.get('shop_code') and '失效' not in (r.get('note') or ''):
                shops.append((r['shop_code'], r['shop_name']))
    if not shops:
        return {}, 0
    cache = load_direct_cache()
    shop_age = {}
    for o in cache.values():
        if o.get('shop'):
            shop_age[o['shop']] = max(shop_age.get(o['shop'], 0), o.get('ts') or 0)
    shops.sort(key=lambda sn: shop_age.get(sn[1], 0))  # 没拉过的 ts=0 最优先，其次最旧的
    from concurrent.futures import ThreadPoolExecutor, as_completed
    out, ok = {}, 0
    ex = ThreadPoolExecutor(max_workers=12)
    futs = [ex.submit(fetch_16688_shop, code, name) for code, name in shops]
    try:
        for fut in as_completed(futs, timeout=max(1, deadline - time.time())):
            try:
                items = fut.result()
                ok += 1
                for o in items:
                    out[o['url']] = o
            except Exception:
                pass
    except Exception:
        pass
    ex.shutdown(wait=False, cancel_futures=True)
    return out, ok

# ---------------- 平台映射：短码 <-> 链接前缀（ken 2026-11-10 定版，双向一等） ----------------
# 映射本体只存一份：data/maps.json 的 platforms{短码: {name, goods[], shop}}，本表只是种子，
# 运行期以 maps 为准。表里只收多卖家聚合平台（现 4 家：wzyp=链动小铺、16688、catfk=云猫寄售、
# aicdks），以后真出现新的多卖家平台才人工加；个人店铺/自建站一律不进表——它们的记录键
# 不做变换、保持整链接本身（仅 www 归一）。平台记录键 =「短码:商品ID」，靠 goods 前缀拼回
# 整链接；反向：任给平台整链接（商品/店铺入口都算）按 goods/shop 前缀最长匹配回短码。
# 主机名归一：www. 与无 www 视为同一前缀。
PLATFORM_PREFIXES = {
    '16688': dict(name='16688', goods=['https://16688.com.cn/goods/'], shop='https://16688.com.cn/shop/'),
    'wzyp': dict(name='链动小铺', goods=['https://wzyp.cn/item/'], shop='https://wzyp.cn/shop/'),
    'catfk': dict(name='云猫寄售', goods=['https://catfk.com/item/'], shop=None),
    'aicdks': dict(name='aicdks', goods=['https://aicdks.com/product/'], shop=None),
}

def _norm_url(u):
    return re.sub(r'^(https?://)www\.', r'\1', str(u).split('?')[0])

def _split_prefix(u):
    u = _norm_url(u)
    i = u.rfind('/')
    return (u[:i + 1], u[i + 1:]) if i >= 0 else (u, '')

def _points(rec):
    return (len(rec) + 2) // 3

def _src_prio(c):
    return '123'.find(c)

def _merge_records(recs):
    """同链接多条旧记录（v1/v2 差分对格式）合并为一条三元记录：价格点解码成绝对时间、
    排序、同刻取最后一个价、折叠相邻同价点，再按三元差分格式重编码（每点带来源码，
    旧记录无法回溯来源、一律回填 1；与上一轮 www 合并同法则）。"""
    pts = []
    for rec in recs:
        ts = rec[0]
        pts.append((ts, rec[1]))
        for i in range(2, len(rec), 2):
            ts += rec[i]
            pts.append((ts, rec[i + 1]))
    pts.sort(key=lambda x: x[0])
    out = []
    for ts, p in pts:
        if out and out[-1][0] == ts:
            out[-1] = (ts, p)
        elif out and out[-1][1] == p:
            continue
        else:
            out.append((ts, p))
    rec = [out[0][0], out[0][1], 1]
    for i in range(1, len(out)):
        rec += [out[i][0] - out[i - 1][0], out[i][1], 1]
    return rec

def _merge_src_v3(items, src):
    """过渡形态兜底：v3 平行 src 字典（items 差分对 + src 串）在内存里并入三元数组，
    与正式三元格式逐点等价；落盘只写三元，不再写 src 字典。"""
    out = {}
    for k, rec in items.items():
        s = src.get(k) or ''
        n = (len(rec) + 1) // 2
        if len(s) != n:
            s = '1' * n
        tri = [rec[0], rec[1], int(s[0])]
        ts = rec[0]
        for i in range(2, len(rec), 2):
            ts += rec[i]
            tri += [rec[i], rec[i + 1], int(s[i // 2])]
        out[k] = tri
    return out

def _norm_map(url):
    """平台映射专用归一（与参考实现 mapping-fn 一致）：去参数；主机去掉开头 www.。"""
    u = urllib.parse.urlsplit(str(url).split('?')[0])
    net = u.netloc[4:] if u.netloc.startswith('www.') else u.netloc
    return urllib.parse.urlunsplit((u.scheme, net, u.path, '', ''))

class PlatformMap:
    """平台映射双向表（语义与 mapping-fn/映射函数.py 参考实现一致，ken 2026-11-10 收紧）：
    platforms{短码: {name, goods[], shop}} 为权威数据（存 maps.json），只含多卖家聚合平台。
    encode(整链接)：命中平台 goods 前缀（最长匹配）->「短码:剩余段」；未命中（个人店铺/
    自建站）-> 归一后的整链接本身即键，不查表、不变换。decode(键)：键头是平台短码 ->
    查表拼回整链接；否则键本身就是整链接、原样返回。platform_of(店铺链接) -> (短码, 店铺码)，
    平台商品链接 -> (短码, None)，非平台链接 -> (None, None)；shop_url(短码, 店铺码) ->
    店铺入口链接。多 goods 前缀的平台剩余段保留完整路径段。"""
    def __init__(self, platforms=None):
        if platforms:
            self.platforms = {str(c): dict(name=(e or {}).get('name', str(c)),
                                            goods=list((e or {}).get('goods') or []),
                                            shop=(e or {}).get('shop'))
                               for c, e in platforms.items()}
        else:
            self.platforms = {c: dict(name=e['name'], goods=list(e['goods']), shop=e['shop'])
                              for c, e in PLATFORM_PREFIXES.items()}
        self._goods_idx = []
        self._shop_idx = []
        for code, ent in self.platforms.items():
            for g in ent.get('goods') or []:
                self._goods_idx.append((_norm_map(g), code))
            if ent.get('shop'):
                self._shop_idx.append((_norm_map(ent['shop']), code))
        self._goods_idx.sort(key=lambda x: -len(x[0]))
        self._shop_idx.sort(key=lambda x: -len(x[0]))
    def encode(self, url):
        u = _norm_map(url)
        for pre, code in self._goods_idx:
            if u.startswith(pre):
                ent = self.platforms[code]
                if len(ent.get('goods') or []) > 1:
                    p = urllib.parse.urlsplit(u)
                    return f"{code}:{p.path.lstrip('/')}"
                return f"{code}:{u[len(pre):]}"
        return u
    def platform_of(self, url):
        u = _norm_map(url)
        for pre, code in self._shop_idx:
            if u.startswith(pre):
                return code, u[len(pre):].strip('/')
        for pre, code in self._goods_idx:
            if u.startswith(pre):
                return code, None
        return None, None
    def decode(self, key):
        code, sep, rest = str(key).partition(':')
        ent = self.platforms.get(code) if sep else None
        if ent is None:
            return key
        goods = ent.get('goods') or []
        if len(goods) > 1:
            p = urllib.parse.urlsplit(_norm_map(goods[0]))
            return f"{p.scheme}://{p.netloc}/{rest}"
        return _norm_map(goods[0]) + rest
    def shop_url(self, code, shop_code):
        return _norm_map(self.platforms[code]['shop']) + shop_code

def platforms_from_prefixes(pfx_map):
    """旧 v2 文件内嵌的数字 pfx 表 -> 平台映射（兜底迁移用）：只取种子 4 家平台的
    goods 前缀建表，其余前缀的记录在重编码时自然落回整链接键。"""
    platforms = {c: dict(name=e['name'], goods=[], shop=e['shop'])
                 for c, e in PLATFORM_PREFIXES.items()}
    seed_goods = {g: c for c, e in PLATFORM_PREFIXES.items() for g in e['goods']}
    for p in pfx_map.values():
        c = seed_goods.get(p)
        if c and p not in platforms[c]['goods']:
            platforms[c]['goods'].append(p)
    for c, ent in platforms.items():
        if not ent['goods']:
            ent['goods'] = list(PLATFORM_PREFIXES[c]['goods'])
    return PlatformMap(platforms)

def apply_pool_round(log, pool, pool_src, ovr_pool, now_min):
    """把本轮全量池价并入历史表（原地更新 log），返回 (new, changed, overridden)。
    记录为三元交错差分数组 [首时刻, 首价, 首来源, 间隔, 新价, 新来源, …]，每个价格点
    带来源码：1=脚本抓（聚合/PriceAI/接口）、2=浏览器抓（browser-pool 植入）、3=人工
    补充（overrides 植入）。变价追加一点（三元一组）；植入价就地覆盖脚本最后一点时
    改写价格与来源码、不新增点（不产生假涨跌）；同价时一手价更新鲜且优先级更高才
    就地升级最后一点来源码（不加点）；价格不变不追加。ovr_pool: {键: (价, 植入时刻
    分钟, 来源码)}；pool_src: {键: 本轮池价来源码}，缺省 '1'；同轮多来源命中以写入
    顺序 3>2>1 为准。"""
    n_new = n_chg = n_ovr = 0
    for key, price in pool.items():
        sc = int(pool_src.get(key, '1'))
        rec = log.get(key)
        if rec is None:
            log[key] = [now_min, price, sc]
            n_new += 1
            continue
        last_ts = rec[0] + sum(rec[3::3])
        ov = ovr_pool.get(key)
        if price != rec[-2]:
            if ov and last_ts <= ov[1]:
                rec[-2] = price
                rec[-1] = int(ov[2])
                n_ovr += 1
            else:
                delta = now_min - last_ts
                rec += [delta if delta > 0 else 0, price, sc]
                n_chg += 1
        elif ov and last_ts <= ov[1] and _src_prio(ov[2]) > _src_prio(str(rec[-1])):
            rec[-1] = int(ov[2])
    return n_new, n_chg, n_ovr

def main():
    # 16688 直拉放后台线程，与聚合抓取并行，合并时再收结果（预算见 DIRECT_16688_BUDGET）
    import threading
    _t0 = time.time()
    _direct_box = {}
    def _crawl():
        try:
            _direct_box['r'] = fetch_16688_direct(_t0 + DIRECT_16688_BUDGET)
        except Exception as e:
            _direct_box['e'] = e
    _crawl_thread = threading.Thread(target=_crawl, daemon=True)
    _crawl_thread.start()
    all_offers = {}
    for name, url in (('aiprice', 'https://aiprice.club/api/shop-products.json'),
                      ('cardnav', 'https://cardnav.xyz/api/shop-products.json')):
        try:
            rows = load_shop_products(url)
            print(f'{name}: {len(rows)} products', file=sys.stderr)
            for o in rows:
                key = urllib.parse.unquote(o['url'].split('?')[0])
                cur = all_offers.get(key)
                if cur is None or (o['ts'] or 0) > (cur['ts'] or 0):
                    o['url'] = o['url'].split('?')[0]
                    all_offers[key] = o
        except Exception as e:
            print(f'{name} failed: {e}', file=sys.stderr)
    # 16688 直拉覆盖（ken 2026-11-05）：本轮新拉先并入缓存，再用可用缓存覆盖聚合——
    # 同链接以一手价为准（但缓存比聚合快照旧 30 分钟以上的不覆盖），库存直拉无效时保留聚合值
    try:
        _crawl_thread.join(timeout=max(1, _t0 + DIRECT_16688_BUDGET - time.time()))
        if 'e' in _direct_box:
            print(f"16688 crawl error: {_direct_box['e']}", file=sys.stderr)
        fresh, ok_shops = _direct_box.get('r', ({}, 0))
        now_ms = int(time.time() * 1000)
        cache = load_direct_cache()
        for url, o in fresh.items():
            cache[url] = o
        cache = {u: o for u, o in cache.items()
                 if now_ms - (o.get('ts') or 0) <= DIRECT_16688_PRUNE_AGE * 1000}
        with open(os.path.join(DATA, 'direct16688.json'), 'w', encoding='utf-8') as f:
            json.dump(dict(items=cache), f, ensure_ascii=False)
        usable = {u: o for u, o in cache.items()
                  if now_ms - (o.get('ts') or 0) <= DIRECT_16688_MAX_AGE * 1000}
        applied = 0
        for url, drow0 in usable.items():
            keys = [url] if url in all_offers else []
            agg_ts = max([(all_offers[k].get('ts') or 0) for k in keys], default=0)
            if keys and (drow0.get('ts') or 0) < agg_ts - 1800_000:
                continue  # 缓存明显比聚合快照旧，不拿旧一手价压新快照
            old_stock = None
            for k in keys:
                if all_offers[k].get('stock') is not None:
                    old_stock = all_offers[k]['stock']
                del all_offers[k]
            drow = dict(drow0)
            if drow.get('stock') is None:
                drow['stock'] = old_stock
            all_offers[url] = drow
            applied += 1
        print(f'16688 direct: {len(fresh)} fresh from {ok_shops} shops, {applied} applied from cache', file=sys.stderr)
    except Exception as e:
        print(f'16688 direct failed: {e}', file=sys.stderr)
    # 定点剔除（ken 2026-11-02 裁定）：异次元店铺 ¥1.85 为引流价（单源、库存未显示），从看板剔除
    # G47831683（ken 2026-11-05 裁定）：¥0.02 只卖渠道介绍、真卡人工发货 12–35 元，同为引流品剔除
    BLOCKED_URLS = {'https://fk.rupap.cn/item/10',
                    'https://www.16688.com.cn/goods/G47831683'}
    rows = [o for o in list(all_offers.values()) if o['url'].split('?')[0] not in BLOCKED_URLS]
    print(f'merged unique products: {len(rows)}', file=sys.stderr)
    _pool_rows = list(rows)  # 价格日志全量池用门前全量（僵尸条目只增不删、继续跟踪）
    # 快照新鲜度门（ken 2026-11-06）：最新快照超过 48 小时的条目不进看板——价格/库存都可能已变。
    # 背景：AI价网对链动小铺的快照自 2026-10 月底冻结，2 万多条只有它收录的链动商品全是旧价旧库存，
    # 出现过看板 ¥9.9、点开实价 ¥28.33 的错价（ken 2026-11-06 录屏指出）。无时间戳的行（PriceAI 等）不受此限。
    _now_ms = int(time.time() * 1000)
    # 脚本二覆盖记录（ken 2026-11-06 定版：脚本一先跑出暂定价，脚本二去详情拿一手价、
    # 以它为准覆盖）：data/overrides.json 由详情现核（链动浏览器现核等）写入，
    # {url: {price, stock, minq, t(epoch ms)}}；72 小时内的覆盖有效，过期不用，
    # 免得覆盖本身变僵尸。脚本一每轮读它：被覆盖的商品以一手价为准（见下方应用与价格日志覆盖）。
    _overrides = {}
    try:
        with open(os.path.join(DATA, 'overrides.json'), encoding='utf-8') as f:
            for _u, _v in json.load(f).items():
                if isinstance(_v, dict) and _v.get('t') and _now_ms - _v['t'] <= 72 * 3600 * 1000:
                    _overrides[_u.split('?')[0]] = _v
    except Exception:
        _overrides = {}
    _kept, _stale = [], 0
    for o in rows:
        if o.get('ts') and _now_ms - o['ts'] > 48 * 3600 * 1000:
            if o['url'].split('?')[0] not in _overrides:
                _stale += 1
                continue
            # 有新鲜的一手覆盖时以脚本二为准，不被快照新鲜度门拦下
        _kept.append(o)
    rows = _kept
    print(f'stale-gate: dropped {_stale} zombie offers (>48h)', file=sys.stderr)
    # 应用脚本二覆盖到看板候选：同一链接只有一行时才动（多规格共链接的价格不可归属，不碰）
    if _overrides:
        _url_n = {}
        for o in rows:
            _url_n[o['url'].split('?')[0]] = _url_n.get(o['url'].split('?')[0], 0) + 1
        _ov_p = _ov_s = 0
        _rows2 = []
        for o in rows:
            _ov = _overrides.get(o['url'].split('?')[0])
            if _ov and _url_n[o['url'].split('?')[0]] == 1:
                if _ov.get('stock') == 0:
                    _ov_s += 1
                    continue  # 脚本二现核售罄：不进看板
                if _ov.get('price'):
                    o['price'] = _ov['price']
                    _ov_p += 1
                if isinstance(_ov.get('stock'), int) and _ov['stock'] > 0:
                    o['stock'] = _ov['stock']
                if _ov.get('minq'):
                    o['minq'] = _ov['minq']
            _rows2.append(o)
        rows = _rows2
        print(f'overrides: {len(_overrides)} fresh, price-applied {_ov_p}, soldout-dropped {_ov_s}', file=sys.stderr)

    # 死链剔除（ken 2026-11-10）：stock=-1 = 链接不可以用，进看板候选前先滤掉（sources 随之不收）；
    # 全量池 _pool_rows 不受影响、死链商品继续跟踪价格
    _dead_n = sum(1 for o in rows if o.get('stock') == -1)
    if _dead_n:
        rows = [o for o in rows if o.get('stock') != -1]
        print(f'dead-drop: {_dead_n} offers (stock=-1)', file=sys.stderr)

    pai = []
    for slug in ('chatgpt-plus', 'gemini-pro-year', 'gemini-ultra',
                 'openai-phone-verification', 'super-grok-heavy'):
        r = fetch_priceai(slug)
        print(f'priceai {slug}: {len(r)} rows', file=sys.stderr)
        pai += [o for o in r if o['url'] not in BLOCKED_URLS]

    _full_rows = list(_pool_rows)  # prepare 前的全量原始行（价格日志全量维护用，含被新鲜度门拦下的）
    _full_pai = list(pai)
    rows = prepare_offers(rows)
    pai = prepare_offers(pai)
    g1, g2, g3 = gpt_groups(rows + [o for o in pai if o['url']])
    # PriceAI 的 GPT 行 category 为空，已在 gpt_groups 内按标题判断；其余分组同理合并
    g4, g5 = ag_groups(rows + pai)
    g6 = codex_group(rows + pai)  # PriceAI 补充行也走同一套权重规则，不开后门
    g7 = grok_group(rows) + [o for o in pai if grok_marker(o['title']) and has(o['title'], 'Heavy', 'HEAVY', 'Ultra', 'ULTRA') and not has(o['title'], '号池', '额度', '速刷')]

    groups = [
        dict(id='gpt-unbound', name='GPT 日抛/Plus 成品号 — 未接马', items=slim(top30(g1, None, 45))),
        dict(id='gpt-bound', name='GPT 日抛/Plus 成品号 — 已接马', items=slim(top30(g2, None, 45))),
        dict(id='gpt-weekly', name='GPT 周限号', items=slim(top30(g3, lambda t: '已接马' if is_bound(t) else ('未接马' if has(t, '未接马', '未绑定') else '未注明'), 45))),
        dict(id='ag-cheapest', name='Antigravity 反重力 — 最便宜', items=slim(top30(g4, ag_type, 45))),
        dict(id='ag-verified', name='Antigravity 反重力 — 已过验证成品号', items=slim(top30(g5, ag_type, 45))),
        dict(id='grok-heavy', name='Grok Heavy（SuperGrok Heavy/Ultra）', items=slim(top30(g7, lambda t: '代充' if has(t, '代充', '直充') else '成品号', 45))),
        dict(id='claude', name='Claude — 最便宜', items=slim(top30(claude_group(rows + pai), claude_kind, 45))),
        dict(id='codex-sms', name='Codex 接码 — 单次', items=slim(top30(g6, None, 45))),
        dict(id='muse', name='Muse — 最便宜', items=slim(top30(muse_group(rows + pai), muse_kind, 45))),
        dict(id='vcc', name='虚拟卡 — 最便宜', items=slim(top30(vcc_group(rows + pai), vcc_kind, 45))),
    ]
    from datetime import datetime, timezone, timedelta
    bj_now = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
    board = dict(updated_at=bj_now,
                 source='AI价网 + cardnav + PriceAI + 16688 直拉 按商家遍历合并',
                 groups=groups)
    # 详情页库存核验（ken 2026-11-02）：能读到详情页实时库存的平台逐条核验，
    # 详情页库存为 0 / 已售罄的剔除，读到的实时库存同时回填展示；
    # 读不到的平台（wzyp 被阿里云验证挡、catfk 连不上、/products/ 系 JS 空壳）不在此列，只能靠聚合库库存。
    def detail_stock(it):
        """返回 (库存, 起购量)：库存 None=读不到保留、0=售罄剔除、-1=链接不可以用
        （商品不存在/详情打不开，ken 2026-11-10 库存语义）；起购量 >1 才有值。"""
        url = it['url']
        try:
            if '16688.com.cn' in url:
                m = re.search(r'/goods/(G\d+)', url)
                if not m:
                    return None, None
                req = urllib.request.Request(
                    'https://www.16688.com.cn/shopApi/goods/detail',
                    data=json.dumps({'goods_no': m.group(1)}).encode(),
                    headers={**HEADERS, 'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=20) as r:
                    d = json.loads(r.read().decode('utf-8', 'ignore'))
                if not d.get('data'):
                    # 接口明确回「商品不存在」= 死链，记 -1 剔除并回写 direct 状态；其他空响应仍按读不到保留
                    return (-1, None) if '不存在' in str(d.get('msg') or '') else (None, None)
                data = d.get('data') or {}
                q = data.get('stock_available_quantity')
                lq = data.get('limit_quantity')
                return (int(q) if isinstance(q, (int, float)) and q >= 0 else None,
                        lq if isinstance(lq, int) and lq > 1 else None)
            if 'aicdks.com' in url or '/item/' in url:
                txt = strip_tags(fetch(url, retries=0).decode('utf-8', 'ignore'))
                if '售罄' in txt or '已售完' in txt:
                    return 0, None
                km = re.search(r'库存\s*[:：]?\s*(\d+)', txt)
                return (int(km.group(1)) if km else None), None
        except Exception as e:
            # 详情页明确 404 = 链接失效，记 -1；其余读不到（网络/风控）仍按未知保留
            if 'HTTP Error 404' in str(e):
                return -1, None
            return None, None
        return None, None

    _dead_marks = []  # 本轮现核确认的死链：组装后回写 direct 当前状态 stock=-1
    def verify_detail_stock(items):
        # 候选池为每组前 45 条：并发核验（单条慢不阻塞整体），剔除售罄后回填截断到 30 条
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=12) as ex:
            stocks = list(ex.map(detail_stock, items))
        kept = []
        for it, (st, mq) in zip(items, stocks):
            if st == -1:
                print(f'dead-drop: {it["url"]}', file=sys.stderr)
                _dead_marks.append(it['url'])
                continue
            if st == 0:
                print(f'soldout-drop: {it["url"]}', file=sys.stderr)
                continue
            if st is not None:
                it['stock'] = st
            if mq and mq <= 1000:
                it['minq'] = mq  # 详情现核回填的起购量（16688）；>1000 视为假值丢弃
            kept.append(it)
        return kept[:30]
    for g in groups:
        g['items'] = verify_detail_stock(g['items'])

    # 死链回写（ken 2026-11-10）：本轮现核确认不存在/打不开的商品，把 direct 当前状态的
    # stock 写成 -1（标题/价格保留最后已知值、记录不删）；之后直拉缓存覆盖聚合时带 -1 进组装层剔除
    if _dead_marks:
        try:
            _dc = load_direct_cache()
            _marked = 0
            for _u in _dead_marks:
                if _u in _dc and _dc[_u].get('stock') != -1:
                    _dc[_u]['stock'] = -1
                    _marked += 1
            if _marked:
                with open(os.path.join(DATA, 'direct16688.json'), 'w', encoding='utf-8') as f:
                    json.dump(dict(items=_dc), f, ensure_ascii=False)
            print(f'dead-mark: {_marked}/{len(_dead_marks)} direct records set stock=-1', file=sys.stderr)
        except Exception as e:
            print(f'dead-mark failed: {e}', file=sys.stderr)

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
    # 旧表本身也是 dict，每件商品一次 O(1) 查表比对，没有两两比对。键 = 链接
    # （去参数）唯一（ken 2026-11-10 点选 1a，取代 2026-11-04 的链接+归一标题键）：
    # 标题只是普通字段，卖家改标题不影响认领，同一链接天然续记、不断历史；
    # 同链接多规格也并成一条（以本轮合并后的行价为准），不再按规格拆账。
    # 文件落盘键经平台映射压缩（ken 2026-11-10 定版）：键 =「平台短码:商品ID」
    # （见 PlatformMap），映射本体在 data/maps.json、文件里不内嵌任何映射。
    # 每个价格点带来源码：差分数组每点三元（时刻或间隔、价、来源码），1=脚本抓、
    # 2=浏览器抓、3=人工补充，同轮覆盖优先级 3>2>1；存量点无法回溯区分、一律记 1，
    # 上线后逐点精确（见 apply_pool_round）。
    _maps_path = os.path.join(DATA, 'maps.json')
    _maps = {}
    try:
        import time as _time
        from datetime import datetime as _dt, timezone as _tz, timedelta as _td
        _t0 = _time.time()
        _bj = _tz(_td(hours=8))
        _now = _dt.now(_bj)
        _now_min = int(_now.timestamp() // 60)
        _log_path = os.path.join(DATA, 'price-log.json')
        try:
            with open(_maps_path, encoding='utf-8') as f:
                _maps = json.load(f)
        except Exception:
            _maps = {}
        _plat = PlatformMap(_maps.get('platforms')) if _maps.get('platforms') else None
        _log = {}
        try:
            with open(_log_path, encoding='utf-8') as f:
                _raw = json.load(f)
            if _plat is None and _raw.get('v') == 2 and _raw.get('pfx'):
                _plat = platforms_from_prefixes(_raw['pfx'])
            if _plat is None:
                _plat = PlatformMap()
            if _raw.get('v', 1) >= 3:
                _log = _raw.get('items', {})
                if _raw.get('src'):
                    # 过渡形态（v3 平行 src 字典）兜底：读入时并入三元，落盘只写三元
                    _log = _merge_src_v3(_log, _raw['src'])
            elif _raw.get('v') == 2 and _raw.get('pfx'):
                # v2 数字短码键兜底：先按内嵌 pfx 解回整链接，再按平台映射重编码；
                # 同键多条先收集齐再一次合并（_merge_records 输出三元）
                _pfx_old = _raw['pfx']
                _pend = {}
                for _k, _rec in _raw.get('items', {}).items():
                    _c, _, _rest = _k.partition(':')
                    _u = _pfx_old[_c] + _rest if _c in _pfx_old else _k
                    _pend.setdefault(_plat.encode(_u), []).append(_rec)
                for _nk, _recs in _pend.items():
                    _log[_nk] = _merge_records(_recs)
            else:
                # v1 整链接键兜底：www 归一后同链接多条按 _merge_records 合并再转平台键
                _legacy = {}
                for _k, _rec in _raw.get('items', {}).items():
                    _legacy.setdefault(_norm_url(_k), []).append(_rec)
                for _u, _recs in _legacy.items():
                    _log[_plat.encode(_u)] = _merge_records(_recs)
        except Exception:
            _log = {}
        if _plat is None:
            _plat = PlatformMap()
        _pool = {}
        for _o in _full_rows + _full_pai:
            if _o['price'] is None or _o['price'] <= 0:
                continue
            _pool[_plat.encode(_o['url'])] = _o['price']
        # 价格日志同样以脚本二为准：被覆盖的链接（全池每链接只有一条记录），本轮池价换成一手价，
        # 并在下面比对时把脚本一记错的最后一点直接改掉（_ovr_pool 标记）
        # 浏览器按店轮换采集（脚本二的全量池通道）：data/browser-pool.json {url:{price,t}}，
        # 8 天内有效；优先级低于看板现核 overrides（条目级现核更准），高于聚合快照
        _bpool = {}
        try:
            with open(os.path.join(DATA, 'browser-pool.json'), encoding='utf-8') as f:
                _bp_raw = json.load(f)
            _bp_now = int(_time.time() * 1000)
            for _u, _v in (_bp_raw or {}).items():
                if isinstance(_v, dict) and _v.get('price') and _v.get('t') and _bp_now - _v['t'] <= 8 * 24 * 3600 * 1000:
                    _bpool[_u.split('?')[0]] = _v
        except Exception:
            _bpool = {}
        # 植入价并入池价并记来源：browser-pool='2'（浏览器抓）、overrides='3'（人工补充），
        # 按顺序写入，同键以人工为准（优先级 3>2>1）；apply_pool_round 据此记每个点的来源码
        _ovr_pool = {}
        _pool_src = {}
        try:
            for _sc, _smap in (('2', _bpool), ('3', _overrides or {})):
                for _u, _v in _smap.items():
                    if _v.get('price'):
                        _k = _plat.encode(_u)  # 输入文件是整链接键，转平台键再匹配
                        if _k in _pool:
                            _pool[_k] = _v['price']
                            _pool_src[_k] = _sc
                            _ovr_pool[_k] = (_v['price'], int(_v['t'] // 60000), _sc)
        except Exception:
            _ovr_pool = {}
        _n_ren = 0
        _n_new, _n_chg, _n_ovr = apply_pool_round(_log, _pool, _pool_src, _ovr_pool, _now_min)
        for g in groups:
            for it in g['items']:
                _rec = _log.get(_plat.encode(it['url']))
                if _rec and len(_rec) > 3:
                    _last_ts = _rec[0] + sum(_rec[3::3])
                    it['pc'] = _dt.fromtimestamp(_last_ts * 60, _bj).strftime('%Y-%m-%d')
        with open(_log_path, 'w', encoding='utf-8') as f:
            json.dump(dict(v=3, items=_log), f, ensure_ascii=False, separators=(',', ':'))
        print(f'price-log: {len(_log)} keys (pool {len(_pool)}, new {_n_new}, renamed {_n_ren}, changed {_n_chg}, overridden {_n_ovr}, {int((_time.time() - _t0) * 1000)}ms)', file=sys.stderr)
        # 看板价格史段（ken 2026-11-10 三件套收拢）：原 board-prices 小表退役，当前 board
        # 条目的价格记录直接并入 board.json 顶层 prices 段（三元差分数组，来源码在点内），
        # 页面弹窗从已加载的 board 里读，不再单独拉一份；全量 price-log 只做后台维护。
        _prices = {}
        for g in groups:
            for it in g['items']:
                _k = _plat.encode(it['url'])
                _rec = _log.get(_k)
                if _rec:
                    _prices[_k] = _rec
        board['prices'] = _prices
        print(f'board prices segment: {len(_prices)} keys', file=sys.stderr)
        # 映射本体落盘：maps.json 只装平台映射这一件事（店铺目录在 shops.json、照旧独立）
        with open(_maps_path, 'w', encoding='utf-8') as f:
            json.dump(dict(v=1, platforms=_plat.platforms), f, ensure_ascii=False, indent=1)
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
        # 内嵌段只含 groups 等展示结构：prices 价格史段不进 HTML（页面从 board.json 取）
        inline_board = {k: v for k, v in board.items() if k != 'prices'}
        inline_json = json.dumps(inline_board, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
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
