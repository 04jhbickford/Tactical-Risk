// V2.81.43 Settlecoast-pattern polish (2D only): loader, Confirm chrome,
// phase guides, guest Rules. Run: node tools/test-settlecoast-polish.mjs

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

if (typeof globalThis.localStorage === 'undefined') {
  const mem = {};
  globalThis.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { mem[k] = String(v); },
    removeItem(k) { delete mem[k]; },
  };
}

const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const {
  resolveConfirmChrome,
  isQueuedConfirmAction,
  CONFIRM_CHROME,
} = await import(pathToFileURL(join(root, 'src/ui/confirmChrome.js')));
const {
  shouldShowStartupRecovery,
  STARTUP_RECOVERY_MS,
  startupSavesAreSafeCopy,
  dismissStartupLoader,
  reportStartupError,
} = await import(pathToFileURL(join(root, 'src/ui/startupLoader.js')));
const {
  resolvePhaseGuideId,
  shouldShowPhaseGuide,
  dismissPhaseGuide,
  reopenPhaseGuide,
  resetPhaseGuides,
  PHASE_GUIDE_IDS,
  PHASE_GUIDES,
  PHASE_GUIDE_STORAGE_KEY,
} = await import(pathToFileURL(join(root, 'src/ui/phaseGuide.js')));
const {
  GAME_PHASES,
  TURN_PHASES,
} = await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const {
  phoneMenuHomeActions,
  isPhoneMenuResignFirst,
  shouldResetGameOnOrientationChange,
} = await import(pathToFileURL(join(root, 'src/ui/mobileShell.js')));

const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'style.css'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');
const lobbySrc = readFileSync(join(root, 'src/ui/lobby.js'), 'utf8');
const hudSrc = readFileSync(join(root, 'src/ui/hud.js'), 'utf8');
const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
const method = readFileSync(join(root, 'doc/METHOD-SETTLECOAST.md'), 'utf8');

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

console.log('=== Version + schema ===');
check('GAME_VERSION is V2.81.43', GAME_VERSION === 'V2.81.43');
check('SCHEMA_VERSION stays 11', SCHEMA_VERSION === 11);

console.log('=== B — paint-first loader ===');
check('index.html inlines #startup-loader before the module',
  /id="startup-loader"/.test(html)
  && html.indexOf('startup-loader') < html.indexOf('src/main.js'));
