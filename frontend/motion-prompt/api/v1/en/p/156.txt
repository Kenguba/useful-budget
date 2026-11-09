Please use "Text roll on hover" (テキストロール), one of the names in "Landing page & web effects, part 2".
Motion Prompt #156

What it is: Letters roll up and swap on hover
What the sample shows: With the cursor on a menu word, its letters roll up and out one by one while the same word rolls in from below in orange; it rolls back when the cursor leaves.
Spec:
- A 511 × 168 viewport with three menu words (WORKS, ABOUT, CONTACT; 30 px, weight 800, 1 px letter spacing). The cursor rests on each, left to right, for about 0.85 s. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- An orange copy of each word sits 40 px below it, and both are clipped to a 39 px tall box (overflow: hidden).
- On hover each letter, staggered by 0.035 s, moves 40 px up and out over 0.36 s (cubic ease-in-out) while its orange copy rises into place.
- On leave the letters roll back down with the same stagger and timing.
When to use it: Use it on header menus or buttons to give short text links a tactile response.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/156.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
