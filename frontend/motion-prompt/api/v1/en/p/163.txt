Please use "Hotspots" (ホットスポット), one of the names in "Landing page & web effects, part 2".
Motion Prompt #163

What it is: Dots on an image open notes when clicked
What the sample shows: White dots pulse on the product picture; clicking one opens a tooltip about that part, and clicking another dot swaps the tooltip.
Spec:
- A 511 × 168 viewport: a product picture (a backpack) on the left, name and price on the right, with two dots on the picture (white circle, radius 8, drop shadow; orange center, radius 4). One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Pulse: from each dot a white ring (width 2) grows from radius 8 to 20 while fading from 0.75 to 0 opacity, every 1.57 s (a third of 4.7 s), two rings half a period apart.
- At 0.9 s the upper dot is clicked: a tooltip (136 × 48, radius 8, with a pointer toward the dot) appears to its left over 0.25 s (cubic ease-out), rising 6 px.
- At 2.4 s the lower dot is clicked: the first tooltip fades over 0.25 s and the next one opens to the right of the lower dot. A second click at 3.8 s closes it.
When to use it: Use it on products, floor plans or maps, to explain different spots within one picture.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/163.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
