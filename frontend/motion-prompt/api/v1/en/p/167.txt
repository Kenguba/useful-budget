Please use "Scroll-down cue" (スクロールダウンの合図), one of the names in "Landing page & web effects, part 2".
Motion Prompt #167

What it is: A looping cue that invites you to scroll down
What the sample shows: Below the hero, the word "SCROLL", a dot inside a mouse outline and arrows on either side keep repeating a downward motion.
Spec:
- A 511 × 168 viewport. Centered below the hero: "SCROLL" (11 px, 3 px letter spacing) and a mouse outline (24 × 38, radius 12, line width 2.2). One beat takes 1.57 s (three per 4.7 s, six per 9.4 s pack cycle).
- The orange dot inside (5 × 9) drops 14 px over the first 70% of the beat (quadratic ease-in-out), fades out between 45% and 75%, and reappears at the top on the next beat.
- 40 px to each side, two down-chevrons (line width 2.5) per side, half a beat apart, drift 24 px downward; their opacity follows a sine, 0 → 0.8 → 0.
When to use it: Use it when the hero fills the screen and people need a hint that the page goes on below.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/167.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
