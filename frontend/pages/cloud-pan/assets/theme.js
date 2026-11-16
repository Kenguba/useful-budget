/* 基德盘搜 · 12 色弥散主题 + 日夜 + 中英（2026-11-06 接入，与 ai/skill/ip/2fa/phone/ui 同族实现）
   - 主题色值与 ai 站线上 THEMES12 逐值一致，另加 orb3（新稿三光斑的第三色，取自新稿）
   - 偏好存储：本站 localStorage（pan-theme-idx / pan-dark / pan-lang）+ 跨子域名 Cookie A 双写，A 优先
   - 页面壳的早期脚本已按同一口径在首帧写入变量防闪；本文件负责交互（单击切日夜、长按开面板滑动/点选、语言切换）
   - 只管外壳偏好与译文，不碰数据与业务逻辑 */
(function () {
  "use strict";

  var THEMES = [
    { name: "01 · 冰川晴空", nameEn: "01 · Glacier Sky", orb1: "#BCE0FD", orb2: "#93C5FD", orb3: "#DBEAFE", refreshBg: "#60A5FA", sendCircleBg: "#9CCAF9", accent: "#2563EB", tagBg: "#EBF5FF", tagText: "#1D4ED8", pageBg: "#F4F8FC", glow: "rgba(147, 197, 253, 0.38)" },
    { name: "02 · 薄荷微风", nameEn: "02 · Mint Breeze", orb1: "#A7F3D0", orb2: "#6EE7B7", orb3: "#D1FAE5", refreshBg: "#34D399", sendCircleBg: "#86EFAC", accent: "#059669", tagBg: "#ECFDF5", tagText: "#047857", pageBg: "#F2FBF7", glow: "rgba(110, 231, 183, 0.36)" },
    { name: "03 · 极光青蓝", nameEn: "03 · Aurora Cyan", orb1: "#A5F3FC", orb2: "#818CF8", orb3: "#C7D2FE", refreshBg: "#6366F1", sendCircleBg: "#A5B4FC", accent: "#4F46E5", tagBg: "#EEF2FF", tagText: "#4338CA", pageBg: "#F4F6FC", glow: "rgba(129, 140, 248, 0.34)" },
    { name: "04 · 抹茶森屿", nameEn: "04 · Matcha Isle", orb1: "#D9F99D", orb2: "#86EFAC", orb3: "#BBF7D0", refreshBg: "#4ADE80", sendCircleBg: "#BEF264", accent: "#16A34A", tagBg: "#F0FDF4", tagText: "#15803D", pageBg: "#F6FAF5", glow: "rgba(134, 239, 172, 0.36)" },
    { name: "05 · 碧海晴空", nameEn: "05 · Azure Lagoon", orb1: "#99F6E4", orb2: "#7DD3FC", orb3: "#BAE6FD", refreshBg: "#2DD4BF", sendCircleBg: "#67E8F9", accent: "#0D9488", tagBg: "#F0FDFA", tagText: "#0F766E", pageBg: "#F2F9FA", glow: "rgba(125, 211, 252, 0.36)" },
    { name: "06 · 深海星雾", nameEn: "06 · Mist Slate", orb1: "#CBD5E1", orb2: "#93C5FD", orb3: "#E2E8F0", refreshBg: "#64748B", sendCircleBg: "#CBD5E1", accent: "#334155", tagBg: "#F1F5F9", tagText: "#1E293B", pageBg: "#F5F7FA", glow: "rgba(148, 163, 184, 0.32)" },
    { name: "07 · 星云幻紫", nameEn: "07 · Nebula Violet", orb1: "#E9D5FF", orb2: "#C4B5FD", orb3: "#DDD6FE", refreshBg: "#8B5CF6", sendCircleBg: "#A396F8", accent: "#6D28D9", tagBg: "#F3E8FF", tagText: "#6D28D9", pageBg: "#F8F5FD", glow: "rgba(167, 139, 250, 0.38)" },
    { name: "08 · 蜜桃乌龙", nameEn: "08 · Peach Oolong", orb1: "#FBCFE8", orb2: "#FDA4AF", orb3: "#FCE7F3", refreshBg: "#F472B6", sendCircleBg: "#F9A8D4", accent: "#DB2777", tagBg: "#FDF2F8", tagText: "#BE185D", pageBg: "#FDF6F9", glow: "rgba(244, 114, 182, 0.34)" },
    { name: "09 · 晨曦微光", nameEn: "09 · Dawn Amber", orb1: "#FDE68A", orb2: "#FDBA74", orb3: "#FEF3C7", refreshBg: "#FB923C", sendCircleBg: "#FCD34D", accent: "#EA580C", tagBg: "#FFF7ED", tagText: "#C2410C", pageBg: "#FCF9F4", glow: "rgba(251, 146, 60, 0.34)" },
    { name: "10 · 落日粉紫", nameEn: "10 · Sunset Glow", orb1: "#F5D0FE", orb2: "#FECDD3", orb3: "#FAE8FF", refreshBg: "#C084FC", sendCircleBg: "#F0ABFC", accent: "#9333EA", tagBg: "#FAF5FF", tagText: "#7E22CE", pageBg: "#FAF6FC", glow: "rgba(192, 132, 252, 0.35)" },
    { name: "11 · 香槟流金", nameEn: "11 · Champagne Gold", orb1: "#FEF08A", orb2: "#FDE047", orb3: "#FEF9C3", refreshBg: "#EAB308", sendCircleBg: "#FDE047", accent: "#CA8A04", tagBg: "#FEFCE8", tagText: "#A16207", pageBg: "#FAF9F2", glow: "rgba(234, 179, 8, 0.32)" },
    { name: "12 · 幻彩全息", nameEn: "12 · Gemini Holo", isHolo: true, orb1: "#8FDBB8", orb2: "#9CC8F7", orb3: "#B9CFF8", refreshBg: "#4FA8F6", sendCircleBg: "#9EE0C5", accent: "#1A73E8", tagBg: "#E6F4EA", tagText: "#137333", pageBg: "#F3F8FA", glow: "rgba(143, 219, 184, 0.44)" }
  ];
  var SUN = '<circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4.5"></line><line x1="12" y1="19.5" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"></line><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="4.5" y2="12"></line><line x1="19.5" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"></line><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"></line>';
  var MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

  /* ---------- 偏好状态：早期脚本已算好（window.__panPref）则直接用，否则同口径重算 ---------- */
  function readSharedA() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)A=(\d{3,4})(?:;|$)/);
      if (!m) return null;
      var v = m[1], t = parseInt(v.slice(2), 10);
      if (v.charAt(1) !== "0" && v.charAt(1) !== "1") return null;
      if (!(t >= 1 && t <= 12)) return null;
      return { l: v.charAt(0), m: v.charAt(1), t: t };
    } catch (e) { return null; }
  }
  var pref = window.__panPref || null;
  if (!pref) {
    pref = { t: 11, d: false, l: "zh", hadLocal: false, hadA: false };
    try {
      var li = localStorage.getItem("pan-theme-idx"), ld = localStorage.getItem("pan-dark"), ll = localStorage.getItem("pan-lang");
      if (li !== null || ld !== null || ll !== null) pref.hadLocal = true;
      if (li !== null) { var n = parseInt(li, 10); if (n >= 0 && n < 12) pref.t = n; }
      if (ld !== null) pref.d = ld === "1";
      if (ll === "en" || ll === "zh") pref.l = ll;
    } catch (e) {}
    var a0 = readSharedA();
    if (a0) { pref.hadA = true; pref.t = a0.t - 1; pref.d = a0.m === "0"; pref.l = a0.l === "1" ? "en" : "zh"; }
  }
  var state = { t: pref.t, d: !!pref.d, l: pref.l === "en" ? "en" : "zh" };

  function saveLocal() {
    try {
      localStorage.setItem("pan-theme-idx", String(state.t));
      localStorage.setItem("pan-dark", state.d ? "1" : "0");
      localStorage.setItem("pan-lang", state.l);
    } catch (e) {}
  }
  function writeSharedA() {
    try {
      var h = location.hostname;
      var s = "A=" + (state.l === "en" ? "1" : "0") + (state.d ? "0" : "1") + (state.t + 1) + ";path=/;max-age=31536000;SameSite=Lax";
      if (h === "jpedu.asia" || h.slice(-11) === ".jpedu.asia") s += ";domain=jpedu.asia";
      if (location.protocol === "https:") s += ";Secure";
      document.cookie = s;
    } catch (e) {}
  }
  function commit() { saveLocal(); writeSharedA(); }

  /* ---------- 主题应用 ---------- */
  function applyTheme(idx) {
    var t = THEMES[idx];
    if (!t) return;
    state.t = idx;
    var root = document.documentElement;
    root.style.setProperty("--orb-color-1", t.orb1);
    root.style.setProperty("--orb-color-2", t.orb2);
    root.style.setProperty("--orb-color-3", t.orb3 || t.orb1);
    root.style.setProperty("--refresh-btn-bg", t.refreshBg);
    root.style.setProperty("--send-circle-bg", t.sendCircleBg);
    root.style.setProperty("--theme-accent", t.accent);
    root.style.setProperty("--theme-tag-bg", t.tagBg);
    root.style.setProperty("--theme-tag-text", t.tagText);
    root.style.setProperty("--search-glow", t.glow);
    if (t.isHolo) root.setAttribute("data-holo", "true"); else root.removeAttribute("data-holo");
    if (state.d) root.style.removeProperty("--page-bg");
    else root.style.setProperty("--page-bg", t.pageBg);
    var mtc = document.querySelector('meta[name="theme-color"]');
    if (mtc) mtc.setAttribute("content", state.d ? "#070B14" : t.pageBg);
    var items = document.querySelectorAll(".theme-swatch-item");
    Array.prototype.forEach.call(items, function (el) {
      el.classList.toggle("active", Number(el.getAttribute("data-theme-idx")) === idx);
    });
  }
  function setDark(on) {
    state.d = !!on;
    var root = document.documentElement;
    if (state.d) root.setAttribute("data-dark", "true"); else root.removeAttribute("data-dark");
    var ic = document.getElementById("sunMoonIcon");
    if (ic) ic.innerHTML = state.d ? MOON : SUN;
    applyTheme(state.t);
  }

  /* ---------- 外壳译文（只译界面框架文案，资源数据原文不动） ---------- */
  var I18N = {
    "搜索首页": "Home", "热播榜": "Trending", "每日更新": "Daily Updates", "热搜榜": "Hot Searches",
    "求片": "Request", "安装": "Install", "全部网盘": "All Clouds", "迅雷": "Xunlei", "磁力": "Magnet",
    "搜索": "Search", "大家都在搜": "Trending now", "站点公告": "Notice", "热门搜索": "Popular Searches",
    "全部更新 →": "All updates →", "浏览每日更新 →": "Browse all updates →", "发现更多 →": "Discover more →", "全部 →": "View all →",
    "影视分类": "Category", "内容": "Type", "排序": "Sort", "推荐": "For You", "全部": "All",
    "本周热门": "This Week", "今日热门": "Today", "该分类暂无快照数据": "No snapshot data in this category",
    "保持联系": "Stay in Touch", "点击放大查看": "Tap to enlarge", "获取资源": "Get Resource", "我知道了": "Got It",
    "告诉我们你需要的资源。邮箱选填。": "Tell us what you are looking for. Email is optional",
    "求片已提交，感谢你的反馈。": "Request submitted. Thank you", "需要的资源": "Resource needed",
    "必填": "Required", "选填": "Optional", "邮箱": "Email", "可留空": "Optional",
    "提交求片": "Submit Request", "完成": "Done", "发现": "Discover", "安装到桌面": "Add to Home Screen",
    "条目视图": "List", "网格视图": "Grid", "网盘筛选": "Cloud Filter", "刷新": "Refresh",
    "无符合条件的更新": "No matching updates", "快照内无符合条件的更新": "No matching updates in snapshot",
    "查看相关资源": "View related resources", "资源详情": "Resource Details", "正在加载…": "Loading…",
    "APP 下载": "App Download", "安卓客户端": "Android App", "苹果桌面版": "iOS Home Screen",
    "申请友情链接": "Apply for a Friend Link", "提交申请": "Submit Application",
    "网站名称": "Site Name", "网站网址": "Site URL", "图标网址（可选）": "Icon URL (optional)",
    "联系方式（仅管理员可见）": "Contact (admin only)", "网站简介": "Site Description",
    "本站信息": "Site Info", "收录要求": "Requirements", "搜索每日更新": "Search daily updates",
    "好内容，": "Great Content, ", "一搜就有": "One Search Away",
    "新发布与追更内容，随时发现更新": "New releases and updates, discover anytime",
    "看看大家正在寻找什么": "See what everyone is looking for",
    "从热门榜单，发现下一部好内容": "Find your next favorite from the charts",
    "新发布与追更内容 · 共 ": "New and updated · ", " 项": " items",
    "电影": "Movies", "剧集": "Series", "动漫": "Anime", "综艺": "Variety",
    "12色弥散主题": "12-Color Aura Themes", "滑动或点击选择": "Slide or tap to select",
    "⚡ 夸克网盘搜索 · 迅雷会员特权直达 · 磁力聚合": "⚡ Quark Search · Xunlei Privilege Direct · Magnet Index"
  };
  var I18N_REV = {};
  Object.keys(I18N).forEach(function (k) { I18N_REV[I18N[k]] = k; });
  var PH = { "搜索你想找的资源": "Search movies, shows, anime…", "搜索每日更新": "Search daily updates",
    "填写名称，也可补充年份、季度或版本": "Name, plus year, season or version if you like", "可留空": "Optional" };
  var PH_REV = {};
  Object.keys(PH).forEach(function (k) { PH_REV[PH[k]] = k; });

  var i18nBusy = false;
  function applyI18n() {
    if (i18nBusy || !document.body) return;
    var toEn = state.l === "en";
    var dict = toEn ? I18N : I18N_REV, ph = toEn ? PH : PH_REV;
    i18nBusy = true;
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          var p = node.parentNode;
          if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || p.nodeName === "TEXTAREA") return NodeFilter.FILTER_REJECT;
          return dict.hasOwnProperty(node.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (node) {
        var raw = node.nodeValue, key = raw.trim();
        node.nodeValue = raw.replace(key, dict[key]);
      });
      Array.prototype.forEach.call(document.querySelectorAll("input[placeholder], textarea[placeholder]"), function (el) {
        var v = el.getAttribute("placeholder");
        if (v && ph.hasOwnProperty(v)) el.setAttribute("placeholder", ph[v]);
      });
      var lt = document.getElementById("langText");
      if (lt) lt.textContent = toEn ? "EN" : "中文";
      document.documentElement.setAttribute("lang", toEn ? "en" : "zh-CN");
    } catch (e) {}
    i18nBusy = false;
  }
  var i18nTimer = null;
  function watchI18n() {
    if (!window.MutationObserver || !document.body) return;
    var ob = new MutationObserver(function () {
      if (state.l !== "en" || i18nBusy) return;
      clearTimeout(i18nTimer);
      i18nTimer = setTimeout(applyI18n, 60);
    });
    ob.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 外壳挂接（app.js renderShell 插入顶栏后调用） ---------- */
  var bound = false;
  function bindShell() {
    if (bound) return;
    var btn = document.getElementById("darkModeBtn");
    if (!btn) return;
    bound = true;

    var grid = document.getElementById("themeSwatchGrid");
    function renderSwatches() {
      if (!grid) return;
      grid.innerHTML = THEMES.map(function (t, idx) {
        return '<div class="theme-swatch-item' + (idx === state.t ? " active" : "") + '" data-theme-idx="' + idx + '">' +
          '<span class="swatch-orb-preview" style="background:linear-gradient(135deg,' + t.orb1 + " 0%," + t.orb2 + " 65%," + t.refreshBg + ' 100%)"></span>' +
          '<span class="swatch-label">' + (state.l === "en" ? t.nameEn : t.name) + "</span></div>";
      }).join("");
      Array.prototype.forEach.call(grid.querySelectorAll(".theme-swatch-item"), function (el) {
        el.addEventListener("click", function () {
          applyTheme(Number(el.getAttribute("data-theme-idx")));
          commit();
          closePanel();
        });
      });
    }
    function openPanel() {
      var pop = document.getElementById("themePopover"), bd = document.getElementById("themeBackdrop");
      if (pop) pop.classList.add("open");
      if (bd) bd.classList.add("open");
      if (navigator.vibrate) try { navigator.vibrate(18); } catch (e) {}
    }
    function closePanel() {
      var pop = document.getElementById("themePopover"), bd = document.getElementById("themeBackdrop");
      if (pop) pop.classList.remove("open");
      if (bd) bd.classList.remove("open");
      Array.prototype.forEach.call(document.querySelectorAll(".theme-swatch-item"), function (el) { el.classList.remove("sliding-hover"); });
    }

    renderSwatches();
    setDark(state.d);
    var bd = document.getElementById("themeBackdrop");
    if (bd) bd.addEventListener("click", closePanel);

    /* 单击切日夜 / 长按开面板，面板内滑动预选、松手定选（与 ai 站同手势） */
    var pressTimer = null, isDown = false, isLong = false, lastIdx = null;
    btn.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;
      isDown = true; isLong = false; lastIdx = null;
      btn.classList.add("pressing");
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      pressTimer = setTimeout(function () { if (!isDown) return; isLong = true; openPanel(); }, 340);
    });
    btn.addEventListener("pointermove", function (e) {
      if (!isDown || !isLong) return;
      var target = document.elementFromPoint(e.clientX, e.clientY);
      var sw = target && target.closest ? target.closest(".theme-swatch-item") : null;
      Array.prototype.forEach.call(document.querySelectorAll(".theme-swatch-item"), function (el) {
        el.classList.toggle("sliding-hover", el === sw);
      });
      if (sw) {
        var idx = Number(sw.getAttribute("data-theme-idx"));
        if (idx !== lastIdx) {
          lastIdx = idx; applyTheme(idx);
          if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) {}
        }
      }
    });
    function finish() {
      if (!isDown) return;
      isDown = false; clearTimeout(pressTimer); btn.classList.remove("pressing");
      if (!isLong) {
        var pop = document.getElementById("themePopover");
        if (pop && pop.classList.contains("open")) closePanel();
        else {
          btn.classList.add("rotating");
          setTimeout(function () { btn.classList.remove("rotating"); }, 520);
          setDark(!state.d); commit();
        }
      } else if (lastIdx !== null) { commit(); closePanel(); }
    }
    btn.addEventListener("pointerup", finish);
    btn.addEventListener("pointercancel", finish);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    var langBtn = document.getElementById("langBtn");
    if (langBtn) langBtn.addEventListener("click", function () {
      state.l = state.l === "en" ? "zh" : "en";
      commit();
      renderSwatches();
      applyTheme(state.t);
      applyI18n();
    });

    /* 种子：本站有存量偏好但还没有 Cookie A 时，首次打开把现值写入 A（全站通用规则） */
    if (!pref.hadA && pref.hadLocal) writeSharedA();
    if (state.l === "en") applyI18n();
    watchI18n();
  }

  window.PanTheme = { bindShell: bindShell, themes: THEMES };
})();
