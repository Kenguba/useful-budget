Please use "Timeline on scroll" (タイムラインアニメーション), one of the names in "Landing page & web effects, part 2".
Motion Prompt #145

What it is: A timeline line grows as you scroll
What the sample shows: As the page scrolls down, an orange line grows down the timeline; each dot it reaches fills in and its year and event slide in from the right. Scrolling back up reverses it.
Spec:
- A 511 × 168 browser viewport. Scroll: 0→190 px over 0.3–2.3 s, 190→0 over 3.0–4.3 s (cubic ease-in-out). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- The timeline line is at x = 168: an orange line grows over a gray track (width 3). Its tip sits at scroll + 126 px, so always 126 px from the top of the viewport (42 px from the bottom).
- Five items (2018–2026), with dots (white, radius 7.5, ring width 2.5) at page y = 72, 126, 180, 234 and 288.
- Over the 22 px of line growth after the tip passes a dot (cubic ease-out): the ring turns orange, an inner dot grows from radius 0 to 4, and the year (18 px, orange) and event (15 px) fade in while sliding 16 px from the right.
- Scrolling back shrinks the line and hides the items by the same formula. The scrollbar thumb on the right follows the scroll.
When to use it: Use it for company history, milestones or a step-by-step process that reads in time order.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/145.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
