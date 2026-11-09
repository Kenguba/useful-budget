Please use "Like button animation" (いいねアニメーション), one of the names in "Landing page & web effects, part 2".
Motion Prompt #166

What it is: The heart pops with a burst when liked
What the sample shows: Clicking the heart fills it red with a springy pop, small particles burst around it and the count beside it goes up by one; clicking again undoes it.
Spec:
- A 511 × 168 viewport: a post card with an outlined heart (line width 2.4) and the count "128" on the right. The heart is clicked at 0.9 s and clicked again at 3.3 s to undo. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- In the 0.1 s before the click it squeezes to 0.78×; at the click it fills red (#F23D5C), grows 0.78 → 1.45× in 0.12 s (cubic ease-out), then settles to 1× as 1 + 0.45·e^(−7t)·cos(15t).
- 0.08–0.58 s after the click: a red ring (radius 15 → 33, opacity 0.5 → 0) and six small particles in six directions (red, yellow, orange) flying out from radius 24 to 37 as they fade.
- Count: 0.05–0.35 s after the click (cubic ease-out) 128 slides up and out and a red 129 comes in from below; undoing slides it back down to 128.
- Undo: the heart goes back to an outline and dips to 0.84× and back over 0.4 s around the click (no particles).
When to use it: Use it on like, favorite or save buttons, to confirm the tap clearly and pleasantly.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/166.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
