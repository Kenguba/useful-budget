// pan.xxxxx.asia 同域接口转发（Cloudflare Pages Functions，仅在 Pages 部署里生效；
// GitHub Pages 会把本文件当普通静态文件，不影响那边的运行）。
// /api/* -> https://api.xxxxx.asia/api/*（后端 Worker），方法/请求头/请求体/查询串原样带上，
// 响应原样回传（搜索流 /api/search/stream 的 SSE 流式响应同样透传，不缓冲不改写）。
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = "https://api.jpedu.asia" + url.pathname + url.search;
  return fetch(new Request(target, context.request));
}
