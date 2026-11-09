Please use "Background color change on scroll" (背景色の切り替え), one of the names in "Landing page & web effects, part 2".
Motion Prompt #148

What it is: The page background changes color by section
What the sample shows: Each time the scroll moves into a new section, the whole page background blends from cream to navy to light blue; on the dark background the text turns white.
Spec:
- A 511 × 168 viewport with three sections, each 168 px (one screen). Scroll: 0→168 px over 0.3–1.2 s, 168→336 over 1.8–2.7 s, 336→0 over 3.3–4.4 s (cubic ease-in-out). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Background colors: morning #FFEBD9 → night #1E2A4A → holiday #DDE6FF, painted as one color behind the whole page and blended while crossing a section boundary.
- Blend: 0→1 between 5% and 95% of the scroll to the next section (quadratic ease-in-out), driven by scroll position, not by time.
- Toward night the headline blends from navy to white and the body bars from beige to blue-gray; the section labels (01 MORNING …) stay orange.
- Each section's picture (sun, moon and stars, mountain photo) moves with the page. The scrollbar thumb follows the scroll.
When to use it: Use it on story-style pages where each chapter has its own mood, or to contrast scenes such as day and night or the seasons.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/148.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
