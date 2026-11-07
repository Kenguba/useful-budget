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
  var BASE = '/hub/modules/';
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
    l.id = id; l.rel = 'stylesheet'; l.href = BASE + name + '/module.css';
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
    if (!root.innerHTML) {
      root.innerHTML = '<div id="hubSkeleton"><div class="skblock" style="width:52%;height:22px"></div>' +
        '<div class="skblock" style="width:100%;height:46px;margin-top:14px;border-radius:23px"></div>' +
        '<div class="skblock" style="width:100%;height:120px;margin-top:14px;border-radius:16px"></div>' +
        '<div class="skblock" style="width:100%;height:120px;margin-top:12px;border-radius:16px"></div></div>';
    }
    st.promise = fetchText(BASE + name + '/ui.html').then(function (html) {
      root.innerHTML = html;                       /* UI first: real frame up */
      return import(BASE + name + '/module.js');  /* then the module's own code */
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
   * unloaded; exit only hides the root (showRoot/current bookkeeping in
   * the callers), so the app keeps its view, scroll and internal history
   * stack and re-entry is a pure visibility switch with zero requests.
   * The frame document is the site's own standalone page: its relative
   * assets/data resolve against its real directory by construction, and
   * its config.js host table sees the hub hostname (jpedu.asia), misses
   * RELAY_BY_HOST and falls back to https://api.jpedu.asia directly —
   * no config change and no main-domain /api router rule needed.
   * Boot cover (phase 8): pan's static HTML is an empty #main — every
   * pixel of its UI is rendered by its app.js after it fetches data, so
   * "document loaded" (the old skeleton-removal trigger) comes long
   * before "UI rendered": measured at 60KB/s, load fired at ~7.2s and
   * first render at ~8.1s, and in between the frame was a full-screen
   * pale blank (its own page background over an empty #main) — the
   * exact blank ken screenshotted. The skeleton also sat IN FLOW above
   * the frame, covering only the top ~252px and shoving the frame down
   * (it snapped up when the skeleton was removed). Now the skeleton is
   * a full-root overlay ABOVE the frame, shaped like pan's home layout,
   * and it is removed only when the frame document actually renders
   * (polled: #main filled, or any visible body text — pan's access
   * gate also counts). If the frame never renders, the skeleton stays:
   * a loading UI in place beats a blank screen (the UI-first rule). */
  function enterSubapp(name, root, st) {
    if (st.frame) { st.status = 'ready'; return Promise.resolve(true); }
    st.status = 'loading';
    root.classList.add('subappRoot');
    root.innerHTML = '';
    var ov = document.createElement('div');
    ov.id = 'hubSkeleton'; ov.className = 'panBoot';
    ov.innerHTML =
      /* static-first cover (ken, 2026-11-08): everything above the data
       * zones is STATIC in pan's home — header, nav tabs, promo, title,
       * search bar and the announcement never wait for data, so the cover
       * renders them as real content from the first frame (the UI-first
       * rule). Only the genuinely data-driven zones — the hot-search
       * chips and the daily-update list — stay skeleton + shimmer until
       * the real frame paints and the whole cover lifts at once. */
      '<div class="pb-head">' +
        '<div class="pb-logo"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M5 5h.01M9.5 5h.01M14 5h.01M18.5 5h.01M5 9.5h.01M9.5 9.5h.01M14 9.5h.01M18.5 9.5h.01M5 14h.01M9.5 14h.01M14 14h.01M18.5 14h.01M5 18.5h.01M9.5 18.5h.01M14 18.5h.01M18.5 18.5h.01"/></svg></div>' +
        '<div class="pb-name">基德盘搜</div>' +
        '<div class="pb-actions">' +
          '<span class="pb-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.8h2"/></svg>APP</span>' +
          '<span class="pb-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.4 2.3 3.5 5.2 3.5 8.6s-1.1 6.3-3.5 8.6c-2.4-2.3-3.5-5.2-3.5-8.6S9.6 5.7 12 3.4Z"/></svg>中文</span>' +
          '<span class="pb-sun"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.1"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19"/></svg></span>' +
        '</div>' +
      '</div>' +
      '<div class="pb-tabs"><span class="pb-tab on">搜索首页</span><span class="pb-tab">热播榜</span><span class="pb-tab">每日更新</span><span class="pb-tab">热搜榜</span></div>' +
      '<div class="pb-promo"><svg viewBox="0 0 24 24" fill="#F59E0B"><path d="M13 2 4.5 13.5H11L9.8 22 19 9.8h-6.5L13 2Z"/></svg>夸克网盘搜索 · 迅雷会员特权直达 · 磁力聚合</div>' +
      '<div class="pb-title">好内容，<span>一搜就有</span></div>' +
      '<div class="pb-search"><span class="pb-scope">全部网盘<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9.5 6 6 6-6"/></svg></span>' +
        '<span class="pb-ph">搜索你想找的资源</span>' +
        '<span class="pb-go"><svg viewBox="0 0 24 24" fill="none" stroke="#10312A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5M5.5 11 12 4.5 18.5 11"/></svg></span></div>' +
      '<div class="pb-tags"><div class="skblock" style="width:84px"></div><div class="skblock" style="width:108px"></div><div class="skblock" style="width:118px"></div><div class="skblock" style="width:96px"></div><div class="skblock" style="width:94px"></div><div class="skblock" style="width:74px"></div><div class="skblock" style="width:88px"></div><div class="skblock" style="width:62px"></div></div>' +
      '<div class="pb-note"><span class="pb-note-ico"><svg viewBox="0 0 24 24" fill="#E8590C"><path d="M3 10.5v3a1.5 1.5 0 0 0 1.5 1.5H7l7.5 4.5v-15L7 9H4.5A1.5 1.5 0 0 0 3 10.5Z"/><path d="M17.5 9.2a4 4 0 0 1 0 5.6M20 6.8a7.6 7.6 0 0 1 0 10.4" fill="none" stroke="#E8590C" stroke-width="1.9" stroke-linecap="round"/></svg></span>' +
        '<span class="pb-note-t"><b>站点公告</b>每天多轮自动更新 · 追更最快 | 优先使用迅雷网盘。</span></div>' +
      '<div class="pb-daily"><div class="pb-daily-h"><div class="skblock" style="width:34px;height:34px;border-radius:10px"></div><div class="skblock" style="width:32%;height:19px"></div><div class="skblock" style="width:22%;height:19px;margin-left:auto"></div></div>' +
      '<div class="pb-row"><div class="skblock" style="width:26px;height:15px"></div><div style="flex:1"><div class="skblock" style="width:72%;height:15px"></div><div class="skblock" style="width:34%;height:11px;margin-top:7px"></div></div><div class="skblock" style="width:40px;height:40px;border-radius:11px"></div></div>' +
      '<div class="pb-row"><div class="skblock" style="width:26px;height:15px"></div><div style="flex:1"><div class="skblock" style="width:64%;height:15px"></div><div class="skblock" style="width:30%;height:11px;margin-top:7px"></div></div><div class="skblock" style="width:40px;height:40px;border-radius:11px"></div></div>' +
      '<div class="pb-row"><div class="skblock" style="width:26px;height:15px"></div><div style="flex:1"><div class="skblock" style="width:78%;height:15px"></div><div class="skblock" style="width:38%;height:11px;margin-top:7px"></div></div><div class="skblock" style="width:40px;height:40px;border-radius:11px"></div></div></div>';
    root.appendChild(ov);
    var f = document.createElement('iframe');
    f.className = 'subappFrame';
    f.title = name;
    f.src = MODULES[name].dir;
    f.addEventListener('load', function () { attachPanPtr(f); });
    root.appendChild(f);
    st.frame = f;
    st.bootPoll = setInterval(function () {
      var rendered = false;
      try {
        var d = f.contentDocument;
        if (d && d.body) {
          var main = d.querySelector('#main');
          rendered = !!((main && main.innerHTML.length > 100) ||
            (d.body.innerText && d.body.innerText.trim().length > 0));
        }
      } catch (e) {}
      if (rendered) {
        clearInterval(st.bootPoll); st.bootPoll = null;
        st.status = 'ready';
        ov.remove();
      }
    }, 120);
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
   * and fires only past the threshold on release. */
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
  function trackPull(doc, scrollTopsOf, activeWhen) {
    var startY = null, startX = 0, engX = 0, engaged = false, lastDy = 0, target = null;
    doc.addEventListener('touchstart', function (ev) {
      if (!activeWhen() || ev.touches.length !== 1) { engaged = false; startY = null; return; }
      target = ev.target; startY = ev.touches[0].clientY; startX = ev.touches[0].clientX; engaged = false; lastDy = 0;
    }, { passive: true });
    doc.addEventListener('touchmove', function (ev) {
      if (startY === null || !activeWhen() || ev.touches.length !== 1) return;
      var y = ev.touches[0].clientY, x = ev.touches[0].clientX;
      if (!engaged) {
        var tops = scrollTopsOf(target);
        if (tops && tops.every(function (t) { return t <= 0; }) && y > startY + 8) { engaged = true; startY = y - 8; engX = x; }
        else if (y < startY - 4) startY = null;   /* upward gesture: not a pull */
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
      else if (engaged) ptrHide();
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
   * stack, including the pinned header ken circled. In grid mode the
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
  trackPull(document, shellScrollTops, function () { return true; });
  /* pan: touches land in the frame's own document, so the same tracker is
   * attached there after every frame load (each reload swaps in a fresh
   * document). The frame is same-origin (its src is the site's own
   * directory on this host), and its scroll model is window-level. */
  function attachPanPtr(frame) {
    try {
      var doc = frame.contentDocument;
      if (!doc || doc.__hubPtrTracked) return;
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
