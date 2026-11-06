// 基德盘搜（cloud-pan）PWA service worker
// 策略与 skill-board 同口径：页面外壳与数据一律网络优先（保证看到最新版），断网回落缓存
const CACHE = "pan-v14";
const SHELL = [
  "./",
  "./index.html",
  "./discover/",
  "./today/",
  "./hot/",
  "./search/",
  "./resource/",
  "./app/",
  "./friend-links/apply/",
  "./assets/style.css?v=20261107c",
  "./assets/config.js",
  "./assets/theme.js?v=20261107c",
  "./assets/app.js?v=20261107c",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./data/site.json",
  "./data/hot.json",
  "./data/updates.json",
  "./data/discovery.json",
  "./data/app.json",
  "./data/friend.json",
  "./data/meta.json"
];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // 实时搜索流（EventSource）与资源获取/投递接口不拦截，保证实时链路原样工作
  if (url.pathname.includes("/api/search/stream")) return;
  if (url.pathname.includes("/api/") && !url.pathname.includes("/api/public")) return;
  // 其余一律网络优先：在线永远是最新版，响应顺手写入缓存；断网回落缓存（忽略查询串，兼容 ?v= 版本参数）
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r && r.ok && (url.origin === self.location.origin || url.pathname.includes("/api/public"))) {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
