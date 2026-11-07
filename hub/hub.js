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
    /* backLeft: skill's own floating-quick-dock (position:fixed, bottom
     * right) is a permanent resident of the bottom-right corner, so the
     * shell puts its back capsule on the left while skill is current. */
    skill: { proj: 'skill-board', dir: '/frontend/skill-board/', tier: 'light', backLeft: true },
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
  var back = document.createElement('button'); back.id = 'hubBack'; back.type = 'button';
  back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg><span>返回总汇</span>';
  document.body.appendChild(view); document.body.appendChild(back);
  back.addEventListener('click', function () { exitModule(true); });

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
    view.classList.add('on'); back.classList.add('on');
    back.classList.toggle('hubBackLeft', !!cfg.backLeft);
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
   * no config change and no main-domain /api router rule needed. */
  function enterSubapp(name, root, st) {
    if (st.frame) { st.status = 'ready'; return Promise.resolve(true); }
    st.status = 'loading';
    root.classList.add('subappRoot');
    root.innerHTML = '<div id="hubSkeleton"><div class="skblock" style="width:52%;height:22px"></div>' +
      '<div class="skblock" style="width:100%;height:46px;margin-top:14px;border-radius:23px"></div>' +
      '<div class="skblock" style="width:100%;height:120px;margin-top:14px;border-radius:16px"></div></div>';
    var f = document.createElement('iframe');
    f.className = 'subappFrame';
    f.title = name;
    f.src = MODULES[name].dir;
    f.addEventListener('load', function () {
      st.status = 'ready';
      var sk = root.querySelector('#hubSkeleton'); if (sk) sk.remove();
    });
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
    view.classList.remove('on'); back.classList.remove('on'); back.classList.remove('hubBackLeft');
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

  /* deep link: landed on /phone, /2fa, /skill, /ai (site-router serves the shell
   * for those paths) — mount directly. Harmless on plain static hosting. */
  var deep = /^\/(\w+)$/.exec(location.pathname || '');
  if (deep && MODULES[deep[1]]) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enterModule(deep[1], false); });
    else enterModule(deep[1], false);
  }

  window.__hub = { enter: enterModule, exit: exitModule, warm: warm, state: state, api: api };
})();
