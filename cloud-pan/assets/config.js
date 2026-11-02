/* 基德盘搜 · 部署配置（全站唯一的接口地址开关）
   以后换部署环境，只改这一个文件，不用动 app.js：
   - RELAY_BY_HOST：按访问域名决定数据接口地址。
     pan.xxxxx.asia 用 ""（空字符串 = 同域请求：/api/* 和 /app/android/latest.json
     由本站的 Pages Functions 在 Cloudflare 内部转给后端 Worker，
     浏览器不用再单独给 api 域名解析和建连）。
     其他域名（kenguba.github.io 等）不在表里，走 DEFAULT_RELAY 绝对地址。
   - 新增门面域名时，在 RELAY_BY_HOST 里加一行即可。 */
(function () {
  "use strict";
  var RELAY_BY_HOST = {
    "pan.jpedu.asia": ""
  };
  var DEFAULT_RELAY = "https://api.jpedu.asia";
  var host = location.hostname;
  window.PAN_RELAY = Object.prototype.hasOwnProperty.call(RELAY_BY_HOST, host)
    ? RELAY_BY_HOST[host]
    : DEFAULT_RELAY;
})();
