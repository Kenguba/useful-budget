Please use "Countdown timer" (カウントダウンタイマー), one of the names in "Landing page & web effects, part 2".
Motion Prompt #164

What it is: Counts down the time left to a deadline
What the sample shows: The hours, minutes and seconds under "キャンペーン終了まで" (until the campaign ends) count down every second; only the digits that change slide up and out as new ones come in from below.
Spec:
- A 511 × 168 viewport: an orange gradient band with "キャンペーン終了まで" (until the campaign ends) and six digit tiles for hours, minutes and seconds (34 × 50 each, radius 6, 32 px digits). This card alone runs once per 9.4 s (the pack cycle).
- It starts at 02:15:04 and counts down one second at a time, nine times, every 1 s from 0.4 s, ending at 02:14:55. At 4.4 s, 02:15:00 → 02:14:59 rolls the minutes over.
- Only the tiles whose digit changes animate: over 0.32 s (cubic ease-in-out) the old digit slides up and out and the new one slides in from below, clipped to the tile.
- At 9.4 s it goes back to 02:15:04 with a plain cut.
When to use it: Use it before a limited-time offer or an application deadline, to make the time left plain to see.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/164.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
