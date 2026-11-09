Please use "Iris out" (アイリスアウト), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #188

What it is: A circle closes down to black
What the sample shows: A circle closes down on the person until the frame is black, then opens again on the next scene.
Spec:
- Iris out: from 1.3 s to 2.7 s (1.4 s) the circular window shrinks from radius 340 px to 0 (quadratic ease-in-out (about cubic-bezier(0.45,0,0.55,1))); outside the circle is black (#141418)
- Centre of the window: the current picture's subject, the person's head in A (0.6 m left, 1.63 m high, 7 m away) or the car in B (1.2 m right, 0.9 m high, 9 m away), projected to the screen
- Black: 2.7–3.1 s; at 2.9 s the incoming picture is swapped in with a straight cut
- Iris in: from 3.1 s to 4.4 s (1.3 s) the circle grows from 0 to 340 px around the incoming picture's subject
- Edge: while the radius is at least 1 px, a 2 px blue circle marks the rim; the camera is fixed in both pictures
- Alternates A→B and B→A every 4.7 s (9.4 s for the round trip); top-right readout shows "IRIS OUT" / "IRIS IN"
When to use it: For a silent-film or cartoon-style ending, or a playful break.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/188.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
