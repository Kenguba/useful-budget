Please use "Deep focus" (ディープフォーカス), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #182

What it is: Near and far all in sharp focus
What the sample shows: From the flower in front to the person and buildings behind, everything comes into sharp focus at the same time.
Spec:
- Camera: position, direction and focal length all fixed (height 1.1 m); only the blur amounts change
- Blur: the foreground flower (0.75 m left, 2 m away) goes 5 px → 0 px and the background (person 0.9 m right, 9 m away; buildings; mountains) goes 6 px → 0 px, both sharpening together (#033 Rack focus blurs one side)
- Timing: 0.5 s to 3.4 s (2.9 s), cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1))
- Focus markers: blue corner brackets on both the flower (half-width 46 px) and the person (half-width 30 px), opacity 0 → 1 as focus arrives
- Return: hold 3.4–4.2 s, then cross-fade back to the start over the last 0.5 s; top-right readout shows the aperture (f/1.8 → f/16)
When to use it: When the viewer may look anywhere in the frame, or to show several things happening at different depths at once.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/182.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
