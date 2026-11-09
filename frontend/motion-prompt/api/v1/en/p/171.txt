Please use "Hyperlapse" (ハイパーラプス), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #171

What it is: A time-lapse shot while the camera travels
What the sample shows: The camera travels forward along a street while the sun, clouds and passers-by run in fast forward: a time-lapse that moves.
Spec:
- Camera: moves forward 0 m → 22 m (height 1.6 m, pitch +0.05 rad) while the sun, clouds and figures fast-forward through 12 hours (#039 Time-lapse keeps the camera still)
- Timing: 0.4 s to 4.1 s (3.7 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Street: 12 buildings at x = ±7.5 m (5–55 m deep, 8–16 m tall) approach the camera and leave the frame
- Sun: travels left to right along an arc, angle -1.25 rad → +1.25 rad, always 170 m ahead of the camera; three clouds drift 140 m right in total, wrapping every 80 m; six small figures cross an 11 m wide street
- Building shadows fall away from the sun and swing as it moves (translucent grey); the mountains move with the camera so they keep their size
- Return: cross-fade back to the start over the last 0.5 s; top-right readout shows the clock and the distance travelled (06:00 · 0m → 18:00 · 22m)
When to use it: To cover a long distance and a long stretch of time in one sweep through a city or a building.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/171.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
