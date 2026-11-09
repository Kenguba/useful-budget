Please use "Lightbox" (ライトボックス), one of the names in "Landing page & web effects, part 2".
Motion Prompt #162

What it is: Opens an image large over a dimmed page
What the sample shows: Clicking a thumbnail in the gallery dims the page and shows that photo large in the center; the × shrinks it back into its thumbnail.
Spec:
- A 511 × 168 viewport with four thumbnails (108 × 72, radius 6). The third is clicked at 0.75 s, and the × at the top right at 3.0 s. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Open: over 0.85–1.3 s (0.45 s, cubic ease-out) a dark overlay (rgb(14,18,28), opacity 0 → 0.82) covers the page and the clicked thumbnail grows to 261 × 128 in the center.
- Over the second half of the open, "3 / 4" appears below the photo, previous/next arrows at the sides and a × at the top right.
- Close: over 3.05–3.4 s (0.35 s, cubic ease-in-out) the same move runs in reverse and the photo returns to its thumbnail.
When to use it: Use it for case studies, portfolios or product photos that should be seen large without leaving the page.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/162.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
