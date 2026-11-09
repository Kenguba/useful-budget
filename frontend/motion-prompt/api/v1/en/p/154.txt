Please use "Spotlight hover" (スポットライトホバー), one of the names in "Landing page & web effects, part 2".
Motion Prompt #154

What it is: Only the area around the cursor lights up
What the sample shows: As the cursor moves over the dark cards, only a circle around it is lit, and the edges of nearby cards glow.
Spec:
- A 511 × 168 viewport: a dark page (#121828) with three dark cards (147 × 116, radius 10). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- The cursor keeps moving in a figure eight: x = 255 + 190·sin(2πt/4.7), y = 92 + 40·sin(4πt/4.7).
- Inside each card only, a white radial light of radius 115 px is centered on the cursor (opacity 0.34 at the center → 0); it does not spill outside the cards.
- Card borders (width 2) glow by distance from the cursor: an orange radial light (rgb(255,122,82)) of radius 120 px. Far edges keep only the faint base line (8% white).
- No lag: the light sits exactly at the cursor (the usual build puts the coordinates in CSS variables used as the radial-gradient center).
When to use it: Use it on dark-themed sites with rows of feature or pricing cards, to make the spot under the pointer stand out.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/154.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
