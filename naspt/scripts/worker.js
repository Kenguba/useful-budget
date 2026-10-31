// 基德盘搜复刻 · Cloudflare Worker 中转
// 作用：给原站公开接口加跨域头，让 kenguba.github.io 上的复刻页能实时拉原站数据。
// 路由：
//   /api/public/*              -> https://naspt.vip/api/public/*（仅 GET）
//   /app/android/latest.json   -> https://ik.naspt.vip/app/android/latest.json
// 其余路径返回 404。部署后把 Worker 域名填回 assets/app.js 的 RELAY 常量。

const ORIGIN_API = "https://naspt.vip";
const ORIGIN_APP = "https://ik.naspt.vip";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS });
    }

    let target = null;
    if (url.pathname.startsWith("/api/public/")) {
      target = ORIGIN_API + url.pathname + url.search;
    } else if (url.pathname === "/app/android/latest.json") {
      target = ORIGIN_APP + url.pathname;
    }
    if (!target) {
      return new Response("Not Found", { status: 404, headers: CORS });
    }

    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      cf: { cacheTtl: 60, cacheEverything: true },
    });

    const headers = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    headers.set("Cache-Control", "public, max-age=60");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
};
