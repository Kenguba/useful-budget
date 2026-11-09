Please use "3D tilt on hover" (3Dチルト), one of the names in "Landing page & web effects, part 2".
Motion Prompt #153

What it is: The card tilts in 3D following the cursor
What the sample shows: As the cursor moves over the card, the card tilts in depth to match the cursor position and a glare moves across its surface; it settles flat when the cursor leaves.
Spec:
- A 511 × 168 viewport with a 220 × 132 card (radius 14) in the middle. The cursor comes in, visits points near the card's corners every 0.6 s and leaves (cubic ease-in-out). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Tilt: the cursor offset from the card center is divided by half the width and height to give −1…1; the horizontal offset × 0.32 rad (about 18°) is the rotation about Y, the vertical offset × 0.32 rad the rotation about X. The side under the cursor tips away.
- Depth: viewer distance 520 px (like perspective: 520px); nearer parts are drawn larger.
- On hover the tilt and glare ramp up over 0.4 s (cubic ease-out); on leave the card returns flat over the same 0.4 s.
- Glare: a white radial light of radius 130 px at the cursor (opacity 0.42 at the center). The floor shadow shifts up to 10 px against the tilt.
When to use it: Use it on member cards, product packaging or pricing cards to make them feel like objects you can pick up.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/153.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
