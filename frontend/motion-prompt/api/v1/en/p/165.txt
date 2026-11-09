Please use "Animated shape divider" (シェイプディバイダー), one of the names in "Landing page & web effects, part 2".
Motion Prompt #165

What it is: A wavy section divider that keeps moving
What the sample shows: Where a blue section meets a white one, two layered wave shapes keep swaying slowly.
Spec:
- A 511 × 168 viewport: a blue gradient section on top (#3B64E8 → #8FA9F7) and a white section below, with two wave shapes layered at the boundary. One loop takes 4.7 s (two per 9.4 s pack cycle).
- Back wave (white, opacity 0.45): centered at y = 100, the sum of a sine with wavelength 260 px, amplitude 8 px and one with wavelength 130 px, amplitude 4 px.
- Front wave (white): centered at y = 110, wavelength 300 px / amplitude 9 px plus wavelength 110 px / amplitude 3.5 px; it runs into the white section below.
- With phase a = 2π·t/4.7, the back wave uses a + 1 and −2a, the front wave −a and 2a + 0.5. The two sines in each wave run in opposite directions, so the shape keeps changing and returns to where it started every 4.7 s.
When to use it: Use it where section edges should look soft rather than ruled, on sites about the sea, summer or children, for example.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/165.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
