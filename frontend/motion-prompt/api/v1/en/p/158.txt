Please use "Floating label" (フローティングラベル), one of the names in "Landing page & web effects, part 2".
Motion Prompt #158

What it is: The label floats up when you start typing
What the sample shows: Clicking the field shrinks the label and moves it onto the top border, leaving the field free for typing; empty and unfocused, the label moves back inside.
Spec:
- A 511 × 168 viewport with a 300 × 46 field (radius 8) holding the label "メールアドレス" (email address, 15 px). The field is clicked at 0.65 s, and a click outside at 3.95 s removes focus. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- While focused or not empty, over 0.24 s (cubic ease-out) the label shrinks 15 → 11.5 px and moves from the middle of the field onto the top border (left padding 14 → 10 px); the border is masked in white behind it.
- While focused, over 0.15 s (cubic ease-out) the border turns from gray to orange and 1.5 → 2.2 px wide, and the label turns orange.
- "hello@example.com" is typed one character per 0.075 s from 1.0 s and deleted one per 0.03 s from 3.2 s. Once empty and unfocused, the label moves back inside over the same 0.24 s.
- The text caret blinks every 0.9 s (it stays on while typing).
When to use it: Use it on forms with many fields, to keep each label visible without taking extra space.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/158.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
