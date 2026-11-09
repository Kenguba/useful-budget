Please use "Follow shot" (フォローショット), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #174

What it is: Follow behind the subject as they move
What the sample shows: The camera trails a weaving walker along the same path a few metres behind; the person stays near the centre, seen from the back.
Spec:
- Path: the person walks the curve x = 1.8·sin(2.2s), depth z = 4 + 9s (s from 0 to 1), from 4 m to 13 m away
- Camera: follows on the same curve at s-0.4 (about 3.6–3.9 m behind) and always faces the person, yaw = atan2(person x - camera x, person z - camera z); height 1.5 m
- Timing: 0.3 s to 4.2 s (3.9 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1)); legs and arms swing by sin(s×30)×0.42 rad
- The person stays near the centre of frame, seen from behind; posts and a rock beside the path sweep past in the foreground (#029 Tracking shot runs alongside)
- Return: cross-fade back to the start over the last 0.5 s (one pass = 4.7 s); top-right readout shows the distance to the person (FOLLOW 3.6–3.9m)
When to use it: To enter a place together with a character, or for a third-person, game-like view.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/174.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
