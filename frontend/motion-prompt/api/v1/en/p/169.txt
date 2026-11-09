Please use "Pedestal" (ペデスタル), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #169

What it is: Move the whole camera straight up or down
What the sample shows: The camera moves straight up without changing its direction; the horizon stays centred while the person and buildings slide down.
Spec:
- Camera: moves straight up from 1.0 m to 3.2 m; direction (yaw, pitch) and focal length (330 px) stay fixed
- Timing: 0.5 s to 3.4 s (2.9 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Subject: a person stands still 7 m ahead and slides down the frame, leaving at the bottom feet first; a tower stands 3.5 m right, 26 m away
- Because the pitch does not change, the horizon stays at the centre of the frame (#031 Crane up tilts down while rising)
- Return: hold 3.4–4.2 s, then cross-fade back to the start over the last 0.5 s (one pass = 4.7 s)
- Top-right readout shows the height (↕ 1.0m → ↕ 3.2m)
When to use it: To show a shelf or a building from bottom to top smoothly, or to change the eye level without tilting.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/169.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
