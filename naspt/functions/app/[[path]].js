// pan.jpedu.asia 同域转发（Cloudflare Pages Functions，仅在 Pages 部署里生效）。
// 只接管 /app/android/latest.json（App 版本信息，源头在后端 Worker）；
// /app/ 下其余路径是本站静态页面，一律放行给静态资源，避免误伤 App 介绍页。
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname !== "/app/android/latest.json") {
    return context.next();
  }
  const target = "https://api.jpedu.asia" + url.pathname + url.search;
  return fetch(new Request(target, context.request));
}
