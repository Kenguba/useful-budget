Please use "Bullet time" (バレットタイム), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #191

What it is: Time stands still while the camera circles
What the sample shows: Time nearly stops at the top of a jump while the camera circles around the person.
Spec:
- Footage time: runs normally for 0–1.5 s, at 0.1× from 1.5 s to 3.3 s (only 0.18 s of footage in 1.8 s), then normally again (footage time = u - 1.62)
- Subject: a person 9 m away jumps on a parabola over footage time 0.6–2.6 s (peak 1.1 m, arms raised); during the slow part they seem to hang near the top (45–54% through); nine leaves fall on the same footage time
- Camera: during the slow part it travels on a circle of radius 6 m around the person from -0.6 rad to +0.6 rad (about 69°), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1)); always facing the centre, height 1.6 m, pitch -0.05 rad
- The next 4.7 s pass circles the other way (+0.6 → -0.6 rad), so the 9.4 s loop is seamless (#030 Orbit does not stop time)
- A dashed circle of radius 1.3 m on the ground and a ring of trees at 10 m; top-right readout shows "×1.0" → "BULLET ×0.1" → "×1.0"
When to use it: To show a decisive moment in three dimensions, or as the highlight of an action scene.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/191.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
