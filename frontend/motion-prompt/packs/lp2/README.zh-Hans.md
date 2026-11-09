<!-- 由 tools/build.mjs 根据 meta.json 生成。请编辑 meta.json，不要直接修改本文件。 -->

# 落地页与网页效果（第 2 弹）

24 个术语 · #145–168 · 分类 `lp2` · 语言: [English](README.md) / [Español](README.es.md) / [日本語](README.ja.md) / [繁體中文](README.zh-Hant.md)

找到名称后直接告诉 AI。补充时长、幅度和运动对象，可以更接近你想要的效果。

![落地页与网页效果（第 2 弹） — 示例](../../assets/preview-lp2.gif)

## 滚动效果

| 编号 | 名称 | 英文名 | 含义 | 向 AI 提出需求的示例 |
|---|---|---|---|---|
| [#145](https://showheyohtaki.github.io/motion-prompt/#145) | **滚动时间轴** | Timeline on scroll | 滚动时时间轴的线条随之延伸 | 把公司沿革做成滚动时间轴：竖线随滚动延伸，线到达哪一年就依次显示该年内容。 |
| [#146](https://showheyohtaki.github.io/motion-prompt/#146) | **滚动文字显现** | Scroll text reveal | 随着阅读，文字逐字变深 | 给理念文案加上滚动文字显现：初始为浅灰色，随滚动逐字加深。 |
| [#147](https://showheyohtaki.github.io/motion-prompt/#147) | **堆叠卡片** | Stacking cards | 滚动时卡片层层叠起 | 把服务的三个步骤做成堆叠卡片：滚动时下一张从下方升起，每张比前一张错开 12 px 叠上去。 |
| [#148](https://showheyohtaki.github.io/motion-prompt/#148) | **滚动切换背景色** | Background color change on scroll | 按区块切换页面背景色 | 给各区块加上滚动切换背景色：滚动时从早晨区块的奶油色平滑过渡到夜晚的藏蓝色，再到假日的浅蓝色。 |
| [#149](https://showheyohtaki.github.io/motion-prompt/#149) | **滚动隐藏页头** | Hide-on-scroll header | 向下滚动时隐藏，向上滚动时出现 | 把页头做成滚动隐藏页头：向下滚动时用 0.3 s 向上隐藏，只要稍微向上滚动就重新出现。 |
| [#150](https://showheyohtaki.github.io/motion-prompt/#150) | **滚动监听** | Scrollspy | 目录高亮当前阅读的章节 | 给文章目录加上滚动监听：当前阅读章节的条目显示为朱红色，切换用时 0.25 s。 |
| [#151](https://showheyohtaki.github.io/motion-prompt/#151) | **回到顶部按钮** | Back-to-top button | 往下滚动后出现，点击回到顶部 | 给文章页加上回到顶部按钮：稍微滚动后显示在右下角，点击后用 0.6 s 滚回顶部。 |
| [#152](https://showheyohtaki.github.io/motion-prompt/#152) | **滚动放大** | Zoom on scroll | 图片随滚动放大至铺满屏幕 | 首屏照片做成滚动放大：中央的小照片随滚动放大到铺满视口，完全展开后叠上标题。 |

## 鼠标与输入交互

| 编号 | 名称 | 英文名 | 含义 | 向 AI 提出需求的示例 |
|---|---|---|---|---|
| [#153](https://showheyohtaki.github.io/motion-prompt/#153) | **3D 倾斜** | 3D tilt on hover | 卡片随光标方向立体倾斜 | 给会员卡加上 3D 倾斜：随光标位置最大倾斜 18°，反光也跟着移动。 |
| [#154](https://showheyohtaki.github.io/motion-prompt/#154) | **聚光灯悬停** | Spotlight hover | 只有光标周围变亮 | 给特色卡片加上聚光灯悬停：在深色卡片上只照亮光标周围半径约 120 px 的范围，边框也一起发光。 |
| [#155](https://showheyohtaki.github.io/motion-prompt/#155) | **悬停切换图片** | Image swap on hover | 悬停时换成另一张照片 | 给商品列表加上悬停切换图片：光标停在卡片上时，用 0.3 s 叠化为背面照片。 |
| [#156](https://showheyohtaki.github.io/motion-prompt/#156) | **悬停文字翻滚** | Text roll on hover | 文字向上翻转并替换 | 给主导航加上悬停文字翻滚：光标悬停时文字逐字向上翻出，每字间隔 0.035 s，同样的朱红色文字从下方翻入。 |
| [#157](https://showheyohtaki.github.io/motion-prompt/#157) | **悬停图片预览** | Hover image reveal | 悬停列表项时显示对应照片 | 把设施列表做成悬停图片预览：光标停在某行时，用 0.25 s 在光标旁显示该行照片，并跟随光标移动。 |
| [#158](https://showheyohtaki.github.io/motion-prompt/#158) | **浮动标签** | Floating label | 开始输入时标签上移 | 表单输入框使用浮动标签：获得焦点时，标签用 0.24 s 缩小并移到边框顶线上。 |
| [#159](https://showheyohtaki.github.io/motion-prompt/#159) | **实时校验** | Inline validation | 输入时即时显示对错 | 给联系表单加上实时校验：邮箱地址未输完整时显示红色“格式不正确”，正确后显示绿色对勾。 |
| [#160](https://showheyohtaki.github.io/motion-prompt/#160) | **加载按钮** | Loading button | 点击后在按钮内显示加载中到完成 | 把提交按钮做成加载按钮：点击后用 0.3 s 收缩成圆形并显示加载圆环，完成后变成绿色对勾和“完成”。 |

## 亮点展示

| 编号 | 名称 | 英文名 | 含义 | 向 AI 提出需求的示例 |
|---|---|---|---|---|
| [#161](https://showheyohtaki.github.io/motion-prompt/#161) | **视图过渡** | View transition (shared element) | 列表中的照片直接展开为详情页 | 从作品列表进入详情页时使用视图过渡：被点击的照片用 0.6 s 直接放大到详情页顶部。 |
| [#162](https://showheyohtaki.github.io/motion-prompt/#162) | **灯箱** | Lightbox | 点击图片后在变暗的背景上放大 | 让施工案例照片可以在灯箱中查看：点击后背景变暗、照片在中央放大，用左右箭头切换上一张和下一张。 |
| [#163](https://showheyohtaki.github.io/motion-prompt/#163) | **图片热点** | Hotspots | 点击图片上的圆点显示说明 | 给商品照片加上图片热点：在特色部位放置脉动的圆点，点击后用 0.25 s 弹出说明气泡。 |
| [#164](https://showheyohtaki.github.io/motion-prompt/#164) | **倒计时** | Countdown timer | 显示距截止时间的剩余时间并递减 | 给活动截止时间加上倒计时：以时:分:秒显示，每次数字变化时新数字用 0.3 s 从下方滚入。 |
| [#165](https://showheyohtaki.github.io/motion-prompt/#165) | **动态形状分隔线** | Animated shape divider | 持续摆动的波浪形区块分隔线 | 在首屏与下一节之间加入动态形状分隔线：叠放两层白色波浪，缓慢地反向持续摆动。 |
| [#166](https://showheyohtaki.github.io/motion-prompt/#166) | **点赞动画** | Like button animation | 点击后爱心迸发弹出 | 给帖子的点赞按钮加上点赞动画：点击后爱心填充红色并弹到 1.45×，周围散开小颗粒，数字加 1。 |
| [#167](https://showheyohtaki.github.io/motion-prompt/#167) | **向下滚动提示** | Scroll-down cue | 持续循环、引导向下滚动的动画 | 在首屏下方加入向下滚动提示：鼠标轮廓内的小圆点约每 1.5 s 向下移动并消失，循环播放。 |
| [#168](https://showheyohtaki.github.io/motion-prompt/#168) | **背景视频** | Background video | 首屏背景中播放视频 | 首屏使用背景视频：静音循环播放，左侧叠加深色渐变，保证标题清晰可读。 |

点击编号可打开动态示例。单个术语的时间、缓动数值与参考代码位于： `api/v1/en/e/<id>.txt` ([#145](../../api/v1/en/e/145.txt)).

[全部分类](../README.md)
