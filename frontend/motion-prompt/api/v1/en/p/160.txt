Please use "Loading button" (ローディングボタン), one of the names in "Landing page & web effects, part 2".
Motion Prompt #160

What it is: Shows loading, then done, inside the button
What the sample shows: Clicking the submit button shrinks it to a circle with a spinner inside; when it finishes it widens into a green "Done" with a check.
Spec:
- A 511 × 168 viewport with an orange pill button, 220 × 36, labeled "送信する" (Send). It is clicked at 0.8 s. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Over 0.85–1.15 s (0.3 s, cubic ease-in-out) it shrinks from 220 to 36 px wide, a circle; the label fades in the first third of the shrink.
- From 1.1 to 2.3 s a white spinner (radius 10, line width 3, 0.7π arc) turns once every 0.7 s inside the circle.
- Over 2.25–2.45 s the color goes orange → green (#1E9E5A) and a white check draws over 2.25–2.5 s; over 2.45–2.8 s (cubic ease-in-out) it widens 36 → 150 px, the check moves 26 px left and "完了" (Done) appears.
- It fades out over 3.9–4.1 s and the original "送信する" button comes back, rising 6 px, over 4.1–4.4 s (cubic ease-out).
When to use it: Use it on buttons that make people wait a moment for a result, such as submit, purchase or save.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/160.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
