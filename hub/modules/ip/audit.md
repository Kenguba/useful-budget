# 自举审查清单 — ip（frontend/ip-check/index.html，186KB）

由 build-module.py 自动生成。口径：机械搬运不改业务逻辑，本清单列出搬运后语义可能变化的每一处，接入/验收时逐项过。

## 脚本块与自举段
- 块#0：行 2399，body 区，104KB，内联
- 无 head 自举段、无 load/DOMContentLoaded 监听依赖

## window/document 级监听（mount 登记、unmount 回收）
- window.addEventListener('popstate')（拼接源码行 293）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('pageshow')（拼接源码行 304）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('scroll')（拼接源码行 306）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('resize')（拼接源码行 926）— 经包装登记，unmount 时摘除、重挂载时恢复
- 另有元素级监听 35 处：绑在模块 DOM 元素上，模块不卸载故不回收，与独立页一致
- setInterval/setTimeout are NOT suspended on unmount (modules are never unloaded; intervals keep running against hidden DOM — see audit.md)

## 危险点
- document.write：无
- eval：无
- new Function：无
- location 导航（总汇内会整页跳走，逐处人工确认触发条件）：无
- history 写入（与外壳路由共用同一 history，逐处确认）：
  - 拼接行 278：`Y(){ spaState.y=window.scrollY; try{history.replaceState({spa:spaState},"",spaURL())}catch(e){} } function spaPush(patch){ s`
  - 拼接行 284：`ch); spaState.y=window.scrollY; try{history.pushState({spa:spaState},"",spaURL())}catch(e){} } function spaApply(st){ spaSta`
  - 拼接行 302：`; spaState.sec=($(id)?id:null); try{history.replaceState({spa:spaState},"",location.href)}catch(e){} })(); window.addEventList`
- ServiceWorker（总汇内经 navigator 代理屏蔽，见下）：无
- setInterval（unmount 不停，残留运行）：无

## 相对路径基准修正点
- fetch 调用 5 处（字面相对地址：['https://']）— all fetch() calls in module scope pass the generated __fetch shadow: relative URLs resolve against /frontend/ip-check/
- XHR：0 处
- ui.html 内无相对资源引用

## 内联事件处理器桥（inline on* → window）
- 无内联 on* 处理器，不需要桥

## 其他
- localStorage 键（沿用原键、与独立页同源同值）：ip-dark, ip-lang, ip-theme-idx
- 与管线注入名（document/window/navigator/fetch 等）无顶层声明冲突
