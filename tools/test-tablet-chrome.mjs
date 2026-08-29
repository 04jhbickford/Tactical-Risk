// Unit checks for V2.61 tablet chrome (tooltip clamp predicate)
// plus V2.63/V2.81 phone-shell predicates. iPhone shell is ≤640px, or
// landscape phone (min side ≤640 and long side <1024). The 641–900
// tablet band (no height) and desktop windows stay on their existing trees.
// Run: node tools/test-tablet-chrome.mjs

import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const {
  clampTooltipToMapArea,
  clampTooltipToViewport,
  resolveMapRightEdge,
  shouldHidePhoneTooltipOn,
  shouldToggleOffPhoneTooltip,
  shouldShowPhoneTooltipOnTap,
  shouldShowPhoneTooltipOnHover,
  shouldInspectPhoneHold,
  shouldCommitPhoneSetupTap,
  shouldApplyPhoneSetupLandTap,
  clampTooltipToPhoneEdge,
  PHONE_TOOLTIP_Z_INDEX,
  PHONE_INSPECT_HOLD_MS,
} = await import(pathToFileURL(join(root, 'src/ui/territoryTooltip.js')));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const {
  MOBILE_SHELL_MAX_WIDTH,
  TABLET_CHROME_MAX_WIDTH,
  DESKTOP_MIN_WIDTH,
  PHONE_MAX_LONG_SIDE,
  shouldUseMobileShell,
  applyMobileShellClass,
  pickMobilePrimaryButtons,
  shouldHideAllGameChrome,
  shouldHideTurnActionChrome,
  formatMobilePhaseLabel,
  formatMobilePlayerMeta,
  shouldCollapseMobileTray,
  shouldPeekPhoneTray,
  shouldShowPhonePeekUnitRow,
  readableFactionTextColor,
  shouldShowPhoneChromeTabs,
  shouldUsePhonePlacementTray,
  shouldShowPhonePanelBody,
  shouldShowPhoneDetentTabs,
  shouldShowPhoneTrayToggle,
  shouldParkPhoneMapTools,
  phonePointerHint,
  PHONE_PEEK_EXPANDED_MAX_DVH,
  phoneUnitIconSize,
  shouldHideUnitsAtZoom,
  boundsFromPoints,
  phoneProblemBounds,
  phoneFitZoom,
  phoneFitLetterboxesMap,
  territoryFitPoint,
  PHONE_MIN_ZOOM_FLOOR,
  shouldHighlightPhoneLegalTerritories,
  collectPhoneLegalTerritoryNames,
  phoneLegalOutlineWidth,
  PHONE_LEGAL_FILL_ALPHA,
  PHONE_LEGAL_OUTLINE_CSS_PX,
  PHONE_LEGAL_EDGE_INK,
  PHONE_LEGAL_EDGE_COLOR,
  collectPhoneFitFocusNames,
  expandPhoneFitRegionNames,
  resolvePhoneFitRegionNames,
  pickPhoneFitOwnedCluster,
  ensurePhoneFitRegionBounds,
  PHONE_FIT_MIN_REGION_W,
  PHONE_FIT_MIN_REGION_H,
} = await import(pathToFileURL(join(root, 'src/ui/mobileShell.js')));
const { Camera, MAP_WIDTH, MAP_HEIGHT } =
  await import(pathToFileURL(join(root, 'src/map/camera.js')));
const {
  resolvePhaseHint,
  resolvePhonePeekHint,
  shouldShowPhoneSetupPeekHint,
  resolvePhoneStickyUnitType,
  shouldAutoCommitPhoneCapital,
  shouldShowPhoneSetupUndo,
  shouldShowSelectUnitsCta,
  PHASE_HINTS,
} = await import(pathToFileURL(join(root, 'src/ui/playerPanel.js')));
const { GAME_PHASES, TURN_PHASES } =
  await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const { formatAiTurnLine, resolveHudWhoseTurn } =
  await import(pathToFileURL(join(root, 'src/ui/hudClarity.js')));
const { shouldIgnoreFactionCardToggle, LOBBY_SELECT_TOGGLE_GUARD_MS } =
  await import(pathToFileURL(join(root, 'src/ui/lobby.js')));

const PHONE_CSS_MARKER = 'V2.81 phone chrome tree';
function phoneCssParts(css) {
  const idx = css.indexOf(PHONE_CSS_MARKER);
  return {
    beforePhone: idx >= 0 ? css.slice(0, idx) : css,
    phoneBlock: idx >= 0 ? css.slice(idx) : '',
  };
}

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

console.log('=== Version stamps ===');
check('GAME_VERSION is V2.81', GAME_VERSION === 'V2.81');
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

