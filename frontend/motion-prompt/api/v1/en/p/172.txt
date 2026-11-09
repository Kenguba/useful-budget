Please use "Long take" (長回し), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #172

What it is: One continuous shot with no cuts
What the sample shows: One continuous shot follows a walking person with no cut; the bar at the bottom stays a single unbroken strip.
Spec:
- Join: none; for 4.2 s one shot keeps following the person (#041 Jump cut splits it into five)
- Subject: a person walks at constant speed from front left (x = -3.4 m, 5.2 m deep) to back right (x = 2.8 m, 9.6 m deep); legs and arms swing by sin(t×7)×0.42 rad
- Camera: trucks right 0 m → 1.4 m after the person while turning, yaw = atan2(person x - camera x, depth)×0.8; height 1.4 m
- Bottom strip: one blue bar labelled "1ショット・カットなし" (one shot, no cut) with a playhead, showing there is no break
- Return: stops at 4.2 s, then cross-fades back to the start over the last 0.5 s (one pass = 4.7 s)
- Top-right readout shows the elapsed time (NO CUT 0.0s → 4.2s)
When to use it: To keep tension and presence unbroken, or to show a sequence of movement as one flow.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/172.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
