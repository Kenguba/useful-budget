Please use "Back-to-top button" (トップへ戻るボタン), one of the names in "Landing page & web effects, part 2".
Motion Prompt #151

What it is: Appears lower down and returns you to the top
What the sample shows: After scrolling down, a round arrow button appears at the bottom right; clicking it takes the page straight back to the top.
Spec:
- A 511 × 168 viewport. Scroll 0→300 px (to the bottom of the page) over 0.2–1.7 s, cubic ease-in-out. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Button: an orange circle at the bottom right (center x = 472, y = 138; radius 19; white up arrow; 10 px shadow blur). Between 80 and 140 px of scroll it fades in while rising 10 px (cubic ease-out).
- It is clicked at 2.6 s. While the cursor is on it, it darkens over 0.2 s (#FF5A2C → #D9431C).
- After the click the scroll goes 300→0 over 2.66–3.26 s (0.6 s, cubic ease-in-out); below 80 px the button fades out by the same formula.
When to use it: Use it on long pages such as blog posts, long landing pages or product lists, so readers can get back to the menu at the top.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/151.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
