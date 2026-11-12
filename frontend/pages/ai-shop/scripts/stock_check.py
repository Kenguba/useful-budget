#!/usr/bin/env python3
"""AI账号商铺 · 库存轻量核对（A+B 结合，ken 2026-11-02 定版）

分层新鲜度规则：
- 服务器每 5 分钟被 GitHub 定时唤醒一次，但防抖锚定「最新一次核对」：
  唤醒先看最近活动（访客在 Worker 侧的核对时间 / board 的 stock_checked_at /
  全量抓取的 updated_at / 本任务上次运行），距今不足 interval_min 就跳过，不重复核。
  interval_min 在 data/stock-config.json 里可调（默认 5），改数即生效、不用动 workflow。
- 有访客刚在进站时核过（Worker 把结果存 KV，经 /api/stock-status 读到）且属于
  同一版 board、未过防抖窗的分组：直接采用那份结果落盘，不再戳店铺（以访客那次为准）。
- 其余分组才自己逐条直查详情页（与 refresh.py 同口径）：
  16688 走接口 shopApi/goods/detail；aicdks 与 /item/ 系读详情页文本；
  wzyp 详情页被 WAF 挡，跳过，保留聚合快照库存。
- 读到的库存回填 board.json，同步 sources 里同链接条目的库存；核到 0（售罄）
  或明确找不到（商品不存在/404）的条目直接从 board 里去除（ken 2026-11-02 定：
  找不到、没库存的可以去除；暂时读不到的不动、保留原值）。
  updated_at 不动（价格数据版本，归全量抓取管），另记 stock_checked_at。
  无变化不写任何文件（workflow 侧就不产生提交）。
- 落盘合并（ken 2026-11-02 追加「合并上一版、除非过期的」）：写盘前先取仓库里
  最新一版 board 当底，只把本轮核到的库存合并进去，没核到的保留底版的值；
  若底版的 updated_at 已变（期间有新全量数据落地），本轮结果算过期，整轮作废
  不写，等下一轮在新版上重核——绝不把旧版结果贴到新版上，也不复活已被
  新版淘汰的条目。对比永远针对整份发布的 JSON：每次合并产出的就是唯一一份
  当前数据，下一轮再有新数据时，拿这份合并后的数据继续对比合并。
- 安全阀：自己核的部分里成功读到的不足三成、且没有可采用的访客结果时，
  视为网络异常，报错退出、不写文件，免得坏网络把好数据冲掉。

用法：python3 scripts/stock_check.py（路径按脚本位置算）
产出（有变化时）：data/board.json、index.html（内嵌块同步）
"""
import html, json, os, re, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, 'data')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
HEADERS = {'User-Agent': UA, 'Accept': 'text/html,application/json',
           'Accept-Language': 'zh-CN,zh;q=0.9'}
STATUS_URL = os.environ.get('STOCK_STATUS_URL',
                            'https://ai.jpedu.asia/api/stock-status')
BJ = timezone(timedelta(hours=8))


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def strip_tags(s):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', s or '')).split())


def bjts(s):
    """'YYYY-MM-DD HH:MM'（北京时间）→ epoch 秒；无效返回 0"""
    try:
        return datetime.strptime(s, '%Y-%m-%d %H:%M').replace(tzinfo=BJ).timestamp()
    except Exception:
        return 0


def load_interval():
    try:
        with open(os.path.join(DATA, 'stock-config.json'), encoding='utf-8') as f:
            v = int(json.load(f).get('interval_min', 5))
        return max(1, v)
    except Exception:
        return 5


def fetch_status():
    try:
        return json.loads(fetch(STATUS_URL, timeout=15).decode('utf-8', 'ignore'))
    except Exception:
        return None


