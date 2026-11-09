/* useful-budget hub shell runtime (phase 2: formal pipeline modules)
 * Loading order per repo README spec: UI first -> core data -> light-module
 * idle preload -> in-page lazy -> heavy on demand -> the rest deferred.
 * Modules are built by build-module.py (mechanical carry of each site's own
 * scripts); the shell only loads, mounts and suspends them. Module DOM and
 * state are never unloaded; exit suspends the module's window/document
 * listeners (its own unmount), re-entry resumes them — zero new requests.
 */
(function () {
  'use strict';
  /* 入口分工（ken 2026-11-09）：总汇只在域名根部署时启用（jpedu.asia——模块
     与短路径全是根绝对路径）；在 github.io 的 /useful-budget/ 子路径部署下
     整体不激活，卡片走页面自带的相对链接跳各自单站，两边跳转逻辑不同。 */
  var hubPrefix = '';
  if (document.currentScript && document.currentScript.src) {
    try { hubPrefix = new URL(document.currentScript.src).pathname.replace(/\/hub\/hub\.js$/, ''); } catch (e) {}
  }
  if (hubPrefix) return;
  var BASE = '/hub/modules/';
  /* 资源版本戳：改任何 hub/模块文件，必须同步 bump 这里的 MV 与根 index.html 里 hub.js/hub.css 的 ?v=，
     否则 CDN 对 .js 有 4 小时缓存，会出现新 ui.html 配旧 module.js 的混搭（2026-11-09 实测 ip 模块中招） */
  var MV = '20261109d';
  var MODULES = {
    phone: { proj: 'cloud-phone', dir: '/frontend/cloud-phone/', tier: 'light' },
    '2fa': { proj: '2fa-auth',    dir: '/frontend/2fa-auth/',    tier: 'light' },
    skill: { proj: 'skill-board', dir: '/frontend/skill-board/', tier: 'light' },
    /* ai is on-demand (heaviest: code 320KB + board ~424KB): never in the
     * idle preload order; the focus-card warm path downloads ui/css/js only.
     * lazyShops is a SWITCH POSITION ONLY (phase 3, not implemented):
     * false = standalone-faithful — the module fetches shops.json at boot
     * (its own 2026-11-06 anti-fake-zero search behaviour). Flipping it to
     * true would defer shops.json to first directory/search use inside the
     * hub; do not flip until ken decides. */
    ai:    { proj: 'ai-shop',     dir: '/frontend/ai-shop/',     tier: 'ondemand', lazyShops: false },
    /* ip (phase 4): pipeline module like the others, but its code alone is
     * ~187KB and it probes realtime APIs the moment it boots — ondemand
     * tier, NOT in PRELOAD_ORDER; focus warm downloads ui/css/js only
     * (modulepreload never evaluates, so warming cannot start a probe). */
    ip:    { proj: 'ip-check',    dir: '/frontend/ip-check/',    tier: 'ondemand' },
    /* pan (phase 4): the only multi-file self-SPA. NOT extracted — mounted
     * as a sub-application: an iframe in the module root loads its own
     * index from its real directory and bootstraps in its own document
     * (its CSS, document click router and window scroll model are all
     * document-global; same-document mounting would fight the shell).
     * Its internal history entries are unstamped -> the A1 contract treats
     * them as module-internal, exactly like ai/skill state entries. */
    pan:   { proj: 'cloud-pan',   dir: '/frontend/cloud-pan/',   tier: 'subapp', subapp: true },
    /* ui (phase 5, after ken picked slimming plan A): the standalone was
     * split first (data per collection in data/*.json, 27 posters as
     * files), so the pipeline module is ui 19K + css 51K + js 41K ~112K.
     * tier ondemand + focus warm (NOT in PRELOAD_ORDER): entering ui also
     * pulls finds.json + first collection data + near-viewport posters,
     * so idle-preloading only its code would save the smallest share and
     * disturb the verified 3-station preload order; the focus card is
     * the strong intent signal here, exactly like ai/ip. Its runtime
     * poster paths ("assets/posters/..." inside finds.json) are rebased
     * by the pipeline's per-mount relative-URL watcher. */
    ui:    { proj: 'ui-design',   dir: '/frontend/ui-design/',   tier: 'ondemand' }
  };
  var PRELOAD_ORDER = ['phone', '2fa', 'skill']; /* sequential, lightest first; code+ui only, never data */
  var byProj = {};
  Object.keys(MODULES).forEach(function (k) { byProj[MODULES[k].proj] = k; });

  /* ---------- fetch-once caches: a URL is requested at most once ---------- */
  var textCache = {}, jsonCache = {};
  function fetchText(url) {
    if (!textCache[url]) textCache[url] = fetch(url).then(function (r) {
      if (!r.ok) { delete textCache[url]; throw new Error(url + ' ' + r.status); }
      return r.text();
    });
    return textCache[url];
  }
  function fetchJSON(url) {
    if (!jsonCache[url]) jsonCache[url] = fetch(url).then(function (r) {
      if (!r.ok) { delete jsonCache[url]; throw new Error(url + ' ' + r.status); }
      return r.json();
    });
    return jsonCache[url];
  }
  var api = { fetchText: fetchText, fetchJSON: fetchJSON, modules: MODULES };

  /* ---------- view layer ---------- */
  var view = document.createElement('div'); view.id = 'hubView';
  document.body.appendChild(view);

  var state = {};   // name -> {root, status, mod}
  var current = null;

  function rootFor(name) {
    if (state[name]) return state[name].root;
    var root = document.createElement('div');
    root.className = 'modRoot'; root.setAttribute('data-mod', name);
    view.appendChild(root);
    state[name] = { root: root, status: 'idle', mod: null };
    return root;
  }
  function loadCssOnce(name) {
    var id = 'hub-css-' + name;
    if (document.getElementById(id)) return;
    var l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet'; l.href = BASE + name + '/module.css?v=' + MV;
    document.head.appendChild(l);
  }
  function showRoot(name) {
    Object.keys(state).forEach(function (k) {
      state[k].root.classList.toggle('on', k === name);
    });
  }

  function enterModule(name, push) {
    var cfg = MODULES[name]; if (!cfg) return Promise.resolve(false);
    if (current && current !== name) suspend(current);
    current = name;
    view.classList.add('on');
    var root = rootFor(name);
    showRoot(name);
    if (push !== false) {
      try { history.pushState(stamp(name), '', '/' + name); } catch (e) {}
    }
    var st = state[name];
    if (cfg.subapp) return enterSubapp(name, root, st);
    if (st.status === 'ready') {           /* re-entry: resume, zero requests */
      if (st.mod && st.mod.mount) st.mod.mount(root, { standalone: false, api: api });
      return Promise.resolve(true);
    }
    if (st.status === 'loading') return st.promise || Promise.resolve(true);
    st.status = 'loading';
    loadCssOnce(name);
    /* no placeholder skeleton (ken, 2026-11-09): the module's own
     * ui.html is its real frame, header included — it paints the
     * moment it lands and the module's data fills in behind the
     * skeletons that page itself defines. A generic invented
     * skeleton here matched nothing and hid the header. */
    st.promise = fetchText(BASE + name + '/ui.html?v=' + MV).then(function (html) {
      root.innerHTML = html;                       /* UI first: real frame up */
      return import(BASE + name + '/module.js?v=' + MV);  /* then the module's own code */
    }).then(function (mod) {
      st.mod = mod;
      if (mod.mount) return mod.mount(root, { standalone: false, api: api });
      if (mod.init) return mod.init(root, api);
      return true;
    }).then(function () {
      st.status = 'ready';
      var sk = root.querySelector('#hubSkeleton'); if (sk) sk.remove();
      return true;
    }).catch(function (err) {
      st.status = 'idle'; st.promise = null;
      root.innerHTML = '<div style="padding:28px 18px;font-size:14px">加载失败，点返回后重试</div>';
      if (window.console) console.error('[hub]', name, err);
      return false;
    });
    return st.promise;
  }

  /* sub-application mount (pan): the frame is created ONCE and never
   * unloaded; exit only hides the root, so the app keeps its view,
   * scroll and internal history stack and re-entry is a pure
   * visibility switch with zero requests. The frame shows pan's own
   * page as-is — its static header paints first and its data zones
   * fill in behind its own skeletons (ken, 2026-11-09: no imitation
   * boot cover and no other redundant code; the cover that used to
   * sit here duplicated pan's home markup in hub.js/hub.css and is
   * removed for good). */
  function enterSubapp(name, root, st) {
    if (st.frame) { st.status = 'ready'; return Promise.resolve(true); }
    st.status = 'loading';
    root.classList.add('subappRoot');
    root.innerHTML = '';
    var f = document.createElement('iframe');
    f.className = 'subappFrame';
    f.title = name;
    f.src = MODULES[name].dir;
    f.addEventListener('load', function () { attachPanPtr(f); st.status = 'ready'; });
    root.appendChild(f);
    st.frame = f;
    return Promise.resolve(true);
  }
  function suspend(name) {
    var st = state[name];
    if (st && st.mod && st.mod.unmount) { try { st.mod.unmount(); } catch (e) {} }
  }
  function exitModule(push) {
    if (current) suspend(current);
    current = null;
    view.classList.remove('on');
    ptrHide();
    if (push) { try { history.pushState(stamp(null), '', '/'); } catch (e) {} }
  }

  /* ---------- history routing (A1 fix, phase 3) ----------
   * The shell stamps every history entry IT creates: {hubNav:n, hub:name}
   * for a module entry, {hubNav:n, hub:null} for a home entry, and stamps
   * the initial entry the same way at startup. popstate decisions are made
   * ONLY from those stamps:
   *   stamped module entry, not current -> enter it
   *   stamped module entry, already current -> nothing (the resident
   *     module's own popstate handlers own this event)
   *   stamped home entry -> leave the current module
   * An UNSTAMPED destination is never the shell's business while a module
   * is resident: it is one of the module's own entries (ai pushes
   * {musePcPopup} / {museSrcPopup} / {leaderNavSession, #grp-…}, skill
   * pushes {secNavSession, #sec-…}) or the module's entry whose stamp the
   * module itself overwrote — ai and skill both run
   * history.replaceState({…NavSession, y}, '', location.href) for their
   * scroll memory, ai at boot already. The old handler treated every
   * unstamped state as "go home", so closing ai's price popup with the
   * back button ejected the whole hub. With no module resident, an
   * unstamped destination whose URL is a module route can only be such a
   * stamp-overwritten module entry, so it is re-entered from the URL.
   * The exit path still works because the entry BELOW a module's entries
   * is always a shell-stamped one: backing past the module's territory
   * lands on a stamped home (or another module's) entry. */
  var hubSeq = 0;
  function stamp(name) { return { hubNav: ++hubSeq, hub: name || null }; }
  try { history.replaceState({ hubNav: 0, hub: null }, '', location.href); } catch (e) {}

  window.addEventListener('popstate', function (ev) {
    var s = ev.state;
    if (s && typeof s.hubNav === 'number') {
      if (s.hub && MODULES[s.hub]) { if (s.hub !== current) enterModule(s.hub, false); }
      else if (current) exitModule(false);
      return;
    }
    if (current) return; /* module-internal entry: the module handles it */
    var m = /^\/(\w+)$/.exec(location.pathname || '');
    if (m && MODULES[m[1]]) enterModule(m[1], false);
  });

  /* ---------- entry interception: home fly-out + card primary anchors ---- */
  function projFromHref(href) {
    var m = /frontend\/([\w-]+)\//.exec(href || '');
    return m ? byProj[m[1]] : null;
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a.card-btn-primary') : null;
    if (!a) return;
    var name = projFromHref(a.getAttribute('href'));
    if (name) { ev.preventDefault(); ev.stopPropagation(); enterModule(name, true); }
  }, true);

  /* fly-out finish() in root index.html calls this before location.href */
  window.__hubTryEnter = function (proj) {
    var name = proj && byProj[proj.id];
    if (!name) return false;
    enterModule(name, true);
    return true;
  };

  /* ---------- preload: download only, never execute, never data ----------
   * ui via the same fetchText cache entry path; css via <link rel=preload
   * as=style> (same fetch type as the stylesheet applied later — a fetch()
   * warm + stylesheet apply double-downloads, phase-1 lesson); js via
   * modulepreload (download+parse, no evaluation). */
  var warmed = {};
  function warm(name) {
    if (MODULES[name] && MODULES[name].subapp) return; /* pan: any warm boots the app and fires realtime API calls — entry only */
    if (warmed[name] || (state[name] && state[name].status !== 'idle')) return; warmed[name] = 1;
    fetchText(BASE + name + '/ui.html').catch(function () {});
    var pl = document.createElement('link');
    pl.rel = 'preload'; pl.as = 'style'; pl.href = BASE + name + '/module.css';
    document.head.appendChild(pl);
    var l = document.createElement('link');
    l.rel = 'modulepreload'; l.href = BASE + name + '/module.js';
    document.head.appendChild(l);
  }
  /* light tier: idle SEQUENTIAL preload once the home page is interactive */
  function idlePreload() {
    PRELOAD_ORDER.forEach(function (n, i) { setTimeout(function () { warm(n); }, i * 1500); });
  }
  if ('requestIdleCallback' in window) requestIdleCallback(idlePreload, { timeout: 3500 });
  else setTimeout(idlePreload, 2500);
  setTimeout(function () { PRELOAD_ORDER.forEach(function (n) { if (!warmed[n]) warm(n); }); }, 9000);

  /* focus card = strong intent: warm that module (code+ui only, no data) */
  var stackVp = document.getElementById('stackViewport');
  if (stackVp) stackVp.addEventListener('pointerup', function () {
    setTimeout(function () {
      var cards = stackVp.querySelectorAll('.app-window-card');
      var vr = stackVp.getBoundingClientRect(), cx = vr.left + vr.width / 2, best = null, bd = 1e9;
      cards.forEach(function (c) {
        var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - cx);
        if (d < bd) { bd = d; best = c; }
      });
      if (!best) return;
      var a = best.querySelector('a.card-btn-primary');
      var name = a && projFromHref(a.getAttribute('href'));
      if (name) warm(name);
    }, 650);
  });

  /* ---------- pull-to-refresh (phase 6 modules, phase 8 home) ----------
   * Standalone, each site scrolls at document level, so Android Chrome's
   * native pull-to-refresh works. In the hub the shell document never
   * scrolls (the root page pins it: overflow hidden + overscroll-behavior
   * none) and module content scrolls inside .modRoot instead — the native
   * gesture has nothing to grab and no in-page gesture replaced it, so
   * pulling at a module's top did nothing at all. The shell therefore
   * tracks the gesture itself and refreshes the current view the way the
   * standalone site would: pipeline modules via location.reload()
   * (a standalone refresh is the same full reload; the deep-link boot
   * then re-mounts the module through the normal path and re-fetches its
   * data), the pan sub-application by reloading only its frame.
   * Phase 8 (ken, on his home screenshot): the home view itself was the
   * last surface without it — trackPull gated on a current module, so a
   * pull on the home stack did literally nothing. The same tracker now
   * runs on the home view too (refresh = location.reload(), identical
   * semantics), gated by the home scroll model instead: the master
   * screen is the only scroller and only in grid mode (in stack mode it
   * is overflow:hidden and gesture-driven, so nothing can be scrolled
   * away from the top and a pull may engage anywhere). The stack's own
   * pointer gestures are unaffected: a downward drag still sinks the
   * focus card at its 0.25 ratio and springs back — and a pull must
   * stay predominantly vertical (see the dominance guard in trackPull),
   * so horizontal card swipes never arm the refresh.
   * A pull engages only while EVERY scrollable ancestor of the touched
   * element sits at its top (checked live on each move, so a gesture that
   * first scrolls a nested list up to its top starts counting from there),
   * and fires only past the threshold on release.
   * Phase 9 (ken): the stream itself is only guaranteed where
   * touch-action forbids the browser claiming the pan — the card
   * viewport had that declaration, the rest of the home did not, and on
   * ken's phone off-card pulls were claimed and cancelled before any
   * move reached this tracker. hub.css therefore declares the whole
   * stack-mode home screen touch-action:none (lifted in grid mode,
   * where the screen scrolls natively and the scrollTop gate rules).
   * Phase 10 (ken): the mirror-image correction — a pull that STARTS
   * on a home card must never refresh. The card surface is card
   * business (damped sink and spring-back, swipe, fly-out, tap), and
   * phases 8/9 arming the tracker there was overreach. The shell
   * tracker therefore takes a skipStart predicate and drops such a
   * touch at touchstart, before any tracking state is set — no disc,
   * no reload, the card's own gestures exactly as standalone. The
   * exclusion covers the focus card and every stacked neighbour's
   * exposed slice, in grid mode too; off-card starts keep the
   * phase-8/9 behaviour. Module views and the pan frame pass no
   * predicate and are tracked exactly as before. */
  var ptrEl = document.createElement('div'); ptrEl.id = 'hubPtr';
  ptrEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/></svg>';
  document.body.appendChild(ptrEl);
  var PTR_THRESHOLD = 72;
  function ptrShow(dy, spinning) {
    var lift = spinning ? 66 : Math.min(dy * 0.55, 66);
    ptrEl.style.opacity = (dy > 2 || spinning) ? '1' : '0';
    ptrEl.style.transform = 'translateY(' + (-52 + lift) + 'px)';
    ptrEl.classList.toggle('spin', !!spinning);
    if (!spinning) ptrEl.querySelector('svg').style.transform = 'rotate(' + (dy * 2.2) + 'deg)';
  }
  function ptrHide() {
    ptrEl.style.opacity = '0';
    ptrEl.style.transform = 'translateY(-52px)';
    ptrEl.classList.remove('spin');
  }
  function refreshCurrent() {
    var name = current;   /* null = the home view itself */
    ptrShow(0, true);
    setTimeout(function () {
      var st = name && state[name];
      if (name && MODULES[name].subapp && st && st.frame) {
        try { st.frame.contentWindow.location.reload(); ptrHide(); return; } catch (e) {}
      }
      location.reload();
    }, 380);
  }
  function trackPull(doc, scrollTopsOf, activeWhen, skipStart) {
    var startY = null, startX = 0, engX = 0, engaged = false, lastDy = 0, target = null;
    doc.addEventListener('touchstart', function (ev) {
      if (!activeWhen() || ev.touches.length !== 1) { if (engaged || startY !== null) ptrHide(); engaged = false; startY = null; return; }
      if (skipStart && skipStart(ev.target)) { engaged = false; startY = null; return; }
      target = ev.target; startY = ev.touches[0].clientY; startX = ev.touches[0].clientX; engaged = false; lastDy = 0;
    }, { passive: true });
    doc.addEventListener('touchmove', function (ev) {
      if (ev.touches.length !== 1) { if (engaged || startY !== null) { ptrHide(); engaged = false; startY = null; lastDy = 0; } return; }
      if (startY === null || !activeWhen()) return;
      var y = ev.touches[0].clientY, x = ev.touches[0].clientX;
      if (!engaged) {
        var dx = x - startX, dy = y - startY;
        if (dy < -4 || (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15)) {
          startY = null;  /* upward or predominantly-horizontal: not a pull */
          return;
        }
        if (dy <= 8) return;
        var tops = scrollTopsOf(target);
        if (tops && tops.every(function (t) { return t <= 0; })) { engaged = true; startY = y - 8; engX = x; }
        return;
      }
      lastDy = y - startY;
      if (lastDy <= 0) { ptrHide(); return; }
      /* predominantly-vertical guard: a diagonal drag (e.g. a stack
       * card swipe with downward drift, or a chip-row flick inside a
       * module) disarms instead of riding along toward a refresh */
      if (Math.abs(x - engX) > 40 && Math.abs(x - engX) > lastDy * 1.15) {
        ptrHide(); engaged = false; startY = null; lastDy = 0; return;
      }
      ptrShow(lastDy, false);
    }, { passive: true });
    function end() {
      if (engaged && lastDy >= PTR_THRESHOLD) refreshCurrent();
      else if (engaged || startY !== null) ptrHide();
      engaged = false; startY = null; lastDy = 0;
    }
    doc.addEventListener('touchend', end);
    doc.addEventListener('touchcancel', end);
  }
  /* scroll positions that must all be at top for a pull in the shell
   * document: the current module root plus any scrollable ancestor of the
   * touched element inside it */
  function rootScrollTops(target) {
    if (!current || !state[current]) return null;
    var root = state[current].root, tops = [], el = target;
    while (el && el !== view) {
      if (el === root) { tops.push(el.scrollTop); break; }
      var cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) tops.push(el.scrollTop);
      el = el.parentElement;
    }
    return tops.length ? tops : null;
  }
  /* home view: the pull must start inside the phone chassis, the preview
   * modal must be closed (its seller list is a scroller of its own and a
   * pull there is modal business, not a page refresh), and every
   * scrollable ancestor must be at its top. In stack mode no ancestor
   * qualifies (the screen is overflow:hidden; the grid-mode chassis class
   * is what turns it into a scroller), so the returned list is empty and
   * "all at top" holds vacuously — a pull may engage anywhere on the
   * stack, including the pinned header ken circled (subject to the
   * phase-10 on-card exclusion at touchstart, below). In grid mode the
   * screen itself is in the list and gates the pull to scrollTop 0. */
  function homeScrollTops(target) {
    var modal = document.getElementById('sameSourceModalBackdrop');
    if (modal && modal.classList.contains('open')) return null;
    var tops = [], el = target, inHome = false;
    while (el && el !== document.body) {
      if (el.id === 'masterPhoneChassis') { inHome = true; break; }
      var cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) tops.push(el.scrollTop);
      el = el.parentElement;
    }
    return inHome ? tops : null;
  }
  function shellScrollTops(target) {
    return current ? rootScrollTops(target) : homeScrollTops(target);
  }
  /* phase 10: is this touch starting on one of the home view's own
   * cards? The cards are the .app-window-card articles inside the
   * chassis — the stack's <article data-stack-idx> in #stackViewport
   * and the grid's <article> in #contentGrid (root index markup,
   * verified). Module roots live in #hubView and use no such class,
   * and the predicate is additionally gated on the home view being
   * current, so module PTR is untouched by construction. */
  function onHomeCard(target) {
    if (!target || !target.closest) return false;
    var card = target.closest('.app-window-card');
    if (!card) return false;
    var chassis = document.getElementById('masterPhoneChassis');
    return !!chassis && chassis.contains(card);
  }
  trackPull(document, shellScrollTops, function () { return true; }, function (target) {
    return !current && onHomeCard(target);
  });
  /* pan: touches land in the frame's own document, so the same tracker is
   * attached there after every frame load (each reload swaps in a fresh
   * document). The frame is same-origin (its src is the site's own
   * directory on this host), and its scroll model is window-level. */
  function attachPanPtr(frame) {
    try {
      var doc = frame.contentDocument;
      if (!doc || doc.__hubPtrTracked) return;
      ptrHide();
      doc.__hubPtrTracked = 1;
      trackPull(doc, function () {
        var w = frame.contentWindow; if (!w) return null;
        return [w.scrollY || 0];
      }, function () { return current === 'pan'; });
    } catch (e) {}
  }

  /* deep link: landed on /phone, /2fa, /skill, /ai (site-router serves the shell
   * for those paths) — mount directly. Harmless on plain static hosting. */
  var deep = /^\/(\w+)$/.exec(location.pathname || '');
  if (deep && MODULES[deep[1]]) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enterModule(deep[1], false); });
    else enterModule(deep[1], false);
  }

  window.__hub = { enter: enterModule, exit: exitModule, warm: warm, state: state, api: api };
})();
