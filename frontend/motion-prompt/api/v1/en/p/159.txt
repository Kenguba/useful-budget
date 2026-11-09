Please use "Inline validation" (インラインバリデーション), one of the names in "Landing page & web effects, part 2".
Motion Prompt #159

What it is: Shows right or wrong while you type
What the sample shows: While the email address is half typed the field turns red with an "invalid format" message; the moment it is complete it switches to a green check and "OK".
Spec:
- A 511 × 168 viewport with a 300 × 44 email field (radius 8). Clicked at 0.45 s, clicked away at 4.2 s. "hana@example.com" (16 characters) is typed one character per 0.115 s from 0.75 s and deleted one per 0.03 s from 3.6 s. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- From the second character until the last one is typed it is invalid: over 0.15 s (cubic ease-out) the border turns red (#E5383B), the fill pale red (#FFF1F1), and a red "!" circle with "形式が正しくありません" (invalid format, 13 px) appears below.
- When the last character makes it valid, over 0.25 s the border turns green (#1E9E5A), a green circle (radius 11, bouncing in with GSAP elastic.out(1, 0.3)) with a white check appears at the right end, and "OK" appears below.
- While focused, the border turns from gray to navy and 1.5 → 2.2 px wide over 0.15 s. Once deletion starts, the messages go away.
When to use it: Use it on sign-up or contact forms so people notice mistakes before they submit.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/159.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
