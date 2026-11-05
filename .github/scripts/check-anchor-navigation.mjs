// Anchor-navigation regression checks for the three single-page projects.
// Run: node .github/scripts/check-anchor-navigation.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const ai = read('frontend/ai-shop/index.html');
const skill = read('frontend/skill-board/index.html');
const ip = read('frontend/ip-check/index.html');
const between = (text, start, end) => {
  const i = text.indexOf(start);
  const j = text.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, 'Missing code section: ' + start);
  return text.slice(i, j);
};
const classList = () => {
  const classes = new Set();
  return {
    add: (...values) => values.forEach(v => classes.add(v)),
    remove: (...values) => values.forEach(v => classes.delete(v)),
    contains: value => classes.has(value)
  };
};

// Syntax-check complete inline scripts, not just the small navigation fragments.
for (const [name, page] of [['AI', ai], ['Skills', skill], ['IP', ip]]) {
  const scripts = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, name + ' script missing');
  for (const [i, m] of scripts.entries()) new Script(m[1], { filename: name + '-inline-' + i });
}

// AI shop: final expanded height must be available when the scroll starts.
assert.ok(ai.includes('.site-list-group.jump-open .site-list-collapsible'));
const revealCode = between(ai, 'function revealGroupForJump(grp){', '\nconst GCAT=');
const opened = new Set();
const reveal = new Function('userOpen', revealCode + '\nreturn revealGroupForJump;')(opened);
let aria = '';
const aiGroup = {
  id: 'grp-last', classList: classList(),
  querySelector: () => ({ setAttribute: (k, v) => { aria = v; } })
};
reveal(aiGroup);
assert.ok(aiGroup.classList.contains('open') && aiGroup.classList.contains('jump-open'));
assert.ok(opened.has('grp-last') && aria === 'true');
assert.ok(ai.includes("pinned.scrollIntoView({behavior:'instant',block:'start'})"));
assert.ok(ai.includes("window.addEventListener('touchstart',()=>{pinnedLeaderGroup=null;}"));
assert.ok(ai.includes("window.addEventListener('popstate',e=>{\n  leaderNavCommit++;\n  pinnedLeaderGroup=null;"));
assert.ok(!ai.includes('if(st.leader)markLeader(st.leader)'));
const leaderCode = between(ai, "document.querySelectorAll('.leader').forEach(el=>{", "document.querySelectorAll('[data-gtoggle]')");
assert.ok(leaderCode.includes("el.addEventListener('click'"));
assert.ok(!/addEventListener\('(pointerdown|pointerup|pointercancel)'/.test(leaderCode),
  'Touch preview must not select a card before a confirmed click');

// Simulate the browser's frame clock: a history screenshot reads the LAST
// presented frame, not merely the DOM state written during the click task.
const createFrames = () => {
  let queue = [];
  return {
    raf: fn => queue.push(fn),
    advance: paint => {
      const callbacks = queue;
      queue = [];
      callbacks.forEach(fn => fn());
      paint();
    }
  };
};

// AI: touching must not select. A real click paints B immediately, then
// history captures B only after a presented frame (not stale A).
const aiFrame = createFrames(), aiSteps = [], aiShots = [];
let aiSelected = 'A', aiPainted = 'A', aiClicked;
const aiTarget = {
  id: 'grp-B', classList: classList(),
  querySelector: () => ({ setAttribute: () => {} }),
  scrollIntoView: opts => {
    aiSteps.push('scroll');
    assert.equal(opts.behavior, 'smooth');
    assert.ok(aiTarget.classList.contains('jump-open'));
  }
};
const aiButton = { dataset: { gid: 'B' }, addEventListener: (name, cb) => {
  assert.equal(name, 'click', 'Touch must not commit the AI selection');
  aiClicked = cb;
}};
const aiDocument = {
  querySelectorAll: sel => sel === '.leader' ? [aiButton] : [],
  getElementById: id => id === 'grp-B' ? aiTarget : null
};
const aiAfter = between(ai, 'function afterLeaderPaint(fn){',
  '\n/* 仅在本次页面生命周期内有效');
const aiHandlers = between(ai, "document.querySelectorAll('.leader').forEach(el=>{",
  "document.querySelectorAll('[data-gtoggle]')");
const aiClickAPI = new Function('document','history','window','markLeader',
  'saveLeaderPosition','requestAnimationFrame','revealGroupForJump','userOpen','leaderNavSession',
  'let leaderNavCommit=0;let pinnedLeaderGroup=null;\n' + aiAfter + '\n' + aiHandlers
  + '\nreturn {cancel:()=>leaderNavCommit++};')(
  aiDocument,
  { pushState: () => { aiShots.push(aiPainted); aiSteps.push('push'); } },
  { scrollY: 80 },
  gid => { aiSelected = gid; aiSteps.push('mark'); },
  () => aiSteps.push('save'),
  aiFrame.raf,
  reveal,
  opened,
  'test'
);
assert.equal(typeof aiClicked,'function');
aiClicked();
assert.equal(aiSelected,'B');
assert.deepEqual(aiSteps,['mark']);
aiFrame.advance(() => { aiPainted = aiSelected; });
assert.deepEqual(aiShots,[], 'History must not capture the unpainted A thumbnail');
aiFrame.advance(() => { aiPainted = aiSelected; });
assert.deepEqual(aiShots,['B']);
assert.deepEqual(aiSteps,['mark','save','push','scroll']);
aiClickAPI.cancel();
assert.ok(!ai.includes('if(st.leader)markLeader(st.leader)'));

// Skills: a confirmed click updates B immediately; the old entry gets
// a thumbnail of B, then groups reach full height before the scroll starts.
assert.ok(skill.includes('.group.jump-open .group-collapsible{transition:none}'));
const skillCode = between(skill, 'function jumpToSection(secId,groupId){', '\nfunction jumpToHash(){');
const skillAfter = between(skill,'function afterSecPaint(fn){','\nconst secNavSession=');
const sf = createFrames(), steps = [], screenshots = [], skillOpen = new Set();
let selectedSec = 'sec-01', paintedSec = 'sec-01';
const sg = { id: 'g-video', classList: classList() };
const section = {
  querySelectorAll: () => [sg],
  scrollIntoView: options => {
    steps.push('scroll');
    assert.ok(sg.classList.contains('jump-open') && skillOpen.has('g-video'));
    assert.equal(options.behavior, 'smooth');
  }
};
const skillJump = new Function('document','window','openGroups','history','secNavSession',
  'markSec','saveSecPosition','saveGroups','applyFilter','updateDockVisibility',
  'requestAnimationFrame','let secNavCommit=0;\n' + skillAfter + '\n' + skillCode
  + '\nreturn jumpToSection;')(
    { getElementById: id => id === 'sec-02' ? section : null },
    { scrollY: 120 },
    skillOpen,
    { pushState: () => { screenshots.push(paintedSec); steps.push('push'); } },
    'session',
    id => { selectedSec = id; steps.push('mark'); },
    () => steps.push('save'),
    () => {},
    () => steps.push('expand'),
    () => {},
    sf.raf
  );
skillJump('sec-02');
assert.deepEqual(steps,['mark']);
sf.advance(() => { paintedSec = selectedSec; });
assert.deepEqual(screenshots,[]);
sf.advance(() => { paintedSec = selectedSec; });
assert.deepEqual(screenshots,['sec-02']);
assert.deepEqual(steps,['mark','save','push','expand','scroll']);
assert.ok(!skill.includes('if(st.sec)markSec(st.sec'));

// IP-check: no hard-coded 60/430ms guessing while the details accordion animates.
assert.ok(ip.includes('.details-collapsible.jump-open'));
const ipCode = between(ip, 'function jumpToSection(id,smooth){', '\nfunction menuVisual(');
assert.ok(!ipCode.includes('setTimeout('));
const ipPanel = { classList: classList() };
const ipSteps = [];
const ipTarget = {
  closest: () => ipPanel,
  scrollIntoView: options => {
    ipSteps.push('scroll');
    assert.ok(ipPanel.classList.contains('jump-open'));
    assert.equal(options.behavior,'smooth');
  }
};
const api = new Function('$','steps', 'let detailsOpen=false;'
  + 'function toggleDetails(v){detailsOpen=v;steps.push("expand")};'
  + ipCode + '\nreturn {jump:jumpToSection,getOpen:()=>detailsOpen};')(
  id => id === 'detailsCollapsible' ? ipPanel : ipTarget, ipSteps
);
api.jump('details-target',true);
assert.equal(api.getOpen(),true);
assert.deepEqual(ipSteps,['expand','scroll']);
assert.ok(!ip.includes('expanding?430:60'));

console.log('Anchor navigation OK: AI, Skills, IP (layout-first, no guess timers)');
