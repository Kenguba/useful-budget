Please use "Barrel roll" (バレルロール), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #170

What it is: Roll the camera a full turn on its axis
What the sample shows: The camera rolls a full turn around its lens axis; the horizon goes all the way round and comes back level.
Spec:
- Camera: position fixed (height 1.5 m); roll only, 0 → 2π rad (360°); the whole picture turns around the frame centre
- Timing: 0.5 s to 3.6 s (3.1 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Subject: a person stands still 7 m ahead; horizon, buildings and person all turn by the same angle, and white shows in the corners while turning
- Hold: 3.6–4.2 s. After a full turn the picture equals the start, so the final 0.5 s cross-fade is invisible (one pass = 4.7 s)
- Top-right readout shows the angle (↻ 0° → ↻ 360°)
When to use it: For aerial or drone footage that needs energy, or to show dizziness and confusion.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/170.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
