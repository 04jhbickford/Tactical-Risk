// Unit checks for V2.61 tablet chrome (tooltip clamp predicate)
// plus V2.63 phone-shell predicates. iPhone shell is ≤480px; the 481–900
// tablet band and desktop ≥901 stay on their existing trees.
// Run: node tools/test-tablet-chrome.mjs

import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { clampTooltipToMapArea, resolveMapRightEdge } =
  await import(pathToFileURL(join(root, 'src/ui/territoryTooltip.js')));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const {
  MOBILE_SHELL_MAX_WIDTH,
  TABLET_CHROME_MAX_WIDTH,
  DESKTOP_MIN_WIDTH,
  shouldUseMobileShell,
  applyMobileShellClass,
  pickMobilePrimaryButtons,
  shouldHideAllGameChrome,
  shouldHideTurnActionChrome,
  formatMobilePhaseLabel,
  formatMobilePlayerMeta,
  shouldCollapseMobileTray,
  readableFactionTextColor,
  shouldShowPhoneChromeTabs,
  shouldUsePhonePlacementTray,
  shouldShowPhonePanelBody,
  phoneUnitIconSize,
  shouldHideUnitsAtZoom,
  boundsFromPoints,
  territoryFitPoint,
  PHONE_MIN_ZOOM_FLOOR,
} = await import(pathToFileURL(join(root, 'src/ui/mobileShell.js')));
const { resolvePhaseHint, PHASE_HINTS } =
  await import(pathToFileURL(join(root, 'src/ui/playerPanel.js')));
