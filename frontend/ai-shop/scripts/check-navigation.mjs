// Regression contract: clicking a group owns the selected mark; browser history owns scroll only.
// Run: node frontend/ai-shop/scripts/check-navigation.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '../index.html'), 'utf8');
const has = part => html.includes(part);

// Catch accidental syntax errors in the single-file page.
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.ok(inlineScripts.length >= 3, 'Expected AI shop inline scripts');
inlineScripts.forEach((match, i) => new Script(match[1], { filename: 'index.html:inline-' + i }));

// The selected marker must be owned only by real user clicks, not by history entries.
assert.ok(has('let seenLeader=null;'), 'Last-click state is missing');
assert.ok(has('function paintLeader(gid)'), 'Selection paint helper is missing');
assert.ok(has('function markLeader(gid)'), 'Selection owner is missing');
assert.ok(has("(seenLeader===g.id?' seen':'')"), 'Rerender must preserve last clicked group');
assert.ok(has('markLeader(gid);\n      const nav=++leaderNavCommit;\n      afterLeaderPaint('),
  'Confirmed click must select immediately and defer navigation until after paint');
assert.ok(has("function afterLeaderPaint(fn)"), 'Missing post-paint navigation barrier');
assert.ok(has("requestAnimationFrame(()=>requestAnimationFrame(fn))"), 'Navigation should wait a rendered frame');
assert.ok(has("if(nav!==leaderNavCommit)return;"), 'Queued navigation must be cancellable');
assert.ok(has("window.addEventListener('popstate',e=>{\n  leaderNavCommit++;"),
  'Back/forward must cancel uncommitted navigation');
assert.ok(has('history.pushState({leaderNavSession,y:window.scrollY}'), 'History should save scroll only');
assert.ok(has('history.replaceState({leaderNavSession,y:window.scrollY}'), 'Initial history entry must not own selection');
assert.ok(!has('leaderNavSession,leader:'), 'History must never store selected group');
assert.ok(!has('if(st.leader)markLeader'), 'Back/forward must never overwrite last-click selection');

// Selected stripe belongs to a confirmed click, never to touch press or touch cancellation.
const leaderBegin = html.indexOf("document.querySelectorAll('.leader').forEach(el=>{");
const leaderEnd = html.indexOf("document.querySelectorAll('[data-gtoggle]')", leaderBegin);
assert.ok(leaderBegin >= 0 && leaderEnd > leaderBegin, 'Cannot locate leader card handlers');
const leaderHandlers = html.slice(leaderBegin, leaderEnd);
assert.ok(leaderHandlers.includes("el.addEventListener('click'"), 'Missing card click handler');
assert.ok(!['pointerdown', 'pointerup', 'pointercancel'].some(type =>
  leaderHandlers.includes("addEventListener('" + type + "'")),
  'Card touches must not preview the selected stripe');
assert.ok(leaderHandlers.includes('markLeader(gid);'), 'Click must commit the selected group');

// Exact anchors: expanded content must have its final height before scrolling.
// Async stock/data rerenders must re-anchor unless the visitor moved manually.
assert.ok(has('function revealGroupForJump(grp)'), 'Missing layout-stable group reveal');
assert.ok(has("grp.classList.add('jump-open','open')"), 'Jump must expand without intermediate height animation');
assert.ok(has('.site-list-group.jump-open .site-list-collapsible'), 'Missing stable-height CSS');
assert.ok(has("pinned.scrollIntoView({behavior:'instant',block:'start'})"), 'Async rerender must preserve anchor');
assert.ok(has("pinnedLeaderGroup=target.id;"), 'Click must pin the current target group');
assert.ok(has('pinnedLeaderGroup=null;'), 'Manual/history navigation must cancel group pin');
assert.ok(has("el.scrollIntoView({behavior:'instant',block:'start'})"), 'Hash restore must avoid inherited smooth scrolling');

// No visual transition should drag old selected-card color into the next frame.
const cardCss = html.slice(html.indexOf('    .product-card {'), html.indexOf('    .card-top {'));
assert.ok(cardCss.length > 0, 'Product card CSS not found');
assert.ok(!/border-color\s+0\.35s\s+ease|box-shadow\s+0\.3s\s+ease|transition:\s*opacity\s+0\.3s\s+ease/.test(cardCss),
  'Selection border/shadow/top line must paint immediately');

// Guard the unrelated price-history cache from being lost in a page rewrite.
assert.ok(has("const MAPS_LS_KEY='aishop.maps.v4'"), 'Platform-maps cache key disappeared');
assert.ok(has('function pcStored()'), 'Platform-maps cache reader disappeared');

console.log('AI shop navigation invariant OK (' + inlineScripts.length + ' inline scripts checked)');
