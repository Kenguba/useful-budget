Please use "Cutaway" (カットアウェイ), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #189

What it is: Cut to something else, then back
What the sample shows: From the speaker to the listening audience and back; what is cut in is a different subject.
Spec:
- Join: two straight cuts (0 frames); to the other subject at 1.7 s and back to the scene at 3.0 s (1.3 s away)
- Main shot (A): fixed camera (height 1.4 m); a person 5.5 m away talks, swinging arms and legs by 0.45·sin(u×6) rad, with a grey lectern 0.9 m to the right
- Other subject (CUTAWAY): the listening audience, five people 3.1–4.6 m away in blue and pale blue with both arms up, bouncing by |sin(t×9+i)|×5 cm; no background (a different place)
- Bottom strip: A (grey), other subject (blue), A (grey) with a playhead (17 Insert shot shows a detail of the same scene)
- Top-right readout shows "SHOT A" → "CUTAWAY" → "SHOT A"; at 4.7 s it cuts straight back to the start
When to use it: To show a reaction, or to hide a time skip or a removed slip.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/189.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
