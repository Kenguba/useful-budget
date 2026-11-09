Please use "Over-the-shoulder" (オーバーザショルダー), one of the names in "Camera moves & transitions, part 2".
Motion Prompt #180

What it is: Frame one person over another's shoulder
What the sample shows: The back of one person's head and shoulder sit at the edge of frame and the other person is seen past them; the foreground is soft, the subject sharp.
Spec:
- Framing: the back of the foreground person's head and shoulder (grey, 0.62 m left, 1.15 m away) fill the left edge; the other person (blue, 0.32 m right, 3.1 m away) is seen past the shoulder
- Focus: the foreground shoulder is blurred 2.6 px, the other person is sharp and framed from the chest up
- Camera: height 1.55 m, yaw +0.05 rad; pushes in slowly 0 m → 0.35 m from 0.5 s to 3.4 s (cubic ease-in-out (about cubic-bezier(0.65,0,0.35,1)))
- The other person sways arms and legs by 0.35·sin(u×5) rad, as if talking
- Return: hold 3.4–4.2 s, then cross-fade back to the start over the last 0.5 s; top-right readout shows "OTS"
When to use it: To show who is facing whom in a conversation and to focus on the other person's expression.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/180.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/camera2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
