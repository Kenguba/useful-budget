/* Motion Prompt — 12-colour themes + shared Cookie A.
   Skin only: the gallery logic (language, day/night toggle, rendering) stays in
   site.js / found.js. This file adds the shared theme table (same values as
   ai-shop / ui-design), the header theme picker, and Cookie A read/write so a
   theme chosen on any jpedu.asia site applies here too.
   Cookie A format: digit 1 = language, digit 2 = day/night (0 dark, 1 light),
   rest = theme 1-12. Since the site ships Chinese and English only, the
   language digit is now in two-way sync with the UI language like on the
   other sites: entering with A digit 0/1 selects Chinese/English (handled by
   each page's first-paint script), and switching the UI language here writes
   the digit back (Chinese = 0, English = 1). This replaces the earlier
   keep-the-digit-verbatim rule, which existed only because the old third
   language (Japanese) had no digit to map to. */
(function () {
  'use strict';
  var root = document.documentElement;

  var THEMES = [
    { name: '01 · 冰川晴空', nameEn: '01 · Glacier Sky',   orb1: '#BCE0FD', orb2: '#93C5FD', refreshBg: '#60A5FA', pageBg: '#F4F8FC' },
    { name: '02 · 薄荷微风', nameEn: '02 · Mint Breeze',   orb1: '#A7F3D0', orb2: '#6EE7B7', refreshBg: '#34D399', pageBg: '#F2FBF7' },
    { name: '03 · 极光青蓝', nameEn: '03 · Aurora Cyan',   orb1: '#A5F3FC', orb2: '#818CF8', refreshBg: '#6366F1', pageBg: '#F4F6FC' },
    { name: '04 · 抹茶森屿', nameEn: '04 · Matcha Isle',   orb1: '#D9F99D', orb2: '#86EFAC', refreshBg: '#4ADE80', pageBg: '#F6FAF5' },
    { name: '05 · 碧海晴空', nameEn: '05 · Azure Lagoon',  orb1: '#99F6E4', orb2: '#7DD3FC', refreshBg: '#2DD4BF', pageBg: '#F2F9FA' },
    { name: '06 · 深海星雾', nameEn: '06 · Mist Slate',    orb1: '#CBD5E1', orb2: '#93C5FD', refreshBg: '#64748B', pageBg: '#F5F7FA' },
    { name: '07 · 星云幻紫', nameEn: '07 · Nebula Violet', orb1: '#E9D5FF', orb2: '#C4B5FD', refreshBg: '#8B5CF6', pageBg: '#F8F5FD' },
    { name: '08 · 蜜桃乌龙', nameEn: '08 · Peach Oolong',  orb1: '#FBCFE8', orb2: '#FDA4AF', refreshBg: '#F472B6', pageBg: '#FDF6F9' },
    { name: '09 · 晨曦微光', nameEn: '09 · Dawn Amber',    orb1: '#FDE68A', orb2: '#FDBA74', refreshBg: '#FB923C', pageBg: '#FCF9F4' },
    { name: '10 · 落日粉紫', nameEn: '10 · Sunset Glow',   orb1: '#F5D0FE', orb2: '#FECDD3', refreshBg: '#C084FC', pageBg: '#FAF6FC' },
    { name: '11 · 香槟流金', nameEn: '11 · Champagne Gold', orb1: '#FEF08A', orb2: '#FDE047', refreshBg: '#EAB308', pageBg: '#FAF9F2' },
    { name: '12 · 幻彩全息', nameEn: '12 · Gemini Holo',   orb1: '#8FDBB8', orb2: '#9CC8F7', refreshBg: '#4FA8F6', pageBg: '#F3F8FA', isHolo: true }
  ];
  var STR = {
    ja: { title: '12色テーマ', hint: '押して選択', pick: 'テーマを選ぶ', panel: 'テーマ' },
    en: { title: '12-colour themes', hint: 'Tap to choose', pick: 'Choose a theme', panel: 'Themes' },
    zh: { title: '12色弥散主题', hint: '滑动或点击选择', pick: '选择主题', panel: '主题' }
  };
  function uiLang() { var l = root.lang || 'zh'; return STR[l] ? l : 'zh'; }
  function $(s) { return document.querySelector(s); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function readA() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)A=(\d{3,4})(?:;|$)/);
      if (!m) return null;
      var v = m[1], t = parseInt(v.slice(2), 10);
      if (v.charAt(1) !== '0' && v.charAt(1) !== '1') return null;
      if (!(t >= 1 && t <= 12)) return null;
      return { l: v.charAt(0), dark: v.charAt(1) === '0', idx: t - 1 };
    } catch (e) { return null; }
  }
  function writeA() {
    try {
      var l = root.lang === 'en' ? '1' : '0';
      var s = 'A=' + l + (state.dark ? '0' : '1') + String(state.idx + 1) +
        '; Path=/; Max-Age=31536000; SameSite=Lax';
      var h = location.hostname;
      if (h === 'jpedu.asia' || h.slice(-11) === '.jpedu.asia') s += '; Domain=jpedu.asia';
      if (location.protocol === 'https:') s += '; Secure';
      document.cookie = s;
    } catch (e) { /* cookies unavailable */ }
  }

  var state = { idx: 11, dark: false };
  (function init() {
    var ti = root.getAttribute('data-tidx');
    if (ti !== null) { var n = parseInt(ti, 10); if (n >= 0 && n < 12) state.idx = n; }
    state.dark = root.getAttribute('data-theme') === 'dark';
    /* Seed Cookie A only from this site's own saved records, never from defaults. */
    if (!readA() && (read('mp-theme') !== null || read('mp-theme-idx') !== null)) writeA();
  })();

  function applyVisual(idx) {
    root.setAttribute('data-tidx', String(idx));
    if (idx === 11) root.setAttribute('data-holo', 'true'); else root.removeAttribute('data-holo');
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', state.dark ? '#101012' : THEMES[idx].pageBg);
  }

  /* Day/night: site.js / found.js own the #theme button and flip data-theme
     first (their listener was registered earlier); mirror the result into A. */
  var themeBtn = $('#theme');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    state.dark = root.getAttribute('data-theme') === 'dark';
    applyVisual(state.idx);
    writeA();
  });

  /* Language: site.js / found.js own the language buttons and update
     root.lang first (their listeners were registered earlier); mirror the
     new language into Cookie A's language digit, keeping day/night + theme. */
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { writeA(); });
  });

  /* ---------- theme picker ---------- */
  var pickBtn = $('#themePick'), pop = $('#themePopover'), bd = $('#themeBackdrop'), grid = $('#themeSwatchGrid');
  if (!pickBtn || !pop || !bd || !grid) { applyVisual(state.idx); return; }

  function labels() {
    var s = STR[uiLang()];
    pickBtn.setAttribute('aria-label', s.pick);
    pop.setAttribute('aria-label', s.panel);
    var tt = $('#themePanelTitle'), hh = $('#themePanelHint');
    if (tt) tt.textContent = s.title;
    if (hh) hh.textContent = s.hint;
  }
  function markActive() {
    grid.querySelectorAll('.theme-swatch-item').forEach(function (el) {
      el.classList.toggle('active', Number(el.getAttribute('data-theme-idx')) === state.idx);
    });
  }
  function build() {
    var en = uiLang() === 'en';
    grid.innerHTML = THEMES.map(function (t, i) {
      return '<div class="theme-swatch-item' + (i === state.idx ? ' active' : '') + '" data-theme-idx="' + i + '" role="button" tabindex="0" aria-pressed="' + (i === state.idx) + '">' +
        '<span class="swatch-orb-preview' + (t.isHolo ? ' holo-animated' : '') + '" style="background: linear-gradient(135deg, ' + t.orb1 + ' 0%, ' + t.orb2 + ' 65%, ' + t.refreshBg + ' 100%);"></span>' +
        '<span class="swatch-label">' + (en ? t.nameEn : t.name) + '</span></div>';
    }).join('');
    grid.querySelectorAll('.theme-swatch-item').forEach(function (el) {
      var i = Number(el.getAttribute('data-theme-idx'));
      el.addEventListener('pointerover', function () {
        grid.querySelectorAll('.theme-swatch-item').forEach(function (x) { x.classList.toggle('sliding-hover', x === el); });
        applyVisual(i);
      });
      el.addEventListener('click', function () { commit(i); });
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); commit(i); }
      });
    });
  }
  function open() {
    labels(); build();
    pop.classList.add('open'); bd.classList.add('open');
    pickBtn.setAttribute('aria-expanded', 'true');
  }
  function close(commitDone) {
    pop.classList.remove('open'); bd.classList.remove('open');
    pickBtn.setAttribute('aria-expanded', 'false');
    grid.querySelectorAll('.theme-swatch-item').forEach(function (x) { x.classList.remove('sliding-hover'); });
    if (!commitDone) { applyVisual(state.idx); markActive(); }
  }
  function commit(i) {
    state.idx = i;
    applyVisual(i);
    store('mp-theme-idx', String(i));
    writeA();
    markActive();
    close(true);
  }
  pickBtn.addEventListener('click', function () {
    if (pop.classList.contains('open')) close(false); else open();
  });
  bd.addEventListener('click', function () { close(false); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && pop.classList.contains('open')) close(false);
  });

  labels();
  build();
  applyVisual(state.idx);
})();
