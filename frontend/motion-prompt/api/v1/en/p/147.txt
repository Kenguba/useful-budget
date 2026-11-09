Please use "Stacking cards" (スタッキングカード), one of the names in "Landing page & web effects, part 2".
Motion Prompt #147

What it is: Cards stack on top of each other on scroll
What the sample shows: On scroll, the next card rises from below and stacks over the previous one with a small offset; the cards underneath shrink a little and darken.
Spec:
- A 511 × 168 viewport. Scroll step s: 0→1 over 0.3–1.1 s, 1→2 over 1.6–2.4 s, 2→0 over 3.2–4.4 s (cubic ease-in-out). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Three cards (371 × 124, radius 12, centered), 170 px apart on the page; each step of s moves them up 170 px.
- They stop 14, 26 and 38 px from the top (position: sticky with the top offset 12 px larger for each card), so each new card covers the one before.
- For each card stacked on top, the card underneath shrinks 4.5% (9% for two) around the middle of its top edge and darkens under a navy layer (up to 16%).
- Card shadow: 14 px blur, 2 px upward. The scrollbar thumb follows the scroll.
When to use it: Use it for steps, features or plans that should be shown one card at a time, in order.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/147.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