def own_last_run():
    """本 workflow 上一次运行的创建时间（epoch 秒），排除当前这次；查不到返回 0。"""
    repo = os.environ.get('GITHUB_REPOSITORY', '')
    token = os.environ.get('GITHUB_TOKEN', '')
    run_id = os.environ.get('GITHUB_RUN_ID', '')
    if not repo or not token:
        return 0
    try:
        req = urllib.request.Request(
            f'https://api.github.com/repos/{repo}/actions/workflows/stock.yml/runs?per_page=5',
            headers={'Authorization': 'Bearer ' + token,
                     'Accept': 'application/vnd.github+json',
                     'User-Agent': 'stock-check'})
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read().decode('utf-8', 'ignore'))
        for run in d.get('workflow_runs', []):
            if str(run.get('id')) == str(run_id):
                continue
            t = datetime.strptime(run['created_at'], '%Y-%m-%dT%H:%M:%SZ') \
                .replace(tzinfo=timezone.utc).timestamp()
            return t
    except Exception:
        pass
    return 0


NOT_FOUND = 'NF'  # 内部哨兵（绝不落盘）：明确「找不到」（商品不存在 / 详情页 404），与读不到（None）区分；落盘口径——看板直接去除该条目，direct 侧失效标记 stock=null 由 refresh.py 回写（ken 2026-11-10 改版，-1 不再使用）


def detail_stock(it):
    """与 refresh.py 同口径：能读的详情页逐条核。
    返回：库存数（0=售罄）；NOT_FOUND=明确找不到（内部哨兵）；None=暂时读不到（保留原值）。"""
    url = it['url']
    try:
        if 'wzyp.cn' in url:
            return None
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
            if not d.get('data') and '不存在' in str(d.get('msg') or ''):
                return NOT_FOUND
            q = (d.get('data') or {}).get('stock_available_quantity')
            return int(q) if isinstance(q, (int, float)) and q >= 0 else None
        if 'aicdks.com' in url or '/item/' in url:
            txt = strip_tags(fetch(url).decode('utf-8', 'ignore'))
            if '售罄' in txt or '已售完' in txt:
                return 0
            km = re.search(r'库存\s*[:：]?\s*(\d+)', txt)
            return int(km.group(1)) if km else None
    except urllib.error.HTTPError as e:
        return NOT_FOUND if e.code == 404 else None
    except Exception:
        return None
    return None


def verifiable(url):
    return ('16688.com.cn' in url or 'aicdks.com' in url or '/item/' in url) \
        and 'wzyp.cn' not in url


def apply_stock(it, st, counter):
    if st is None:
        return
    if it.get('stock') != st:
        it['stock'] = st
        counter[0] += 1
    for src in it.get('sources') or []:
        if src.get('url') == it['url'] and src.get('stock') != st:
            src['stock'] = st


def fetch_latest_board():
    """写盘前取仓库里最新一版 board.json 当合并底版；取不到返回 None（用本地版）。"""
    url = os.environ.get(
        'BOARD_RAW_URL',
        'https://raw.githubusercontent.com/Kenguba/useful-budget/main/frontend/pages/ai-shop/data/board.json')
    try:
        return json.loads(fetch(url, timeout=15).decode('utf-8', 'ignore'))
    except Exception:
        return None


