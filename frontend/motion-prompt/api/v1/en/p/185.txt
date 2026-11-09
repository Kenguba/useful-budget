Please use "Insert shot" (インサートショット), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #185

What it is: Cut in to a detail of the same scene
What the sample shows: A big close-up of the watch on the person's wrist is cut into the scene for 1.3 s, then it returns to the same shot.
Spec:
- Join: two straight cuts (0 frames); to the detail at 1.6 s and back to the scene at 2.9 s (the detail lasts 1.3 s)
- Main shot (A): fixed camera (height 1.4 m); a person stands 0.6 m left, 6 m away, with a watch (dark dot) on the wrist; a post 2.2 m right, 4 m away
- Detail (INSERT): a big close-up of the wrist from the same scene; a blue sleeve (600×92 px, rotated -0.35 rad) on pale blue, a white dial (radius 58 px), dark hands and a blue second hand that makes one turn in 1.3 s
- Bottom strip: three sections A (grey), detail (blue), A (grey) with a playhead; what is cut in belongs to the same scene (21 Cutaway shows a different subject)
- Top-right readout shows "SHOT A" → "INSERT" → "SHOT A"; at 4.7 s it cuts straight back to the start
When to use it: To show a small object or a hand action, or to point out an important prop.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/185.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
