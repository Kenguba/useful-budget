/* Motion Prompt — "Examples" page (found.html). Plain JS, no dependencies.
   Reads examples/found.json (post IDs, URLs and our own one-line introductions only).
   Every post is shown as an X embed: widgets.js is loaded once, and each post is drawn with
   twttr.widgets.createTweet() as its card comes near the viewport. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var WIDGETS = 'https://platform.twitter.com/widgets.js';

  var I18N = {
    ja: {
      title: '見つけた事例｜Motion Prompt',
      skip: '事例の一覧へ移動', navLabel: 'サイト内', navGallery: '見本', navFound: '事例', langLabel: '言語',
      themeToDark: 'ダークモードに切り替える', themeToLight: 'ライトモードに切り替える',
      eyebrow: '見つけた事例',
      h1: '名前と見本で、共通言語を作っている人たち',
      lead: 'AIに頼むための名前を、動く見本や早見表と一緒にまとめて公開している人たちのポストです。分野も言語も見た目もそれぞれ違います。投稿者が自分で作った見本のあるポストを選んでいて、ポストの内容と権利は各投稿者にあります。',
      leadNote: 'ここで紹介していることは、投稿者がこのサイトを支持しているという意味ではありません。紹介文はこのサイトが書いています。',
      noteH: '埋め込みについて',
      noteP: 'このページは、各ポストをX（旧Twitter）の埋め込みで表示しています。開くとXのサーバーから読み込まれ、XのCookieが使われます。Xはその閲覧を記録し、広告に使うことがあります。読み込むときは、パーソナライズに使わないよう求める設定（dnt）を付けています。',
      notePrivacy: 'Xのプライバシーポリシー', noteCookies: 'XのCookieについて',
      listH: '事例の一覧', loadListFailed: '一覧を読み込めませんでした。',
      count: '{n}件',
      postLang: { ja: '日本語', en: '英語' },
      postLangLabel: 'ポストの言語: {l}',
      viewOnX: 'Xで見る',
      viewOnXLabel: '{a} のポストをXで見る',
      loading: '読み込み中です…',
      gone: 'このポストは表示できません（削除された可能性があります）。',
      failed: 'Xから読み込めませんでした。広告ブロックなどで止められている可能性があります。「Xで見る」から開けます。',
      shown: '{a} のポストを表示しました',
      moreH: '事例を教えてください',
      recH: 'ポストを推薦する（自薦も歓迎）',
      recP: '名前に見本を付けて公開しているポストを見つけたら、GitHub の Issue で知らせてください。自分のポストでもかまいません。載せるのは埋め込みとリンクだけで、画像や動画をこのサイトに写すことはしません。',
      recLink: '事例を推薦する（GitHub Issue）',
      rmH: '外してほしいとき',
      rmP: 'ご自分のポストを外したい、紹介文が正しくない、という場合は Issue のフォームから依頼してください。確認できたら、すみやかに外します。',
      rmLink: '削除・訂正を依頼する（GitHub Issue）',
      author: '作者', authorName: '大滝昇平',
      whyLink: 'なぜ作ったか', makeLink: '自分の分野・自分の言語で作る', addLink: 'あなたの分野の名前を足す', listLink: '名前の一覧（GitHub）',
      removeP1: '掲載の削除・訂正は', removeLink: 'GitHub の Issue のフォーム', removeP2: 'から依頼できます。確認後、すみやかに対応します。',
      thanks1: '動く見本を並べて、プロンプトをコピーして使う形は', thanks2: 'から着想を得ました。ありがとうございます。',
    },
    en: {
      title: 'Examples — Motion Prompt',
      skip: 'Skip to the examples', navLabel: 'Site', navGallery: 'Gallery', navFound: 'Examples', langLabel: 'Language',
      themeToDark: 'Switch to dark mode', themeToLight: 'Switch to light mode',
      eyebrow: 'Examples we found',
      h1: 'People building a common language with names and samples',
      lead: 'Posts by people who publish names to use with AI, together with moving samples or cheat sheets. The fields, languages and looks all differ. We pick posts whose samples the author made, and each post and its rights belong to its author.',
      leadNote: 'Being listed here does not mean the author supports this site. The introductions are written by this site.',
      noteH: 'About the embeds',
      noteP: "This page shows each post as an X (formerly Twitter) embed. When you open it, the posts load from X's servers and X cookies are used. X may record the view and use it for ads. The embeds are loaded with the setting that asks X not to use them for personalization (dnt).",
      notePrivacy: 'X Privacy Policy', noteCookies: 'How X uses cookies',
      listH: 'Examples', loadListFailed: 'Could not load the list.',
      count: '{n} posts',
      postLang: { ja: 'Japanese', en: 'English' },
      postLangLabel: 'Post language: {l}',
      viewOnX: 'View on X',
      viewOnXLabel: 'View the post by {a} on X',
      loading: 'Loading…',
      gone: 'This post cannot be shown. It may have been deleted.',
      failed: 'Could not load from X. A content blocker may have stopped it. You can still open it with "View on X".',
      shown: 'Showing the post by {a}',
      moreH: 'Know a good one?',
      recH: 'Suggest a post (your own is welcome)',
      recP: 'If you find a post that shares names with samples, tell us in a GitHub issue. It can be your own. We only embed and link to it; images and videos are not copied to this site.',
      recLink: 'Suggest an example (GitHub issue)',
      rmH: 'To have a post removed',
      rmP: 'If you want your post taken off, or an introduction is wrong, use the issue form. We remove it as soon as the request is confirmed.',
      rmLink: 'Ask for a removal or correction (GitHub issue)',
      author: 'by', authorName: 'Shohei Ohtaki',
      whyLink: 'Why I made this', makeLink: 'Make one for your own field or language', addLink: 'Add the names of your field', listLink: 'Name lists (GitHub)',
      removeP1: 'To ask for a removal or a correction, use the ', removeLink: 'issue form on GitHub', removeP2: '. We act on it once the request is confirmed.',
      thanks1: 'The format — moving samples with a prompt you can copy — was inspired by', thanks2: '. Thank you.',
    },
    zh: {
      title: '找到的案例｜Motion Prompt',
      skip: '跳到案例列表', navLabel: '站内导航', navGallery: '示例', navFound: '案例', langLabel: '语言',
      themeToDark: '切换到深色模式', themeToLight: '切换到浅色模式',
      eyebrow: '找到的案例',
      h1: '用名字和示例建立共同语言的人们',
      lead: '这里收集的是把给 AI 下指令用的名字、连同动态示例或速查表一起公开的帖子。领域、语言和样式各不相同。我们选取的都是作者自己做了示例的帖子，每篇帖子及其权利都属于原作者。',
      leadNote: '被收录在这里并不代表作者支持本站。介绍文字由本站撰写。',
      noteH: '关于嵌入',
      noteP: '本页以 X（原 Twitter）嵌入的形式展示每篇帖子。打开时内容从 X 的服务器加载，并会使用 X 的 Cookie。X 可能记录这次浏览并用于广告。加载时我们带上了不希望被用于个性化的设置（dnt）。',
      notePrivacy: 'X 隐私政策', noteCookies: 'X 如何使用 Cookie',
      listH: '案例列表', loadListFailed: '列表加载失败。',
      count: '{n} 篇',
      postLang: { ja: '日语', en: '英语' },
      postLangLabel: '帖子语言：{l}',
      viewOnX: '在 X 上查看',
      viewOnXLabel: '在 X 上查看 {a} 的帖子',
      loading: '正在加载…',
      gone: '这篇帖子无法显示，可能已被删除。',
      failed: '从 X 加载失败，可能是内容拦截工具挡住了。可以点「在 X 上查看」打开。',
      shown: '已显示 {a} 的帖子',
      moreH: '你有好案例吗',
      recH: '推荐帖子（也欢迎自荐）',
      recP: '如果你发现把名字和示例一起公开的帖子，请在 GitHub Issue 里告诉我们，自己的帖子也可以。我们只做嵌入和链接，不会把图片或视频复制到本站。',
      recLink: '推荐案例（GitHub Issue）',
      rmH: '想撤下自己的帖子时',
      rmP: '如果你想撤下自己的帖子，或者介绍文字有误，请用 Issue 表单联系我们。确认后会尽快处理。',
      rmLink: '申请删除或更正（GitHub Issue）',
      author: '作者', authorName: 'Shohei Ohtaki',
      whyLink: '为什么做这个', makeLink: '为你的领域和语言做一个', addLink: '加上你所在领域的名字', listLink: '名字列表（GitHub）',
      removeP1: '删除或更正的申请请通过', removeLink: 'GitHub 的 Issue 表单', removeP2: '提交。确认后我们会尽快处理。',
      thanks1: '「并排展示动态示例、复制提示词即可用」这种形式，灵感来自', thanks2: '。谢谢。',
    },
  };

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode etc. */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  var state = { lang: root.lang === 'en' ? 'en' : 'zh', data: null };
  var cards = [];   // { item, el, box, status, shown, token }

  function t(key, vars) {
    var s = I18N[state.lang][key];
    if (s == null) s = I18N.en[key];
    if (s == null) s = key;
    if (vars && typeof s === 'string') Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function say(msg) { var l = $('#live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); }
  function isDark() {
    var a = root.getAttribute('data-theme');
    return a ? a === 'dark' : darkQuery.matches;
  }

  // ------------------------------------------------------------------ X widgets
  var widgetsPromise = null;
  function loadWidgets() {
    if (widgetsPromise) return widgetsPromise;
    widgetsPromise = new Promise(function (resolve, reject) {
      if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) { resolve(window.twttr); return; }
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; reject(new Error('timeout')); } }, 15000);
      var s = document.createElement('script');
      s.id = 'x-wjs'; s.async = true; s.charset = 'utf-8'; s.src = WIDGETS;
      s.onload = function () {
        if (!window.twttr || !window.twttr.ready) { done = true; clearTimeout(timer); reject(new Error('no twttr')); return; }
        window.twttr.ready(function (tw) { if (done) return; done = true; clearTimeout(timer); resolve(tw); });
      };
      s.onerror = function () { if (done) return; done = true; clearTimeout(timer); reject(new Error('blocked')); };
      document.head.appendChild(s);
    });
    widgetsPromise.catch(function () { widgetsPromise = null; var old = $('#x-wjs'); if (old) old.remove(); });
    return widgetsPromise;
  }

  function setStatus(c, key) {
    c.statusKey = key || null;
    c.status.textContent = key ? t(key) : '';
    c.status.hidden = !key;
    c.status.classList.toggle('is-warn', key === 'gone' || key === 'failed');
  }
  function show(c) {
    var token = (c.token || 0) + 1;
    c.token = token;
    c.shown = true;
    c.box.innerHTML = '';
    c.box.hidden = false;
    c.el.classList.add('is-open');
    setStatus(c, 'loading');
    return loadWidgets().then(function (tw) {
      if (c.token !== token) return;
      return tw.widgets.createTweet(c.item.id, c.box, {
        lang: state.lang, theme: isDark() ? 'dark' : 'light', dnt: true, conversation: 'none', align: 'center',
      }).then(function (el) {
        if (c.token !== token) return;
        if (el) { setStatus(c, null); c.el.classList.remove('is-gone'); }
        else { c.box.innerHTML = ''; c.box.hidden = true; setStatus(c, 'gone'); c.el.classList.add('is-gone'); }
      });
    }).catch(function () {
      if (c.token !== token) return;
      c.box.innerHTML = ''; c.box.hidden = true;
      setStatus(c, 'failed');
    });
  }
  function redrawShown() { cards.forEach(function (c) { if (c.shown) show(c); }); }

  // ------------------------------------------------------------------ list
  function authorHandle(item) { return item.author.replace(/^@/, ''); }
  function build() {
    var wrap = $('#themes');
    wrap.innerHTML = '';
    cards = [];
    var data = state.data;
    data.themes.forEach(function (th) {
      var items = data.items.filter(function (it) { return it.theme === th.slug; });
      if (!items.length) return;
      var hid = 'th-' + th.slug;
      var list = h('ul', { class: 'ex-list' });
      items.forEach(function (it) {
        var handle = authorHandle(it);
        var link = h('a', { class: 'ex-x', href: it.url, rel: 'noopener', 'aria-label': t('viewOnXLabel', { a: it.author }), text: t('viewOnX') });
        var status = h('p', { class: 'ex-status', role: 'status' });
        status.hidden = true;
        var box = h('div', { class: 'ex-embed' });
        box.hidden = true;
        var langName = (t('postLang') || {})[it.lang] || it.lang;
        var li = h('li', { class: 'ex' }, [
          h('div', { class: 'ex-head' }, [
            h('a', { class: 'ex-author', href: 'https://x.com/' + encodeURIComponent(handle), rel: 'noopener', text: it.author }),
            h('span', { class: 'ex-lang', title: t('postLangLabel', { l: langName }), 'aria-label': t('postLangLabel', { l: langName }), text: String(it.lang).toUpperCase() }),
          ]),
          h('p', { class: 'ex-intro', text: (it.intro && (it.intro[state.lang] || it.intro.en)) || '' }),
          h('div', { class: 'ex-act' }, [link]),
          status,
          box,
        ]);
        var c = { item: it, el: li, box: box, status: status, shown: false, token: 0 };
        cards.push(c);
        list.appendChild(li);
      });
      wrap.appendChild(h('section', { class: 'ex-theme', 'aria-labelledby': hid }, [
        h('div', { class: 'pack-h' }, [
          h('h3', { id: hid, text: th[state.lang] || th.en }),
          h('span', { text: t('count', { n: items.length }) }),
        ]),
        list,
      ]));
    });
    observe();
  }

  // Draw each embed as its card comes near the viewport, so the page opens fast but reads as fully embedded.
  var io = null;
  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) { cards.forEach(show); return; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var c = cards.filter(function (x) { return x.el === e.target; })[0];
        if (c && !c.shown) show(c);
      });
    }, { rootMargin: '1200px 0px' });
    cards.forEach(function (c) { io.observe(c.el); });
  }

  // ------------------------------------------------------------------ text, language, theme
  function applyText() {
    var lang = state.lang;
    root.lang = lang;
    document.title = t('title');
    $$('[data-t]').forEach(function (n) { n.textContent = t(n.getAttribute('data-t')); });
    $$('[data-t-attr]').forEach(function (n) {
      n.getAttribute('data-t-attr').split(',').forEach(function (pair) {
        var kv = pair.split(':'); n.setAttribute(kv[0].trim(), t(kv[1].trim()));
      });
    });
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false'); });
    $$('[data-href-' + lang + ']').forEach(function (a) { a.href = a.getAttribute('data-href-' + lang); });
    applyTheme();
  }
  function applyTheme() { $('#theme').setAttribute('aria-label', t(isDark() ? 'themeToLight' : 'themeToDark')); }
  $$('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-lang');
      if (lang === state.lang) return;
      state.lang = lang;
      store.set('mp-lang', lang);
      applyText();
      if (state.data) build();  // rebuild redraws the embeds in the new language
    });
  });
  $('#theme').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('mp-theme', next);
    applyTheme();
    redrawShown();
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', function () {
    applyTheme();
    if (!root.getAttribute('data-theme')) redrawShown();
  });

  // ------------------------------------------------------------------ start
  if (store.get('mp-lang') === 'ja') store.set('mp-lang', state.lang); // migrate a saved ja preference to the resolved zh/en
  applyText();
  fetch('examples/found.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      state.data = data;
      build();
    })
    .catch(function () { $('#f-empty').hidden = false; });
})();
