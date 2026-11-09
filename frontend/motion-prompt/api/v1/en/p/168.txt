Please use "Background video" (背景動画), one of the names in "Landing page & web effects, part 2".
Motion Prompt #168

What it is: A video plays behind the hero section
What the sample shows: In the hero background, clouds and waves keep moving, while the headline and button sit still on top.
Spec:
- A 511 × 168 viewport. Background footage (sky, clouds, mountains, sea) fills the hero, with a still headline (28 px, white) and button on top. The footage loops every 4.7 s (twice per 9.4 s pack cycle).
- Clouds: the far layer repeats every 170 px and moves 170 px right per 4.7 s (about 36 px/s); the near layer repeats every 340 px and moves 340 px per 4.7 s (about 72 px/s). The mountains stay still.
- Sea: three waves (y = 118, 130, 146; amplitude 2.5–3 px; wavelength 90, 60, 120 px); only the middle one runs the other way and moves two wavelengths per 4.7 s (the other two move one wavelength to the right).
- For legibility, a 12% navy layer covers the footage, a gradient darkens the left 300 px (opacity 0.45 → 0), and the headline has a shadow (10 px blur).
- A playing badge (pause, muted) sits at the bottom right. On a real site the video uses autoplay, muted, loop and playsinline.
When to use it: Use it on hero sections for travel, hotels, restaurants or recruiting, where atmosphere and motion say more than one photo.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/168.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