const { GAME_PHASES, TURN_PHASES } =
  await import(pathToFileURL(join(root, 'src/state/gameState.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

console.log('=== Version stamps ===');
check('GAME_VERSION is V2.64', GAME_VERSION === 'V2.64');
check('SCHEMA_VERSION stays 11', SCHEMA_VERSION === 11);

console.log('=== resolveMapRightEdge ===');
check('missing sidebar → full viewport', resolveMapRightEdge(null, 772) === 772);
check('zero-width sidebar → full viewport', resolveMapRightEdge({ left: 492, width: 0 }, 772) === 772);
check('visible 280px panel at 772 → map right 492',
  resolveMapRightEdge({ left: 492, width: 280 }, 772) === 492);
check('off-screen left → full viewport',
  resolveMapRightEdge({ left: -280, width: 280 }, 772) === 772);

console.log('=== clampTooltipToMapArea: 772×635 with 280px sidebar ===');
{
  const pos = clampTooltipToMapArea({
    cursorX: 400,
    cursorY: 200,
    width: 280,
    height: 220,
    viewportWidth: 772,
    viewportHeight: 635,
    mapRight: 492,
  });
  check('fits in the map', !!pos);
  check('does not cross sidebar', pos.left + 280 <= 492 - 15);
  check('stays on-screen left', pos.left >= 15);
}

console.log('=== clampTooltipToMapArea: cursor on the sidebar edge ===');
{
  const pos = clampTooltipToMapArea({
    cursorX: 480,
    cursorY: 180,
    width: 280,
    height: 200,
    viewportWidth: 772,
    viewportHeight: 635,
    mapRight: 492,
  });
  check('flips left of the panel', !!pos && pos.left + 280 <= 492 - 15);
}

console.log('=== clampTooltipToMapArea: map too narrow to fit ===');
{
  const pos = clampTooltipToMapArea({
    cursorX: 80,
    cursorY: 80,
    width: 280,
    height: 200,
    viewportWidth: 400,
    viewportHeight: 635,
    mapRight: 200,
  });
  check('returns null so the tooltip is dismissed', pos === null);
}

console.log('=== V2.63 mobile shell breakpoint (480 iPhone / 481–900 tablet / ≥901 desktop) ===');
check('breakpoint is 480', MOBILE_SHELL_MAX_WIDTH === 480);
check('tablet band still ends at 900', TABLET_CHROME_MAX_WIDTH === 900);
check('desktop floor is 901', DESKTOP_MIN_WIDTH === 901);
check('390px iPhone → mobile shell', shouldUseMobileShell(390) === true);
check('480px → mobile shell', shouldUseMobileShell(480) === true);
check('481px tablet band → no mobile shell', shouldUseMobileShell(481) === false);
check('772px V2.61 tablet → no mobile shell', shouldUseMobileShell(772) === false);
check('900px tablet ceiling → no mobile shell', shouldUseMobileShell(900) === false);
check('901px desktop → no mobile shell', shouldUseMobileShell(901) === false);
check('1280×800 desktop → no mobile shell', shouldUseMobileShell(1280) === false);
{
  const root = { classList: { on: new Set(), toggle(name, force) {
    if (force) this.on.add(name); else this.on.delete(name);
  }, contains(name) { return this.on.has(name); } } };
  applyMobileShellClass(390, root);
  check('apply at 390 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(772, root);
  check('apply at 772 clears mobile-shell (tablet band)', !root.classList.contains('mobile-shell'));
  applyMobileShellClass(1280, root);
  check('apply at 1280 clears mobile-shell', !root.classList.contains('mobile-shell'));
}

console.log('=== V2.63 phase identity (not the tablet 9px / hidden-dots path) ===');
check('3/7 Combat Movement',
  formatMobilePhaseLabel(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === '3/7 Combat Movement');
check('1/7 Develop Tech',
  formatMobilePhaseLabel(GAME_PHASES.PLAYING, TURN_PHASES.DEVELOP_TECH) === '1/7 Develop Tech');
check('7/7 Collect Income',
  formatMobilePhaseLabel(GAME_PHASES.PLAYING, TURN_PHASES.COLLECT_INCOME) === '7/7 Collect Income');
check('setup phase keeps its name',
  formatMobilePhaseLabel(GAME_PHASES.UNIT_PLACEMENT, null) === 'Initial Deployment');

console.log('=== V2.63 tray peek PHASE_HINTS + visible IPC/OUT ===');
check('combat-move hint is the existing PHASE_HINTS line',
  resolvePhaseHint(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === PHASE_HINTS[TURN_PHASES.COMBAT_MOVE]);
check('hint text is Click units → enemy territory',
  resolvePhaseHint(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === 'Click units → enemy territory');
check('purchase phase hint may be empty (still a legal peek)',
  resolvePhaseHint(GAME_PHASES.PLAYING, TURN_PHASES.PURCHASE) === '');
check('IPC is visible, not title-only',
  formatMobilePlayerMeta({ ipcs: 24, surrendered: false }) === '24$');
check('Surrendered is visible OUT',
  formatMobilePlayerMeta({ ipcs: 0, surrendered: true }) === '0$ · OUT');

console.log('=== V2.63 one primary CTA; End Turn and Done never coexist ===');
{
  const both = pickMobilePrimaryButtons([
    { action: 'finish-placement', label: 'Done', primary: true },
    { action: 'next-phase', label: 'End Turn', primary: true },
  ]);
  check('Done wins over End Turn', both.length === 1 && both[0].action === 'finish-placement');

  const greyed = pickMobilePrimaryButtons([
    { action: 'confirm-move', label: 'Confirm Move', primary: true },
    { action: 'next-phase', label: 'End Combat', primary: true, disabled: true },
  ]);
  check('disabled End Turn is hidden, not greyed',
    greyed.length === 1 && greyed[0].action === 'confirm-move');

  const onlyIllegal = pickMobilePrimaryButtons([
    { action: 'next-phase', label: 'End Mobilize', primary: true, disabled: true },
  ]);
  check('only-disabled CTA → no button', onlyIllegal.length === 0);
}

console.log('=== V2.63 handoff / auto-battle chrome flags ===');
check('handoff hides all game chrome', shouldHideAllGameChrome({ handoffVisible: true }) === true);
check('no handoff → chrome stays', shouldHideAllGameChrome({ handoffVisible: false }) === false);
check('combat hides End Turn / Done / Max', shouldHideTurnActionChrome({ combatVisible: true }) === true);
check('no combat → turn chrome stays', shouldHideTurnActionChrome({ combatVisible: false }) === false);

console.log('=== V2.63 CSS is phone-scoped; tablet 481–900 and desktop ≥901 stay ===');
{
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const unscopedHud = css.match(/^#hud \{[\s\S]*?^\}/m);
  check('unscoped #hud is still 48px', !!unscopedHud && /height:\s*48px/.test(unscopedHud[0]));
  check('phone layout is inside max-width: 480px',
    /@media \(max-width:\s*480px\)/.test(css));
  check('no leftover max-width: 767px phone gate',
    !/@media \(max-width:\s*767px\)/.test(css));
  check('unscoped zoom still parks left of the 320px panel',
    /#zoom-controls \{[\s\S]*?right:\s*calc\(320px \+ 12px\)/.test(css));
  const beforePhone = css.split('@media (max-width: 480px)')[0];
  check('phone 100dvh is not unscoped on html/body',
    !/html,\s*body \{[^}]*100dvh/.test(beforePhone));
  check('V2.61 tablet 900px block still hides the legend',
    /@media \(max-width: 900px\)[\s\S]*\.hud-legend \{\s*display:\s*none/.test(beforePhone));
  check('V2.61 tablet 900px block still uses 9px phase name',
    /@media \(max-width: 900px\)[\s\S]*\.hud-phase-name \{\s*font-size:\s*9px/.test(beforePhone));
  check('V2.61 tablet 900px block still slims the rail to 280px',
    /@media \(max-width: 900px\)[\s\S]*\.player-panel \{\s*width:\s*280px/.test(beforePhone));
  const phoneBlock = css.split('@media (max-width: 480px)')[1] || '';
  check('phone phase identity is ≥11px',
    /\.hud-mobile-phase \{[\s\S]*?font-size:\s*(1[1-9]|[2-9]\d)px/.test(phoneBlock));
  check('phone tray peek class is in the 480 block',
    /pp-tray-peek/.test(phoneBlock) && /pp-tray-hint/.test(phoneBlock));
  check('phone ☰ / overflow is a 44px target',
    /\.hud-menu-btn \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone menu rows are ≥44px',
    /\.hud-menu-item \{[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone Turn Summary ✕ is a 44px target',
    /\.turn-summary-close \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone Players tab is a 2-col grid, not 5-col',
    /\.pp-player-stats \{[\s\S]*?grid-template-columns:\s*1fr 1fr/.test(phoneBlock));
  check('phone setup pins START GAME above the fold',
    /\.setup-footer \{[\s\S]*?position:\s*sticky[\s\S]*?bottom:\s*0/.test(phoneBlock)
    && /\.start-game-btn \{[\s\S]*?min-height:\s*48px/.test(phoneBlock));
  check('phone tabs are ≥44px tall',
    /\.pp-tab \{[\s\S]*?min-height:\s*44px[\s\S]*?height:\s*44px/.test(phoneBlock));
  check('phone hides compact phase header (one hint)',
    /\.pp-phase\.compact \{[\s\S]*?display:\s*none/.test(phoneBlock));
  check('Fit button is hidden outside the phone block',
    /\.zoom-btn-fit \{\s*display:\s*none/.test(beforePhone));
  check('phone shows a ≥44px Fit control',
    /\.zoom-btn-fit \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone menu is a full-screen sheet, not only a dropdown',
    /phone-menu-sheet/.test(phoneBlock) && /phone-menu-row/.test(phoneBlock));
  check('phone menu rows are ≥44px',
    /\.phone-menu-row[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone placement tray rows are ≥44px',
    /\.phone-place-row \{[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone lobby is a full-width tree, not the 50% desktop column',
    /lobby-phone[\s\S]*?width:\s*100%/.test(phoneBlock)
    && /\.lobby-phone-card \{/.test(phoneBlock));
  check('phone hides the permanent tab bar',
    /\.pp-tabs \{\s*display:\s*none/.test(phoneBlock));
}

console.log('=== V2.64 phone chrome tree (not desktop restack) ===');
check('desktop Place Capital does not collapse the sheet',
  shouldCollapseMobileTray({ mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === false);
check('phone Place Capital collapses to peek (one hint)',
  shouldCollapseMobileTray({ mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === true);
check('phone unit-placement uses the placement tray, not peek',
  shouldCollapseMobileTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === false
  && shouldUsePhonePlacementTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true);
check('desktop unit-placement does not use the phone tray',
  shouldUsePhonePlacementTray({ mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT }) === false);
check('phone purchase keeps a body (no permanent tabs)',
  shouldShowPhonePanelBody({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.PURCHASE }) === true
  && shouldShowPhoneChromeTabs({ mobile: true }) === false);
check('phone idle collect-income is peek only',
  shouldCollapseMobileTray({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.COLLECT_INCOME }) === true);
check('desktop still shows chrome tabs',
  shouldShowPhoneChromeTabs({ mobile: false }) === true);
check('peek hint is the single PHASE_HINTS line',
  resolvePhaseHint(GAME_PHASES.CAPITAL_PLACEMENT, null) === 'Click your territory');
check('dark grey faction text is lifted for contrast',
  readableFactionTextColor('#4A4A4A') !== '#4a4a4a'
  && readableFactionTextColor('#4A4A4A').startsWith('#'));
check('already-bright faction color is kept',
  readableFactionTextColor('#1E90FF') === '#1e90ff');
check('End Turn and Done still never coexist',
  pickMobilePrimaryButtons([
    { action: 'finish-placement', label: 'Done', primary: true },
    { action: 'next-phase', label: 'End Turn', primary: true },
  ]).length === 1);
check('phone min zoom floor is below desktop 0.4',
  PHONE_MIN_ZOOM_FLOOR < 0.4 && PHONE_MIN_ZOOM_FLOOR <= 0.12);
check('phone units stay visible at world-fit zoom',
  shouldHideUnitsAtZoom(0.11, { mobile: true }) === false
  && phoneUnitIconSize(0.11, { mobile: true }) >= 20);
check('desktop units still hide below 0.35',
  shouldHideUnitsAtZoom(0.11, { mobile: false }) === true
  && phoneUnitIconSize(0.5, { mobile: false }) === Math.max(14, Math.min(24, 20 * 0.5)));
check('owned-land bbox is used; worldwide span falls back',
  !!boundsFromPoints([{ x: 100, y: 100 }, { x: 200, y: 180 }])
  && boundsFromPoints([{ x: 10, y: 10 }, { x: 3000, y: 20 }]) === null);
check('territory.center is preferred for fit points',
  territoryFitPoint({ center: [120, 80], polygons: [[[0, 0], [10, 0]]] }).x === 120);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll tablet-chrome checks passed');
