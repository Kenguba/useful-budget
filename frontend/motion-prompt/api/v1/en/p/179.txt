Please use "POV shot" (POVショット), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #179

What it is: See through a character's eyes
What the sample shows: Seen through a character's eyes: the walking sway and the hands at the bottom say first person, and the person ahead waves at you.
Spec:
- Camera: walks forward 0 m → 3.2 m at the character's eye height of 1.6 m; 0.3 s to 4.2 s (3.9 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Walking sway: height ±3 cm (6 cycles per 4.7 s), roll ±0.008 rad (3 cycles), added only while moving
- Hands: blue rounded hands at both bottom corners (±178 px from centre), a white phone in the right one; they move with the body, so the hands stay still and the world sways
- The other person, 7.5 m ahead, raises both arms and waves only from 1.6 s to 3.4 s (looking at you); two posts in the foreground
- Return: cross-fade back to the start over the last 0.5 s (one pass = 4.7 s); top-right readout shows "POV"
When to use it: To put the viewer in the character's place, or for a game-like or VR-like feel.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/179.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
