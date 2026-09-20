// Hybrid HUD must swallow stepper / zoom taps. Run:
// node tools/test-ux-preview-chrome-hit.mjs

import {
  isPointInAnyRect,
  shouldIgnoreMapHit,
  sealChromeEvent,
  sealChromeControl,
  bindSealedActivate,
  clientPointOf,
  eventElement,
  chromeHitRectsFrom,
} from '../src/map/threeChromeEvents.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

const peek = { left: 0, right: 390, top: 520, bottom: 780 };
const zoom = { left: 336, right: 380, top: 360, bottom: 500 };
const plus = { left: 322, right: 376, top: 600, bottom: 654 };

assert(isPointInAnyRect(350, 628, [peek, zoom]) === true, 'INF + point is in peek');
assert(isPointInAnyRect(200, 200, [peek, zoom]) === false, 'map center is not chrome');
assert(isPointInAnyRect(358, 420, [peek, zoom]) === true, 'zoom + is chrome');

assert(shouldIgnoreMapHit({
  sheetOpen: false,
  targetInChrome: false,
  clientX: 350,
  clientY: 628,
  rects: [peek, zoom],
}) === true, 'INF + rect blocks map');

assert(shouldIgnoreMapHit({
  sheetOpen: false,
  targetInChrome: false,
  clientX: 200,
  clientY: 200,
  rects: [peek, zoom],
}) === false, 'open map still selectable');

assert(shouldIgnoreMapHit({
  sheetOpen: true,
  targetInChrome: false,
  clientX: 200,
  clientY: 200,
  rects: [peek],
}) === true, 'match sheet open blocks all map hits');

assert(shouldIgnoreMapHit({
  sheetOpen: false,
  targetInChrome: true,
  clientX: 10,
  clientY: 10,
  rects: [],
}) === true, 'event target in chrome blocks even without rect');

const ev = {
  n: 0,
  prevented: 0,
  cancelable: true,
  stopPropagation() { this.n += 1; },
  preventDefault() { this.prevented += 1; },
};
sealChromeEvent(ev);
assert(ev.n === 1 && ev.prevented === 1, 'seal stops and prevents');
const evPan = {
  n: 0,
  prevented: 0,
  cancelable: true,
  stopPropagation() { this.n += 1; },
  preventDefault() { this.prevented += 1; },
};
sealChromeEvent(evPan, { prevent: false });
assert(evPan.n === 1 && evPan.prevented === 0, 'lobby seal stops without preventDefault so native pan lives');

const textTarget = { parentElement: { closest: (sel) => (sel === '[data-step]' ? { dataset: { step: '1' } } : null) } };
assert(eventElement({ target: textTarget }) === textTarget.parentElement, 'text-node tap walks to parent');

const touch = clientPointOf({
  changedTouches: [{ clientX: plus.left + 4, clientY: plus.top + 4 }],
});
assert(touch.x === plus.left + 4 && touch.y === plus.top + 4, 'touch point');
assert(shouldIgnoreMapHit({
  clientX: touch.x,
  clientY: touch.y,
  rects: [peek],
}) === true, 'touch on INF + ignored by map');

const hiddenZoom = {
  hidden: true,
  getBoundingClientRect() {
    return { left: 336, right: 380, top: 360, bottom: 500, width: 44, height: 140 };
  },
};
const peekEl = {
  classList: { contains: (c) => c === 'is-on' },
  getBoundingClientRect() { return { left: 0, right: 390, top: 520, bottom: 780, width: 390, height: 260 }; },
};
const rectsOpen = chromeHitRectsFrom({ zoom: hiddenZoom, peek: peekEl, confirm: peekEl });
assert(!rectsOpen.some((r) => r.top === 360 && r.left === 336), 'hidden zoom is not a hit rect');

assert(shouldIgnoreMapHit({
  lobbyOpen: true,
  targetInChrome: false,
  clientX: 200,
  clientY: 200,
  rects: [],
}) === true, 'lobby open ignores all map hits');

assert(shouldIgnoreMapHit({
  battleOpen: true,
  targetInChrome: false,
  clientX: 200,
  clientY: 200,
  rects: [],
}) === true, 'battle / casualty sheet blocks all map hits');

const panListeners = [];
const panEl = {
  dataset: {},
  addEventListener(type, fn, opts) {
    panListeners.push({ type, fn, opts });
  },
};
sealChromeControl(panEl, { prevent: false });
const touchStart = panListeners.find((l) => l.type === 'touchstart');
assert(!!touchStart && touchStart.opts?.passive === true, 'lobby seal touchstart is passive');
const touchEv = { n: 0, prevented: 0, stopPropagation() { this.n += 1; }, preventDefault() { this.prevented += 1; } };
touchStart.fn(touchEv);
assert(touchEv.n === 1 && touchEv.prevented === 0, 'passive lobby touchstart never preventDefault');

const clickOnly = [];
let fired = 0;
const chip = { disabled: false, closest: (sel) => (sel === '[data-lobby]' ? chip : null) };
const lobbyRoot = {
  dataset: {},
  contains() { return true; },
  addEventListener(type, fn, opts) { clickOnly.push({ type, fn, opts }); },
};
bindSealedActivate(lobbyRoot, '[data-lobby]', () => { fired += 1; }, { prevent: false });
assert(clickOnly.filter((l) => l.type === 'pointerdown').length === 1, 'lobby has seal pointerdown only, not activate');
assert(clickOnly.some((l) => l.type === 'click'), 'lobby activates on click so a tap still works');
const clickFire = clickOnly.find((l) => l.type === 'click' && l.opts == null);
clickFire.fn({ target: chip });
assert(fired === 1, 'lobby click still selects a chip');

if (failures) {
  console.error(`${failures} ux-preview chrome-hit checks failed`);
  process.exit(1);
}
console.log('ux-preview chrome hit isolation checks passed');
