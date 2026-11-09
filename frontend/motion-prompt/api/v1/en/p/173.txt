Please use "Steadicam" (ステディカム), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #173

What it is: Smooth, floating movement with no shake
What the sample shows: The camera glides forward after a walking person with only a slow, gentle sway and no jitter, unlike handheld.
Spec:
- Camera: moves forward at a constant 1.7 m/s (8 m per 4.7 s); height 1.45 m, pitch -0.02 rad; no easing
- Sway: height ±3.5 cm (2 cycles per 4.7 s), sideways ±5 cm (1 cycle), yaw ±0.012 rad, roll ±0.006 rad, all sine waves with integer periods, slow and wide (#034 Handheld is fast and irregular)
- Subject: a person walks 5 m ahead of the camera at the same speed; legs and arms take 5 strides per 4.7 s
- Trees: 3.6 m tall at x = -5 m and 3.2 m tall at x = +5 m, every 8 m (the two rows offset by 4 m); the mountains and sun move with the camera
- 8 m is a multiple of the grid (2 m) and tree (8 m) spacing, so it loops seamlessly every 4.7 s; top-right readout shows "STEADICAM"
When to use it: To make a walking move look smooth and cinematic.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/173.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
