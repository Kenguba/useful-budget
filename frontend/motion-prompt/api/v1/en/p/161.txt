Please use "View transition (shared element)" (ビュートランジション), one of the names in "Landing page & web effects, part 2".
Motion Prompt #161

What it is: A list photo expands into the detail page
What the sample shows: Clicking a photo in the list grows that same photo into the image at the top of the detail page while the rest changes to the detail page; going back shrinks it into place.
Spec:
- A 511 × 168 viewport with three photos in a list (143 × 80, radius 6). The middle photo is clicked at 0.75 s, and "← 一覧へ" (back to list) on the detail page at 3.05 s. One pass takes 4.7 s (twice per 9.4 s pack cycle).
- Forward: over 0.85–1.45 s (0.6 s, cubic ease-in-out) the clicked photo moves and resizes continuously from its list slot to the 479 × 94 image at the top of the detail page (radius 8). It stays one photo throughout.
- The other photos and the heading fade out over the first 62% of the move; the detail title, text and back button fade in over the last 40%. At 50% the URL changes from /works to /works/02.
- Back: over 3.15–3.75 s (0.6 s) the same move runs in reverse to the list slot.
- This is how the View Transitions API looks when the list photo and the detail photo share the same view-transition-name.
When to use it: Use it on galleries or product pages that go back and forth between a list and a detail view, so people never lose track of what they opened.

Reference implementation (Canvas 2D, a function whose picture depends only on the time): https://showheyohtaki.github.io/motion-prompt/api/v1/en/e/161.txt
Shared helper code: https://showheyohtaki.github.io/motion-prompt/api/v1/kit/lp2.js
Keep the shapes, timing and easing values of the reference implementation as they are, and change only the text, colours and assets to fit what I am making.
