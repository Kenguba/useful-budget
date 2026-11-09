Please use "Locked-off shot" (ロックオフ), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #175

What it is: Camera fixed; only the subject moves
What the sample shows: A person crosses in front of a tripod-fixed camera and a car passes behind; the camera does not move by a pixel.
Spec:
- Camera: completely fixed (height 1.4 m, facing forward, focal length 330 px); only the subjects move
- Subject: a person crosses left to right at constant speed 6.5 m ahead (x = -6.2 m → +6.2 m in 4.7 s); legs and arms swing by sin(u×7)×0.42 rad
- A grey car crosses right to left 15 m away (x = +16 m → -16 m in 4.7 s)
- Both start and end outside the frame, so it loops seamlessly every 4.7 s
- A grey tripod mark at bottom left; top-right readout shows "LOCKED" (#040 Freeze frame stops the footage time; here time runs and only the camera is still)
When to use it: To make the subject stand out by contrast, for fixed-point observation, or as a base for time-lapse and compositing.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/175.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
