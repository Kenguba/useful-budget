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
    var header =
      '<header class="topbar"><div class="topbar-in">' +
      '<a class="logo" href="' + BASE + 'index.html">' + logoGrid() + esc(name) + "</a>" +
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
      "<div>本站资源均来自公开网络，仅供学习交流</div></div></div>" +
      '<div class="footer-bottom"><a href="' + BASE + 'today/">每日更新</a>' +
      '<a href="' + BASE + 'friend-links/apply/">申请友情链接</a>' +
      '<span class="cp">© ' + year + " " + esc(name) + "</span></div>" +
      "</div></footer>";
    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", footer);

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
      '<div class="d-foot"><button type="submit" class="btn-primary" id="askSubmit" disabled>提交求片</button></div></form>' +
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
  function posterCard(item, chName) {
    var rankCls = item.rank <= 3 ? "rank top" : "rank";
    var sub = [item.year, chName].filter(Boolean).join(" · ");
    return '<a class="poster" href="' + BASE + "search/?q=" + encodeURIComponent(item.name) + '">' +
      '<div class="ph"><img loading="lazy" src="' + esc(item.poster_url) + '" alt="' + esc(item.name) + '">' +
      '<span class="' + rankCls + '">' + item.rank + "</span></div>" +
      '<div class="meta"><div class="t">' + esc(item.name) + '</div><div class="s">' + esc(sub) + "</div></div></a>";
  }
  function chName(id) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].id === id) return CHANNELS[i].name;
    return "";
  }
  function mergedDiscovery() {
    var all = [];
    CHANNELS.forEach(function (c) {
      (state.discovery[c.id] || []).forEach(function (it) { all.push(it); });
    });
    all.sort(function (a, b) { return a.rank - b.rank; });
    return all;
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
      '<div class="board-head"><h2>热播榜</h2><a class="more" href="' + BASE + 'discover/">发现更多 →</a></div>' +
      '<div class="filters">' +
      '<div class="frow"><span class="fl">影视分类</span><span id="fCat"></span></div>' +
      '<div class="frow"><span class="fl">内容</span><span id="fKind"></span></div>' +
      '<div class="frow"><span class="fl">排序</span><span id="fSort"></span></div></div>' +
      '<div class="poster-grid" id="boardGrid"></div>' +
      '<div class="tmdb-note">This product uses the TMDB API but is not endorsed or certified by TMDB.</div>' +
      '<details class="about"><summary>关于榜单与分类</summary><p>榜单按原站公开数据快照展示，分类含电影、剧集、动漫、综艺与短剧；海报来自原站公开接口。</p></details>' +
      "</div></div>";
    main.innerHTML = html;
    bindSearchbar();
    var cats = [{ id: "rec", name: "推荐" }].concat(CHANNELS);
    var curCat = "rec";
    function pills(el, items, cur, cb) {
      el.innerHTML = items.map(function (it) {
        return '<button class="pill' + (it.id === cur ? " on" : "") + '" data-id="' + it.id + '">' + it.name + "</button>";
      }).join("");
      Array.prototype.forEach.call(el.querySelectorAll(".pill"), function (b) {
        b.onclick = function () { cb(b.dataset.id); };
      });
    }
    function drawBoard() {
      var items = curCat === "rec" ? mergedDiscovery() : (state.discovery[curCat] || []);
      document.getElementById("boardGrid").innerHTML = items.slice(0, 16).map(function (it) {
        return posterCard(it, chName(it.channel));
      }).join("");
      pills(document.getElementById("fCat"), cats, curCat, function (id) { curCat = id; drawBoard(); });
    }
    pills(document.getElementById("fKind"),
      [{ id: "all", name: "全部" }, { id: "movie", name: "电影" }, { id: "tv", name: "剧集" }], "all",
      function (id) { curCat = id === "all" ? "rec" : id; drawBoard(); });
    pills(document.getElementById("fSort"),
      [{ id: "week", name: "本周热门" }, { id: "day", name: "今日热门" }], "week",
      function () { drawBoard(); });
    drawBoard();
  }

  /* ---------------- 热播榜页 ---------------- */
  function renderDiscover() {
    var main = document.getElementById("main");
    var cur = "movie";
    main.innerHTML =
      '<div class="page-head"><h1>热播榜</h1><div class="desc">近期热门电影、剧集、动漫、综艺与短剧榜单</div></div>' +
      '<div class="tabs" id="dTabs"></div><div class="poster-grid" id="dGrid" style="grid-template-columns:repeat(5,1fr)"></div>' +
      '<div class="tmdb-note">This product uses the TMDB API but is not endorsed or certified by TMDB.</div>';
    function draw() {
      var tabs = document.getElementById("dTabs");
      tabs.innerHTML = CHANNELS.map(function (c) {
        return '<button class="pill' + (c.id === cur ? " on" : "") + '" data-id="' + c.id + '">' + c.name + "</button>";
      }).join("");
      Array.prototype.forEach.call(tabs.querySelectorAll(".pill"), function (b) {
        b.onclick = function () { cur = b.dataset.id; draw(); };
      });
      document.getElementById("dGrid").innerHTML = (state.discovery[cur] || []).map(function (it) {
        return posterCard(it, chName(it.channel));
      }).join("");
    }
    draw();
  }

  /* ---------------- 每日更新页 ---------------- */
  function renderToday() {
    var main = document.getElementById("main");
    var per = 24, page = 1;
    var totalPages = Math.max(1, Math.ceil(state.updates.length / per));
    main.innerHTML =
      '<div class="page-head"><h1>每日更新</h1><div class="desc">新发布与追更内容（快照 ' +
      state.updates.length + " 条 / 原站共 " + state.updatesTotal + " 条）</div></div>" +
      '<div class="card" id="tList"></div><div class="pager" id="tPager"></div>';
    function draw() {
      var rows = state.updates.slice((page - 1) * per, page * per)
        .map(function (it, i) { return updRow(it, (page - 1) * per + i); }).join("");
      document.getElementById("tList").innerHTML = rows;
      var p = '<button id="pgPrev"' + (page <= 1 ? " disabled" : "") + ">上一页</button>";
      for (var i = 1; i <= totalPages; i++)
        p += '<button data-p="' + i + '"' + (i === page ? ' class="on"' : "") + ">" + i + "</button>";
      p += '<button id="pgNext"' + (page >= totalPages ? " disabled" : "") + ">下一页</button>";
      var pg = document.getElementById("tPager");
      pg.innerHTML = p;
      Array.prototype.forEach.call(pg.querySelectorAll("[data-p]"), function (b) {
        b.onclick = function () { page = +b.dataset.p; draw(); window.scrollTo(0, 0); };
      });
      var pv = document.getElementById("pgPrev"), nx = document.getElementById("pgNext");
      if (pv) pv.onclick = function () { if (page > 1) { page--; draw(); window.scrollTo(0, 0); } };
      if (nx) nx.onclick = function () { if (page < totalPages) { page++; draw(); window.scrollTo(0, 0); } };
    }
    draw();
  }

  /* ---------------- 热搜榜页 ---------------- */
  function renderHot() {
    var main = document.getElementById("main");
    var rows = state.hot.map(function (h, i) {
      return '<div class="hot-row"><span class="hot-rank">' + (i + 1) + '</span>' +
        '<span class="hot-name"><a href="' + BASE + "search/?q=" + encodeURIComponent(h.query) + '">' + esc(h.query) + "</a></span>" +
        (i < 3 ? '<span class="tag-hot">热</span>' : "") +
        '<span class="hot-count">' + (h.search_count != null ? h.search_count + " 次搜索" : "") + "</span></div>";
    }).join("");
    main.innerHTML =
      '<div class="page-head"><h1>热搜榜</h1><div class="desc">站内近期搜索热度较高的影视与网盘资源</div></div>' +
      '<div class="card">' + rows + "</div>";
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
    var discs = mergedDiscovery().filter(function (it) { return it.name.indexOf(q) >= 0; });
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
        '<div class="res-meta">' + esc([it.year, chName(it.channel)].filter(Boolean).join(" · ")) + "</div></div>" +
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
    var appUrl = location.origin + location.pathname;
    var size = app.sizeBytes ? " · " + (app.sizeBytes / 1024).toFixed(0) + " KB" : "";
    var ver = app.versionName ? " v" + app.versionName : "";
    var apkBtn = app.apkUrl
      ? '<a class="btn-primary" style="display:inline-block" href="' + esc(app.apkUrl) + '">下载安卓客户端' + ver + size + "</a>"
      : '<button class="btn-primary" disabled style="opacity:.5">安装包暂不可用</button>';
    main.innerHTML =
      '<div class="page-head"><h1>APP 下载</h1><div class="desc">下载安卓客户端，或将本站添加到苹果手机桌面。</div></div>' +
      '<div class="card" style="max-width:680px;text-align:center;padding:30px 28px">' +
      '<img src="https://api.qrserver.com/v1/create-qr-code/?size=168x168&data=' + encodeURIComponent(appUrl) +
      '" alt="本站 APP 下载页面二维码" style="width:168px;height:168px" onerror="this.style.display=\'none\'">' +
      '<div style="color:var(--mut);font-size:13.5px;margin-top:10px">手机扫码打开本页</div></div>' +
      '<div class="cols" style="grid-template-columns:1fr 1fr;max-width:880px;margin-top:24px">' +
      '<div class="card"><h2 style="font-size:18px;margin:0 0 4px">🤖 安卓客户端</h2>' +
      '<div class="desc" style="color:var(--mut);font-size:13px;margin-bottom:16px">网盘直达 · 本地历史</div>' + apkBtn + "</div>" +
      '<div class="card"><h2 style="font-size:18px;margin:0 0 4px">🍎 苹果桌面版</h2>' +
      '<div class="desc" style="color:var(--mut);font-size:13px;margin-bottom:10px">本站图标 · 随网站更新</div>' +
      '<div style="margin-bottom:16px"><span class="tag-hot" style="font-size:12px;padding:4px 10px">网页版 · 无需自签</span></div>' +
      '<a class="btn-primary" style="display:inline-block" href="' + ORIGIN + '/api/public/app/ios.mobileconfig">下载桌面版</a></div>' +
      "</div>";
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
      '<form class="form-card" id="applyForm"><h2 style="font-size:17px;margin:0 0 18px">提交申请</h2>' +
      '<div class="f-field"><label>网站名称</label><input name="name" required maxlength="80"></div>' +
      '<div class="f-field"><label>网站网址</label><input name="url" type="url" required maxlength="2048" placeholder="https://"></div>' +
      '<div class="f-field"><label>图标网址（可选）</label><input name="logo_url" type="url" maxlength="2048"></div>' +
      '<div class="f-field"><label>联系方式（仅管理员可见）</label><input name="contact" maxlength="200"></div>' +
      '<div class="f-field"><label>网站简介</label><textarea name="description" rows="3" maxlength="500"></textarea></div>' +
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
