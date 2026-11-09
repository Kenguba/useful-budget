Please use "Low angle" (ローアングル), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #177

What it is: Shoot from low down, looking up
What the sample shows: The camera drops to near the ground and looks up; the person looks big and the buildings tower.
Spec:
- Camera: lowers from 1.5 m to 0.35 m while the pitch goes 0 → +0.32 rad (about 18° up); no movement forward or back
- Timing: 0.6 s to 2.2 s (1.6 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Subject: a person stands still 4.5 m ahead; an 11.8 m tower stands 3 m left, 22 m away. As the camera looks up, person and tower stretch upward and the horizon drops
- Hold: stays at the low angle from 2.2 s to 4.2 s (time to read the composition itself)
- Return: cross-fade back to eye level over the last 0.5 s (one pass = 4.7 s); top-right readout shows angle and height (↗ 0° · 1.5m → ↗ 18° · 0.4m)
When to use it: To make a person look powerful or large, or to emphasise the height of a building.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/177.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