check('critical body fill is inline (no white flash before style.css)',
  /<style>[\s\S]*background:\s*#1a1a2e/.test(html));
check('loader has title, tagline, progress, status',
  /Tactical Risk/.test(html)
  && /World War II Grand Strategy/.test(html)
  && /startup-loader-fill/.test(html)
  && /startup-loader-status/.test(html));
check('recovery copy + Reload after ~15–20s',
  STARTUP_RECOVERY_MS >= 15000 && STARTUP_RECOVERY_MS <= 20000
  && /taking a little longer/i.test(html)
  && /id="startup-reload"/.test(html)
  && shouldShowStartupRecovery({ elapsedMs: 15999 }) === false
  && shouldShowStartupRecovery({ elapsedMs: 16000 }) === true);
check('error path reassures local saves',
  /Local saves/.test(html)
  && /stay on this device/.test(startupSavesAreSafeCopy()));
check('reduced-motion honored on loader',
  /prefers-reduced-motion/.test(html)
  && /data-motion/.test(html));
check('main dismisses loader when home/setup paints',
  /dismissStartupLoader/.test(mainSrc));
check('init failure shows safe error, not a blank shell',
  /reportStartupError/.test(mainSrc));
check('no Settlecoast / Catan / Sunmere copy in the loader shell',
  !/Settlecoast|Sunmere|Catan|catan/i.test(html));

console.log('=== C — Confirm chrome + orientation ===');
check('unavailable beats queued and held',
  resolveConfirmChrome({ disabled: true, held: true, queued: true }) === CONFIRM_CHROME.UNAVAILABLE);
check('select-units ghost is unavailable',
  resolveConfirmChrome({ selectUnits: true }) === CONFIRM_CHROME.UNAVAILABLE);
check('held beats queued',
  resolveConfirmChrome({ held: true, queued: true }) === CONFIRM_CHROME.HELD);
check('staged Confirm is queued',
  resolveConfirmChrome({ queued: true }) === CONFIRM_CHROME.QUEUED
  && isQueuedConfirmAction('place-capital')
  && isQueuedConfirmAction('confirm-placement')
  && !isQueuedConfirmAction('phone-pair-max'));
check('ready when enabled and unstaged',
  resolveConfirmChrome({}) === CONFIRM_CHROME.READY);
check('CSS: grayscale unavailable, focus-visible, tap-highlight off',
  /pp-chrome-unavailable[\s\S]*grayscale/.test(css)
  && /\.pp-confirm-btn:focus-visible/.test(css)
  && /-webkit-tap-highlight-color:\s*transparent/.test(css));
check('orientation change must not reset GameState',
  shouldResetGameOnOrientationChange() === false);

console.log('=== D — phase guides + guest Rules ===');
check('four one-job guides exist',
  PHASE_GUIDES.capital && PHASE_GUIDES.deploy && PHASE_GUIDES.attack && PHASE_GUIDES.fortify);
check('phase ids map Place Capital / Deploy / Attack / Fortify',
  resolvePhaseGuideId(GAME_PHASES.CAPITAL_PLACEMENT) === PHASE_GUIDE_IDS.CAPITAL
  && resolvePhaseGuideId(GAME_PHASES.UNIT_PLACEMENT) === PHASE_GUIDE_IDS.DEPLOY
  && resolvePhaseGuideId(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === PHASE_GUIDE_IDS.ATTACK
  && resolvePhaseGuideId(GAME_PHASES.PLAYING, TURN_PHASES.NON_COMBAT_MOVE) === PHASE_GUIDE_IDS.FORTIFY
  && resolvePhaseGuideId(GAME_PHASES.PLAYING, TURN_PHASES.PURCHASE) === null);
{
  resetPhaseGuides();
  check('first session shows Place Capital',
    shouldShowPhaseGuide(PHASE_GUIDE_IDS.CAPITAL) === true);
  dismissPhaseGuide(PHASE_GUIDE_IDS.CAPITAL);
  check('dismissed tip stays dismissed',
    shouldShowPhaseGuide(PHASE_GUIDE_IDS.CAPITAL) === false);
  reopenPhaseGuide(PHASE_GUIDE_IDS.CAPITAL);
  check('menu reopen clears dismiss for that tip',
    shouldShowPhaseGuide(PHASE_GUIDE_IDS.CAPITAL) === true);
  check('storage key is first-session only',
    PHASE_GUIDE_STORAGE_KEY === 'tacticalRisk_phaseGuides');
}
check('phone menu exposes Phase tips + Game Rules',
  phoneMenuHomeActions().some((r) => r.action === 'phase-tips')
  && phoneMenuHomeActions().some((r) => r.action === 'rules')
  && isPhoneMenuResignFirst() === true);
check('desktop HUD menu has Phase tips',
  /data-action="phase-tips"/.test(hudSrc));
check('lobby How to Play does not go through Play Online / auth',
  /data-action="how-to-play"/.test(lobbySrc)
  && /setOnRulesToggle/.test(lobbySrc)
  && !/how-to-play[\s\S]{0,80}onPlayOnline/.test(lobbySrc));

console.log('=== Kills + METHOD ===');
check('no @designcodeio/threeui dependency',
  !/@designcodeio\/threeui/.test(pkg)
  && !/threeui/.test(pkg));
check('METHOD doc lists smoke, fixtures, kills',
  /Production smoke checklist/.test(method)
  && /Playtest fixture matrix/.test(method)
  && /@designcodeio\/threeui/.test(method)
  && /Voice blocker/.test(method)
  && /Catan/.test(method));

console.log('=== F — menu rail hover pattern ===');
check('phone menu magnify is hover+fine only',
  /\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)[\s\S]{0,200}\.phone-menu-row:hover/.test(css));

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll settlecoast-polish checks passed');
