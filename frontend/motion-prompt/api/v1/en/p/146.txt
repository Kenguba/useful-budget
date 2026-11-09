Please use "Scroll text reveal" (スクロールテキストリビール), one of the names in "Landing page & web effects, part 2".
Motion Prompt #146

What it is: Text darkens letter by letter as you scroll
What the sample shows: A light gray headline darkens one character at a time from the top left as the page scrolls, and fades back from the end when scrolling up.
Spec:
- A 511 × 168 viewport. Scroll progress p: 0→1 over 0.3–2.6 s, 1→0 over 3.2–4.4 s (cubic ease-in-out). The page moves up by p × 40 px. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- A three-line headline, 24 characters in all (27 px, weight 800, 38 px line height), all light gray (#D6DBE4) at the start.
- Character n (counting from 0) has darkness clamp(p × 26 − n): each character takes 1/26 of the progress to reach the text color (#1C2333), in step with the scroll.
- Scrolling back fades them from the last character by the same formula. The body-text bars and the scrollbar thumb move with the page.
When to use it: Use it on a short statement, such as a concept or a message from the founder, that should be read slowly.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/146.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
