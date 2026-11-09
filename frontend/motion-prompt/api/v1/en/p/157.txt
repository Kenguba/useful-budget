Please use "Hover image reveal" (ホバーで画像プレビュー), one of the names in "Landing page & web effects, part 2".
Motion Prompt #157

What it is: Hovering a list item shows its photo
What the sample shows: With the cursor on a row of a text-only list, that row's photo fades in beside the cursor and follows it.
Spec:
- A 511 × 168 viewport with a text-only list of four rows (39 px rows, 17 px names). The cursor moves down the rows, about 1 s on each. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Hovered row: over 0.25 s (cubic ease-out) the name shifts 8 px right and the name and the arrow at the right turn orange; on leave they return over 0.25 s.
- Photo: that row's photo (132 × 84, radius 6, drop shadow) appears 26 px right of the cursor, a little above it, kept inside the window vertically.
- Over the same 0.25 s the photo goes from opacity 0 to 1 and from 0.85× to 1×. It follows the cursor without lag; moving to the next row fades the old photo out as the new one comes in.
When to use it: Use it on lists of work, projects or properties that stay text-only and light, while letting people check a photo for the rows they care about.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/157.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
