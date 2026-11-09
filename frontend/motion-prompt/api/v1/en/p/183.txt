Please use "Establishing shot" (エスタブリッシングショット), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #183

What it is: A wide opening shot that shows the place
What the sample shows: A wide, high view of the whole town; the camera pushes in slowly and a location caption appears at bottom left.
Spec:
- Camera: wide lens (focal length 220 px, shown as 16mm), height 4.5 m, pitch -0.06 rad; pushes in slowly from -5 m to -2.5 m
- Timing: 0.3 s to 4.2 s (3.9 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Scene: eight city buildings 30 m away, a tower 16 m right and 36 m away, three clouds and mountains; a small person 1 m left, 12 m away gives the scale
- Location caption: from 0.9 s to 1.3 s a white card reading "EXT. CITY – DAY" (158×30 px, blue bar on its left) fades in at bottom left while moving up 8 px, then stays
- Return: cross-fade back to the start over the last 0.5 s (one pass = 4.7 s); top-right readout shows "16mm WIDE"
When to use it: At the start of a scene to say where we are, or whenever the place or time changes.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/183.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
