Please use "Bird's-eye view" (バーズアイ), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #181

What it is: Straight down from directly overhead
What the sample shows: Looking straight down from overhead: road, people, cars and trees appear as top-down shapes, and more comes into view as the camera rises.
Spec:
- Camera: points straight down (pitch -π/2 = -90°) and rises from 9 m to 15 m, directly above the origin
- Timing: 0.5 s to 3.4 s (2.9 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Ground: a 2 m grid and a 3.2 m wide road (white dashed centre line) drawn as one plane; six trees as circles and three buildings as squares, seen from above
- Subjects: a person (head circle and shoulder ellipse) walks 5.2 m up the right side of the road, a car (1.8×4 m) drives 6.8 m down the left side; both move in proportion to the progress p
- As the camera rises everything shrinks and more of the ground comes into view (10 High angle looks down at a slant)
- Return: hold 3.4–4.2 s, then cross-fade back to the start over the last 0.5 s; top-right readout shows "↓ 90° · 9m → 15m"
When to use it: To show layout and paths like a diagram, or for a god's-eye overview.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/181.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
