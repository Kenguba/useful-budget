Please use "Scrollspy" (スクロールスパイ), one of the names in "Landing page & web effects, part 2".
Motion Prompt #150

What it is: Highlights the current section in the menu
What the sample shows: As the article scrolls, the table-of-contents item for the section being read lights up, and the highlight moves on when the next heading comes in.
Spec:
- A 511 × 168 viewport: a table of contents on the left (150 px wide, 4 items) and the article on the right, with headings 100 px apart. Scroll: 0→100 over 0.3–0.9 s, →200 over 1.35–1.95 s, →300 over 2.4–3.0 s, 300→0 over 3.5–4.4 s (cubic ease-in-out). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Current item = the last heading whose top is above scroll + 40 px (a trigger line 40 px below the top of the viewport).
- When it changes, over 0.25 s (cubic ease-out) the item gets a pale orange background (126 × 26, radius 6) and an orange bar on its left (width 4), and its text turns from gray to bold orange; the previous item reverts over the same 0.25 s.
- The table of contents stays put; only the article scrolls. The scrollbar thumb follows the scroll.
When to use it: Use it on long articles, documentation or FAQs to show where the reader is within the whole page.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/150.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
