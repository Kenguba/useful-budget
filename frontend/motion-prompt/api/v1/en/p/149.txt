Please use "Hide-on-scroll header" (隠れるヘッダー), one of the names in "Landing page & web effects, part 2".
Motion Prompt #149

What it is: Hides on scroll down, returns on scroll up
What the sample shows: Scrolling down slides the header up out of view to free the screen; scrolling up even a little brings it straight back.
Spec:
- A 511 × 168 viewport with a 34 px header fixed at the top. Scroll: 0→170 px over 0.3–1.1 s (down), 170→100 over 1.5–1.9 s (up), 100→230 over 2.4–2.9 s (down), 230→0 over 3.3–4.3 s (up), each with cubic ease-in-out. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- If the last movement was downward the header hides; if upward it shows. Within 34 px of the top of the page it always shows.
- Hiding and showing both move it 36 px upward over 0.3 s (quadratic ease-in-out), like transform: translateY with a transition.
- While scrolled, a 12 px shadow sits under the header (opacity 0→0.14 over the first 30 px of scroll). The scrollbar thumb follows the scroll.
When to use it: Use it when screen space is tight, as on phones, to give the content more room while keeping the menu one small scroll away.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/149.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
