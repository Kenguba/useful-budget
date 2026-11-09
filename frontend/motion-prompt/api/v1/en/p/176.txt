Please use "Fly-through" (フライスルー), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #176

What it is: Fly through an opening into the next space
What the sample shows: The camera flies toward a wall with a window, passes through the opening and comes out into the place beyond.
Spec:
- Camera: moves forward 0 m → 12.5 m (height 1.3 m, direction fixed); a wall with a window stands 8 m ahead and the camera passes through it
- Timing: 0.5 s to 3.6 s (3.1 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Wall: a pale grey plane 80 m wide and 14 m tall with a window 2.4 m wide and 2.2 m tall (sill at 0.15 m); through it a person (0.3 m right, 14.5 m away), trees, buildings and mountains are visible
- Pass-through: the wall stops being drawn 0.25 m in front of the camera; by then the window edge is outside the frame (half-width about 1580 px), so it vanishes unseen
- After the pass the place beyond fills the frame and the camera closes to 2 m from the person (#035 FPV drone shot keeps weaving between trees)
- Return: hold 3.6–4.2 s, then cross-fade back to the start over the last 0.5 s; top-right readout shows the distance to the window ("窓まで 8.0m" → "通過", passed)
When to use it: To enter a building as an opening move, or to travel from one place to another in a single move.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/176.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
