Please use "Zoom on scroll" (スクロールで拡大), one of the names in "Landing page & web effects, part 2".
Motion Prompt #152

What it is: An image grows to fill the screen as you scroll
What the sample shows: As the page scrolls, a small photo in the middle grows to fill the window, the text around it fades away and a headline appears over the photo.
Spec:
- A 511 × 168 viewport. Scroll progress p: 0→1 over 0.3–2.3 s, 1→0 over 3.0–4.4 s (cubic ease-in-out). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Photo frame: from 155 × 90 in the middle (x = 178, y = 58, radius 8) to the full 511 × 168 window (radius 0); position, width, height and radius change in proportion to p.
- The heading and text around it fade out while p goes 0→0.45 (opacity 1 − 2.2p).
- While p goes 0.7→1, a white headline (26 px, 2 px letter spacing) fades in at the center of the photo. The scrollbar thumb follows the scroll.
When to use it: Use it on travel, real-estate or brand sites to pull the visitor into the photo.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/152.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
