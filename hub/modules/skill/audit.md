# 自举审查清单 — skill（frontend/skill-board/index.html，111KB）

由 build-module.py 自动生成。口径：机械搬运不改业务逻辑，本清单列出搬运后语义可能变化的每一处，接入/验收时逐项过。

## 脚本块与自举段
- 块#0：行 480，body 区，22KB，内联
- 块#1：行 796，body 区，41KB，内联
- 块#2：行 1405，body 区，0KB，内联
- **load_listener**：window 的 load 监听（源码行 927）——window load / DOMContentLoaded already fired before module import; this listener never fires in hub mode

## window/document 级监听（mount 登记、unmount 回收）
- window.addEventListener('resize')（拼接源码行 9）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('scroll')（拼接源码行 711）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('pageshow')（拼接源码行 717）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('popstate')（拼接源码行 718）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('resize')（拼接源码行 883）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('scroll')（拼接源码行 895）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('load')（拼接源码行 927）— 经包装登记，unmount 时摘除、重挂载时恢复
- 另有元素级监听 34 处：绑在模块 DOM 元素上，模块不卸载故不回收，与独立页一致
- setInterval/setTimeout are NOT suspended on unmount (modules are never unloaded; intervals keep running against hidden DOM — see audit.md)

## 危险点
- document.write：无
- eval：无
- new Function：无
- location 导航（总汇内会整页跳走，逐处人工确认触发条件）：无
- history 写入（与外壳路由共用同一 history，逐处确认）：
  - 拼接行 662：` history.scrollRestoration="manual"; history.replaceState({secNavSession,y:window.scrollY},"",location.href); }catch(e){} funct`
  - 拼接行 667：`==secNavSession||st.y===y)return; try{history.replaceState({...st,y},"",location.href)}catch(e){} } function paintSec(secId,anim`
  - 拼接行 688：`)return; saveSecPosition(); try{history.pushState({secNavSession,y:window.scrollY},"","#"+secId)}catch(e){} /* Use ful`
  - 拼接行 714：`dow.scrollY<=0&&location.hash){ try{history.replaceState(history.state,"",location.pathname+location.search)}catch(e){} } },`
- ServiceWorker（总汇内经 navigator 代理屏蔽，见下）：
  - 拼接行 927：` updateDockVisibility(); })(); if ("serviceWorker" in navigator) { window.addEventListener("load", () => navigator.serviceWork`
  - 拼接行 927：`ddEventListener("load", () => navigator.serviceWorker.register("./sw.js", {updateViaCache: "none"}).then(r => r.update()).catch(()`
- setInterval（unmount 不停，残留运行）：无

## 相对路径基准修正点
- fetch 调用 4 处（字面相对地址：['data/boards/${d}.json?t=', 'data/dates.json?t=', 'data/video.json?t=']）— all fetch() calls in module scope pass the generated __fetch shadow: relative URLs resolve against /frontend/skill-board/
- XHR：0 处
- ui.html 内无相对资源引用

## 内联事件处理器桥（inline on* → window）
- 无内联 on* 处理器，不需要桥

## 其他
- localStorage 键（沿用原键、与独立页同源同值）：skill-open-groups, skill-prefs
- 与管线注入名（document/window/navigator/fetch 等）无顶层声明冲突
- ServiceWorker：原代码的注册在总汇模式下被 navigator 代理屏蔽（`'serviceWorker' in navigator` 为 false），独立入口文件未动、照常注册
