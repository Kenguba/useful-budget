Please use "Cross-cutting" (クロスカッティング), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #190

What it is: Alternate between two simultaneous scenes
What the sample shows: Two scenes happening at the same time, a runner and a car, alternate in shorter and shorter cuts.
Spec:
- Two scenes share one clock: A is a runner (0.3 m left, depth 15 m → 4.5 m, legs at u×12), B is a car in the city (1 m right, depth 17 m → 4.5 m); both close in over 4.7 s
- Cuts: straight cuts between A and B at 0 / 1.1 / 2.0 / 2.7 / 3.3 / 3.8 / 4.2 / 4.5 s; the shots shorten 1.1 → 0.9 → 0.7 → 0.6 → 0.5 → 0.4 → 0.3 s to raise the tension
- Each scene keeps running while the other is on screen (when it comes back, its subject has moved on)
- Camera: A at height 1.3 m, fixed, with four posts in the foreground; B at height 1.6 m, pitch +0.06 rad, fixed, with the city and sun
- Bottom strip: eight alternating sections A (grey) and B (blue) with a playhead; the last 0.3 s cross-fades back to the start of A
- Top-right readout shows "SCENE A" / "SCENE B"
When to use it: To build tension between things happening at once, such as a chase or a rescue.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/190.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
