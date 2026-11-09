Please use "High angle" (ハイアングル), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #178

What it is: Shoot from above, looking down
What the sample shows: The camera rises and looks down; the person looks small and the ground fills most of the frame.
Spec:
- Camera: rises from 1.5 m to 4.5 m while the pitch goes 0 → -0.5 rad (about 29° down); no movement forward or back
- Timing: 0.6 s to 2.2 s (1.6 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Subject: a person stands still 5 m ahead; as the camera looks down they shrink and move lower, the ground grid fills most of the frame and the horizon leaves at the top
- Hold: stays at the high angle from 2.2 s to 4.2 s (#031 Crane up keeps rising to 9 m; 13 Bird's-eye view looks straight down at 90°)
- Return: cross-fade back to eye level over the last 0.5 s (one pass = 4.7 s); top-right readout shows angle and height (↘ 0° · 1.5m → ↘ 29° · 4.5m)
When to use it: To make a person look vulnerable or small, or to explain a situation from above.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/178.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
