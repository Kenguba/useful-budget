Please use "Extreme close-up" (エクストリームクローズアップ), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #184

What it is: Fill the frame with one small detail
What the sample shows: From a close-up of the face to a frame filled by nothing but the eyes.
Spec:
- Camera: the face's right eye (0.06 m left of centre, 1.66 m high) 1.3 m ahead is placed at the centre of frame; the camera does not move
- Focal length: 610 px → 2040 px (shown as 44mm → 148mm, about 3.3×); f = 610 × (2040/610)^p, where p is a cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1)) from 0.5 s to 3.4 s
- Face: a blue head (radius 0.16 m) with white eyes (ellipses 0.045×0.028 m), dark pupils (radius 0.016 m), highlights and white brows; it starts as a close-up of the whole face (head about 150 px across) and ends with only the eyes filling the frame
- Background: trees and buildings blurred 3 px, leaving the frame as the lens closes in
- Return: hold 3.4–4.2 s, then cross-fade back to the start over the last 0.5 s; top-right readout shows the focal length and the abbreviation (44mm CU → 148mm ECU)
When to use it: For the emotional peak, or to make the viewer notice one small detail.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/184.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
