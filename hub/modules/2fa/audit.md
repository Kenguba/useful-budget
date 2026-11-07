# 自举审查清单 — 2fa（frontend/2fa-auth/index.html，88KB）

由 build-module.py 自动生成。口径：机械搬运不改业务逻辑，本清单列出搬运后语义可能变化的每一处，接入/验收时逐项过。

## 脚本块与自举段
- 块#0：行 10，head 区，0KB，内联
- 块#1：行 1946，body 区，33KB，内联
- **head 自举段 1 个**：独立页里在 body 解析前执行（主题预绘防闪烁等）。总汇模式下改为挂载时执行，且经 document 代理把 documentElement/body 定向到模块根，属性与 CSS 变量落到模块根而非外壳 html；防闪烁语义在总汇内不成立（进入时才执行），主题结果一致、时机不同

## window/document 级监听（mount 登记、unmount 回收）
- document.addEventListener('click')（拼接源码行 64）— 经包装登记，unmount 时摘除、重挂载时恢复
- 另有元素级监听 18 处：绑在模块 DOM 元素上，模块不卸载故不回收，与独立页一致
- setInterval/setTimeout are NOT suspended on unmount (modules are never unloaded; intervals keep running against hidden DOM — see audit.md)

## 危险点
- document.write：无
- eval：无
- new Function：无
- location 导航（总汇内会整页跳走，逐处人工确认触发条件）：无
- history 写入（与外壳路由共用同一 history，逐处确认）：无
- ServiceWorker（总汇内经 navigator 代理屏蔽，见下）：无
- setInterval（unmount 不停，残留运行）：
  - 拼接行 600：`t window rollover (same as original) */ setInterval(() => { renderOtpCodes(false); }, 1000); /* ================= Init ==========`

## 相对路径基准修正点
- fetch 调用 0 处（字面相对地址：无）— all fetch() calls in module scope pass the generated __fetch shadow: relative URLs resolve against /frontend/2fa-auth/
- XHR：0 处
- ui.html 内无相对资源引用

## 内联事件处理器桥（inline on* → window）
- 无内联 on* 处理器，不需要桥

## 其他
- localStorage 键（沿用原键、与独立页同源同值）：2fa-aura-theme
- 与管线注入名（document/window/navigator/fetch 等）无顶层声明冲突
