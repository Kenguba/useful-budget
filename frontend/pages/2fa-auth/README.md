# 2FA 验证码工具（2fa-auth）

谷歌验证器网页版（2fa.fun 1:1 复刻）：批量粘贴 2FA 密钥生成 6 位 TOTP 动态验证码，浏览器端本地计算（Web Crypto HMAC-SHA1），密钥不上传。页面本体见 `index.html`。

## Cookie A 实现细则

2fa-auth 是单槽：主题只有一个槽，读 `A` 后主题号 1–12 直接作为本站主题，语言、日夜也全部跟 `A` 走，与 `A` 双写
