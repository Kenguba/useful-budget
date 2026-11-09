Please use "Fade to black" (フェードアウト), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #187

What it is: The picture darkens to black
What the sample shows: The whole picture sinks to black, and the next scene brightens out of the black.
Spec:
- Fade out: from 1.4 s to 2.6 s (1.2 s) black (rgb(20,20,24)) is laid over the outgoing picture with opacity 0 → 100%, quadratic ease-in-out (about cubic-bezier(0.45,0,0.55,1))
- Black: fully black from 2.6 s to 3.1 s; at 2.9 s the incoming picture is swapped in unseen, with a straight cut
- Fade in: from 3.1 s to 4.3 s (1.2 s) the black goes from 100% → 0 with the same easing
- Camera: fixed in both pictures (A at height 1.4 m; B at height 1.6 m, pitch +0.1 rad); the subjects do not move either
- Alternates A→B and B→A every 4.7 s (9.4 s for the round trip); top-right readout shows "FADE OUT" / "FADE IN"; the viewfinder marks stay over the black
When to use it: For a chapter break, a long passage of time, or the end of a story.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/187.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