console.log('=== V2.81 mobile shell breakpoint (640 iPhone+500 / 641–900 tablet / ≥901 desktop) ===');
check('breakpoint is 640', MOBILE_SHELL_MAX_WIDTH === 640);
check('tablet band still ends at 900', TABLET_CHROME_MAX_WIDTH === 900);
check('desktop floor is 901', DESKTOP_MIN_WIDTH === 901);
check('phone long-side ceiling is below iPad 1024', PHONE_MAX_LONG_SIDE === 1024);
check('390px iPhone → mobile shell', shouldUseMobileShell(390) === true);
check('480px → mobile shell', shouldUseMobileShell(480) === true);
check('500px Chrome box → mobile shell (no 280px rail)', shouldUseMobileShell(500) === true);
check('520px floor → mobile shell', shouldUseMobileShell(520) === true);
check('640px → mobile shell', shouldUseMobileShell(640) === true);
check('641px tablet band → no mobile shell', shouldUseMobileShell(641) === false);
check('772px V2.61 tablet → no mobile shell', shouldUseMobileShell(772) === false);
check('900px tablet ceiling → no mobile shell', shouldUseMobileShell(900) === false);
check('901px desktop → no mobile shell', shouldUseMobileShell(901) === false);
check('1280×800 desktop → no mobile shell', shouldUseMobileShell(1280) === false);
check('390/480 still phone', shouldUseMobileShell(390, 480) === true);
check('500 with no height is phone, not tablet split', shouldUseMobileShell(500) === true);
check('641 with no height still tablet', shouldUseMobileShell(641) === false);
check('772 with no height still tablet', shouldUseMobileShell(772) === false);
check('900 with no height still tablet', shouldUseMobileShell(900) === false);
check('iPhone landscape 844×390 → phone', shouldUseMobileShell(844, 390) === true);
check('iPhone landscape 667×375 → phone', shouldUseMobileShell(667, 375) === true);
check('772×390 with height is landscape-phone, not tablet', shouldUseMobileShell(772, 390) === true);
check('900×390 with height is landscape-phone', shouldUseMobileShell(900, 390) === true);
check('iPhone landscape 932×430 → phone', shouldUseMobileShell(932, 430) === true);
check('iPhone 14 Plus landscape 926×428 → phone', shouldUseMobileShell(926, 428) === true);
check('iPhone Pro Max landscape 956×440 → phone', shouldUseMobileShell(956, 440) === true);
check('desktop 1280×400 stays desktop', shouldUseMobileShell(1280, 400) === false);
check('desktop 1280×800 stays desktop', shouldUseMobileShell(1280, 800) === false);
check('iPad portrait 768×1024 not phone', shouldUseMobileShell(768, 1024) === false);
check('iPad landscape 1024×768 not phone', shouldUseMobileShell(1024, 768) === false);
{
  const root = { classList: { on: new Set(), toggle(name, force) {
    if (force) this.on.add(name); else this.on.delete(name);
  }, contains(name) { return this.on.has(name); } } };
  applyMobileShellClass(390, root);
  check('apply at 390 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(500, root);
  check('apply at 500 sets mobile-shell (no tablet rail)', root.classList.contains('mobile-shell'));
  applyMobileShellClass(640, root);
  check('apply at 640 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(641, root);
  check('apply at 641 clears mobile-shell (tablet band)', !root.classList.contains('mobile-shell'));
  applyMobileShellClass(772, root);
  check('apply at 772 clears mobile-shell (tablet band)', !root.classList.contains('mobile-shell'));
  applyMobileShellClass(1280, root);
  check('apply at 1280 clears mobile-shell', !root.classList.contains('mobile-shell'));
  applyMobileShellClass(844, root, 390);
  check('apply landscape iPhone 844×390 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(932, root, 430);
  check('apply landscape iPhone 932×430 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(956, root, 440);
  check('apply Pro Max landscape 956×440 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(1280, root, 400);
  check('apply short desktop 1280×400 clears mobile-shell', !root.classList.contains('mobile-shell'));
  applyMobileShellClass(768, root, 1024);
  check('apply iPad portrait clears mobile-shell', !root.classList.contains('mobile-shell'));
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
  check('phone layout is inside max-width: 640px',
    /@media \(max-width:\s*640px\)/.test(css) && css.includes(PHONE_CSS_MARKER));
  check('no leftover max-width: 767px phone gate',
    !/@media \(max-width:\s*767px\)/.test(css));
  check('unscoped zoom still parks left of the 320px panel',
    /#zoom-controls \{[\s\S]*?right:\s*calc\(320px \+ 12px\)/.test(css));
  const { beforePhone } = phoneCssParts(css);
  check('phone 100dvh is not unscoped on html/body',
    !/html,\s*body \{[^}]*100dvh/.test(beforePhone));
  check('V2.61 tablet 900px block still hides the legend',
    /@media \(max-width: 900px\)[\s\S]*\.hud-legend \{\s*display:\s*none/.test(beforePhone));
  check('V2.61 tablet 900px block still uses 9px phase name',
    /@media \(max-width: 900px\)[\s\S]*\.hud-phase-name \{\s*font-size:\s*9px/.test(beforePhone));
  check('V2.61 tablet 900px block still slims the rail to 280px',
    /@media \(max-width: 900px\)[\s\S]*\.player-panel \{\s*width:\s*280px/.test(beforePhone));
  const { phoneBlock } = phoneCssParts(css);
  check('phone phase identity is ≥11px',
    /\.hud-mobile-phase \{[\s\S]*?font-size:\s*(1[1-9]|[2-9]\d)px/.test(phoneBlock));
  check('phone tray peek class is in the 640 block',
    /pp-tray-peek/.test(phoneBlock) && /pp-tray-hint/.test(phoneBlock));
  check('phone peek tray is height:auto, not a 42/50dvh sheet',
    /#sidebar\.player-panel--peek[\s\S]*?max-height:\s*none/.test(phoneBlock));
  check('phone expanded detent is 36dvh, not a 280px column',
    /#sidebar\.player-panel--expanded[\s\S]*?max-height:\s*36dvh/.test(phoneBlock)
    && PHONE_PEEK_EXPANDED_MAX_DVH === 36);
  check('phone peek hides the tray body until expand',
    /\.player-panel--peek \.phone-tray-body[\s\S]*?display:\s*none/.test(phoneBlock));
  check('phone peek chips and toggle are ≥44px',
    /\.phone-peek-chip \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock)
    && /\.phone-tray-toggle \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone peek stacks hint above the CTA (hint not crushed)',
    /\.pp-tray-peek \{[\s\S]*?flex-direction:\s*column/.test(phoneBlock));
  check('phone peek CTA clears the home indicator',
    /\.pp-tray-peek \{[\s\S]*?env\(safe-area-inset-bottom/.test(phoneBlock));
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
  check('unscoped territory tooltip stays z-index 100',
    /\.territory-tooltip \{[\s\S]*?z-index:\s*100/.test(beforePhone));
  check('phone tooltip z-index is under the HUD / menu sheet',
    /html\.mobile-shell \.territory-tooltip[\s\S]*?z-index:\s*40/.test(phoneBlock)
    && PHONE_TOOLTIP_Z_INDEX === 40
    && PHONE_TOOLTIP_Z_INDEX < 70);
  check('phone tooltip text is lifted off the dark card',
    /html\.mobile-shell \.territory-tooltip \.tt-header[\s\S]*?color:\s*#f8fafc/.test(phoneBlock));
}

console.log('=== V2.64 phone chrome tree (not desktop restack) ===');
check('desktop Place Capital does not collapse the sheet',
  shouldCollapseMobileTray({ mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === false);
check('phone Place Capital collapses to peek (one hint)',
  shouldCollapseMobileTray({ mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === true);
check('phone unit-placement stays open so + / Max / Deploy are visible',
  shouldPeekPhoneTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === false
  && shouldCollapseMobileTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === false
  && shouldUsePhonePlacementTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true);
check('desktop unit-placement does not use the phone tray',
  shouldUsePhonePlacementTray({ mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT }) === false);
check('phone purchase keeps a body region (no permanent tabs)',
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

console.log('=== V2.65 phone tooltip dismiss + legal-land highlight ===');
check('phone hides tooltip on menu open',
  shouldHidePhoneTooltipOn({ mobile: true, reason: 'menu-open' }) === true);
check('phone hides tooltip on tap-away / fit / phase / turn / commit',
  shouldHidePhoneTooltipOn({ mobile: true, reason: 'tap-away' })
  && shouldHidePhoneTooltipOn({ mobile: true, reason: 'fit' })
  && shouldHidePhoneTooltipOn({ mobile: true, reason: 'phase-change' })
  && shouldHidePhoneTooltipOn({ mobile: true, reason: 'turn-change' })
  && shouldHidePhoneTooltipOn({ mobile: true, reason: 'commit' }));
check('desktop does not auto-hide tooltip on menu open',
  shouldHidePhoneTooltipOn({ mobile: false, reason: 'menu-open' }) === false);
check('phone second tap on the same territory toggles off',
  shouldToggleOffPhoneTooltip({
    mobile: true, fromTouch: true, visibleName: 'Germany', tappedName: 'Germany',
  }) === true);
check('phone tap on a different territory does not toggle off',
  shouldToggleOffPhoneTooltip({
    mobile: true, fromTouch: true, visibleName: 'Germany', tappedName: 'France',
  }) === false);
check('desktop mouse does not use tap-to-toggle',
  shouldToggleOffPhoneTooltip({
    mobile: false, fromTouch: false, visibleName: 'Germany', tappedName: 'Germany',
  }) === false);
check('phone Place Capital highlights current player owned land',
  shouldHighlightPhoneLegalTerritories({ mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === true);
check('phone Initial Deployment highlights current player owned land',
  shouldHighlightPhoneLegalTerritories({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true);
check('desktop setup does not add the phone legal highlight',
  shouldHighlightPhoneLegalTerritories({ mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === false);
check('legal names are the current player\'s land only',
  JSON.stringify(collectPhoneLegalTerritoryNames({
    mobile: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    playerId: 'germans',
    territories: [
      { name: 'Germany', isWater: false },
      { name: 'France', isWater: false },
      { name: 'Baltic Sea Zone', isWater: true },
    ],
    getOwner: (n) => (n === 'Germany' ? 'germans' : 'british'),
  })) === JSON.stringify(['Germany']));

console.log('=== V2.66 leftover sidebar must not re-hide the phone tooltip ===');
{
  const leftoverRail = { left: 110, width: 280 };
  check('desktop leftover 280px rail still shrinks mapRight',
    resolveMapRightEdge(leftoverRail, 390) === 110);
  check('phone ignores leftover sidebar rect (full 390)',
    resolveMapRightEdge(leftoverRail, 390, { mobile: true }) === 390);
  const eaten = clampTooltipToMapArea({
    cursorX: 200,
    cursorY: 200,
    width: 280,
    height: 160,
    viewportWidth: 390,
    viewportHeight: 720,
    mapRight: 110,
  });
  check('desktop clamp-to-sidebar still returns null when the rail eats the card',
    eaten === null);
  const phonePos = clampTooltipToViewport({
    cursorX: 200,
    cursorY: 200,
    width: 280,
    height: 160,
    viewportWidth: 390,
    viewportHeight: 720,
  });
  check('phone viewport clamp always returns a visible box',
    !!phonePos && phonePos.left >= 0 && phonePos.left + 280 <= 390 + 1);
  check('phone second tap still toggles without fromTouch (DevTools)',
    shouldToggleOffPhoneTooltip({
      mobile: true, visibleName: 'Germany', tappedName: 'Germany',
    }) === true);
  check('gold outline is a 2 CSS px ink edge at Fit (not 0.3 CSS px, not 8px glow)',
    PHONE_LEGAL_OUTLINE_CSS_PX === 2
    && phoneLegalOutlineWidth(0.11) >= 2 / 0.11 - 0.01
    && phoneLegalOutlineWidth(0.11) < 30
    && phoneLegalOutlineWidth(0.11) > 2.5);
  check('owned-land fill is an edge, not a 55% flood',
    PHONE_LEGAL_FILL_ALPHA === 0);
  check('owned edge is ink + gold, not faction color alone',
    PHONE_LEGAL_EDGE_INK === '#2a1f08'
    && PHONE_LEGAL_EDGE_COLOR === '#c9a227'
    && PHONE_LEGAL_EDGE_COLOR !== PHONE_LEGAL_EDGE_INK);
  check('desktop/tablet outline helper stays unused at their default zoom',
    phoneLegalOutlineWidth(0.5) === 2 / 0.5);
}

console.log('=== V2.68 Fit fills the phone frame; gold is an edge ===');
{
  const worldZoom = phoneFitZoom({
    cssW: 366, cssH: 636, canvasH: 844, bw: MAP_WIDTH, bh: MAP_HEIGHT,
  });
  check('390 Fit of the world is height-fill, not a letterboxed poster',
    worldZoom >= 844 / MAP_HEIGHT - 0.001
    && phoneFitLetterboxesMap({ canvasH: 844, zoom: worldZoom }) === false);
  const containWorld = Math.min(366 / MAP_WIDTH, 636 / MAP_HEIGHT);
  check('old contain-the-world zoom letterboxed on 390×844',
    phoneFitLetterboxesMap({ canvasH: 844, zoom: containWorld }) === true);
  const germany = phoneFitZoom({
    cssW: 366, cssH: 636, canvasH: 844, bw: 600, bh: 400,
  });
  check('compact owned land still contains the problem and fills height',
    germany >= 844 / MAP_HEIGHT - 0.001
    && germany >= Math.min(366 / 600, 636 / 400) - 0.001
    && phoneFitLetterboxesMap({ canvasH: 844, zoom: germany }) === false);
  check('worldwide owned land still gets a regional window, not null',
    !!phoneProblemBounds([{ x: 10, y: 10 }, { x: 3000, y: 20 }])
    && boundsFromPoints([{ x: 10, y: 10 }, { x: 3000, y: 20 }]) === null);
  const prevDpr = globalThis.devicePixelRatio;
  globalThis.devicePixelRatio = 1;
  try {
    const cam = new Camera({ width: 390, height: 844 });
    cam.usePhoneMinZoom = true;
    cam.fitBounds(
      { minX: 0, minY: 0, maxX: MAP_WIDTH, maxY: MAP_HEIGHT },
      { padding: 12, padTop: 64, padBottom: 120, fillFrame: true },
    );
    check('Camera.fitBounds(fillFrame) on 390×844 does not letterbox the map',
      844 / cam.zoom <= MAP_HEIGHT + 1);
  } finally {
    if (prevDpr === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = prevDpr;
  }
  const rendererSrc = readFileSync(join(root, 'src/map/territoryRenderer.js'), 'utf8');
  const highlight = rendererSrc.match(/renderPhoneLegalHighlights\([\s\S]*?\n  \}/);
  check('phone legal highlight has no 55% wash and no glow',
    !!highlight
    && !/0\.55/.test(highlight[0])
    && !/shadowBlur/.test(highlight[0]));
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const { beforePhone } = phoneCssParts(css);
  check('tablet 481–900 rail is still 280px after V2.68',
    /@media \(max-width: 900px\)[\s\S]*\.player-panel \{\s*width:\s*280px/.test(beforePhone));
  check('unscoped tooltip z-index stays 100 (V2.66 visibility path untouched)',
    /\.territory-tooltip \{[\s\S]*?z-index:\s*100/.test(beforePhone));
  check('Fit seed is owned + dests — selected chip does not replace owned',
    JSON.stringify(collectPhoneFitFocusNames({
      ownedNames: ['Germany', 'Poland'],
      selectedName: 'France',
      destinationNames: ['Belgium', 'France'],
    })) === JSON.stringify(['Germany', 'Poland', 'Belgium', 'France'])
    && JSON.stringify(collectPhoneFitFocusNames({
      ownedNames: ['Germany', 'Poland'],
    })) === JSON.stringify(['Germany', 'Poland']));
  check('phone legal highlight uses ink + gold edge colors',
    /PHONE_LEGAL_EDGE_INK/.test(rendererSrc)
    && /PHONE_LEGAL_EDGE_COLOR/.test(rendererSrc));
}

console.log('=== V2.67 phone peek tray (map-first; no persistent unit sheet) ===');
check('desktop never peeks',
  shouldPeekPhoneTray({ mobile: false, expanded: false }) === false
  && shouldCollapseMobileTray({ mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT }) === false);
check('phone purchase / deploy / mobilize peek unless expanded',
  shouldPeekPhoneTray({ mobile: true, expanded: false }) === true
  && shouldPeekPhoneTray({ mobile: true, expanded: true }) === false
  && shouldShowPhonePeekUnitRow({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true
  && shouldShowPhonePeekUnitRow({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.PURCHASE }) === true
  && shouldShowPhonePeekUnitRow({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.MOBILIZE }) === true);
check('phone air-landing / move-confirm keep the body up',
  shouldPeekPhoneTray({ mobile: true, airLanding: true }) === false
  && shouldPeekPhoneTray({ mobile: true, movePending: true }) === false);
check('desktop purchase hint stays empty (PHASE_HINTS frozen)',
  resolvePhaseHint(GAME_PHASES.PLAYING, TURN_PHASES.PURCHASE) === '');
check('phone peek hint is readable for purchase / mobilize',
  resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.PURCHASE) === 'Tap a unit to buy'
  && resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.MOBILIZE) === 'Tap a factory, then a unit');
check('phone peek still uses PHASE_HINTS when they exist',
  resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === PHASE_HINTS[TURN_PHASES.COMBAT_MOVE]);
{
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const { beforePhone } = phoneCssParts(css);
  check('V2.67 peek classes are not in the tablet 900 / desktop tree',
    !/#sidebar\.player-panel--peek/.test(beforePhone)
    && !/\.phone-peek-chip \{/.test(beforePhone)
    && !/\.phone-tray-body \{/.test(beforePhone));
  check('tablet 481–900 rail is still 280px after V2.67',
    /@media \(max-width: 900px\)[\s\S]*\.player-panel \{\s*width:\s*280px/.test(beforePhone));
}

console.log('=== V2.69 phone setup tap places; inspect is long-press edge card ===');
check('phone setup tap does not open the tooltip',
  shouldShowPhoneTooltipOnTap({ mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT }) === false
  && shouldShowPhoneTooltipOnTap({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === false);
check('phone playing tap still can show the tooltip',
  shouldShowPhoneTooltipOnTap({ mobile: true, phase: GAME_PHASES.PLAYING }) === true);
check('desktop tap predicate is off (hover path unchanged)',
  shouldShowPhoneTooltipOnTap({ mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT }) === false);
check('phone hover does not open the tooltip',
  shouldShowPhoneTooltipOnHover({ mobile: true }) === false
  && shouldShowPhoneTooltipOnHover({ mobile: false }) === true);
check('long-press on setup is inspect, not a tap',
  shouldInspectPhoneHold({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, heldMs: PHONE_INSPECT_HOLD_MS, movedPx: 0,
  }) === true
  && shouldInspectPhoneHold({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, heldMs: 100, movedPx: 0,
  }) === false
  && shouldInspectPhoneHold({
    mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT, heldMs: PHONE_INSPECT_HOLD_MS, movedPx: 0,
  }) === false);
check('inspect hold does not commit a setup tap',
  shouldCommitPhoneSetupTap({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, inspected: true,
  }) === false
  && shouldCommitPhoneSetupTap({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, inspected: false,
  }) === true);
check('phone deploy hint is Tap a territory to select',
  resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null) === 'Tap a territory to select');
check('phone capital hint is Tap your land, then Confirm',
  resolvePhonePeekHint(GAME_PHASES.CAPITAL_PLACEMENT, null) === 'Tap your land, then Confirm'
  && shouldShowPhoneSetupPeekHint({
    phase: GAME_PHASES.CAPITAL_PLACEMENT, hasPrimaryCta: false,
  }) === true
  && shouldShowPhoneSetupPeekHint({
    phase: GAME_PHASES.CAPITAL_PLACEMENT, hasPrimaryCta: true,
  }) === false
  && shouldShowPhoneSetupPeekHint({
    phase: GAME_PHASES.UNIT_PLACEMENT, hasPrimaryCta: false,
  }) === true);
check('desktop deploy PHASE_HINTS stay Click to place units',
  resolvePhaseHint(GAME_PHASES.UNIT_PLACEMENT, null) === PHASE_HINTS[GAME_PHASES.UNIT_PLACEMENT]);
check('desktop capital PHASE_HINTS stay Click your territory',
  resolvePhaseHint(GAME_PHASES.CAPITAL_PLACEMENT, null) === PHASE_HINTS[GAME_PHASES.CAPITAL_PLACEMENT]);
check('own-land tap selects even without a peeked unit',
  shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.UNIT_PLACEMENT,
    selectedUnitType: null,
    tappedIsOwnedLand: true,
    hasHit: true,
  }) === true
  && shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.UNIT_PLACEMENT,
    selectedUnitType: 'infantry',
    tappedIsOwnedLand: true,
    hasHit: true,
  }) === true);
check('place-tap does not clear a pending Place Capital confirm',
  shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    tappedIsOwnedLand: false,
    hasHit: true,
  }) === false
  && shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    tappedIsOwnedLand: false,
    hasHit: false,
  }) === false
  && shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    tappedIsOwnedLand: true,
    hasHit: true,
  }) === true);
check('desktop setup land tap still applies',
  shouldApplyPhoneSetupLandTap({
    mobile: false,
    phase: GAME_PHASES.UNIT_PLACEMENT,
    selectedUnitType: null,
    hasHit: true,
  }) === true);
{
  const edge = clampTooltipToPhoneEdge({ width: 180, viewportWidth: 390, padTop: 56 });
  check('inspect chip parks under the HUD, not on the tap',
    edge.top >= 56 && edge.left >= 0 && edge.left + 180 <= 390 + 1);
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const { phoneBlock } = phoneCssParts(css);
  const { beforePhone } = phoneCssParts(css);
  check('phone inspect edge card is in the 480 block only',
    /territory-tooltip--edge/.test(phoneBlock)
    && /max-height:\s*88px/.test(phoneBlock)
    && !/territory-tooltip--edge/.test(beforePhone));
}

console.log('=== V2.70 phone Fit is a regional window (never one chip, never poster) ===');
{
  const fake = [
    { name: 'Germany', isCapital: true, connections: ['Baltic Sea Zone', 'Poland', 'West Europe'], center: [1000, 450] },
    { name: 'Poland', connections: ['Germany', 'Baltic Sea Zone'], center: [1100, 440] },
    { name: 'West Europe', connections: ['Germany', 'West Europe Sea Zone'], center: [900, 480] },
    { name: 'Baltic Sea Zone', isWater: true, connections: ['Germany', 'Poland'], center: [1050, 380] },
    { name: 'West Europe Sea Zone', isWater: true, connections: ['West Europe'], center: [820, 500] },
    { name: 'United Kingdom', isCapital: true, connections: ['North Sea Zone', 'Eire'], center: [200, 340] },
    { name: 'Eire', connections: ['United Kingdom', 'North Sea Zone'], center: [150, 360] },
    { name: 'North Sea Zone', isWater: true, connections: ['United Kingdom', 'Eire'], center: [220, 300] },
    { name: 'India', connections: ['India Sea Zone', 'Burma'], center: [3000, 700] },
    { name: 'Burma', connections: ['India'], center: [3100, 720] },
    { name: 'India Sea Zone', isWater: true, connections: ['India'], center: [2980, 780] },
  ];
  check('owned ≤ 1 seed keeps dests / the name — not an empty chip',
    JSON.stringify(collectPhoneFitFocusNames({
      ownedNames: ['Germany'],
      selectedName: 'Germany',
    })) === JSON.stringify(['Germany'])
    && JSON.stringify(collectPhoneFitFocusNames({
      ownedNames: ['Germany'],
      destinationNames: ['Germany', 'Poland'],
    })) === JSON.stringify(['Germany', 'Poland']));
  const one = resolvePhoneFitRegionNames({
    ownedNames: ['Germany'],
    selectedName: 'Germany',
    territories: fake,
  });
  check('owned ≤ 1 expands to neighbors, including coastline sea',
    one.includes('Germany')
    && one.includes('Poland')
    && one.includes('West Europe')
    && one.includes('Baltic Sea Zone')
    && one.length > 1);
  check('selected chip does not shrink a multi-owned seed',
    JSON.stringify(collectPhoneFitFocusNames({
      ownedNames: ['Germany', 'Poland'],
      selectedName: 'Germany',
    })) === JSON.stringify(['Germany', 'Poland']));
  const worldOwned = ['United Kingdom', 'Eire', 'India', 'Burma'];
  const cluster = pickPhoneFitOwnedCluster(worldOwned, fake);
  check('worldwide owned picks the capital cluster, not India+UK poster',
    cluster.includes('United Kingdom')
    && !cluster.includes('India')
    && !cluster.includes('Burma'));
  const ukRegion = resolvePhoneFitRegionNames({
    ownedNames: worldOwned,
    territories: fake,
  });
  check('worldwide Fit is the UK starting region with coastline, not the poster',
    ukRegion.includes('United Kingdom')
    && ukRegion.includes('North Sea Zone')
    && !ukRegion.includes('India')
    && !ukRegion.includes('Burma'));
  const indiaFight = resolvePhoneFitRegionNames({
    ownedNames: worldOwned,
    selectedName: 'India',
    destinationNames: ['Burma'],
    territories: fake,
  });
  check('worldwide + selected stack frames that region, not the UK poster',
    indiaFight.includes('India')
    && indiaFight.includes('Burma')
    && indiaFight.includes('India Sea Zone')
    && !indiaFight.includes('United Kingdom'));
  const padded = ensurePhoneFitRegionBounds({ minX: 1000, maxX: 1010, minY: 450, maxY: 455 });
  check('tiny bbox is padded to a region, not a one-tile chip',
    padded.maxX - padded.minX >= PHONE_FIT_MIN_REGION_W - 0.01
    && padded.maxY - padded.minY >= PHONE_FIT_MIN_REGION_H - 0.01);
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const { beforePhone } = phoneCssParts(css);
  check('tablet 481–900 rail is still 280px after V2.70',
    /@media \(max-width: 900px\)[\s\S]*\.player-panel \{\s*width:\s*280px/.test(beforePhone));
  check('unscoped tooltip z-index stays 100 after V2.70',
    /\.territory-tooltip \{[\s\S]*?z-index:\s*100/.test(beforePhone));
}

console.log('=== V2.71 default-first + sticky place; one-tap capital; undo ===');
check('null selection defaults to the first remaining unit',
  resolvePhoneStickyUnitType(null, [
    { type: 'infantry', quantity: 3 },
    { type: 'tank', quantity: 1 },
  ]) === 'infantry');
check('sticky keeps the selected type while it remains',
  resolvePhoneStickyUnitType('tank', [
    { type: 'infantry', quantity: 3 },
    { type: 'tank', quantity: 2 },
  ]) === 'tank');
check('exhausted type defaults to the first remaining',
  resolvePhoneStickyUnitType('infantry', [
    { type: 'infantry', quantity: 0 },
    { type: 'artillery', quantity: 1 },
  ]) === 'artillery');
check('no remaining units → null',
  resolvePhoneStickyUnitType('infantry', []) === null);
check('unknown leftover is not sticky-selected when defs are passed',
  resolvePhoneStickyUnitType(null, [
    { type: 'tacticalBomber', quantity: 1 },
    { type: 'infantry', quantity: 2 },
  ], { infantry: { isLand: true } }) === 'infantry');
check('phone capital tap selects only — Confirm is the verb',
  shouldAutoCommitPhoneCapital({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, tappedIsOwnedLand: true,
  }) === false
  && shouldAutoCommitPhoneCapital({
    mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT, tappedIsOwnedLand: true,
  }) === false
  && shouldAutoCommitPhoneCapital({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, tappedIsOwnedLand: false,
  }) === false);
check('phone setup undo is required for place and last capital',
  shouldShowPhoneSetupUndo({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, canUndoPlacement: true,
  }) === true
  && shouldShowPhoneSetupUndo({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, canUndoCapital: true,
  }) === true
  && shouldShowPhoneSetupUndo({
    mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT, canUndoPlacement: true,
  }) === false);
check('selected type changes the deploy hint to select then Deploy',
  resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null, 'infantry') === 'Select a territory, then Deploy'
  && resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null) === 'Tap a territory to select');
check('place-tap still does not inspect (V2.69 split stays)',
  shouldShowPhoneTooltipOnTap({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === false
  && shouldInspectPhoneHold({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, heldMs: 500, movedPx: 0,
  }) === true);
{
  const src = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  check('drag-from-chip is not the place verb',
    !/drag-place|peek-drag|chip-drag/.test(src)
    && /shouldAutoCommitPhoneCapital/.test(src)
    && /resolvePhoneStickyUnitType/.test(src));
}

console.log('=== V2.81 iPhone polish holds ===');
check('phone ticker is off — HUD is one phase chip',
  shouldParkPhoneMapTools({ mobile: true }) === true
  && shouldParkPhoneMapTools({ mobile: false }) === false);
check('Place Capital does not expand an empty Units tab bar',
  shouldShowPhoneDetentTabs({
    mobile: true, expanded: true, phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }) === false
  && shouldShowPhoneTrayToggle({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }) === false
  && shouldShowPhoneDetentTabs({
    mobile: true, expanded: true, phase: GAME_PHASES.UNIT_PLACEMENT,
  }) === true);
check('desktop still has no phone detent tabs',
  shouldShowPhoneDetentTabs({
    mobile: false, expanded: true, phase: GAME_PHASES.UNIT_PLACEMENT,
  }) === false);
check('phone placement hints say Tap, desktop stay Click',
  phonePointerHint('Click a territory you own to place units', { mobile: true }) === 'Tap a territory you own to place units'
  && phonePointerHint('Click a territory you own to place units', { mobile: false }) === 'Click a territory you own to place units');
{
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const { phoneBlock } = phoneCssParts(css);
  check('occupant color chip is 44–48px on the seated card',
    /\.lobby-phone-faction-tools \.color-swatch \{[\s\S]*?(width|min-width):\s*48px[\s\S]*?(height|min-height):\s*48px/.test(phoneBlock));
  check('occupant Human/AI select is 44–48px on the seated card',
    /\.lobby-phone-faction-tools \.ai-select\.modern \{[\s\S]*?min-height:\s*48px/.test(phoneBlock));
  check('Starting IPCs control is a 44pt target',
    /\.lobby-phone-option #starting-ipcs \{[\s\S]*?min-height:\s*44px/.test(phoneBlock)
    || /\.lobby-phone-option \.modern-select[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('Teams checkbox is a 44pt target',
    /\.lobby-phone-teams input\[type="checkbox"\] \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('phone HUD ticker is collapsed',
    /html\.mobile-shell #hud-clarity \{[\s\S]*?display:\s*none/.test(phoneBlock));
  check('phone peek CTA is a row so Confirm is not under Undo',
    /\.pp-tray-peek \.pp-bottom-buttons \{[\s\S]*?flex-direction:\s*row/.test(phoneBlock)
    && /\.pp-undo-ghost/.test(phoneBlock));
  check('phone zoom/minimap stay off the art until Map is open',
    /#zoom-controls,\s*#minimap \{\s*display:\s*none/.test(phoneBlock)
    && /html\.mobile-shell\.map-tools-open #zoom-controls/.test(phoneBlock));
  check('phone body Deploy is hidden so the peek CTA is the on-screen verb',
    /html\.mobile-shell \.pp-placement-actions \{\s*display:\s*none/.test(phoneBlock));
  check('Deploy at 0 is a visible ghost Select units, not a live blue',
    /pp-select-units/.test(phoneBlock));
}
check('inspect≠commit still holds — tap never auto-places capital',
  shouldAutoCommitPhoneCapital({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, tappedIsOwnedLand: true,
  }) === false);
check('Select units CTA only when phone deploy queue is empty',
  shouldShowSelectUnitsCta({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, totalQueued: 0, showDone: false,
  }) === true
  && shouldShowSelectUnitsCta({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, totalQueued: 2, showDone: false,
  }) === false
  && shouldShowSelectUnitsCta({
    mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT, totalQueued: 0, showDone: false,
  }) === false);
check('phone tooltip hides on capital commit',
  shouldHidePhoneTooltipOn({ mobile: true, reason: 'commit' }) === true);
check('AI seat is not YOUR TURN',
  formatAiTurnLine({ name: 'Germans', phase: GAME_PHASES.CAPITAL_PLACEMENT })
    === 'Germans placing capital…'
  && !/YOUR TURN/.test(resolveHudWhoseTurn({
    currentPlayerName: 'Germans',
    currentPlayerIsAI: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }).line));
check('native AI option click does not toggle the seated card',
  shouldIgnoreFactionCardToggle({ now: 1000, ignoreUntil: 1000 + LOBBY_SELECT_TOGGLE_GUARD_MS }) === true
  && shouldIgnoreFactionCardToggle({ now: 2000, ignoreUntil: 1000 }) === false);
{
  if (typeof globalThis.devicePixelRatio !== 'number') globalThis.devicePixelRatio = 1;
  const cam = new Camera({ width: 500, height: 844 });
  cam.usePhoneMinZoom = true;
  cam.zoom = 0.5;
  cam.dirty = false;
  const before = cam.zoom;
  cam.zoomBy('out');
  check('minus-zoom paints on this call, not the next pointer',
    cam.zoom < before && cam.dirty === true);
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll tablet-chrome checks passed');
