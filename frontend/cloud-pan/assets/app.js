/* 基德盘搜复刻 — 共享外壳 + 各页渲染（数据来自 data/ 快照） */
(function () {
  "use strict";
  /* SPA 化（ken 2026-11-07 定）：BASE 启动时归一化为站点根绝对地址，
     站内切视图（pushState 改址）后数据与链接仍按根解析，不随当前路由深度漂移 */
  var BASE = (function () {
    var rel = window.PAN_BASE || "";
    return new URL(rel === "" ? "." : rel, location.href).href;
  })();
  var ORIGIN = "https://naspt.vip";
  /* 实时数据中转（Cloudflare Worker）：页面 -> Worker -> 原站公开接口。
     RELAY 未配置或请求失败时，自动回退到 data/ 快照。 */
  /* 接口地址来自 assets/config.js（部署时只改那个文件）。
     RELAY 为空字符串表示同域请求（pan.xxxxx.asia），属正常配置，不是未配置。 */
  var RELAY = (typeof window.PAN_RELAY === "string") ? window.PAN_RELAY : "https://api.jpedu.asia";
  function relayReady() { return typeof RELAY === "string" && RELAY.indexOf("example.workers.dev") < 0; }
  function apiGet(path) {
    return fetch(RELAY + "/api/public" + path).then(function (r) {
      if (!r.ok) throw new Error("api " + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || j.code !== 0) throw new Error("api code");
      return j.data;
    });
  }
  function apiPost(path) {
    return fetch(RELAY + path, { method: "POST", headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); });
  }
  function apiGetApi(path) {
    return fetch(RELAY + path, { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); });
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function () {});
  }

  /* ---- 资源获取弹窗（与原站 ResourceAccessDialog 同口径：access 直取 / delivery 临时交付轮询） ---- */
  function openAccess(meta) {
    var ov = document.getElementById("accessOv");
    if (!ov) return;
    var body = document.getElementById("accBody");
    var titleEl = document.getElementById("accTitle");
    if (titleEl) titleEl.textContent = meta.title || "获取资源";
    ov.classList.add("open");
    function show(html) { if (body) body.innerHTML = html; }
    function ready(url, expires) {
      show('<div class="acc-label">' + (meta.provider === "magnet" ? "磁力地址" : "资源地址") + "</div>" +
        '<a class="acc-url" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + "</a>" +
        (expires ? '<p class="acc-tip">临时链接有效期至 ' + esc(fmtTime(expires)) + "</p>" : "") +
        '<div class="acc-actions"><a class="btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">打开' +
        esc(panName(meta.provider)) + '</a><button class="btn-ghost" id="accCopy" type="button">复制链接</button></div>');
      var cp = document.getElementById("accCopy");
      if (cp) cp.onclick = function () {
        copyText(url); cp.textContent = "已复制";
        setTimeout(function () { cp.textContent = "复制链接"; }, 1500);
      };
    }
    function fail(msg) {
      show('<p class="acc-fail">' + esc(msg || "资源获取失败，请稍后重试") + '</p>' +
        '<div class="acc-actions"><button class="btn-primary" id="accRetry" type="button">重试</button></div>');
      var rt = document.getElementById("accRetry");
      if (rt) rt.onclick = function () { openAccess(meta); };
    }
    show('<p class="acc-loading">正在获取网盘链接…</p>');
    if (relayReady()) {
      fetch(RELAY + "/api/resources/" + encodeURIComponent(meta.id) + "/click", { method: "POST" }).catch(function () {});
    }
    if (meta.provider === "magnet") {
      var hash = String(meta.id).indexOf("magnet:") === 0 ? String(meta.id).slice(7) : String(meta.id);
      ready("magnet:?xt=urn:btih:" + hash);
      return;
    }
    if (!relayReady()) { fail("实时服务不可用，暂时无法获取"); return; }
    apiPost("/api/resources/" + encodeURIComponent(meta.id) + "/access").then(function (j) {
      if (j && j.code === 0 && j.data && j.data.url) { ready(j.data.url, j.data.expires_at); return; }
      if (j && j.data && j.data.error === "RESOURCE_REQUIRES_DELIVERY") { deliver(); return; }
      fail(j && j.message ? j.message : undefined);
    }).catch(function () { fail(); });
    function deliver() {
      show('<p class="acc-loading">正在通过临时交付获取…</p>');
      apiPost("/api/resources/" + encodeURIComponent(meta.id) + "/delivery").then(function (j) {
        if (!j || j.code !== 0 || !j.data) { fail(j && j.message ? j.message : undefined); return; }
        poll(j.data, 0);
      }).catch(function () { fail(); });
    }
    function poll(rec, n) {
      var url = rec.url || rec.delivery_url || rec.target_url || rec.share_url || "";
      var st = String(rec.status || "");
      if (/FAILED|EXPIRED|CANCEL/.test(st)) { fail(rec.error_message || "资源链接已经失效"); return; }
      if (url && !/PENDING|PROCESSING|PREPARED|CREATED|QUEUED/.test(st)) { ready(url, rec.expires_at); return; }
      if (n >= 30) { fail("获取超时，请稍后重试"); return; }
      setTimeout(function () {
        apiGetApi("/api/deliveries/" + encodeURIComponent(rec.id)).then(function (j) {
          poll((j && j.data) || rec, n + 1);
        }).catch(function () { poll(rec, n + 1); });
      }, 2000);
    }
  }

  function absolutize(url) {
    if (typeof url === "string" && url.charAt(0) === "/") return ORIGIN + url;
    return url;
  }
  var CHANNELS = [
    { id: "movie", name: "电影" },
    { id: "tv", name: "剧集" },
    { id: "anime", name: "动漫" },
    { id: "variety", name: "综艺" },
    { id: "short", name: "短剧" }
  ];
  var PAN_FALLBACK = {
    xunlei: "迅雷", quark: "夸克", baidu: "百度", magnet: "磁力", uc: "UC",
    aliyun: "阿里", tianyi: "天翼", mobile: "移动", "115": "115", "123": "123",
    pikpak: "PikPak", ed2k: "ED2K", guangya: "光芽"
  };
  var state = { site: null, hot: [], updates: [], updatesTotal: 0, updatesPage: 1, discovery: {}, friend: {}, appInfo: {}, live: false };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function panName(id) {
    var opts = (state.site && state.site.search && state.site.search.provider_options) || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].id === id) return opts[i].name;
    return PAN_FALLBACK[id] || id;
  }
  /* 网盘品牌图标（各家官方图标地址，已逐个核验可达且图案正确）：
     桌面端图标+文字，手机端（≤560px）只显示图标，见 style.css 的 .btn-pan.has-ico 规则。
     图标加载失败时自动摘掉 has-ico 回退纯文字，不会出现空按钮。 */
  var PAN_ICONS = {
    xunlei: "https://pan.xunlei.com/icon.png",
    baidu: "https://www.baidu.com/favicon.ico",
    quark: "https://pan.quark.cn/favicon.ico",
    aliyun: "https://www.alipan.com/favicon.ico",
    uc: "https://drive.uc.cn/favicon.ico",
    "115": "https://115.com/favicon.ico",
    "123": "https://statics.123957.com/static-by-custom/favicon.ico",
    tianyi: "https://cloud.dlife.cn/web/main/logo.ico",
    pikpak: "https://mypikpak.com/favicon-32x32.png",
    guangya: "https://www.guangyapan.com/icon.png"
  };
  var PAN_ICON_EMOJI = { magnet: "🧲", ed2k: "🔗" };
  function panHasIcon(id) { return !!(PAN_ICONS[id] || PAN_ICON_EMOJI[id]); }
  function panBtnCls(id) { return "btn-pan" + (panHasIcon(id) ? " has-ico" : ""); }
  function panBtnInner(id, text) {
    var ico = "";
    if (PAN_ICONS[id]) ico = '<img class="pan-ico" src="' + PAN_ICONS[id] + '" alt="" loading="lazy" onerror="this.parentNode.classList.remove(\'has-ico\');this.remove()">';
    else if (PAN_ICON_EMOJI[id]) ico = '<span class="pan-ico-em" aria-hidden="true">' + PAN_ICON_EMOJI[id] + "</span>";
    return ico + '<span class="pan-txt">' + esc(text) + "</span>";
  }
  function fmtTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var now = new Date();
    var f = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
    var dayStr = f.format(d), todayStr = f.format(now);
    var yest = new Date(now.getTime() - 864e5);
    var hm = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    if (dayStr === todayStr) return "今天 " + hm;
    if (dayStr === f.format(yest)) return "昨天 " + hm;
    var md = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" }).format(d);
    return md + " " + hm;
  }
  function load(name) {
    return fetch(BASE + "data/" + name + ".json").then(function (r) { return r.json(); });
  }
  /* 优先实时（经中转），失败回退快照；live=true 表示本次走的是实时数据。
     实时请求加 10 秒上限：中转慢/挂起时不等死，按失败口径回退快照先把页面渲染出来，避免长时间白屏 */
  function liveOr(path, snapName, onLive) {
    if (!relayReady()) return load(snapName).catch(function () { return null; });
    var api = apiGet(path).then(function (d) {
      if (onLive) onLive();
      return d;
    });
    var slow = new Promise(function (resolve, reject) {
      setTimeout(function () { reject(new Error("api timeout")); }, 10000);
    });
    return Promise.race([api, slow]).catch(function () {
      return load(snapName).catch(function () { return null; });
    });
  }
  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ---------------- 外壳：顶栏 / 页脚 / 联系卡 / 弹窗 ---------------- */
  function logoGrid() {
    var s = '<span class="logo-grid">';
    for (var i = 0; i < 9; i++) s += "<i></i>";
    return s + "</span>";
  }
  /* 联系我们磁吸竖签（移植新稿 initDraggableContactDock 逻辑，状态存 pan_contact_dock_state_v1） */
  function initContactDock(dockEl, onTap) {
    if (!dockEl) return;
    var STORAGE_KEY = "pan_contact_dock_state_v1";
    var isPointerDown = false, wasDragged = false;
    var startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    var currentLeft = 0, currentTop = 0;
    var lastMoveTime = 0, lastMoveX = 0, instantVx = 0;
    var pendingStashSide = null, stashedSide = null, dockEdgeSide = "right";
    var stashedIdleTimer = null;
    function clearIdleTimer() {
      if (stashedIdleTimer) { clearTimeout(stashedIdleTimer); stashedIdleTimer = null; }
      dockEl.classList.remove("stashed-idle");
    }
    function scheduleIdleFade() {
      clearIdleTimer();
      if (stashedSide) stashedIdleTimer = setTimeout(function () {
        if (stashedSide) dockEl.classList.add("stashed-idle");
      }, 2800);
    }
    function saveDockState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ top: currentTop, dockEdgeSide: dockEdgeSide, stashedSide: stashedSide }));
      } catch (e) {}
    }
    function applyDockPosition(animate) {
      var vw = window.innerWidth, vh = window.innerHeight;
      var rect = dockEl.getBoundingClientRect();
      var w = rect.width || 32, h = rect.height || 96;
      currentTop = Math.min(Math.max(16, currentTop), Math.max(16, vh - h - 16));
      dockEl.classList.remove("stashed-left", "stashed-right", "docked-left", "docked-right");
      dockEl.style.transition = animate ? "" : "none";
      if (stashedSide === "right") {
        dockEdgeSide = "right"; currentLeft = vw - w;
        dockEl.classList.add("stashed-right"); scheduleIdleFade();
      } else if (stashedSide === "left") {
        dockEdgeSide = "left"; currentLeft = 0;
        dockEl.classList.add("stashed-left"); scheduleIdleFade();
      } else {
        clearIdleTimer();
        if (dockEdgeSide === "left") { currentLeft = 0; dockEl.classList.add("docked-left"); }
        else { currentLeft = vw - w; dockEl.classList.add("docked-right"); }
      }
      dockEl.style.right = "auto"; dockEl.style.bottom = "auto";
      dockEl.style.left = currentLeft + "px"; dockEl.style.top = currentTop + "px";
      if (!animate) { void dockEl.offsetWidth; dockEl.style.transition = ""; }
    }
    (function initPosition() {
      var vh = window.innerHeight;
      currentTop = Math.max(80, vh - 220);
      dockEdgeSide = "right"; stashedSide = null;
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved && typeof saved.top === "number") {
          currentTop = saved.top;
          dockEdgeSide = saved.dockEdgeSide === "left" ? "left" : "right";
          stashedSide = (saved.stashedSide === "left" || saved.stashedSide === "right") ? saved.stashedSide : null;
        }
      } catch (e) {}
      applyDockPosition(false);
    })();
    dockEl.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;
      isPointerDown = true; wasDragged = false; pendingStashSide = null; instantVx = 0;
      clearIdleTimer();
      var rect = dockEl.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      initialLeft = rect.left; initialTop = rect.top;
      currentLeft = initialLeft; currentTop = initialTop;
      lastMoveTime = performance.now(); lastMoveX = e.clientX;
      try { dockEl.setPointerCapture(e.pointerId); } catch (err) {}
    });
    dockEl.addEventListener("pointermove", function (e) {
      if (!isPointerDown) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!wasDragged && Math.hypot(dx, dy) > 4) {
        wasDragged = true; stashedSide = null;
        dockEl.classList.remove("stashed-left", "stashed-right", "stashed-idle");
        dockEl.classList.add("is-dragging");
      }
      if (!wasDragged) return;
      var now = performance.now(), dt = now - lastMoveTime;
      if (dt > 0) { instantVx = (e.clientX - lastMoveX) / dt; lastMoveX = e.clientX; lastMoveTime = now; }
      var vw = window.innerWidth, vh = window.innerHeight;
      var w = dockEl.offsetWidth || 32, h = dockEl.offsetHeight || 96;
      currentLeft = Math.min(Math.max(-w * 0.45, initialLeft + dx), vw - w * 0.55);
      currentTop = Math.min(Math.max(12, initialTop + dy), vh - h - 12);
      if (currentLeft <= -10) pendingStashSide = "left";
      else if (currentLeft >= vw - w + 10) pendingStashSide = "right";
      else pendingStashSide = null;
      dockEl.style.left = currentLeft + "px"; dockEl.style.top = currentTop + "px";
    });
    function endDrag(e) {
      if (!isPointerDown) return;
      isPointerDown = false;
      try { dockEl.releasePointerCapture(e.pointerId); } catch (err) {}
      if (wasDragged) {
        dockEl.classList.remove("is-dragging");
        var vw = window.innerWidth, w = dockEl.offsetWidth || 32;
        var centerX = currentLeft + w / 2;
        if (pendingStashSide === "left" || (centerX < 28 && instantVx < -0.55)) { stashedSide = "left"; dockEdgeSide = "left"; }
        else if (pendingStashSide === "right" || (centerX > vw - 28 && instantVx > 0.55)) { stashedSide = "right"; dockEdgeSide = "right"; }
        else { stashedSide = null; dockEdgeSide = centerX < vw / 2 ? "left" : "right"; }
        applyDockPosition(true); saveDockState();
      } else if (stashedSide) {
        stashedSide = null; applyDockPosition(true); saveDockState();
      } else if (onTap) onTap();
    }
    dockEl.addEventListener("pointerup", endDrag);
    dockEl.addEventListener("pointercancel", endDrag);
    dockEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    dockEl.addEventListener("selectstart", function (e) { e.preventDefault(); });
    window.addEventListener("resize", function () { applyDockPosition(false); });
  }
  function renderShell(active) {
    var site = state.site || {};
    var pres = site.presentation || {};
    var content = site.content || {};
    var name = (site.site && site.site.site_name) || "基德盘搜";
    var nav = [
      { href: BASE + "index.html", label: "搜索首页", key: "home" },
      { href: BASE + "discover/", label: "热播榜", key: "discover" },
      { href: BASE + "today/", label: "每日更新", key: "today" },
      { href: BASE + "hot/", label: "热搜榜", key: "hot" }
    ];
    var navHtml = nav.map(function (n) {
      return '<a href="' + n.href + '"' + (n.key === active ? ' class="on"' : "") + ">" + n.label + "</a>";
    }).join("");
    // 顶栏 B 版（热播榜/热搜榜/申请友链/搜索/资源页）：Logo 与导航间带紧凑搜索框
    var variantB = ["discover", "hot", "apply", "search", "resource"].indexOf(active) >= 0;
    var topSearch = variantB
      ? '<form class="top-search" id="topSearch"><input id="topSearchInput" placeholder="搜索你想找的资源" autocomplete="off">' +
        '<button type="submit">搜索</button></form>'
      : "";
    var sunPaths = '<circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4.5"></line><line x1="12" y1="19.5" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"></line><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="4.5" y2="12"></line><line x1="19.5" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"></line><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"></line>';
    var globeSvg = '<svg class="globe-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
    var auraHtml = '<div class="aura-backdrop" aria-hidden="true"><div class="aura-orb orb-left"></div><div class="aura-orb orb-center"></div><div class="aura-orb orb-right"></div></div>';
    var header =
      '<header class="topbar">' + auraHtml + '<div class="topbar-in">' +
      '<div class="top-row">' +
      '<a class="logo" href="' + BASE + 'index.html">' + logoGrid() + '<span class="logo-name" id="brandNameText">' + esc(name) + "</span></a>" +
      topSearch +
      '<div class="top-right-widgets">' +
      '<button class="btn-app' + (active === "app" ? " on" : "") + '" id="btnAppNav">📱<span class="app-txt">APP</span></button>' +
      '<button class="lang-pill-btn" id="langBtn" type="button" title="切换语言 / Switch Language">' + globeSvg + '<span class="lang-text" id="langText">中文</span></button>' +
      '<button class="theme-mode-btn" id="darkModeBtn" type="button" title="单击切换日夜 / 长按滑动选12色主题" aria-label="切换日夜或选择主题">' +
      '<svg class="sun-moon-svg" id="sunMoonIcon" viewBox="0 0 24 24">' + sunPaths + "</svg></button>" +
      '<div class="theme-panel-backdrop" id="themeBackdrop"></div>' +
      '<div class="theme-popover-panel" id="themePopover"><div class="panel-header"><span class="panel-title">12色弥散主题</span><span class="panel-hint">滑动或点击选择</span></div><div class="theme-swatch-grid" id="themeSwatchGrid"></div></div>' +
      "</div></div>" +
      '<nav class="nav" id="topNav" data-active="' + ["home", "discover", "today", "hot"].indexOf(active) + '"><span class="nav-glider" aria-hidden="true"></span>' + navHtml +
      '<div class="caterpillar-bar" id="caterpillarBar"></div>' +
      '<button class="btn-ask" id="btnAsk">求片</button>' +
      "</nav></div></header>";
    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.classList.toggle("page-home", active === "home");
    function initCaterpillar() {
      var navEl = document.getElementById("topNav");
      if (!navEl) return;
      var bar = document.getElementById("caterpillarBar");
      var links = navEl.querySelectorAll("a");
      var activeLink = navEl.querySelector("a.on") || links[0];
      function setBar(el, animate) {
        if (!el || !bar) return;
        var r = el.getBoundingClientRect(), nr = navEl.getBoundingClientRect();
        var left = r.left - nr.left + 8;
        var width = Math.max(20, r.width - 16);
        if (!animate) {
          bar.style.transition = "none";
          bar.style.left = left + "px";
          bar.style.width = width + "px";
          bar.offsetHeight;
          bar.style.transition = "";
          return;
        }
        var curL = parseFloat(bar.style.left) || left;
        var curW = parseFloat(bar.style.width) || width;
        if (left > curL) {
          bar.style.transition = "width .2s cubic-bezier(.2,1,.3,1), left .35s cubic-bezier(.25,1,.5,1)";
          bar.style.width = (left - curL + width) + "px";
          setTimeout(function () { bar.style.left = left + "px"; bar.style.width = width + "px"; }, 110);
        } else {
          bar.style.transition = "left .2s cubic-bezier(.2,1,.3,1), width .35s cubic-bezier(.25,1,.5,1)";
          bar.style.left = left + "px";
          bar.style.width = (curL - left + curW) + "px";
          setTimeout(function () { bar.style.width = width + "px"; }, 110);
        }
      }
      setBar(activeLink, false);
      window.addEventListener("resize", function () { setBar(navEl.querySelector("a.on"), false); });
    }
    initCaterpillar();
    var tsForm = document.getElementById("topSearch");
    if (tsForm) tsForm.onsubmit = function (e) {
      e.preventDefault();
      var q = document.getElementById("topSearchInput").value.trim();
      if (q) navigate(BASE + "search/?q=" + encodeURIComponent(q));
    };

    // 右侧联系卡 + 磁吸竖签（按新稿 floating-contact-dock：可拖拽、松手磁吸左右边缘、拉到最外侧或甩向边缘半收起露耳片，点击展开二维码卡）
    if (pres.contact_image) {
      var cc =
        '<div class="contact-card" id="contactCard" style="display:none"><div class="cc-t"><span>保持联系</span>' +
        '<button class="cc-x" id="ccClose">✕</button></div>' +
        '<img src="' + esc(pres.contact_image) + '" alt="二维码">' +
        '<div class="cc-c">' + esc(pres.contact_caption || "扫码加入交流群") + "<br>点击放大查看</div>" +
        '<button type="button" class="cc-ask" id="ccAsk">在线求片</button></div>' +
        '<div class="floating-contact-dock docked-right" id="contactDock" title="可自由拖拽移动，松手自动贴边吸附；点击打开联系我们">' +
        '<span class="dock-stash-ear" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></span>' +
        '<button type="button" class="contact-float-btn" id="contactFloatBtn"><span>保持联系</span></button></div>';
      document.body.insertAdjacentHTML("beforeend", cc);
      var card = document.getElementById("contactCard");
      document.getElementById("ccClose").onclick = function () {
        card.style.display = "none";
        var d = document.getElementById("contactDock");
        if (d) d.style.display = "";
      };
      document.querySelector("#contactCard img").onclick = function () { window.open(pres.contact_image, "_blank"); };
      initContactDock(document.getElementById("contactDock"), function () {
        card.style.display = "block";
        var d = document.getElementById("contactDock");
        if (d) d.style.display = "none";
      });
    }

    // 资源获取弹窗（全站共用）
    document.body.insertAdjacentHTML("beforeend",
      '<div class="overlay" id="accessOv"><div class="dialog">' +
      '<button class="d-x" data-close>✕</button>' +
      '<h3 id="accTitle">获取资源</h3><div class="d-body" id="accBody"></div>' +
      "</div></div>");
    bindClose("accessOv");

    // 站点公告自动弹窗已按 ken 2026-11-06 指示彻底删除（首页公告条保留展示）

    // 求片弹窗（字段与原站 ResourceRequestDialog 一致；原站提交 POST /public/resource-requests，复刻版跨域不可达，本地模拟成功态）
    var ask =
      '<div class="overlay" id="askOv"><div class="dialog">' +
      '<button class="d-x" data-close>✕</button>' +
      '<h3 style="text-align:left;margin-bottom:6px">求片</h3>' +
      '<div style="color:var(--mut);font-size:13.5px;margin-bottom:18px">告诉我们你需要的资源。邮箱选填。</div>' +
      '<div id="askDone" style="display:none"><p style="font-size:15px;margin:8px 0 4px">求片已提交，感谢你的反馈。</p>' +
      '<div class="d-foot"><button class="btn-primary" data-close>完成</button></div></div>' +
      '<form id="askForm"><div class="f-field"><label>需要的资源 <span style="color:var(--faint);font-weight:400;font-size:12px">必填</span></label>' +
      '<textarea id="askResource" rows="3" maxlength="500" required placeholder="填写名称，也可补充年份、季度或版本"></textarea></div>' +
      '<div class="f-field"><label>邮箱 <span style="color:var(--faint);font-weight:400;font-size:12px">选填</span></label>' +
      '<input id="askEmail" type="email" maxlength="254" placeholder="可留空"></div>' +
      '<div class="d-foot"><button type="submit" class="btn-green" id="askSubmit" disabled>提交求片</button></div></form>' +
      "</div></div>";
    document.body.insertAdjacentHTML("beforeend", ask);
    bindClose("askOv");
    document.getElementById("btnAsk").onclick = function () {
      document.getElementById("askDone").style.display = "none";
      document.getElementById("askForm").style.display = "block";
      document.getElementById("askOv").classList.add("open");
    };
    // 联系卡内的在线求片（按原稿：联系窗内含求片）——先关联系卡并恢复竖签，再打开求片弹窗
    var ccAsk = document.getElementById("ccAsk");
    if (ccAsk) ccAsk.onclick = function () {
      document.getElementById("contactCard").style.display = "none";
      var d = document.getElementById("contactDock");
      if (d) d.style.display = "";
      document.getElementById("askDone").style.display = "none";
      document.getElementById("askForm").style.display = "block";
      document.getElementById("askOv").classList.add("open");
    };
    var askRes = document.getElementById("askResource");
    askRes.addEventListener("input", function () {
      document.getElementById("askSubmit").disabled = !askRes.value.trim();
    });
    document.getElementById("askForm").onsubmit = function (e) {
      e.preventDefault();
      document.getElementById("askForm").style.display = "none";
      document.getElementById("askDone").style.display = "block";
    };

    // PWA 安装入口已按新稿收进 APP 页（顶栏不再放安装钮）；beforeinstallprompt 监听在文件末尾，按钮在 renderApp 里绑定
    // 12 色主题 / 日夜 / 语言模块挂接（assets/theme.js，只管外壳偏好）
    if (window.PanTheme) window.PanTheme.bindShell();
  }
  function bindClose(id, after) {
    var ov = document.getElementById(id);
    if (!ov) return;
    ov.addEventListener("click", function (e) {
      if (e.target === ov || e.target.hasAttribute("data-close")) {
        ov.classList.remove("open");
        if (after) after();
      }
    });
  }

  /* ---------------- 搜索栏 ---------------- */
  function searchbarHtml(prefill) {
    return '<form class="searchbar" id="searchForm"><div class="pan-select" id="panSelect">' +
      '<button type="button" class="pan-btn" id="panBtn" aria-haspopup="true" aria-expanded="false">' +
      '<span id="panLabel">全部网盘</span>' +
      '<svg class="car" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">' +
      '<path d="M1 1L5 5L9 1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></button>' +
      '<div class="pan-menu" id="panMenu" role="menu"></div></div>' +
      '<input id="searchInput" placeholder="搜索你想找的资源" value="' + esc(prefill || "") + '" autocomplete="off">' +
      '<button class="btn-search" id="searchBtn" type="submit">搜索</button></form>';
  }
  function bindSearchbar() {
    var form = document.getElementById("searchForm");
    if (!form) return;
    var input = document.getElementById("searchInput");
    var sel = document.getElementById("panSelect");
    var btn = document.getElementById("panBtn");
    var menu = document.getElementById("panMenu");
    var label = document.getElementById("panLabel");
    var providers = [{ n: "全部网盘", id: "" }, { n: "迅雷", id: "xunlei" }, { n: "磁力", id: "magnet" }];
    var urlProv = new URLSearchParams(location.search).get("provider") || "";
    var curPan = providers.some(function (p) { return p.id === urlProv; }) ? urlProv : "";
    var curItem = providers.filter(function (p) { return p.id === curPan; })[0] || providers[0];
    if (label) label.textContent = curItem.n;

    var chkSvg = '<svg class="pan-chk" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">' +
      '<path d="M2 6.2L4.8 9L10 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    function renderMenu() {
      if (!menu) return;
      menu.innerHTML = providers.map(function (p) {
        var act = p.id === curPan ? " active" : "";
        return '<button type="button" class="pan-item' + act + '" data-id="' + p.id + '" role="menuitem">' +
          '<span>' + esc(p.n) + '</span>' + chkSvg + "</button>";
      }).join("");
      Array.prototype.forEach.call(menu.querySelectorAll("button"), function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          curPan = b.dataset.id;
          var match = providers.filter(function (p) { return p.id === curPan; })[0];
          if (label && match) label.textContent = match.n;
          closeMenu();
          renderMenu();
        };
      });
    }

    function openMenu() {
      if (!sel) return;
      sel.classList.add("open");
      if (btn) btn.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      if (!sel) return;
      sel.classList.remove("open");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    if (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        if (sel && sel.classList.contains("open")) {
          closeMenu();
        } else {
          openMenu();
        }
      };
    }
    function docClick(e) { if (sel && !sel.contains(e.target)) closeMenu(); }
    function docKey(e) {
      if (e.key === "Escape" && sel && sel.classList.contains("open")) {
        closeMenu();
        if (btn) btn.focus();
      }
    }
    document.addEventListener("click", docClick);
    document.addEventListener("keydown", docKey);
    onCleanup(function () {
      document.removeEventListener("click", docClick);
      document.removeEventListener("keydown", docKey);
    });

    renderMenu();

    form.onsubmit = function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      navigate(BASE + "search/?q=" + encodeURIComponent(q) + (curPan ? "&provider=" + curPan : ""));
    };
  }

  /* ---------------- 组件：更新行 / 海报卡 ---------------- */
  function updRow(item, idx) {
    var links = item.links || [];
    var pref = links.filter(function (l) { return l.provider === "xunlei"; })[0] || links[0];
    var btn = pref
      ? '<a class="' + panBtnCls(pref.provider) + '" href="' + BASE + "resource/?id=" + esc(pref.id) + '" title="获取' + esc(panName(pref.provider)) + '资源">' + panBtnInner(pref.provider, "获取" + panName(pref.provider) + "资源") + "</a>"
      : "";
    var no = idx != null ? '<span class="upd-no">' + String(idx + 1).padStart(2, "0") + "</span>" : "";
    return '<div class="upd-row">' + no +
      '<div class="upd-main"><div class="upd-title">' + esc(item.note || item.title) + "</div>" +
      '<div class="upd-time">' + fmtTime(item.updated_at) + "</div></div>" + btn + "</div>";
  }
  function posterCard(item) {
    var rankCls = item.rank <= 3 ? "rank top" : "rank";
    // 信息行拆两段：年份·类型可省略截断，TMDB 评分固定在右侧完整显示（整行 nowrap 时评分会被省略号吞掉）
    var meta = item.metadata || "";
    var mi = meta.indexOf(" · TMDB");
    var sHtml = mi >= 0
      ? '<span class="sm">' + esc(meta.slice(0, mi)) + '</span><span class="ss">' + esc(meta.slice(mi + 2).trim()) + "</span>"
      : esc(meta);
    return '<a class="poster" href="' + BASE + "search/?q=" + encodeURIComponent(item.name) + '">' +
      '<div class="ph"><img loading="lazy" src="' + esc(item.poster_url) + '" alt="' + esc(item.name) + '">' +
      '<span class="' + rankCls + '">' + item.rank + "</span></div>" +
      '<div class="meta"><div class="t">' + esc(item.name) + '</div><div class="s">' + sHtml + "</div></div></a>";
  }
  function discItems() { return (state.discovery && state.discovery.items) || []; }
  function typeOf(item) {
    var parts = (item.metadata || "").split("·");
    return parts.length >= 2 ? parts[1].trim() : "";
  }
  function boardPills(el, items, cur, cb) {
    el.innerHTML = items.map(function (it) {
      return '<button class="pill' + (it.id === cur ? " on" : "") + '" data-id="' + it.id + '">' + it.name + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".pill"), function (b) {
      b.onclick = function () { cb(b.dataset.id); };
    });
  }
  var BOARD_CATS = [
    { id: "rec", name: "推荐" }, { id: "电影", name: "电影" }, { id: "剧集", name: "剧集" },
    { id: "动漫", name: "动漫" }, { id: "综艺", name: "综艺" }
  ];
  function boardFilter(cat, kind) {
    var items = discItems();
    var t = kind && kind !== "all" ? kind : (cat === "rec" ? "" : cat);
    if (!t) return items;
    return items.filter(function (it) { return typeOf(it) === t; });
  }
  function tmdbNoteHtml() {
    return '<div class="tmdb-note">TMDB 影片资料来源 · This product uses the TMDB API but is not endorsed or certified by TMDB.</div>' +
      '<details class="about"><summary>关于榜单与分类</summary><p>榜单内容不代表本站资源已收录；评分为 TMDB 用户评分。地区按作品产地归类，合拍作品可能出现在多个分类中。</p></details>';
  }

  /* 热搜词推荐栏（移植新稿 layoutResponsiveHotKeywords 量宽算法）：
     电脑端带「大家都在搜」标签、单行按行宽装 3–10 个整条标签，不滚不截；
     手机端无标签、严格两行均衡装入（3–8 个），整条不截，两行一起横向可滚 */
  function hotChipHtml(it) {
    return '<a class="hot-kw-chip" href="' + BASE + "search/?q=" + encodeURIComponent(it.q) + '"><span>' + esc(it.q) + "</span>" +
      (it.hot ? '<span class="hot-badge-mini">热</span>' : "") + "</a>";
  }
  function layoutHotKeywords() {
    var bar = document.getElementById("hotKeywordsBar");
    var items = window.__panHotItems;
    if (!bar || !items || !items.length) return;
    var sandbox = document.getElementById("kwMeasureSandbox");
    var row1 = document.getElementById("hotKwRow1"), row2 = document.getElementById("hotKwRow2");
    var pcWrap = document.getElementById("hotKwPcWrap");
    if (!sandbox || !row1 || !row2 || !pcWrap) return;
    sandbox.innerHTML = items.map(hotChipHtml).join("");
    var widths = Array.prototype.map.call(sandbox.children, function (n) { return n.offsetWidth || 68; });
    var containerWidth = Math.max(260, bar.clientWidth - 8);
    // 电脑端：标签占位先扣掉，剩余宽度贪心装入
    var lbl = bar.querySelector(".hot-kw-pc .lbl");
    var pcAvail = containerWidth - (lbl ? lbl.offsetWidth + 10 : 0);
    var used = 0, fit = 0;
    for (var i = 0; i < items.length; i++) {
      var w = widths[i] + (i > 0 ? 7 : 0);
      if (used + w <= pcAvail) { used += w; fit++; } else break;
    }
    fit = Math.max(Math.min(3, items.length), Math.min(10, fit));
    pcWrap.innerHTML = items.slice(0, fit).map(hotChipHtml).join("");
    // 手机端：两行均衡装入（与新稿同一套分配规则）
    var mobilePool = items.slice(0, 8), mobileGap = 5;
    var row1Items = [], row2Items = [], w1 = 0, w2 = 0;
    mobilePool.forEach(function (item, idx) {
      var cw = widths[idx] || 60;
      if (w1 + cw <= containerWidth && row1Items.length <= row2Items.length + 1) { row1Items.push(item); w1 += cw + mobileGap; }
      else if (w2 + cw <= containerWidth) { row2Items.push(item); w2 += cw + mobileGap; }
      else if (row1Items.length + row2Items.length < 3) {
        if (w1 <= w2) { row1Items.push(item); w1 += cw + mobileGap; } else { row2Items.push(item); w2 += cw + mobileGap; }
      } else {
        if (w1 <= w2) { row1Items.push(item); w1 += cw + mobileGap; } else { row2Items.push(item); w2 += cw + mobileGap; }
      }
    });
    row1.innerHTML = row1Items.map(hotChipHtml).join("");
    row2.innerHTML = row2Items.map(hotChipHtml).join("");
    if (!window.__panKwResizeBound) {
      window.__panKwResizeBound = true;
      window.addEventListener("resize", layoutHotKeywords);
    }
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var main = document.getElementById("main");
    var pres = state.site.presentation || {};
    var content = state.site.content || {};
    var hotItems = state.hot.slice(0, 10).map(function (h, i) {
      return { q: h.query, hot: i < 3 };
    });
    window.__panHotItems = hotItems;
    var hotBar =
      '<div class="hot-keywords-bar" id="hotKeywordsBar">' +
      '<div class="hot-kw-pc"><span class="lbl">大家都在搜</span><div class="hot-kw-pc-wrap" id="hotKwPcWrap"></div></div>' +
      '<div class="hot-kw-mobile-wrap" id="hotKwMobileWrap"><div class="hot-kw-mobile-row" id="hotKwRow1"></div><div class="hot-kw-mobile-row" id="hotKwRow2"></div></div>' +
      '<div class="kw-measure-sandbox" id="kwMeasureSandbox" aria-hidden="true"></div></div>';
    var html =
      '<section class="hero"><div class="aura-backdrop" aria-hidden="true"><div class="aura-orb orb-left"></div><div class="aura-orb orb-center"></div><div class="aura-orb orb-right"></div></div>' +
      '<div class="hero-badge">⚡ 夸克网盘搜索 · 迅雷会员特权直达 · 磁力聚合</div>' +
      '<h1>好内容，<span class="b">一搜就有</span></h1>' +
      searchbarHtml("") +
      hotBar + "</section>";
    if (content.announcement_enabled && content.announcement) {
      html += '<div class="announce"><div class="announce-in"><span class="ic">📣</span><b>站点公告</b><span>' +
        esc(content.announcement) + "</span></div></div>";
    }
    // 两栏：每日更新 + 热门搜索
    var upd8 = state.updates.slice(0, 8).map(function (it, i) { return updRow(it, i); }).join("");
    var hot9 = state.hot.slice(0, 9).map(function (h, i) {
      return '<div class="hot-row"><span class="hot-rank">' + (i + 1) + '</span>' +
        '<span class="hot-name"><a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a></span>" +
        (i < 3 ? '<span class="tag-hot">热</span>' : "") + "</div>";
    }).join("");
    html += '<div class="section"><div class="cols">' +
      '<div class="card"><div class="card-head"><span class="ic ic-green">🕐</span><div><h2>每日更新</h2>' +
      '<div class="desc">新发布与追更内容，随时发现更新</div></div>' +
      '<a class="more" href="' + BASE + 'today/">全部更新 →</a></div>' + upd8 +
      '<div class="card-foot"><a href="' + BASE + 'today/">浏览每日更新 →</a></div></div>' +
      '<div class="card"><div class="card-head"><span class="ic ic-orange">🔥</span><div><h2>热门搜索</h2>' +
      '<div class="desc">看看大家正在寻找什么</div></div>' +
      '<a class="more" href="' + BASE + 'hot/">全部 →</a></div>' + hot9 + "</div>" +
      "</div></div>";
    // 热播榜
    html += '<div class="section"><div class="card" style="padding:24px 26px">' +
      '<div class="board-head"><div><h2>热播榜</h2><div style="color:var(--mut);font-size:13px;margin-top:3px">从热门榜单，发现下一部好内容</div></div>' +
      '<a class="more" href="' + BASE + 'discover/">发现更多 →</a></div>' +
      '<div class="filters">' +
      '<div class="frow"><span class="fl">影视分类</span><span id="fCat"></span></div>' +
      '<div class="frow"><span class="fl">内容</span><span id="fKind"></span></div>' +
      '<div class="frow"><span class="fl">排序</span><span id="fSort"></span></div></div>' +
      '<div class="poster-grid" id="boardGrid"></div>' +
      tmdbNoteHtml() +
      "</div></div>";
    main.innerHTML = html;
    bindSearchbar();
    layoutHotKeywords();
    // 导航签按 ken 2026-11-07 指示放回顶栏原位：首页不再移签，顶栏导航与子页面同款分段控件
    var curCat = "rec", curKind = "all";
    function drawBoard() {
      var items = boardFilter(curCat, curKind);
      document.getElementById("boardGrid").innerHTML =
        (items.slice(0, 16).map(function (it) { return posterCard(it); }).join("") ||
         '<div style="color:var(--faint);font-size:14px;padding:12px 0">该分类暂无快照数据</div>');
      boardPills(document.getElementById("fCat"), BOARD_CATS, curCat, function (id) { curCat = id; drawBoard(); });
      boardPills(document.getElementById("fKind"),
        [{ id: "all", name: "全部" }, { id: "电影", name: "电影" }, { id: "剧集", name: "剧集" }], curKind,
        function (id) { curKind = id; drawBoard(); });
      boardPills(document.getElementById("fSort"),
        [{ id: "week", name: "本周热门" }, { id: "day", name: "今日热门" }], "week",
        function () { drawBoard(); });
    }
    drawBoard();
  }

  /* ---------------- 热播榜页 ---------------- */
  function renderDiscover() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var curCat = "rec", curKind = "all";
    var items0 = discItems();
    var updLine = "";
    if (items0.length && items0[0].collected_at) {
      var cd = new Date(items0[0].collected_at);
      var bj = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(cd).replace(/\//g, "/");
      updLine = '<div style="color:var(--faint);font-size:13px;margin-top:14px">更新于 ' + bj + " 00:00</div>";
    }
    main.innerHTML =
      '<div class="page-head"><h1>发现</h1><div class="desc">近期值得关注的影视作品。</div></div>' +
      '<div class="card" style="padding:24px 26px;margin-top:14px">' +
      '<div class="filters">' +
      '<div class="frow"><span class="fl">影视分类</span><span id="dCat"></span></div>' +
      '<div class="frow"><span class="fl">内容</span><span id="dKind"></span></div>' +
      '<div class="frow"><span class="fl">排序</span><span id="dSort"></span></div></div>' +
      '<div class="poster-grid" id="dGrid"></div>' +
      tmdbNoteHtml() + updLine + "</div>";
    function draw() {
      var items = boardFilter(curCat, curKind);
      document.getElementById("dGrid").innerHTML =
        (items.map(function (it) { return posterCard(it); }).join("") ||
         '<div style="color:var(--faint);font-size:14px;padding:12px 0">该分类暂无快照数据</div>');
      boardPills(document.getElementById("dCat"), BOARD_CATS, curCat, function (id) { curCat = id; draw(); });
      boardPills(document.getElementById("dKind"),
        [{ id: "all", name: "全部" }, { id: "电影", name: "电影" }, { id: "剧集", name: "剧集" }], curKind,
        function (id) { curKind = id; draw(); });
      boardPills(document.getElementById("dSort"),
        [{ id: "week", name: "本周热门" }, { id: "day", name: "今日热门" }], "week",
        function () { draw(); });
    }
    draw();
  }

  /* ---------------- 每日更新页 ---------------- */
  function renderToday() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var per = 24, view = "list", kw = "", pan = "xunlei";
    var GRID_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></svg>';
    var LIST_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>';
    var items = state.updates.slice(), total = state.updatesTotal, curPage = 1, shown = per;
    main.innerHTML =
      '<div class="page-head page-head-flex"><div><h1>每日更新</h1><div class="desc">新发布与追更内容 · 共 ' +
      '<span id="tTotal">' + total + "</span> 项</div></div>" +
      '</div>' +
      '<div class="today-tools"><div class="t-search"><input id="tKw" placeholder="搜索每日更新">' +
      '<button class="btn-small blue" id="tSearchBtn">搜索</button><button class="btn-small view-toggle-btn" id="tViewBtn" type="button" aria-label="切换视图" title="切换视图"></button></div></div>' +
      '<div class="frow" style="margin:4px 0 14px"><span id="tPan"></span></div>' +
      '<div id="tBody"></div><div class="more-row" id="tMore"></div>';
    function localFilter(list) {
      return list.filter(function (it) {
        if (kw && (it.note || "").indexOf(kw) < 0 && (it.title || "").indexOf(kw) < 0) return false;
        if (pan && !(it.links || []).some(function (l) { return l.provider === pan; })) return false;
        return true;
      });
    }
    function fetchPage(p, replace, done) {
      if (!state.live) { if (done) done(); return; }
      var qs = "?page=" + p + "&page_size=" + per +
        (kw ? "&q=" + encodeURIComponent(kw) : "") +
        (pan ? "&provider=" + encodeURIComponent(pan) : "");
      apiGet("/updates" + qs).then(function (d) {
        total = d.total != null ? d.total : total;
        curPage = p;
        items = replace ? (d.items || []) : items.concat(d.items || []);
        if (replace) { shown = per; tLoadFailed = false; }
        document.getElementById("tTotal").textContent = total;
        if (done) done();
        draw();
      }).catch(function () { if (done) done(); /* 保留现有列表 */ });
    }
    /* 触底加载（借鉴 ai-shop 店铺目录的哨兵模式）：哨兵进入视口前 300px 自动加载下一批，
       带加载中特效与在途锁，不再用「加载更多 / 下一页」按钮 */
    var tLoading = false, tObserver = null, tLoadFailed = false;
    function hasMoreNow() {
      var list = state.live ? items : localFilter(items);
      return shown < list.length || (state.live && items.length < total);
    }
    function loadMore() {
      if (tLoading || !hasMoreNow()) return;
      tLoading = true;
      var spin = document.getElementById("tLoading");
      if (spin) spin.style.display = "";
      function finish() { tLoading = false; shown += per; draw(); }
      if (state.live && shown >= items.length && items.length < total) {
        var before = items.length;
        fetchPage(curPage + 1, false, function () {
          tLoading = false;
          if (items.length > before) { shown += per; tLoadFailed = false; }
          else tLoadFailed = true; /* 拉取失败不空转重试，draw 里给一次点击重试 */
        });
      } else {
        setTimeout(finish, 300);
      }
    }
    if (typeof IntersectionObserver !== "undefined") {
      tObserver = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) loadMore();
      }, { rootMargin: "300px" });
    }
    onCleanup(function () { if (tObserver) tObserver.disconnect(); });
    function tgCard(it) {
      var links = it.links || [];
      var pref = links.filter(function (l) { return l.provider === pan; })[0] || links[0];
      var btn = pref ? '<a class="' + panBtnCls(pref.provider) + '" href="' + BASE + "resource/?id=" + esc(pref.id) + '" title="' + esc(panName(pref.provider)) + '">' + panBtnInner(pref.provider, panName(pref.provider)) + "</a>" : "";
      return '<div class="tg-card"><h3>' + esc(it.title || "") + '</h3><div class="tg-note">' + esc(it.note || "") +
        '</div><div class="tg-time">' + fmtTime(it.updated_at) + "</div>" + btn + "</div>";
    }
    function draw() {
      var list = state.live ? items : localFilter(items);
      var slice = list.slice(0, shown);
      var body = document.getElementById("tBody");
      var emptyTxt = state.live ? "无符合条件的更新" : "快照内无符合条件的更新";
      if (view === "list") {
        body.className = "card";
        body.innerHTML = slice.map(function (it, i) { return updRow(it, i); }).join("") ||
          '<div style="color:var(--faint);padding:16px 0">' + emptyTxt + "</div>";
      } else {
        body.className = "today-grid";
        body.innerHTML = slice.map(tgCard).join("") ||
          '<div style="color:var(--faint);padding:16px 0">' + emptyTxt + "</div>";
      }
      var more = document.getElementById("tMore");
      if (hasMoreNow() && tLoadFailed) {
        if (tObserver) tObserver.disconnect();
        more.innerHTML = '<button class="btn-small" id="tRetry">加载失败，点此重试</button>';
        document.getElementById("tRetry").onclick = function () { tLoadFailed = false; draw(); };
      } else if (hasMoreNow()) {
        more.innerHTML = '<div id="tSentinel" style="height:1px"></div>' +
          '<div id="tLoading" class="loadspin" style="display:none"><span class="spinner"></span>加载中…</div>';
        var sent = document.getElementById("tSentinel");
        if (tObserver && sent) { tObserver.disconnect(); tObserver.observe(sent); }
        else if (sent) loadMore(); /* 无 IntersectionObserver 时直接续载一批兜底 */
      } else {
        if (tObserver) tObserver.disconnect();
        more.innerHTML = list.length ? '<span style="color:var(--faint);font-size:13.5px">已展示全部 ' + (state.live ? total : list.length) + " 条</span>" : "";
      }
      boardPills(document.getElementById("tPan"),
        [{ id: "", name: "全部" }, { id: "xunlei", name: "迅雷" }, { id: "magnet", name: "磁力" }], pan,
        function (id) {
          pan = id; shown = per;
          if (state.live) fetchPage(1, true); else draw();
        });
      var tvb = document.getElementById("tViewBtn");
      if (tvb) tvb.innerHTML = view === "list" ? GRID_SVG : LIST_SVG;
    }
    document.getElementById("tViewBtn").onclick = function () { view = view === "list" ? "grid" : "list"; draw(); };
    document.getElementById("tSearchBtn").onclick = function () {
      kw = document.getElementById("tKw").value.trim(); shown = per;
      if (state.live) fetchPage(1, true); else draw();
    };
    draw();
  }

  /* ---------------- 热搜榜页 ---------------- */
  function renderHot() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var cells = state.hot.map(function (h, i) {
      var cnt = h.search_count != null ? Number(h.search_count).toLocaleString("en-US") + " 次搜索" : "";
      return '<div class="hot-cell"><span class="hot-rank">' + (i + 1) + '</span>' +
        '<div class="hc-main"><div class="hc-name"><a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a></div>" +
        '<div class="hc-sub">查看相关资源</div></div>' +
        '<span class="hot-count">' + cnt + "</span></div>";
    }).join("");
    main.innerHTML =
      '<div class="page-head"><h1>热搜榜</h1><div class="desc">查看站内用户最近搜索最多的内容。</div></div>' +
      '<div class="card" style="margin-top:14px"><div class="hot-grid">' + cells + "</div></div>";
  }

  /* ---------------- 搜索页 ---------------- */
  function renderSearch() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var q = new URLSearchParams(location.search).get("q") || "";
    var prov0 = new URLSearchParams(location.search).get("provider") || "";
    var html = '<section class="hero" style="padding-top:36px"><div class="aura-backdrop" aria-hidden="true"><div class="aura-orb orb-left"></div><div class="aura-orb orb-center"></div><div class="aura-orb orb-right"></div></div>' + searchbarHtml(q) + "</section>";
    if (!q) {
      html += '<div class="section"><div class="card"><div class="card-head"><span class="ic ic-orange">🔥</span>' +
        "<div><h2>热门搜索</h2></div></div>" +
        state.hot.map(function (h, i) {
          return '<div class="hot-row"><span class="hot-rank">' + (i + 1) + '</span><span class="hot-name">' +
            '<a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a></span></div>";
        }).join("") + "</div></div>";
      main.innerHTML = html; bindSearchbar(); return;
    }
    // 快照结果（兜底用）：与实时同页渲染，实时可用时隐藏
    var hits = state.updates.filter(function (it) {
      return (it.title && it.title.indexOf(q) >= 0) || (it.note && it.note.indexOf(q) >= 0);
    });
    var discs = discItems().filter(function (it) { return it.name.indexOf(q) >= 0; });
    var snapHtml = "";
    if (!hits.length && !discs.length) {
      snapHtml = '<div class="empty">快照内暂无相关资源，去<a href="' + ORIGIN + "/search?q=" +
        encodeURIComponent(q) + '" target="_blank" rel="noopener" style="color:var(--blue)">原站搜索</a>看看</div>';
    }
    discs.forEach(function (it) {
      snapHtml += '<div class="res-row"><div class="res-main"><div class="res-title">' + esc(it.name) +
        '</div><div class="res-note">' + esc((it.summary || "").slice(0, 80)) + '</div>' +
        '<div class="res-meta">' + esc(it.metadata || "") + "</div></div>" +
        '<a class="btn-pan" href="' + ORIGIN + "/search?q=" + encodeURIComponent(it.name) +
        '" target="_blank" rel="noopener">去原站搜索</a></div>';
    });
    hits.forEach(function (it) {
      var chips = (it.links || []).map(function (l) {
        return '<a class="' + panBtnCls(l.provider) + '" href="' + BASE + "resource/?id=" + esc(l.id) + '" title="获取' + esc(panName(l.provider)) + '资源">' + panBtnInner(l.provider, "获取" + panName(l.provider) + "资源") + "</a>";
      }).join(" ");
      snapHtml += '<div class="res-row"><div class="res-main"><div class="res-title">' + esc(it.title || "") +
        '</div><div class="res-note">' + esc(it.note || "") + '</div>' +
        '<div class="res-meta">' + fmtTime(it.updated_at) + "</div></div>" +
        (chips ? '<div class="res-chips">' + chips + "</div>" : "") + "</div>";
    });

    if (!state.live || !relayReady() || typeof EventSource === "undefined") {
      html += '<div class="section"><div class="page-head" style="padding-top:6px"><h1 style="font-size:22px">“' +
        esc(q) + '” 的搜索结果</h1><div class="desc">快照内共找到 ' + (hits.length + discs.length) + ' 条</div></div>' +
        snapHtml + "</div>";
      main.innerHTML = html; bindSearchbar(); return;
    }

    /* ---- 实时流式搜索：与原站同口径 /api/search/stream（本站 + 外部聚合源陆续推送） ---- */
    html += '<div class="section"><div class="page-head" style="padding-top:6px"><h1 style="font-size:22px">“' +
      esc(q) + '” 的搜索结果</h1><div class="desc" id="searchDesc">正在搜索，结果将陆续显示…</div></div>' +
      '<div class="filters" id="streamFilters" style="margin-bottom:14px"></div>' +
      '<div id="streamSuggest"></div>' +
      '<div id="streamResults"><div class="empty">正在搜索，请稍候…</div></div>' +
      '<div id="snapResults" style="display:none">' + snapHtml + "</div></div>";
    main.innerHTML = html; bindSearchbar();

    var items = [], byId = {}, providers = [], curProv = prov0, done = false, failed = false;
    function dispText(it) { return it.mine ? (it.note || it.title || "") : (it.title || it.note || ""); }
    function hl(text) {
      var t = esc(text), k = esc(q);
      if (!k || t.indexOf(k) < 0) return t;
      return t.split(k).join("<mark>" + k + "</mark>");
    }
    function rowHtml(it) {
      var invalid = it.health_status === "INVALID";
      var mainText = dispText(it);
      var sub = (it.title && it.note && it.title !== it.note) ? it.note : "";
      var tag = it.mine ? '<span class="res-tag res-tag-mine">本站</span>'
        : (it.result_source && it.result_source !== "local" ? '<span class="res-tag res-tag-ext">外部</span>' : "");
      var href, target = "";
      if (it.provider === "magnet" && String(it.id).indexOf("magnet:") === 0) {
        href = "magnet:?xt=urn:btih:" + it.id.slice(7); target = ' target="_blank" rel="noopener"';
      } else {
        href = BASE + "resource/?id=" + encodeURIComponent(it.id);
      }
      return '<div class="res-row"><div class="res-main"><div class="res-title">' + hl(mainText) + tag + "</div>" +
        (sub ? '<div class="res-note">' + esc(sub) + "</div>" : "") +
        '<div class="res-meta">' + esc(panName(it.provider)) + "网盘 · " + fmtTime(it.discovered_at) +
        (invalid ? " · 已失效" : "") + "</div></div>" +
        (invalid ? '<span class="btn-pan" style="opacity:.45">已失效</span>'
                 : '<button class="' + panBtnCls(it.provider) + '" type="button" data-acc="' + esc(it.id) + '" title="获取' + esc(panName(it.provider)) + '资源">' + panBtnInner(it.provider, "获取" + panName(it.provider) + "资源") + "</button>") + "</div>";
    }
    function paint() {
      var box = document.getElementById("streamResults");
      if (!box) return;
      var counts = {};
      items.forEach(function (it) { counts[it.provider] = (counts[it.provider] || 0) + 1; });
      var provs = providers.length ? providers : Object.keys(counts);
      var fhtml = '<div class="frow"><span class="fl">网盘</span><span class="pills-x"><button class="pill' + (curProv ? "" : " on") +
        '" data-prov="">全部（' + items.length + "）</button>";
      provs.forEach(function (p) {
        fhtml += '<button class="pill' + (curProv === p ? " on" : "") + '" data-prov="' + esc(p) + '">' +
          esc(panName(p)) + "（" + (counts[p] || 0) + "）</button>";
      });
      fhtml += "</span></div>";
      var fbox = document.getElementById("streamFilters");
      if (fbox) {
        fbox.innerHTML = fhtml;
        Array.prototype.forEach.call(fbox.querySelectorAll(".pill"), function (b) {
          b.onclick = function () { curProv = b.getAttribute("data-prov") || ""; paint(); };
        });
      }
      var list = curProv ? items.filter(function (it) { return it.provider === curProv; }) : items;
      box.innerHTML = list.length ? list.map(rowHtml).join("")
        : (done ? '<div class="empty">没有找到相关资源，可以精简关键词，或换个名称再试试。</div>'
                : '<div class="empty">正在搜索，请稍候…</div>');
      var desc = document.getElementById("searchDesc");
      if (desc) desc.textContent = done ? "共 " + items.length + " 条结果"
        : "正在搜索…已找到 " + items.length + " 条，结果将陆续显示";
      Array.prototype.forEach.call(box.querySelectorAll("[data-acc]"), function (b) {
        b.onclick = function () {
          var it = byId[b.getAttribute("data-acc")];
          if (it) openAccess({ id: it.id, provider: it.provider, mine: it.mine, title: dispText(it) });
        };
      });
      Array.prototype.forEach.call(box.querySelectorAll(".res-row"), function (row) {
        row.style.cursor = "pointer";
        row.onclick = function (e) {
          if (e.target.closest("button, a")) return;
          var btn = row.querySelector("[data-acc], a.btn-pan");
          if (btn) btn.click();
        };
      });
    }
    function failover() {
      if (failed) return; failed = true;
      var snap = document.getElementById("snapResults");
      var box = document.getElementById("streamResults");
      var desc = document.getElementById("searchDesc");
      if (!items.length) {
        if (box) box.style.display = "none";
        if (snap) snap.style.display = "";
        if (desc) desc.textContent = "实时搜索暂时不可用，以下为快照结果";
      }
    }
    var es;
    try {
      es = new EventSource(RELAY + "/api/search/stream?q=" + encodeURIComponent(q));
    } catch (e) { failover(); return; }
    var timer = setTimeout(function () { if (!done && !items.length) { try { es.close(); } catch (e) {} failover(); } }, 40000);
    onCleanup(function () { done = true; clearTimeout(timer); try { es.close(); } catch (e) {} });
    es.addEventListener("start", function (e) {
      try { providers = JSON.parse(e.data).providers || []; } catch (err) {}
      paint();
    });
    es.addEventListener("items", function (e) {
      var d; try { d = JSON.parse(e.data); } catch (err) { return; }
      (d.items || []).forEach(function (it) {
        it.result_source = it.result_source || d.source;
        var old = byId[it.id];
        if (old) {
          var keepLocal = old.result_source === "local" ? "local" : it.result_source;
          items[items.indexOf(old)] = it; byId[it.id] = it; it.result_source = keepLocal === "local" ? old.result_source : it.result_source;
        } else { byId[it.id] = it; items.push(it); }
      });
      paint();
    });
    es.addEventListener("suggestions", function (e) {
      var d; try { d = JSON.parse(e.data); } catch (err) { return; }
      var qs = (d.queries || []).filter(function (s) { return typeof s === "string"; }).slice(0, 3);
      var box = document.getElementById("streamSuggest");
      if (box && qs.length) {
        box.innerHTML = '<div class="res-note" style="margin-bottom:12px">你是不是在找：' + qs.map(function (s) {
          return '<a href="' + BASE + "search/?q=" + encodeURIComponent(s) + '" style="color:var(--blue)">' + esc(s) + "</a>";
        }).join(" · ") + "</div>";
      }
    });
    es.addEventListener("complete", function () {
      done = true; clearTimeout(timer);
      try { es.close(); } catch (e) {}
      if (!items.length) failover(); else paint();
    });
    es.onerror = function () {
      if (!done && !items.length) { clearTimeout(timer); try { es.close(); } catch (e) {} failover(); }
    };
  }

  /* ---------------- 资源详情页 ---------------- */
  function renderResource() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var id = new URLSearchParams(location.search).get("id") || "";
    function paint(title, note, provider, timeText, valid) {
      main.innerHTML =
        '<div class="page-head"><h1>' + esc(title || "资源详情") + "</h1>" +
        '<div class="desc">' + esc(note || "") + "</div></div>" +
        '<div class="card"><div class="res-meta" style="font-size:14px;line-height:2.1">' +
        "网盘类型：" + esc(panName(provider)) + "网盘<br>更新时间：" + esc(timeText || "") +
        "<br>资源状态：" + (valid === false ? "失效" : "有效") + "</div>" +
        '<div style="margin-top:18px"><button class="btn-primary" id="resGet" type="button">' + panBtnInner(provider, "获取" + panName(provider) + "资源") + '</button>' +
        '<a href="' + ORIGIN + "/resource/" + esc(id) + '" target="_blank" rel="noopener" style="margin-left:14px;color:var(--blue)">原站页面</a></div></div>';
      var rg = document.getElementById("resGet");
      if (rg) rg.onclick = function () { openAccess({ id: id, provider: provider, title: title }); };
    }
    function fromSnapshot() {
      var found = null, provider = "";
      state.updates.forEach(function (it) {
        (it.links || []).forEach(function (l) { if (l.id === id) { found = it; provider = l.provider; } });
      });
      if (!found) {
        main.innerHTML = '<div class="page-head"><h1>资源详情</h1></div><div class="empty">该资源不在本次快照内，' +
          '可前往<a href="' + ORIGIN + "/resource/" + esc(id) + '" target="_blank" rel="noopener" style="color:var(--blue)">原站查看</a></div>';
        return;
      }
      paint(found.title, found.note, provider, fmtTime(found.updated_at), true);
    }
    if (state.live && id) {
      main.innerHTML = '<div class="page-head"><h1>资源详情</h1></div><div class="empty">正在加载…</div>';
      apiGet("/resources/" + encodeURIComponent(id)).then(function (d) {
        paint(d.title, d.note, d.provider,
          fmtTime(d.updated_at || d.last_discovered_at),
          d.health_status ? d.health_status === "VALID" : true);
      }).catch(fromSnapshot);
    } else {
      fromSnapshot();
    }
  }

  /* ---------------- APP 页 ---------------- */
  function renderApp() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var app = state.appInfo || {};
    var appUrl = location.href;
    var sdkMap = { 26: "8.0", 27: "8.1", 28: "9", 29: "10", 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15" };
    var params = [];
    if (app.versionName) params.push("v" + app.versionName);
    if (app.sizeBytes) params.push((app.sizeBytes / 1024).toFixed(0) + " KB");
    if (app.minSdk) params.push("Android " + (sdkMap[app.minSdk] || app.minSdk) + " 及以上");
    var dlBtn = app.apkUrl
      ? '<a class="btn-outline" href="' + esc(app.apkUrl) + '">下载安卓版 ↓</a>'
      : '<button class="btn-outline" disabled style="opacity:.5">安装包暂不可用</button>';
    main.innerHTML =
      '<div class="page-head"><h1>APP 下载</h1><div class="desc">安卓客户端 · 苹果桌面版</div></div>' +
      '<div class="cols cols-app" style="margin-top:18px">' +
      '<div class="card"><h2 style="font-size:19px;margin:0 0 4px">安卓客户端</h2>' +
      '<div style="color:var(--mut);font-size:13.5px">网盘直达 · 本地历史</div>' +
      '<div style="color:var(--faint);font-size:13px;margin:12px 0 18px">' + esc(params.join(" · ")) + "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn-primary" style="display:inline-block" href="' + ORIGIN + '/app" target="_blank" rel="noopener">打开 APP · 连接本站 →</a>' + dlBtn + "</div>" +
      '<p style="color:var(--mut);font-size:13.5px;line-height:1.8;margin:16px 0 0">首次安装后，回到这里点「打开 APP」，确认连接本站。</p>' +
      '<details class="about"><summary>打开或安装遇到问题？</summary><p>安装时按系统提示允许当前浏览器安装应用。<br>已安装但打不开，可「换一种方式打开」。<br>后续在 APP「设置 → 检查更新」升级，安装时需系统确认。</p></details></div>' +
      '<div class="card"><h2 style="font-size:19px;margin:0 0 4px">苹果桌面版</h2>' +
      '<div style="color:var(--mut);font-size:13.5px">本站图标 · 随网站更新</div>' +
      '<div style="margin:12px 0 18px"><span class="tag-hot" style="font-size:12px;padding:4px 10px">网页版 · 无需自签</span></div>' +
      '<a class="btn-primary" style="display:inline-block" href="' + ORIGIN + '/api/public/app/ios.mobileconfig">下载桌面版 ↓</a>' +
      '<div><button class="btn-install" id="btnInstall" type="button">安装到桌面</button></div>' +
      '<p style="color:var(--mut);font-size:13.5px;line-height:1.8;margin:16px 0 0">下载后打开「设置 → 已下载描述文件 → 安装」。</p>' +
      '<details class="about"><summary>也可以直接添加到主屏幕</summary><p>用 Safari 或支持此功能的 Chrome 打开本站，在分享菜单中选择「添加到主屏幕」。<br>描述文件仅添加本站图标，系统可能显示「未签名」。<br>桌面版使用网页，网盘唤起以手机实际支持为准。</p></details></div>' +
      "</div>" +
      '<div class="card" style="max-width:520px;margin:24px auto 0;text-align:center;padding:28px">' +
      '<img src="https://api.qrserver.com/v1/create-qr-code/?size=168x168&data=' + encodeURIComponent(appUrl) +
      '" alt="本站 APP 下载页面二维码" style="width:168px;height:168px" onerror="this.style.display=\'none\'">' +
      '<div style="font-weight:800;font-size:16px;margin-top:12px">用手机扫码打开</div>' +
      '<div style="color:var(--mut);font-size:13.5px;margin-top:5px">在手机上下载，连接本站。</div></div>';
    // PWA 安装钮（从顶栏收进本页）：浏览器已给出安装提示、或 iOS 未安装时才显示；已安装（standalone）不显示
    var btnInstall = document.getElementById("btnInstall");
    if (btnInstall) {
      var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
      var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
      if (!standalone && (window.__panInstallPrompt || isIos)) btnInstall.classList.add("show");
      btnInstall.onclick = function () {
        var p = window.__panInstallPrompt;
        if (p) {
          window.__panInstallPrompt = null;
          p.prompt();
          p.userChoice.then(function (c) {
            if (c && c.outcome === "accepted") btnInstall.classList.remove("show");
            else window.__panInstallPrompt = p;
          }).catch(function () {});
        } else {
          toast("在浏览器分享菜单里点「添加到主屏幕」，即可像 APP 一样打开");
        }
      };
    }
  }

  /* ---------------- 申请友链页 ---------------- */
  function renderApply() {
    var main = document.querySelector("#main .wrap") || document.getElementById("main");
    var s = state.friend || {};
    if (s.enabled === false) {
      main.innerHTML = '<div style="padding-top:26px"><a href="' + BASE + 'index.html" style="color:var(--blue)">← 返回首页</a>' +
        '<div class="page-head"><h1>' + esc(s.title || "申请友情链接") + '</h1></div><div class="empty">本站暂未开放友情链接申请。</div></div>';
      return;
    }
    var siteInfo = "";
    if (s.site_name || s.site_url) {
      siteInfo = '<div class="card" style="margin-bottom:20px"><h2 style="font-size:17px;margin:0 0 10px">本站信息</h2>' +
        '<div style="line-height:2;color:#374151;font-size:14.5px">名称：' + esc(s.site_name || "") + "<br>网址：" + esc(s.site_url || "") +
        (s.site_description ? "<br>" + esc(s.site_description) : "") +
        (s.contact ? "<br>联系：" + esc(s.contact) : "") + "</div></div>";
    }
    main.innerHTML =
      '<div style="padding-top:26px"><a href="' + BASE + 'index.html" style="color:var(--blue)">← 返回首页</a>' +
      '<div class="page-head"><h1>' + esc(s.title || "申请友情链接") + "</h1></div>" +
      (s.requirements ? '<div class="card" style="margin-bottom:20px"><h2 style="font-size:17px;margin:0 0 10px">收录要求</h2>' +
        '<p style="margin:0;color:#374151;font-size:14.5px;line-height:1.9">' + esc(s.requirements) + "</p></div>" : "") +
      siteInfo +
      '<form class="form-card" id="applyForm" style="max-width:820px"><h2 style="font-size:17px;margin:0 0 18px">提交申请</h2>' +
      '<div class="form-grid">' +
      '<div class="f-field"><label>网站名称</label><input name="name" required maxlength="80"></div>' +
      '<div class="f-field"><label>网站网址</label><input name="url" type="url" required maxlength="2048" placeholder="https://"></div>' +
      '<div class="f-field"><label>图标网址（可选）</label><input name="logo_url" type="url" maxlength="2048"></div>' +
      '<div class="f-field"><label>联系方式（仅管理员可见）</label><input name="contact" maxlength="200"></div>' +
      '<div class="f-field full"><label>网站简介</label><textarea name="description" rows="3" maxlength="500"></textarea></div></div>' +
      '<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
      (s.footer_hint ? '<p style="color:var(--faint);font-size:13px;margin:4px 0 16px">' + esc(s.footer_hint) + "</p>" : "") +
      '<button class="btn-primary" type="submit">提交申请</button></form></div>';
    document.getElementById("applyForm").onsubmit = function (e) {
      e.preventDefault();
      document.getElementById("applyForm").outerHTML =
        '<div class="form-card" role="status" style="color:#374151;font-size:15px">申请已提交，等待管理员审核。通过后会在本站友情链接区展示。</div>';
    };
  }

  /* ---------------- PWA：Service Worker 注册 + 安装提示捕获 ---------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(BASE + "sw.js", { updateViaCache: "none" })
        .then(function (r) { r.update(); })
        .catch(function () {});
    });
  }
  window.__panInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.__panInstallPrompt = e;
    var b = document.getElementById("btnInstall");
    if (b) b.classList.add("show");
  });
  window.addEventListener("appinstalled", function () {
    window.__panInstallPrompt = null;
    var b = document.getElementById("btnInstall");
    if (b) b.classList.remove("show");
  });

  /* ---------------- 启动 ---------------- */
  // 外壳只依赖站点配置：先到先渲染；各页只等自己需要的数据，不再全站等齐 6 个接口。
  var page = document.body.getAttribute("data-page") || "home";
  function absDiscovery(d) {
    (d && d.items || []).forEach(function (it) { it.poster_url = absolutize(it.poster_url); });
    return d || {};
  }
  function fillUpdates(u) {
    state.updates = (u && u.items) || [];
    state.updatesTotal = (u && u.total) || state.updates.length;
    state.updatesPage = 1;
  }
  /* ================= SPA 路由（ken 2026-11-07 定：全站单页化） =================
     外壳（顶栏/竖签/弹窗）只渲染一次；站内跳转拦截链接、pushState 改址、就地换视图，
     前进/返回恢复视图与滚动位置；页面级副作用（搜索流、触底观察器、文档监听）离页时统一清理 */
  var TITLES = {
    home: "基德盘搜 - 网盘资源搜索引擎 | 夸克百度阿里迅雷全平台",
    discover: "影视榜单与热门剧集 - 基德盘搜",
    today: "今日更新 - 基德盘搜",
    hot: "热搜榜 - 基德盘搜",
    search: "搜索资源 - 基德盘搜",
    resource: "资源详情 - 基德盘搜",
    app: "基德盘搜 APP - 基德盘搜",
    apply: "申请友情链接 - 基德盘搜"
  };
  var VARIANT_B = ["discover", "hot", "apply", "search", "resource"];
  var cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }
  function runCleanups() {
    var fns = cleanups; cleanups = [];
    fns.forEach(function (f) { try { f(); } catch (e) {} });
  }
  var dataCache = {};
  function getHot() {
    if (dataCache.hot) { state.hot = dataCache.hot; return Promise.resolve(); }
    return liveOr("/hot-searches?limit=50", "hot").then(function (h) { dataCache.hot = h || []; state.hot = dataCache.hot; });
  }
  function getUpdates() {
    if (dataCache.updates) { fillUpdates(dataCache.updates); return Promise.resolve(); }
    return liveOr("/updates?page=1&page_size=24", "updates").then(function (u) { dataCache.updates = u; fillUpdates(u); });
  }
  function getDiscovery() {
    if (dataCache.discovery) { state.discovery = dataCache.discovery; return Promise.resolve(); }
    return liveOr("/discovery?limit=40&source=tmdb", "discovery").then(function (d) { dataCache.discovery = absDiscovery(d); state.discovery = dataCache.discovery; });
  }
  function getFriend() {
    if (dataCache.friend) { state.friend = dataCache.friend; return Promise.resolve(); }
    return liveOr("/friend-link-settings", "friend").then(function (f) { dataCache.friend = f || {}; state.friend = dataCache.friend; });
  }
  function getApp() {
    if (dataCache.app) { state.appInfo = dataCache.app; return Promise.resolve(); }
    var appLive = relayReady()
      ? fetch(RELAY + "/app/android/latest.json").then(function (r) { return r.json(); }).catch(function () { return load("app"); })
      : load("app").catch(function () { return {}; });
    return appLive.then(function (a) { dataCache.app = a || {}; state.appInfo = dataCache.app; });
  }
  function loadAndRender(key, seq) {
    /* 渲染前必须确认这次导航仍是最新一次：数据谁先回不一定，旧视图的数据迟到时
       不许再往 #main 里写，否则会出现标签高亮与正文对不上的错位（2026-11-09 实测定位） */
    function live(fn) { return function () { if (seq === renderSeq) fn(); }; }
    if (key === "home") return Promise.all([getHot(), getUpdates(), getDiscovery()]).then(live(renderHome));
    if (key === "search") return Promise.all([getHot(), getUpdates(), getDiscovery()]).then(live(renderSearch));
    if (key === "discover") return getDiscovery().then(live(renderDiscover));
    if (key === "today") return getUpdates().then(live(renderToday));
    if (key === "hot") return getHot().then(live(renderHot));
    if (key === "resource") return load("updates").then(function (u) { fillUpdates(u); if (seq === renderSeq) renderResource(); }).catch(function () { if (seq === renderSeq) renderResource(); });
    if (key === "app") return getApp().then(live(renderApp));
    if (key === "apply") return getFriend().then(live(renderApply));
    renderHome();
    return Promise.resolve();
  }
  function routeKeyFromUrl(u) {
    var p = u.pathname, root = new URL(BASE).pathname;
    if (/\/friend-links\/apply\/?$/.test(p)) return "apply";
    if (/\/discover\/?$/.test(p)) return "discover";
    if (/\/today\/?$/.test(p)) return "today";
    if (/\/hot\/?$/.test(p)) return "hot";
    if (/\/search\/?$/.test(p)) return "search";
    if (/\/resource\/?$/.test(p)) return "resource";
    if (/\/app\/?$/.test(p)) return "app";
    if (p === root || p === root + "index.html") return "home";
    return null;
  }
  function updateShell(key) {
    document.body.setAttribute("data-page", key);
    document.body.classList.toggle("page-home", key === "home");
    document.title = TITLES[key] || "基德盘搜";
    var nav = document.getElementById("topNav");
    if (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
        var k = null;
        try { k = routeKeyFromUrl(new URL(a.href)); } catch (e) {}
        a.classList.toggle("on", k === key);
      });
      nav.setAttribute("data-active", ["home", "discover", "today", "hot"].indexOf(key));
    }
    var appBtn = document.getElementById("btnAppNav");
    if (appBtn) appBtn.classList.toggle("on", key === "app");
    var needTs = VARIANT_B.indexOf(key) >= 0;
    var ts = document.getElementById("topSearch");
    if (needTs && !ts) {
      var row = document.querySelector(".top-row");
      if (row) {
        var form = document.createElement("form");
        form.className = "top-search"; form.id = "topSearch";
        form.innerHTML = '<input id="topSearchInput" placeholder="搜索你想找的资源" autocomplete="off"><button type="submit">搜索</button>';
        row.insertBefore(form, row.querySelector(".top-right-widgets"));
        form.onsubmit = function (e) {
          e.preventDefault();
          var q = document.getElementById("topSearchInput").value.trim();
          if (q) navigate(BASE + "search/?q=" + encodeURIComponent(q));
        };
      }
    } else if (!needTs && ts) {
      ts.parentNode.removeChild(ts);
    }
  }
  function mountReset(key) {
    var m = document.getElementById("main");
    if (m) m.innerHTML = key === "home" ? "" : '<div class="wrap"></div>';
  }
  var routerReady = false, currentKey = null, lastHref = location.href, renderedHref = location.href, scrollCache = {};
  var renderSeq = 0;
  function navigate(url, push) {
    var u;
    try { u = new URL(url, location.href); } catch (e) { location.href = url; return; }
    if (!routerReady || u.origin !== location.origin) { location.href = u.href; return; }
    var key = routeKeyFromUrl(u);
    if (!key) { location.href = u.href; return; }
    /* 同址判断必须比「当前已渲染的地址」而非 location.href：popstate 触发时浏览器已先改址，
       拿 location.href 比会把所有返回/前进都误判成同页而吞掉（2026-11-07 本地实测定位） */
    if (push !== false && u.href === renderedHref) { window.scrollTo(0, 0); return; }
    runCleanups();
    if (push !== false) history.pushState({ pan: 1 }, "", u.href);
    lastHref = u.href;
    renderedHref = u.href;
    currentKey = key;
    updateShell(key);
    mountReset(key);
    var seq = ++renderSeq;
    loadAndRender(key, seq).then(function () {
      if (seq !== renderSeq) return;
      if (push === false) window.scrollTo(0, scrollCache[u.href] || 0);
      else window.scrollTo(0, 0);
    });
  }
  function installRouter() {
    routerReady = true;
    currentKey = page;
    lastHref = location.href;
    renderedHref = location.href;
    try { history.replaceState({ pan: 1 }, "", location.href); } catch (e) {}
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
      var u;
      try { u = new URL(href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin) return;
      if (!routeKeyFromUrl(u)) return;
      e.preventDefault();
      navigate(u.href, true);
    });
    window.addEventListener("popstate", function () { navigate(location.href, false); });
    window.addEventListener("scroll", function () { scrollCache[lastHref] = window.scrollY; }, { passive: true });
    var appBtn = document.getElementById("btnAppNav");
    if (appBtn) appBtn.addEventListener("click", function () { navigate(BASE + "app/"); });
  }

  liveOr("/site", "site", function () { state.live = true; }).then(function (siteRes) {
    state.site = siteRes || {};
    if (state.site.presentation) state.site.presentation.contact_image = absolutize(state.site.presentation.contact_image);
    renderShell(page);
    currentKey = page;
    loadAndRender(page, ++renderSeq).then(function () { installRouter(); });
  });
})();