def main():
    interval = load_interval()
    now = time.time()
    board_path = os.path.join(DATA, 'board.json')
    with open(board_path, encoding='utf-8') as f:
        board = json.load(f)

    status = fetch_status()
    visitor_last = ((status or {}).get('lastcheck') or 0) / 1000.0
    anchors = [visitor_last, bjts(board.get('stock_checked_at')),
               bjts(board.get('updated_at')), own_last_run()]
    last_act = max(anchors)
    age = now - last_act if last_act else float('inf')
    print(f'interval {interval}min; last activity age '
          f'{age:.0f}s (visitor {visitor_last:.0f}, board_checked '
          f'{bjts(board.get("stock_checked_at")):.0f}, board_updated '
          f'{bjts(board.get("updated_at")):.0f})')
    if age < interval * 60:
        print('debounced: fresh enough, skip')
        return

    # 采用访客核对：同版 board + 在防抖窗内的分组结果直接落盘
    adopted = {}
    if status and status.get('board_updated_at') == board.get('updated_at'):
        for gid, entry in (status.get('groups') or {}).items():
            t = (entry.get('t') or 0) / 1000.0
            if entry.get('board_updated_at') == board.get('updated_at') \
                    and now - t < interval * 60 and entry.get('results'):
                adopted[gid] = entry['results']
    verified = {}
    own_groups = []
    for g in board.get('groups', []):
        res = adopted.get(g.get('id'))
        if res is not None:
            n = 0
            for it in g.get('items', []):
                v = res.get(it.get('url'))
                if isinstance(v, (int, float)):
                    verified[it['url']] = int(v)
                    n += 1
            print(f"group {g.get('id')}: adopted visitor check "
                  f'({n} usable results)')
        else:
            own_groups.append(g)
    if adopted:
        print(f'adopted {len(adopted)} groups from visitor checks')

    # 其余分组自己核
    targets = [it for g in own_groups for it in g.get('items', [])
               if verifiable(it.get('url', ''))]
    if targets:
        with ThreadPoolExecutor(max_workers=12) as ex:
            stocks = list(ex.map(detail_stock, targets))
        ok = sum(1 for s in stocks if s is not None)
        print(f'own check ok {ok}/{len(targets)}')
        if ok < 0.3 * len(targets) and not adopted:
            print('GUARD: too few successful reads; refusing to write',
                  file=sys.stderr)
            sys.exit(1)
        for it, st in zip(targets, stocks):
            if st is not None:
                verified[it['url']] = st

    if not verified:
        print('nothing verified; no write')
        return

    # 落盘合并：以仓库最新一版 board 为底，只合并本轮核到的库存；
    # 底版版本已变（期间有新全量数据）则本轮结果过期，整轮作废不写。
    base = fetch_latest_board() or board
    if base.get('updated_at') != board.get('updated_at'):
        print(f"board version changed during run ({board.get('updated_at')} "
              f"-> {base.get('updated_at')}); results expired, discard")
        return
    changed = [0]
    removed = 0
    for g in base.get('groups', []):
        kept = []
        for it in g.get('items', []):
            v = verified.get(it.get('url'))
            if v is not None and (v is NOT_FOUND
                                   or (isinstance(v, (int, float)) and v <= 0)):
                # 找不到（核实失效）或没库存（0）：直接去除（ken 2026-11-02 定）
                changed[0] += 1
                removed += 1
                continue
            if v is not None:
                apply_stock(it, v, changed)
            kept.append(it)
        g['items'] = kept
    if not changed[0]:
        print('no stock changes vs latest board')
        return
    if removed:
        print(f'removed {removed} items (not found / out of stock)')
    base['stock_checked_at'] = datetime.now(BJ).strftime('%Y-%m-%d %H:%M')
    with open(board_path, 'w', encoding='utf-8') as f:
        json.dump(base, f, ensure_ascii=False, indent=1)
    # 内嵌块同步（与 refresh.py 同一段逻辑）：首屏快照与 board.json 保持同版
    page_path = os.path.join(BASE, 'index.html')
    with open(page_path, encoding='utf-8') as f:
        page = f.read()
    # 内嵌段只放 groups 等展示结构：prices 段（变价记录）不进 HTML，页面运行时从 board.json 读
    inline_base = {k: v for k, v in base.items() if k != 'prices'}
    inline_json = json.dumps(inline_base, ensure_ascii=False, separators=(',', ':')) \
        .replace('<', '\\u003c').replace(' ', '\\u2028').replace(' ', '\\u2029')
    block = '<!--INLINE-BOARD-START--><script>window.INLINE_BOARD=' + inline_json \
        + ';</script><!--INLINE-BOARD-END-->'
    new_page, n = re.subn(r'<!--INLINE-BOARD-START-->.*?<!--INLINE-BOARD-END-->',
                          lambda m: block, page, flags=re.S)
    if n == 1:
        with open(page_path, 'w', encoding='utf-8') as f:
            f.write(new_page)
    else:
        print(f'WARN: inline block replace count={n}, index.html untouched',
              file=sys.stderr)
    print(f'updated {changed[0]} stocks; board.json + inline synced')


if __name__ == '__main__':
    main()
