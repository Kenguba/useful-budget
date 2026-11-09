Please use "Image swap on hover" (ホバーで画像切り替え), one of the names in "Landing page & web effects, part 2".
Motion Prompt #155

What it is: Hovering swaps the photo for another shot
What the sample shows: With the cursor on a product card, the front photo of the T-shirt cross-fades to a back view; it returns to the front when the cursor leaves.
Spec:
- A 511 × 168 viewport with two product cards (photo frame 196 × 112, radius 8, name and price below). The cursor rests on the left card, then the right one, for about 1.3 s each. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- On hover, over 0.3 s (quadratic ease-in-out), the front photo (small dot on the chest) cross-fades to the back photo (large star on the back); on leave it fades back over the same 0.3 s.
- Two dots under the photo (radius 3) show which photo is showing (the dark dot is the current one).
- The hover area is the whole card, including the name. The frame, name and price do not move.
When to use it: Use it on e-commerce product grids to show another angle or an on-model shot without leaving the list.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/155.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
