# 自举审查清单 — ai（frontend/ai-shop/index.html，424KB）

由 build-module.py 自动生成。口径：机械搬运不改业务逻辑，本清单列出搬运后语义可能变化的每一处，接入/验收时逐项过。

## 脚本块与自举段
- 块#0：行 10，head 区，2KB，内联
- 块#1：行 1925，body 区，292KB，内联
- 块#2：行 1926，body 区，56KB，内联
- 块#3：行 2608，body 区，8KB，内联
- **head 自举段 1 个**：独立页里在 body 解析前执行（主题预绘防闪烁等）。总汇模式下改为挂载时执行，且经 document 代理把 documentElement/body 定向到模块根，属性与 CSS 变量落到模块根而非外壳 html；防闪烁语义在总汇内不成立（进入时才执行），主题结果一致、时机不同

## window/document 级监听（mount 登记、unmount 回收）
- window.addEventListener('resize')（拼接源码行 250）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('popstate')（拼接源码行 313）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('popstate')（拼接源码行 320）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('popstate')（拼接源码行 411）— 经包装登记，unmount 时摘除、重挂载时恢复
- document.addEventListener('click')（拼接源码行 413）— 经包装登记，unmount 时摘除、重挂载时恢复
- document.addEventListener('keydown')（拼接源码行 414）— 经包装登记，unmount 时摘除、重挂载时恢复
- document.addEventListener('click')（拼接源码行 416）— 经包装登记，unmount 时摘除、重挂载时恢复
- document.addEventListener('keydown')（拼接源码行 421）— 经包装登记，unmount 时摘除、重挂载时恢复
- document.addEventListener('click')（拼接源码行 586）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('hashchange')（拼接源码行 600）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('touchstart')（拼接源码行 605）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('wheel')（拼接源码行 606）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('keydown')（拼接源码行 607）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('scroll')（拼接源码行 610）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('pageshow')（拼接源码行 617）— 经包装登记，unmount 时摘除、重挂载时恢复
- window.addEventListener('resize')（拼接源码行 660）— 经包装登记，unmount 时摘除、重挂载时恢复
- 另有元素级监听 19 处：绑在模块 DOM 元素上，模块不卸载故不回收，与独立页一致
- setInterval/setTimeout are NOT suspended on unmount (modules are never unloaded; intervals keep running against hidden DOM — see audit.md)

## 危险点
- document.write：无
- eval：无
- new Function：无
- location 导航（总汇内会整页跳走，逐处人工确认触发条件）：无
- history 写入（与外壳路由共用同一 history，逐处确认）：
  - 拼接行 99：` history.scrollRestoration='manual'; history.replaceState({leaderNavSession,y:window.scrollY},'',location.href); }catch(e){} fu`
  - 拼接行 104：`eaderNavSession||st.y===y)return; try{history.replaceState({...st,y},'',location.href);}catch(e){} } /* 历史只记录滚动位置；最后点击的卡片只由用户点击改`
  - 拼接行 192：` saveLeaderPosition(); try{ history.pushState({leaderNavSession,y:window.scrollY},'','#grp-'+gid); }catch(e){} `
  - 拼接行 282：`activeElement; srcPrevSR=null; try{ history.pushState({museSrcPopup:1},''); srcHist=true; }catch(e){ srcHist=false; } window`
  - 拼接行 380：`ner=btn||document.activeElement; try{ history.pushState({musePcPopup:1},''); pcHist=true; }catch(e){ pcHist=false; } window.__`
  - 拼接行 588：`losest('a[data-anchor]'); if(a){ try{ history.pushState(null,'','#'+a.dataset.anchor); }catch(err){} } }); function jumpToHash()`
- window.* 赋值（经 window 代理落到真实 window，全局可见）：INLINE_BOARD, __applyTabTheme, __srcSettleUntil
- ServiceWorker（总汇内经 navigator 代理屏蔽，见下）：无
- setInterval（unmount 不停，残留运行）：无

## 相对路径基准修正点
- fetch 调用 8 处（字面相对地址：['data/board-prices.json?t=', 'data/board.json', 'data/board.json?t=', 'data/shops.json', 'data/shops.json?t=']）— all fetch() calls in module scope pass the generated __fetch shadow: relative URLs resolve against /frontend/ai-shop/
- XHR：0 处
- ui.html 内无相对资源引用

## 内联事件处理器桥（inline on* → window）
- 无内联 on* 处理器，不需要桥

## 其他
- localStorage 键（沿用原键、与独立页同源同值）：aishop.theme.v1
- 与管线注入名（document/window/navigator/fetch 等）无顶层声明冲突
