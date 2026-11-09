<!-- 由 tools/build.mjs 根据 meta.json 生成。请编辑 meta.json，不要直接修改本文件。 -->

# 动态图形（第 2 弹）

24 个术语 · #121–144 · 分类 `motion2` · 语言: [English](README.md) / [Español](README.es.md) / [日本語](README.ja.md) / [繁體中文](README.zh-Hant.md)

找到名称后直接告诉 AI。补充时长、幅度和运动对象，可以更接近你想要的效果。

![动态图形（第 2 弹） — 示例](../../assets/preview-motion2.gif)

## 动效技巧

| 编号 | 名称 | 英文名 | 含义 | 向 AI 提出需求的示例 |
|---|---|---|---|---|
| [#121](https://showheyohtaki.github.io/motion-prompt/#121) | **预备动作** | Anticipation | 运动前先向反方向稍稍蓄力 | 按钮向右飞出前加上预备动作：先用 0.3 s 向反方向稍稍后拉并压扁，再飞出去。 |
| [#122](https://showheyohtaki.github.io/motion-prompt/#122) | **跟随动作** | Follow-through | 主体停下后，局部仍延迟摆动 | 角色停下后，给头发和旗子加上跟随动作：延迟约 0.5 s 继续摆动，然后停稳。 |
| [#123](https://showheyohtaki.github.io/motion-prompt/#123) | **弹跳** | Bounce | 落下后越弹越低直至停下 | 让球从上方落下并弹跳：弹 3 次，一次比一次低。 |
| [#124](https://showheyohtaki.github.io/motion-prompt/#124) | **随机抖动** | Wiggle | 小幅、随机地持续晃动 | 给通知铃铛加上轻微的随机抖动，角度最大约 10°，响铃期间一直持续。 |
| [#125](https://showheyohtaki.github.io/motion-prompt/#125) | **脉冲动画** | Pulse | 像心跳一样有节奏地缩放 | 给爱心图标加上脉冲动画：每 1.2 s 放大约 10% 再恢复原样。 |
| [#126](https://showheyohtaki.github.io/motion-prompt/#126) | **运动路径** | Motion path | 沿设定的曲线移动 | 让纸飞机沿这条曲线的运动路径在 4 s 内飞完，机头始终朝向前进方向。 |
| [#127](https://showheyohtaki.github.io/motion-prompt/#127) | **往返循环** | Ping-pong loop | 正放后倒放，反复来回 | 让加载圆点以往返循环左右来回移动，单程 1 s。 |
| [#128](https://showheyohtaki.github.io/motion-prompt/#128) | **定格动画风格** | Stop-motion style | 抽帧后动作一顿一顿 | 把这段动作做成定格动画风格：每秒 8 帧，每帧位置都轻微错开。 |

## 文字与图形

| 编号 | 名称 | 英文名 | 含义 | 向 AI 提出需求的示例 |
|---|---|---|---|---|
| [#129](https://showheyohtaki.github.io/motion-prompt/#129) | **文字乱码效果** | Text scramble | 字符随机变换后定格为正确文字 | 让标题以文字乱码效果出现：随机字符变换约 1 s，再从左到右依次定格。 |
| [#130](https://showheyohtaki.github.io/motion-prompt/#130) | **波浪文字** | Wave text | 文字像波浪一样依次上下起伏 | 让标志的文字做波浪文字动画：每个字依次错开，上下起伏约 20 px。 |
| [#131](https://showheyohtaki.github.io/motion-prompt/#131) | **路径文字** | Text on a path | 文字沿线条或曲线流动 | 把宣传语做成路径文字，沿波浪线从左向右流动，每 5 s 走完一轮。 |
| [#132](https://showheyohtaki.github.io/motion-prompt/#132) | **可变字体动画** | Variable font animation | 文字粗细平滑变化 | 给标题加上可变字体动画：1 s 内从 Thin 变到 Black（字重 100 到 900）。 |
| [#133](https://showheyohtaki.github.io/motion-prompt/#133) | **文字遮罩** | Text mask | 镂空成文字形状，透出内部画面 | 把“OCEAN”做成文字遮罩，里面透出海浪视频，最后 1 s 显示完整画面。 |
| [#134](https://showheyohtaki.github.io/motion-prompt/#134) | **中继器** | Repeater | 复制图形并排列旋转 | 用中继器把这片花瓣复制成 12 片排成圆形，每 4 s 旋转一圈。 |
| [#135](https://showheyohtaki.github.io/motion-prompt/#135) | **万花筒** | Kaleidoscope | 像万花筒一样对称展开 | 在标志背后加入万花筒效果：8 等分镜像对称，一边缓慢旋转一边向外展开。 |
| [#136](https://showheyohtaki.github.io/motion-prompt/#136) | **线条抖动** | Line boil | 手绘线条逐帧轻微抖动 | 给手绘插画加上线条抖动：每秒 10 帧，线条只偏移 2–3 px。 |

## 转场与强调

| 编号 | 名称 | 英文名 | 含义 | 向 AI 提出需求的示例 |
|---|---|---|---|---|
| [#137](https://showheyohtaki.github.io/motion-prompt/#137) | **推入转场** | Push transition | 下一画面把当前画面推出 | 用推入转场切到下一张幻灯片，从右侧在 0.8 s 内推入。 |
| [#138](https://showheyohtaki.github.io/motion-prompt/#138) | **百叶窗转场** | Blinds transition | 从细条缝隙中打开下一画面 | 用百叶窗转场切换场景：7 条横向条带，在 1 s 内打开。 |
| [#139](https://showheyohtaki.github.io/motion-prompt/#139) | **立方体转场** | Cube transition | 像立方体旋转一样切换画面 | 商品照片用立方体转场切换，向左转 90°，时长 0.8 s。 |
| [#140](https://showheyohtaki.github.io/motion-prompt/#140) | **翻页转场** | Page curl | 像纸张一样卷起，翻到下一页 | 用翻页转场进入下一章，从右下角在 1.2 s 内翻起。 |
| [#141](https://showheyohtaki.github.io/motion-prompt/#141) | **像素化转场** | Pixelate | 马赛克逐渐变粗后切换画面 | 用像素化转场切换：0.6 s 内马赛克逐渐变粗，在最粗时切到下一画面。 |
| [#142](https://showheyohtaki.github.io/motion-prompt/#142) | **玻璃碎裂** | Shatter | 像玻璃一样碎裂，碎片飞散 | 标题出现前，用玻璃碎裂打碎前一画面：先出现裂纹，碎片再在约 1 s 内落下。 |
| [#143](https://showheyohtaki.github.io/motion-prompt/#143) | **爆炸图** | Exploded view | 零件分离，展示内部结构 | 展示产品的爆炸图：4 个零件在 1 s 内分开，并分别标上名称。 |
| [#144](https://showheyohtaki.github.io/motion-prompt/#144) | **分屏** | Split screen | 分割画面，同时展示多个场景 | 用分屏同时展示三个场景：从一个画面分成两个，再分成三个，每步 0.5 s。 |

点击编号可打开动态示例。单个术语的时间、缓动数值与参考代码位于： `api/v1/en/e/<id>.txt` ([#121](../../api/v1/en/e/121.txt)).

[全部分类](../README.md)
