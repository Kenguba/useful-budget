/* 基德盘搜复刻 — 共享外壳 + 各页渲染（数据来自 data/ 快照） */
(function () {
  "use strict";
  var BASE = window.NASPT_BASE || "";
  var ORIGIN = "https://naspt.vip";
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
  var state = { site: null, hot: [], updates: [], updatesTotal: 0, discovery: {}, friend: {}, appInfo: {} };

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
    var header =
      '<header class="topbar"><div class="topbar-in">' +
      '<a class="logo" href="' + BASE + 'index.html">' + logoGrid() + esc(name) + "</a>" +
      topSearch +
      '<nav class="nav">' + navHtml +
      '<button class="btn-app" onclick="location.href=\'' + BASE + "app/'\">APP</button>" +
      '<button class="btn-ask" id="btnAsk">求片</button>' +
      "</nav></div></header>";
    var friends = (site.friend_links || []).filter(function (f) { return f.enabled !== false; });
    var friendHtml = friends.map(function (f) {
      return '友情链接：<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + "</a>";
    }).join("<br>");
    var year = content.copyright_year || 2026;
    var footer =
      '<footer class="footer"><div class="footer-in"><div class="footer-top">' +
      '<div><div class="flogo">' + logoGrid() + esc(name) + "</div>" +
      '<div class="ftitle">' + esc((site.site && site.site.introduction) || "") + "</div></div>" +
      '<div class="footer-right">' + friendHtml +
      "<div>本站提供资源检索与分享导航，资源来自公开网络。</div></div></div>" +
      '<div class="footer-bottom"><a href="' + BASE + 'today/">每日更新</a>' +
      '<a href="' + BASE + 'friend-links/apply/">申请友情链接</a>' +
      '<span class="cp">© ' + year + " " + esc(name) + "</span></div>" +
      "</div></footer>";
    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", footer);
    var tsForm = document.getElementById("topSearch");
    if (tsForm) tsForm.onsubmit = function (e) {
      e.preventDefault();
      var q = document.getElementById("topSearchInput").value.trim();
      if (q) location.href = BASE + "search/?q=" + encodeURIComponent(q);
    };

    // 右侧联系卡
    if (pres.contact_image) {
      var cc =
        '<div class="contact-card" id="contactCard"><div class="cc-t"><span>保持联系</span>' +
        '<button class="cc-x" id="ccClose">✕</button></div>' +
        '<img src="' + esc(pres.contact_image) + '" alt="二维码">' +
        '<div class="cc-c">' + esc(pres.contact_caption || "扫码加入交流群") + "<br>点击放大查看</div></div>" +
        '<button class="contact-mini" id="contactMini">保持联系</button>';
      document.body.insertAdjacentHTML("beforeend", cc);
      document.getElementById("ccClose").onclick = function () {
        document.getElementById("contactCard").style.display = "none";
        document.getElementById("contactMini").style.display = "block";
      };
      document.getElementById("contactMini").onclick = function () {
        document.getElementById("contactCard").style.display = "block";
        this.style.display = "none";
      };
      document.querySelector("#contactCard img").onclick = function () { window.open(pres.contact_image, "_blank"); };
    }

    // 公告弹窗（每会话一次）
    if (pres.popup_enabled && !sessionStorage.getItem("naspt_popup_seen")) {
      var link = extractPopupLink(pres);
      var bodyHtml = esc(pres.popup_content || "").replace(/\n/g, "<br>");
      if (link) bodyHtml = bodyHtml.replace("点我进群", '<a href="' + esc(link) + '" target="_blank" rel="noopener">点我进群</a>');
      var ov =
        '<div class="overlay open" id="popupOv"><div class="dialog">' +
        '<button class="d-x" data-close>✕</button>' +
        "<h3>" + esc(pres.popup_title || "站点公告") + "</h3>" +
        '<div class="d-body">' + bodyHtml + "</div>" +
        '<div class="d-foot"><button class="btn-primary" data-close>我知道了</button></div>' +
        "</div></div>";
      document.body.insertAdjacentHTML("beforeend", ov);
      bindClose("popupOv", function () { sessionStorage.setItem("naspt_popup_seen", "1"); });
    }

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
    var askRes = document.getElementById("askResource");
    askRes.addEventListener("input", function () {
      document.getElementById("askSubmit").disabled = !askRes.value.trim();
    });
    document.getElementById("askForm").onsubmit = function (e) {
      e.preventDefault();
      document.getElementById("askForm").style.display = "none";
      document.getElementById("askDone").style.display = "block";
    };
  }
  function extractPopupLink(pres) {
    try {
      var stack = [pres.popup_rich_text];
      while (stack.length) {
        var n = stack.pop();
        if (!n || typeof n !== "object") continue;
        if (n.marks) for (var i = 0; i < n.marks.length; i++)
          if (n.marks[i].type === "link" && n.marks[i].attrs && n.marks[i].attrs.href) return n.marks[i].attrs.href;
        for (var k in n) stack.push(n[k]);
      }
    } catch (e) { /* ignore */ }
    return "";
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
    return '<form class="searchbar" id="searchForm"><div class="pan-select">' +
      '<button type="button" class="pan-btn" id="panBtn"><span id="panLabel">全部网盘</span><span class="car">∨</span></button>' +
      '<div class="pan-menu" id="panMenu"></div></div>' +
      '<input id="searchInput" placeholder="搜索你想找的资源" value="' + esc(prefill || "") + '" autocomplete="off">' +
      '<button class="btn-search" id="searchBtn" type="submit">搜索</button></form>';
  }
  function bindSearchbar() {
    var form = document.getElementById("searchForm");
    if (!form) return;
    var input = document.getElementById("searchInput");
    var menu = document.getElementById("panMenu");
    var label = document.getElementById("panLabel");
    var providers = ["全部网盘", "迅雷", "磁力"];
    menu.innerHTML = providers.map(function (p) { return '<button type="button">' + p + "</button>"; }).join("");
    document.getElementById("panBtn").onclick = function (e) { e.stopPropagation(); menu.classList.toggle("open"); };
    document.addEventListener("click", function () { menu.classList.remove("open"); });
    Array.prototype.forEach.call(menu.querySelectorAll("button"), function (b) {
      b.onclick = function () { label.textContent = b.textContent; menu.classList.remove("open"); };
    });
    form.onsubmit = function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      location.href = BASE + "search/?q=" + encodeURIComponent(q);
    };
  }

  /* ---------------- 组件：更新行 / 海报卡 ---------------- */
  function updRow(item, idx) {
    var links = item.links || [];
    var pref = links.filter(function (l) { return l.provider === "xunlei"; })[0] || links[0];
    var btn = pref
      ? '<a class="btn-pan" href="' + BASE + "resource/?id=" + esc(pref.id) + '">获取' + esc(panName(pref.provider)) + "资源</a>"
      : "";
    var no = idx != null ? '<span class="upd-no">' + String(idx + 1).padStart(2, "0") + "</span>" : "";
    return '<div class="upd-row">' + no +
      '<div class="upd-main"><div class="upd-title">' + esc(item.note || item.title) + "</div>" +
      '<div class="upd-time">' + fmtTime(item.updated_at) + "</div></div>" + btn + "</div>";
  }
  function posterCard(item) {
    var rankCls = item.rank <= 3 ? "rank top" : "rank";
    return '<a class="poster" href="' + BASE + "search/?q=" + encodeURIComponent(item.name) + '">' +
      '<div class="ph"><img loading="lazy" src="' + esc(item.poster_url) + '" alt="' + esc(item.name) + '">' +
      '<span class="' + rankCls + '">' + item.rank + "</span></div>" +
      '<div class="meta"><div class="t">' + esc(item.name) + '</div><div class="s">' + esc(item.metadata || "") + "</div></div></a>";
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

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var main = document.getElementById("main");
    var pres = state.site.presentation || {};
    var content = state.site.content || {};
    var hotTop = state.hot.slice(0, 4).map(function (h) {
      return '<a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a>";
    }).join("");
    var html =
      '<section class="hero"><h1>好内容，<span class="b">一搜就有。</span></h1>' +
      '<p class="sub">' + esc(pres.hero_subtitle || "夸克网盘搜索") + "</p>" +
      searchbarHtml("") +
      '<div class="hotline"><span class="lbl">大家都在搜</span>' + hotTop + "</div></section>";
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
    var main = document.getElementById("main");
    var curCat = "rec", curKind = "all";
    var items0 = discItems();
    var updLine = "";
    if (items0.length && items0[0].collected_at) {
      var cd = new Date(items0[0].collected_at);
      var bj = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(cd).replace(/\//g, "/");
      updLine = '<div style="color:var(--faint);font-size:13px;margin-top:14px">更新于 ' + bj + " 00:00</div>";
    }
    main.innerHTML =
      '<div class="page-head page-head-flex"><div><h1>发现</h1><div class="desc">近期值得关注的影视作品。</div></div>' +
      '<a class="back" href="' + BASE + 'index.html">返回首页 →</a></div>' +
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
    var main = document.getElementById("main");
    var per = 24, shown = per, view = "list", kw = "", pan = "xunlei";
    main.innerHTML =
      '<div class="page-head page-head-flex"><div><h1>每日更新</h1><div class="desc">新发布与追更内容 · 共 ' +
      state.updatesTotal + " 项</div></div>" +
      '<div class="view-toggle"><button id="vList" class="on">条目视图</button><button id="vGrid">网格视图</button></div></div>' +
      '<div class="today-tools"><div class="t-search"><input id="tKw" placeholder="搜索每日更新">' +
      '<button class="btn-small blue" id="tSearchBtn">搜索</button><button class="btn-small" id="tRefresh">刷新</button></div></div>' +
      '<div class="frow" style="margin:4px 0 14px"><span class="fl" style="color:var(--mut);font-size:13.5px;width:64px">网盘筛选</span><span id="tPan"></span></div>' +
      '<div id="tBody"></div><div class="more-row" id="tMore"></div>';
    function filtered() {
      return state.updates.filter(function (it) {
        if (kw && (it.note || "").indexOf(kw) < 0 && (it.title || "").indexOf(kw) < 0) return false;
        if (pan && !(it.links || []).some(function (l) { return l.provider === pan; })) return false;
        return true;
      });
    }
    function tgCard(it) {
      var links = it.links || [];
      var pref = links.filter(function (l) { return l.provider === pan; })[0] || links[0];
      var btn = pref ? '<a class="btn-pan" href="' + BASE + "resource/?id=" + esc(pref.id) + '">' + esc(panName(pref.provider)) + "</a>" : "";
      return '<div class="tg-card"><h3>' + esc(it.title || "") + '</h3><div class="tg-note">' + esc(it.note || "") +
        '</div><div class="tg-time">' + fmtTime(it.updated_at) + "</div>" + btn + "</div>";
    }
    function draw() {
      var list = filtered();
      var slice = list.slice(0, shown);
      var body = document.getElementById("tBody");
      if (view === "list") {
        body.className = "card";
        body.innerHTML = slice.map(function (it, i) { return updRow(it, i); }).join("") ||
          '<div style="color:var(--faint);padding:16px 0">快照内无符合条件的更新</div>';
      } else {
        body.className = "today-grid";
        body.innerHTML = slice.map(tgCard).join("") ||
          '<div style="color:var(--faint);padding:16px 0">快照内无符合条件的更新</div>';
      }
      var more = document.getElementById("tMore");
      if (shown < list.length) {
        more.innerHTML = '<button class="btn-small" id="tLoadMore">加载更多</button>' +
          '<a class="next" href="javascript:void(0)" id="tNext">下一页 →</a>';
        document.getElementById("tLoadMore").onclick = function () { shown += per; draw(); };
        document.getElementById("tNext").onclick = function () {
          shown = Math.min(list.length, shown + per); draw();
          document.getElementById("tBody").scrollIntoView();
        };
      } else {
        more.innerHTML = list.length ? '<span style="color:var(--faint);font-size:13.5px">已展示快照内全部 ' + list.length + " 条</span>" : "";
      }
      boardPills(document.getElementById("tPan"),
        [{ id: "xunlei", name: "迅雷" }, { id: "magnet", name: "磁力" }, { id: "", name: "全部" }], pan,
        function (id) { pan = id; shown = per; draw(); });
      document.getElementById("vList").className = view === "list" ? "on" : "";
      document.getElementById("vGrid").className = view === "grid" ? "on" : "";
    }
    document.getElementById("vList").onclick = function () { view = "list"; draw(); };
    document.getElementById("vGrid").onclick = function () { view = "grid"; draw(); };
    document.getElementById("tSearchBtn").onclick = function () {
      kw = document.getElementById("tKw").value.trim(); shown = per; draw();
    };
    document.getElementById("tRefresh").onclick = function () {
      kw = ""; document.getElementById("tKw").value = ""; shown = per; draw();
    };
    draw();
  }

  /* ---------------- 热搜榜页 ---------------- */
  function renderHot() {
    var main = document.getElementById("main");
    var cells = state.hot.map(function (h, i) {
      var cnt = h.search_count != null ? Number(h.search_count).toLocaleString("en-US") + " 次搜索" : "";
      return '<div class="hot-cell"><span class="hot-rank">' + (i + 1) + '</span>' +
        '<div class="hc-main"><div class="hc-name"><a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a></div>" +
        '<div class="hc-sub">查看相关资源</div></div>' +
        '<span class="hot-count">' + cnt + "</span></div>";
    }).join("");
    main.innerHTML =
      '<div class="page-head page-head-flex"><div><h1>热搜榜</h1><div class="desc">查看站内用户最近搜索最多的内容。</div></div>' +
      '<a class="back" href="' + BASE + 'index.html">返回首页 →</a></div>' +
      '<div class="card" style="margin-top:14px"><div class="hot-grid">' + cells + "</div></div>";
  }

  /* ---------------- 搜索页 ---------------- */
  function renderSearch() {
    var main = document.getElementById("main");
    var q = new URLSearchParams(location.search).get("q") || "";
    var html = '<section class="hero" style="padding-top:36px">' + searchbarHtml(q) + "</section>";
    if (!q) {
      html += '<div class="section"><div class="card"><div class="card-head"><span class="ic ic-orange">🔥</span>' +
        "<div><h2>热门搜索</h2></div></div>" +
        state.hot.map(function (h, i) {
          return '<div class="hot-row"><span class="hot-rank">' + (i + 1) + '</span><span class="hot-name">' +
            '<a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a></span></div>";
        }).join("") + "</div></div>";
      main.innerHTML = html; bindSearchbar(); return;
    }
    var hits = state.updates.filter(function (it) {
      return (it.title && it.title.indexOf(q) >= 0) || (it.note && it.note.indexOf(q) >= 0);
    });
    var discs = discItems().filter(function (it) { return it.name.indexOf(q) >= 0; });
    html += '<div class="section"><div class="page-head" style="padding-top:6px"><h1 style="font-size:22px">“' +
      esc(q) + '” 的搜索结果</h1><div class="desc">快照内共找到 ' + (hits.length + discs.length) +
      ' 条；全站结果请到<a href="' + ORIGIN + "/search?q=" + encodeURIComponent(q) +
      '" target="_blank" rel="noopener" style="color:var(--blue)">原站搜索</a></div></div>';
    if (!hits.length && !discs.length) {
      html += '<div class="empty">快照内暂无相关资源，去<a href="' + ORIGIN + "/search?q=" +
        encodeURIComponent(q) + '" target="_blank" rel="noopener" style="color:var(--blue)">原站搜索</a>看看</div>';
    }
    discs.forEach(function (it) {
      html += '<div class="res-row"><div class="res-main"><div class="res-title">' + esc(it.name) +
        '</div><div class="res-note">' + esc((it.summary || "").slice(0, 80)) + '</div>' +
        '<div class="res-meta">' + esc(it.metadata || "") + "</div></div>" +
        '<a class="btn-pan" href="' + ORIGIN + "/search?q=" + encodeURIComponent(it.name) +
        '" target="_blank" rel="noopener">去原站搜索</a></div>';
    });
    hits.forEach(function (it) {
      var chips = (it.links || []).map(function (l) {
        return '<a class="btn-pan" href="' + BASE + "resource/?id=" + esc(l.id) + '">获取' + esc(panName(l.provider)) + "资源</a>";
      }).join(" ");
      html += '<div class="res-row"><div class="res-main"><div class="res-title">' + esc(it.title || "") +
        '</div><div class="res-note">' + esc(it.note || "") + '</div>' +
        '<div class="res-meta">' + fmtTime(it.updated_at) + "</div></div>" + chips + "</div>";
    });
    html += "</div>";
    main.innerHTML = html;
    bindSearchbar();
  }

  /* ---------------- 资源详情页 ---------------- */
  function renderResource() {
    var main = document.getElementById("main");
    var id = new URLSearchParams(location.search).get("id") || "";
    var found = null, provider = "";
    state.updates.forEach(function (it) {
      (it.links || []).forEach(function (l) { if (l.id === id) { found = it; provider = l.provider; } });
    });
    if (!found) {
      main.innerHTML = '<div class="page-head"><h1>资源详情</h1></div><div class="empty">该资源不在本次快照内，' +
        '可前往<a href="' + ORIGIN + "/resource/" + esc(id) + '" target="_blank" rel="noopener" style="color:var(--blue)">原站查看</a></div>';
      return;
    }
    main.innerHTML =
      '<div class="page-head"><h1>' + esc(found.title || "") + "</h1>" +
      '<div class="desc">' + esc(found.note || "") + "</div></div>" +
      '<div class="card"><div class="res-meta" style="font-size:14px;line-height:2.1">' +
      "网盘类型：" + esc(panName(provider)) + "网盘<br>更新时间：" + fmtTime(found.updated_at) +
      '<br>资源状态：有效</div>' +
      '<div style="margin-top:18px"><a class="btn-primary" style="display:inline-block" href="' + ORIGIN +
      "/resource/" + esc(id) + '" target="_blank" rel="noopener">前往原站获取资源</a></div></div>';
  }

  /* ---------------- APP 页 ---------------- */
  function renderApp() {
    var main = document.getElementById("main");
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
      '<div class="cols" style="grid-template-columns:1fr 1fr;margin-top:18px">' +
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
      '<p style="color:var(--mut);font-size:13.5px;line-height:1.8;margin:16px 0 0">下载后打开「设置 → 已下载描述文件 → 安装」。</p>' +
      '<details class="about"><summary>也可以直接添加到主屏幕</summary><p>用 Safari 或支持此功能的 Chrome 打开本站，在分享菜单中选择「添加到主屏幕」。<br>描述文件仅添加本站图标，系统可能显示「未签名」。<br>桌面版使用网页，网盘唤起以手机实际支持为准。</p></details></div>' +
      "</div>" +
      '<div class="card" style="max-width:520px;margin:24px auto 0;text-align:center;padding:28px">' +
      '<img src="https://api.qrserver.com/v1/create-qr-code/?size=168x168&data=' + encodeURIComponent(appUrl) +
      '" alt="本站 APP 下载页面二维码" style="width:168px;height:168px" onerror="this.style.display=\'none\'">' +
      '<div style="font-weight:800;font-size:16px;margin-top:12px">用手机扫码打开</div>' +
      '<div style="color:var(--mut);font-size:13.5px;margin-top:5px">在手机上下载，连接本站。</div></div>';
  }

  /* ---------------- 申请友链页 ---------------- */
  function renderApply() {
    var main = document.getElementById("main");
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

  /* ---------------- 启动 ---------------- */
  var page = document.body.getAttribute("data-page") || "home";
  Promise.all([
    load("site").catch(function () { return {}; }),
    load("hot").catch(function () { return []; }),
    load("updates").catch(function () { return { items: [], total: 0 }; }),
    load("discovery").catch(function () { return {}; }),
    load("friend").catch(function () { return {}; }),
    load("app").catch(function () { return {}; })
  ]).then(function (res) {
    state.site = res[0] || {};
    state.hot = res[1] || [];
    state.updates = (res[2] && res[2].items) || [];
    state.updatesTotal = (res[2] && res[2].total) || state.updates.length;
    state.discovery = res[3] || {};
    state.friend = res[4] || {};
    state.appInfo = res[5] || {};
    renderShell(page);
    ({ home: renderHome, discover: renderDiscover, today: renderToday, hot: renderHot,
       search: renderSearch, resource: renderResource, app: renderApp, apply: renderApply }[page] || renderHome)();
    document.title = document.title || "基德盘搜";
  });
})();
