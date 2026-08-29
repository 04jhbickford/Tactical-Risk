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
  shouldApplyPhoneSetupTapOnPointerDown,
  shouldCommitPhoneSetupPeekAfterGesture,
  PHONE_SETUP_PAN_SLOP_PX,
  shouldRefitPhoneSetupHit,
  isPhoneCapitalCtaTarget,
  isPhoneHudChromeTarget,
  isPhoneMapToolsChromeTarget,
  pointHitsPhoneMapToolsChrome,
  isPhoneTrayChromeTarget,
  shouldIgnorePanelBoxForPhoneCapitalPeek,
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
  formatMobilePhaseWord,
  shouldHidePhoneMapLabel,
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
  shouldShowPhoneMenuPlayerRoster,
  shouldShowPhonePlaceMeta,
  shouldParkPhoneMapTools,
  shouldShowPhoneDeployQty,
  shouldAutoStagePhoneDeployPair,
  shouldUsePhonePairGrammar,
  shouldShowPhonePeekMax,
  phonePointerHint,
  PHONE_PEEK_EXPANDED_MAX_DVH,
  phoneUnitIconSize,
  phoneMapStackOffsets,
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
  phoneLegalDashPattern,
  phoneLegalUsesSolidStroke,
  phoneCountryOutlineWidth,
  phoneOwnershipSeamWidth,
  shouldWidenPhoneUserFit,
  PHONE_COUNTRY_OUTLINE_CLOSE_ZOOM,
  PHONE_LEGAL_FILL_ALPHA,
  PHONE_LEGAL_OUTLINE_CSS_PX,
  PHONE_LEGAL_OUTLINE_WORLD_MAX,
  PHONE_LEGAL_EDGE_INK,
  PHONE_LEGAL_EDGE_COLOR,
  PHONE_LEGAL_FILL_RGB,
  PHONE_LEGAL_CHROME_CREAM,
  phoneLegalDashColor,
  shouldDrawPhoneCapitalStar,
  shouldDrawPhoneCapitalGlow,
  shouldShowPhoneDeployChip,
  isPhoneLegalSetupSeaDest,
  unwrapFitX,
  PHONE_SELECT_PULSE_MS,
  PHONE_CONFIRM_PULSE_MS,
  PHONE_MAP_LABEL_MIN_ZOOM,
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
  resolvePhoneDeployLandName,
  resolvePhoneDeployCtaLabel,
  shouldKeepPhonePairLand,
  shouldShowPhoneSetupPeekHint,
  resolvePhoneStickyUnitType,
  shouldAutoCommitPhoneCapital,
  resolvePhoneCapitalCta,
  shouldShowPhoneSetupUndo,
  shouldShowSelectUnitsCta,
  PHASE_HINTS,
} = await import(pathToFileURL(join(root, 'src/ui/playerPanel.js')));
const { GAME_PHASES, TURN_PHASES } =
  await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const { formatAiTurnLine, resolveHudWhoseTurn } =
  await import(pathToFileURL(join(root, 'src/ui/hudClarity.js')));
const { shouldIgnoreFactionCardToggle, shouldSeatFactionOnPointerDown, LOBBY_SELECT_TOGGLE_GUARD_MS } =
  await import(pathToFileURL(join(root, 'src/ui/lobby.js')));
const { shouldShowTurnSummary } =
  await import(pathToFileURL(join(root, 'src/ui/turnSummaryModal.js')));

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
check('GAME_VERSION is V2.81.28', GAME_VERSION === 'V2.81.28');
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
check('HUD phase is one word',
  formatMobilePhaseWord(GAME_PHASES.UNIT_PLACEMENT, null) === 'Deploy'
  && formatMobilePhaseWord(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === 'Attack');
check('peeked tile hides its map label',
  shouldHidePhoneMapLabel({ mobile: true, name: 'Novosibirsk', peekedName: 'Novosibirsk' }) === true
  && shouldHidePhoneMapLabel({ mobile: true, name: 'China', peekedName: 'Novosibirsk' }) === false
  && shouldHidePhoneMapLabel({ mobile: false, name: 'Novosibirsk', peekedName: 'Novosibirsk' }) === false);
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
    /#sidebar\.player-panel--peek[\s\S]*?max-height:\s*none/.test(phoneBlock)
    && /#sidebar\.player-panel--peek[\s\S]*?top:\s*auto/.test(phoneBlock)
    && /#sidebar\.player-panel--peek[\s\S]*?overflow:\s*hidden/.test(phoneBlock));
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
  {
    const hudSrc = readFileSync(join(root, 'src/ui/hud.js'), 'utf8');
    check('⋯ rows are mark → label → trailing meta, not emoji posters',
      /phone-menu-mark/.test(hudSrc)
      && /phone-menu-label/.test(hudSrc)
      && /phone-menu-meta/.test(hudSrc)
      && !/📊|🗺|📜|📖|💾/.test(hudSrc.slice(hudSrc.indexOf('_renderMobile() {'), hudSrc.indexOf('_clarityModel() {'))));
  }
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
check('phone unit-placement peeks like Place Capital (chips + Deploy)',
  shouldPeekPhoneTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true
  && shouldCollapseMobileTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true
  && shouldUsePhonePlacementTray({ mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT }) === true
  && shouldPeekPhoneTray({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, expanded: true,
  }) === false);
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
  check('gold outline is a ≥3 CSS px tile edge at Fit, capped (not a 45px continent hull)',
    PHONE_LEGAL_OUTLINE_CSS_PX >= 3
    && phoneLegalOutlineWidth(0.11) <= PHONE_LEGAL_OUTLINE_WORLD_MAX
    && phoneLegalOutlineWidth(0.11) >= 2.5
    && phoneLegalOutlineWidth(0.11) < 20);
  check('owned-land fill is fill-lite, not a 55% flood',
    PHONE_LEGAL_FILL_ALPHA > 0
    && PHONE_LEGAL_FILL_ALPHA <= 0.22);
  check('owned edge is Civ gold, not cream map chrome',
    PHONE_LEGAL_EDGE_INK === '#3d2800'
    && PHONE_LEGAL_EDGE_COLOR === '#f5c518'
    && PHONE_LEGAL_EDGE_COLOR !== PHONE_LEGAL_CHROME_CREAM
    && PHONE_LEGAL_EDGE_COLOR !== PHONE_LEGAL_EDGE_INK
    && PHONE_LEGAL_FILL_RGB === '255, 208, 32');
  check('legal dash uses faction color, never cream chrome',
    phoneLegalDashColor('#B22222') === '#b22222'
    && phoneLegalDashColor('#4A4A4A') === '#4a4a4a'
    && phoneLegalDashColor(null) === PHONE_LEGAL_EDGE_COLOR
    && phoneLegalDashColor('#B22222') !== PHONE_LEGAL_CHROME_CREAM);
  check('legal dash is solid at world Fit (no sparkle / continent dashes)',
    phoneLegalUsesSolidStroke(0.11) === true
    && phoneLegalDashPattern(0.11).length === 0);
  check('legal dash returns when zoomed in',
    phoneLegalUsesSolidStroke(0.5) === false
    && phoneLegalDashPattern(0.5)[0] > phoneLegalDashPattern(0.5)[1]);
  check('desktop/tablet outline helper stays unused at their default zoom',
    phoneLegalOutlineWidth(0.5) === PHONE_LEGAL_OUTLINE_CSS_PX / 0.5);
  check('phone hides country strokes through dest-cluster Fit; desktop keeps 0.4',
    phoneCountryOutlineWidth(0.11, { mobile: true }) === 0
    && phoneCountryOutlineWidth(0.316, { mobile: true }) === 0
    && phoneCountryOutlineWidth(0.5, { mobile: true }) === 0
    && phoneCountryOutlineWidth(0.7, { mobile: true }) === 0
    && phoneCountryOutlineWidth(0.9, { mobile: true }) === 1
    && phoneCountryOutlineWidth(0.5, { mobile: false }) === 1
    && PHONE_COUNTRY_OUTLINE_CLOSE_ZOOM === 0.85);
  check('phone ownership seam is off at Fit so unowned lands have no edge',
    phoneOwnershipSeamWidth(0.35, { mobile: true }) === 0
    && phoneOwnershipSeamWidth(0.9, { mobile: true }) > 0);
  check('world Fit legal edge is a visible owned-tile hairline, not a 9px double hull',
    phoneLegalOutlineWidth(0.11) <= PHONE_LEGAL_OUTLINE_WORLD_MAX
    && phoneLegalOutlineWidth(0.11) >= 2.5
    && phoneLegalOutlineWidth(0.11) * 0.11 >= 1.5);
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
  check('phone legal highlight is a dashed Civ gold-hex on first paint, not peek-only',
    !!highlight
    && /phoneLegalNames\.size/.test(highlight[0])
    && /phoneLegalDashPattern/.test(highlight[0])
    && /phoneLegalDashColor/.test(highlight[0])
    && /PHONE_LEGAL_FILL_RGB/.test(highlight[0])
    && !/#fff3b0/.test(highlight[0])
    && !/selectedTerritory/.test(highlight[0]));
  check('legal marks stroke each owned tile, not a continent hull',
    !!highlight
    && /_strokePoly/.test(highlight[0])
    && !/_getExternalEdgesWithTolerance/.test(highlight[0]));
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
    && /PHONE_LEGAL_EDGE_COLOR/.test(rendererSrc)
    && /PHONE_LEGAL_FILL_RGB/.test(rendererSrc));
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
  && shouldShowPhonePeekUnitRow({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.MOBILIZE }) === true
  && shouldShowPhonePeekUnitRow({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.COMBAT_MOVE }) === true
  && shouldShowPhonePeekUnitRow({ mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.NON_COMBAT_MOVE }) === true);
check('phone air-landing keeps the body up; dest-pending combat stays peeked',
  shouldPeekPhoneTray({ mobile: true, airLanding: true }) === false
  && shouldPeekPhoneTray({ mobile: true, movePending: true }) === true);
check('desktop purchase hint stays empty (PHASE_HINTS frozen)',
  resolvePhaseHint(GAME_PHASES.PLAYING, TURN_PHASES.PURCHASE) === '');
check('phone peek hint is the same pair grammar for mobilize / move',
  resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.PURCHASE) === 'Tap a unit to buy'
  && resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.MOBILIZE) === 'Tap unit, then land'
  && resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE) === 'Tap unit, then land'
  && resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.NON_COMBAT_MOVE) === 'Tap unit, then land');
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
check('phone deploy hint is Tap unit, then land',
  resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null) === 'Tap unit, then land');
check('land-then-unit names the territory; unit-then-land asks for land',
  resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null, null, { territoryName: 'Yakut S.S.R.' })
    === 'Tap a unit · Yakut S.S.R.'
  && resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null, 'tank', { territoryName: 'Yakut S.S.R.' })
    === 'To Yakut S.S.R.'
  && resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null, 'tank')
    === 'Tap land, then unit');
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
  }) === true
  && shouldShowPhoneSetupPeekHint({
    phase: GAME_PHASES.UNIT_PLACEMENT, hasPrimaryCta: true,
  }) === false);
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
check('deploy peek hint is pair-aware',
  resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null, 'infantry') === 'Tap land, then unit'
  && resolvePhonePeekHint(GAME_PHASES.UNIT_PLACEMENT, null) === 'Tap unit, then land');
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
  }) === false
  && shouldShowPhoneTrayToggle({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT,
  }) === false);
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
{
  const lobbySrc = readFileSync(join(root, 'src/ui/lobby.js'), 'utf8');
  check('occupant sits on the same roster row',
    /lobby-phone-occupant/.test(lobbySrc)
    && /lobby-phone-faction-meta/.test(lobbySrc)
    && /lobby-phone-pip/.test(lobbySrc));
}
  check('occupant Human/AI select is 44pt on the seated row',
    /\.lobby-phone-occupant \.ai-select\.modern \{[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('color is an 8–12pt pip, not a 28pt square',
    /\.lobby-phone-pip \{[\s\S]*?width:\s*10px/.test(phoneBlock));
  check('DEPLOYED chip is not covered by the Units hint',
    /html\.mobile-shell \.phone-tray-body \.pp-budget-bar/.test(phoneBlock)
    && /display:\s*none/.test(phoneBlock.match(/html\.mobile-shell \.phone-tray-body \.pp-budget-bar[\s\S]*?\}/)?.[0] || ''));
  check('seated cards keep the 44pt occupant on the same row',
    /\.lobby-phone-seat \{[\s\S]*?flex-shrink:\s*0/.test(phoneBlock)
    && /\.lobby-phone-occupant \{[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('hidden turn-summary overlay cannot steal phone taps',
    /\.turn-summary-overlay\.hidden[\s\S]*?display:\s*none !important[\s\S]*?pointer-events:\s*none !important/.test(phoneBlock)
    || /\.turn-summary-overlay\.hidden[\s\S]*?pointer-events:\s*none !important/.test(css));
  check('Starting IPCs control is a 44pt target',
    /\.lobby-phone-option #starting-ipcs \{[\s\S]*?min-height:\s*44px/.test(phoneBlock)
    || /\.lobby-phone-option \.modern-select[\s\S]*?min-height:\s*44px/.test(phoneBlock));
  check('Teams is a 114×44 labeled control, not a bare checkbox',
    /\.lobby-phone-teams-toggle \{[\s\S]*?min-width:\s*114px[\s\S]*?min-height:\s*44px/.test(phoneBlock)
    && /lobby-phone-teams-toggle/.test(readFileSync(join(root, 'src/ui/lobby.js'), 'utf8')));
  check('Teams toggle sits in the mark→name→meta options row',
    /\.lobby-phone-options \{[\s\S]*?overflow:\s*hidden/.test(phoneBlock)
    && /lobby-phone-teams-name/.test(phoneBlock));
  {
    const lobbySrc = readFileSync(join(root, 'src/ui/lobby.js'), 'utf8');
    const mobileCard = lobbySrc.slice(
      lobbySrc.indexOf('_renderMobileFactionCard(faction'),
      lobbySrc.indexOf('_renderMainMenu() {'),
    );
    const mainRule = phoneBlock.match(/\.lobby-phone-faction-main \{[\s\S]*?\}/)?.[0] || '';
    const logoRule = phoneBlock.match(/\.lobby-phone-faction-logo \{[\s\S]*?\}/)?.[0] || '';
    check('phone seats drop desktop player-card.modern',
      /lobby-phone-faction/.test(mobileCard)
      && !/player-card modern/.test(mobileCard)
      && !/player-avatar/.test(mobileCard)
      && /querySelectorAll\('\.player-card\.modern, \.lobby-phone-faction'\)/.test(lobbySrc));
    check('setup spine is mark → name → occupant/meta on one row',
      /lobby-phone-faction-logo/.test(lobbySrc)
      && /lobby-phone-occupant/.test(mobileCard)
      && /flex-direction:\s*row/.test(mainRule)
      && /flex-wrap:\s*nowrap/.test(mainRule)
      && /justify-content:\s*flex-start/.test(mainRule)
      && /flex:\s*0 0 var\(--phone-mark/.test(logoRule)
      && /margin:\s*0/.test(logoRule));
    check('4/8 rhythm tokens',
      /--phone-mark:\s*44px/.test(phoneBlock)
      && /--phone-inset:\s*16px/.test(phoneBlock)
      && /--phone-row-gap:\s*8px/.test(phoneBlock)
      && /--phone-type-meta:\s*13px/.test(phoneBlock));
    check('390 home verbs have a leading mark',
      /lobby-phone-card-mark/.test(lobbySrc));
  }
  check('Teams label stays off the control',
    /\.lobby-phone-teams \{[\s\S]*?gap:\s*8px/.test(phoneBlock)
    && /\.lobby-phone-teams-name[\s\S]*?white-space:\s*nowrap/.test(phoneBlock));
  check('setup seat gutter is 8 (no 8+8 padding that made a 26px gap)',
    /\.lobby-phone-seat \{[\s\S]*?padding:\s*0/.test(phoneBlock)
    && /\.lobby-phone-factions \{[\s\S]*?gap:\s*8px/.test(phoneBlock)
    && /gap:\s*4px/.test(phoneBlock.match(/\.lobby-phone-faction-main \{[\s\S]*?\}/)?.[0] || ''));
  check('deploy chips wrap inside the 500 frame',
    /\.phone-peek-row \{[\s\S]*?flex-wrap:\s*wrap/.test(phoneBlock)
    && /\.phone-peek-row \{[\s\S]*?overflow-x:\s*hidden/.test(phoneBlock));
  check('in-game labels ellipsize instead of overlapping',
    /\.phone-menu-title \{[\s\S]*?text-overflow:\s*ellipsis/.test(phoneBlock)
    && /\.territory-tooltip \.tt-header[\s\S]*?text-overflow:\s*ellipsis/.test(phoneBlock)
    && /\.combat-title \{[\s\S]*?text-overflow:\s*ellipsis/.test(phoneBlock)
    && /\.phone-peek-pair-hint \{[\s\S]*?text-overflow:\s*ellipsis/.test(phoneBlock));
  check('phone HUD ticker is collapsed',
    /html\.mobile-shell #hud-clarity \{[\s\S]*?display:\s*none/.test(phoneBlock));
  check('phone peek CTA is a row so Confirm is not under Undo',
    /\.pp-tray-peek \.pp-bottom-buttons \{[\s\S]*?flex-direction:\s*row/.test(phoneBlock)
    && /\.pp-undo-ghost/.test(phoneBlock));
  check('empty peek tray does not eat named-land taps',
    /player-panel--peek \.pp-bottom-actions[\s\S]*?pointer-events:\s*none/.test(phoneBlock)
    && /player-panel--peek \.pp-bottom-actions \[data-action\][\s\S]*?pointer-events:\s*auto/.test(phoneBlock));
  check('phone zoom/minimap stay off the art until Map is open',
    /#zoom-controls,\s*#minimap \{\s*display:\s*none/.test(phoneBlock)
    && /html\.mobile-shell\.map-tools-open #zoom-controls/.test(phoneBlock));
  check('deploy peek keeps +/−/Max beside chips, not a covering sheet',
    /\.phone-peek-qty-btn \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/.test(phoneBlock)
    && /html\.mobile-shell #sidebarClose[\s\S]*?display:\s*none/.test(phoneBlock));
  check('circular list puck is not painted on setup, map, or ⋯',
    /vercel-live-feedback/.test(css)
    && /html\.mobile-shell #sidebarClose[\s\S]*?display:\s*none !important/.test(phoneBlock));
  {
    const land = { name: 'Yakut S.S.R.', isWater: false };
    const water = { name: 'SZ 5', isWater: true };
    check('qty stepper waits for a unit+land pair',
      shouldShowPhoneDeployQty({
        mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: 'tank', territory: land,
      }) === true
      && shouldShowPhoneDeployQty({
        mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: 'tank', territory: null,
      }) === false
      && shouldShowPhoneDeployQty({
        mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: null, territory: land,
      }) === false
      && shouldShowPhoneDeployQty({
        mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: 'transport', territory: water,
      }) === true
      && shouldShowPhoneDeployQty({
        mobile: false, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: 'tank', territory: land,
      }) === false);
    check('first pair auto-stages once; a second tap does not restack',
      shouldAutoStagePhoneDeployPair({
        mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: 'tank', territory: land,
        queuedForType: 0,
      }) === true
      && shouldAutoStagePhoneDeployPair({
        mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, unitType: 'tank', territory: land,
        queuedForType: 1,
      }) === false);
  }
  {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const vercel = readFileSync(join(root, 'vercel.json'), 'utf8');
    const panelSrc = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
    check('preview toolbar / comment puck is opted out',
      /name="vercel-toolbar" content="disable"/.test(html)
      && /x-vercel-skip-toolbar/.test(vercel));
    check('Deploy is the pair-commit thumb, not a type-then-count third step',
      /_maybeStagePhoneDeployPair/.test(panelSrc)
      && /resolvePhoneDeployCtaLabel/.test(panelSrc)
      && /phone-peek-pair-hint/.test(panelSrc)
      && !/label: 'Deploy',\s*disabled: true/.test(panelSrc));
  }
  check('⋯ is a short sheet, not a second lobby',
    /phone-menu-sheet\.open \{[\s\S]*?max-height:\s*52dvh/.test(phoneBlock)
    && /phone-menu-open \.player-panel--peek/.test(phoneBlock)
    && shouldShowPhoneMenuPlayerRoster({ mobile: true }) === false
    && shouldShowPhonePlaceMeta({
      mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, peek: true,
    }) === false
    && shouldShowPhonePlaceMeta({
      mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, peek: false,
    }) === true);
  check('phone body Deploy is hidden so the peek CTA is the on-screen verb',
    /html\.mobile-shell \.pp-placement-actions \{\s*display:\s*none/.test(phoneBlock));
  check('Deploy at 0 is a visible ghost Select units, not a live blue',
    /pp-select-units/.test(phoneBlock));
}
check('inspect≠commit still holds — tap never auto-places capital',
  shouldAutoCommitPhoneCapital({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, tappedIsOwnedLand: true,
  }) === false);
{
  const land = { name: 'Novosibirsk', isWater: false };
  const cta = resolvePhoneCapitalCta({
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    territory: land,
  });
  check('owned-land peek resolves Place Capital Confirm',
    cta?.action === 'place-capital'
    && cta?.label === 'Place Capital: Novosibirsk'
    && cta?.territory === 'Novosibirsk'
    && cta?.disabled === false);
  check('peeked land name mounts Confirm even if selectedTerritory dropped',
    resolvePhoneCapitalCta({
      phase: GAME_PHASES.CAPITAL_PLACEMENT,
      landName: 'Novosibirsk',
    })?.label === 'Place Capital: Novosibirsk');
  check('water or missing land does not mount Confirm',
    resolvePhoneCapitalCta({
      phase: GAME_PHASES.CAPITAL_PLACEMENT,
      territory: { name: 'SZ 5', isWater: true },
    }) === null
    && resolvePhoneCapitalCta({
      phase: GAME_PHASES.CAPITAL_PLACEMENT,
    }) === null);
  check('Confirm CTA hides the Place Capital hint',
    shouldShowPhoneSetupPeekHint({
      phase: GAME_PHASES.CAPITAL_PLACEMENT, hasPrimaryCta: true,
    }) === false
    && shouldShowPhoneSetupPeekHint({
      phase: GAME_PHASES.CAPITAL_PLACEMENT, hasPrimaryCta: false,
    }) === true);
}
{
  const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
  const panelSrc = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  check('peek stores the land name and paints the 22d4b13 Confirm tray',
    /_phoneCapitalLandName = hit\.name/.test(mainSrc)
    && /setSelectedTerritory\(hit\)/.test(mainSrc)
    && /setSelectedTerritory\(selectedTerritory\)/.test(mainSrc)
    && /resolvePhoneCapitalCta\(/.test(panelSrc)
    && /landName: this\._phoneCapitalLandName/.test(panelSrc)
    && /shouldIgnorePanelBoxForPhoneCapitalPeek/.test(mainSrc)
    && /document\.addEventListener\('pointerdown'/.test(mainSrc)
    && /camera\.onMouseDown\(e\)/.test(mainSrc)
    && !/_capitalCtaArmed/.test(panelSrc)
    && !/shouldIgnorePhoneSetupCtaAfterPeek/.test(panelSrc));
}
check('Place Capital peek ignores the leftover-tall panel box',
  shouldIgnorePanelBoxForPhoneCapitalPeek({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }) === true
  && shouldIgnorePanelBoxForPhoneCapitalPeek({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT,
  }) === false
  && shouldIgnorePanelBoxForPhoneCapitalPeek({
    mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }) === false);
{
  const cta = { closest: (sel) => (sel === '[data-action]' ? { dataset: { action: 'place-capital' } } : null) };
  const map = { closest: () => null };
  check('only Confirm / Undo are Place Capital panel hits',
    isPhoneCapitalCtaTarget(cta) === true
    && isPhoneCapitalCtaTarget(map) === false);
}
{
  const deploy = { closest: (sel) => (sel === '[data-action]' ? { dataset: { action: 'confirm-placement' }, closest: () => ({}) } : null) };
  const map = { closest: () => null };
  check('Deploy / tray chrome is not a setup land peek',
    isPhoneTrayChromeTarget(deploy) === true
    && isPhoneTrayChromeTarget(map) === false);
}
{
  const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
  const panelSrc = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  const peekFn = mainSrc.slice(
    mainSrc.indexOf('const applyPhoneSetupPeekFromPointer'),
    mainSrc.indexOf('// Mouse events'),
  );
  check('setup peek skips Deploy and honors the tray box',
    /isPhoneTrayChromeTarget/.test(peekFn)
    && /containsPoint/.test(peekFn)
    && /_phonePairFrozenAt/.test(peekFn)
    && /shouldBlockMapSelect/.test(peekFn)
    && !/shouldIgnorePanelBoxForPhoneCapitalPeek/.test(peekFn));
  check('thumb Deploy commits the staged land on this pointer',
    /_phoneDeployLandName/.test(panelSrc)
    && /_phoneDeployCommittedAt/.test(panelSrc)
    && /_commitStagedPlacement/.test(panelSrc)
    && /confirm-placement/.test(panelSrc)
    && /player-panel--peek/.test(panelSrc));
}
check('staged land name survives without a queue',
  resolvePhoneDeployLandName({
    stagedLandName: 'Ukraine S.S.R.',
    selectedTerritory: null,
  }) === 'Ukraine S.S.R.'
  && resolvePhoneDeployLandName({
    stagedLandName: 'Ukraine S.S.R.',
    selectedTerritory: { name: 'East Indies', isWater: false },
  }) === 'Ukraine S.S.R.');
check('Confirm names the pair',
  resolvePhoneDeployCtaLabel({
    count: 1, unitType: 'infantry', landName: 'Ukraine S.S.R.',
  }) === 'Deploy 1 infantry to Ukraine S.S.R.');
{
  const { formatUnitName } = await import(pathToFileURL(join(root, 'src/utils/unitNames.js')));
  check('unit ids are human words, never camelCase',
    formatUnitName('tacticalBomber') === 'Tactical bomber'
    && formatUnitName('aaGun') === 'AA Gun'
    && formatUnitName('armour') === 'Tank');
}
{
  const phone = phoneMapStackOffsets(0.4, { mobile: true });
  const desk = phoneMapStackOffsets(0.4, { mobile: false });
  check('phone map chips sit below the territory name',
    phone.unitDy > 25
    && phone.nameDy < 0
    && desk.unitDy === 25
    && desk.nameDy === 0);
}
{
  const panelSrc = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  check('peek hit-test is tray verbs + peek row, not the leftover-tall footer box',
    /\[data-action="confirm-placement"\]/.test(panelSrc)
    && /\[data-action="phone-select-unit"\]/.test(panelSrc)
    && /\.phone-peek-row/.test(panelSrc)
    && /\.phone-peek-pair-hint/.test(panelSrc)
    && /\.pp-peek-cta-row/.test(panelSrc)
    && !/\.pp-bottom-actions, \.pp-seat-chip/.test(panelSrc));
}
{
  const hud = { closest: (sel) => (sel === '#hud' ? {} : null) };
  const sheet = { closest: (sel) => (sel === '.phone-menu-sheet' ? {} : null) };
  const map = { closest: () => null };
  const zoomBtn = { closest: (sel) => (sel === '#zoom-controls' ? {} : null) };
  check('⋯ / Map / HUD chrome are not setup land peeks',
    isPhoneHudChromeTarget(hud) === true
    && isPhoneHudChromeTarget(sheet) === true
    && isPhoneHudChromeTarget(map) === false);
  check('Map +/−/Fit chrome is not a land peek',
    isPhoneMapToolsChromeTarget(zoomBtn) === true
    && isPhoneHudChromeTarget(zoomBtn) === true
    && pointHitsPhoneMapToolsChrome(NaN, 0) === false);
}
{
  const hudSrc = readFileSync(join(root, 'src/ui/hud.js'), 'utf8');
  const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
  check('header ⋯ opens the short sheet on this pointer',
    /_toggleMenu\(/.test(hudSrc)
    && /data-action="toggle-menu"/.test(hudSrc)
    && /Players/.test(hudSrc)
    && /Territory/.test(hudSrc)
    && /Game Rules/.test(hudSrc)
    && /Save & Exit/.test(hudSrc)
    && /isPhoneHudChromeTarget\(e\.target\)/.test(mainSrc)
    && /if \(!isMobileShell\(\)\) return;/.test(hudSrc));
}
check('phone setup peek does not apply on pointerdown (pan ≠ inspect)',
  shouldApplyPhoneSetupTapOnPointerDown({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }) === false
  && shouldApplyPhoneSetupTapOnPointerDown({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT,
  }) === false
  && shouldApplyPhoneSetupTapOnPointerDown({
    mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT,
  }) === false);
check('phone setup peek commits on tap-up, not on a drag',
  shouldCommitPhoneSetupPeekAfterGesture({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, movedPx: 0,
  }) === true
  && shouldCommitPhoneSetupPeekAfterGesture({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, movedPx: 4,
  }) === true
  && shouldCommitPhoneSetupPeekAfterGesture({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, movedPx: PHONE_SETUP_PAN_SLOP_PX,
  }) === false
  && shouldCommitPhoneSetupPeekAfterGesture({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, movedPx: 40,
  }) === false
  && shouldCommitPhoneSetupPeekAfterGesture({
    mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT, movedPx: 0,
  }) === false);
check('first setup miss refits the camera on this pointer',
  shouldRefitPhoneSetupHit({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, hasHit: false,
  }) === true
  && shouldRefitPhoneSetupHit({
    mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT, hasHit: true,
  }) === false
  && shouldRefitPhoneSetupHit({
    mobile: false, phase: GAME_PHASES.CAPITAL_PLACEMENT, hasHit: false,
  }) === false);
check('phone seats a faction on pointerdown so the leftover click cannot unseat',
  shouldSeatFactionOnPointerDown({ mobile: true }) === true
  && shouldSeatFactionOnPointerDown({ mobile: false }) === false);
check('own-land Place Capital tap applies (peek + Confirm), miss does not clear',
  shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    inspected: false,
    tappedIsOwnedLand: true,
    hasHit: true,
  }) === true
  && shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    inspected: false,
    tappedIsOwnedLand: false,
    hasHit: false,
  }) === false
  && shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.UNIT_PLACEMENT,
    inspected: false,
    tappedIsOwnedLand: true,
    hasHit: true,
  }) === true
  && shouldApplyPhoneSetupLandTap({
    mobile: true,
    phase: GAME_PHASES.UNIT_PLACEMENT,
    inspected: false,
    tappedIsOwnedLand: false,
    hasHit: true,
  }) === false);
check('turn summary never covers local Place Capital',
  shouldShowTurnSummary({
    events: [{ type: 'combat' }],
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    isMultiplayer: false,
  }) === false
  && shouldShowTurnSummary({
    events: [{ type: 'combat' }],
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    isMultiplayer: true,
  }) === false
  && shouldShowTurnSummary({
    events: [{ type: 'combat' }],
    phase: GAME_PHASES.PLAYING,
    isMultiplayer: true,
  }) === true);
check('Select units ghost is not the peek Deploy verb',
  shouldShowSelectUnitsCta({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, totalQueued: 0, showDone: false,
  }) === false
  && shouldShowSelectUnitsCta({
    mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT, totalQueued: 2, showDone: false,
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
  && shouldIgnoreFactionCardToggle({ now: 2000, ignoreUntil: 1000 }) === false
  && shouldIgnoreFactionCardToggle({
    now: 1000,
    ignoreUntil: 1000 + LOBBY_SELECT_TOGGLE_GUARD_MS,
    playerId: 'germans',
    lockedPlayerId: 'ussr',
  }) === false);
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

console.log('=== V2.81.17 James lock — one grammar across land+unit phases ===');
{
  const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
  const panelSrc = readFileSync(join(root, 'src/ui/playerPanel.js'), 'utf8');
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const { phoneBlock } = phoneCssParts(css);
  const placeCapital = mainSrc.slice(
    mainSrc.indexOf("case 'place-capital'"),
    mainSrc.indexOf("case 'open-purchase'"),
  );
  check('opening legal marks paint without a selected land',
    /setPhoneLegalTerritories\(collectPhoneLegalTerritoryNames/.test(mainSrc)
    && /currentPlayer\?\.color/.test(mainSrc)
    && /renderPhoneLegalHighlights\(ctx, camera\.zoom\)/.test(mainSrc)
    && !/if \(selectedTerritory\)[\s\S]{0,80}renderPhoneLegalHighlights/.test(mainSrc));
  check('setup peek finishes on pointerup after a tap, not pointerdown',
    /finishPhoneSetupGesture/.test(mainSrc)
    && /beginPhoneSetupGesture/.test(mainSrc)
    && /shouldCommitPhoneSetupPeekAfterGesture/.test(mainSrc)
    && /addEventListener\('pointerup'/.test(mainSrc)
    && !/addEventListener\('pointerdown'[\s\S]{0,220}applyPhoneSetupPeekFromPointer/.test(mainSrc));
  check('capital Confirm does not auto-Fit',
    /placeCapital\(data\.territory\)/.test(placeCapital)
    && !/fitPhoneCamera/.test(placeCapital));
  check('unit-chip pointerdown freezes the named land',
    /_selectPhonePairUnit/.test(panelSrc)
    && /_phonePairFrozenAt/.test(panelSrc)
    && /data-action="phone-select-unit"/.test(panelSrc));
  check('null territory does not wipe a staged land name',
    shouldKeepPhonePairLand({
      incomingTerritory: null, stagedLandName: 'Ukraine S.S.R.',
    }) === true
    && shouldKeepPhonePairLand({
      incomingTerritory: { name: 'Ukraine S.S.R.' }, stagedLandName: 'Ukraine S.S.R.',
    }) === true
    && shouldKeepPhonePairLand({
      incomingTerritory: null, stagedLandName: '',
    }) === false);
  check('Max is in the thumb and does not commit',
    /phone-pair-max/.test(panelSrc)
    && /_applyPhonePairMax/.test(panelSrc)
    && /_commitStagedPlacement/.test(panelSrc)
    && panelSrc.indexOf('_applyPhonePairMax') > 0
    && !/_applyPhonePairMax[\s\S]{0,200}_commitStagedPlacement/.test(
      panelSrc.slice(panelSrc.indexOf('_applyPhonePairMax')),
    ));
  {
    const maxRule = phoneBlock.match(/\.pp-peek-max \{[\s\S]*?\}/)?.[0] || '';
    const confirmRule = phoneBlock.match(/\.pp-peek-primary-slot \.pp-confirm-btn \{[\s\S]*?\}/)?.[0] || '';
    check('Max is a compact secondary; Confirm stays the wide primary',
      /class="pp-peek-max"/.test(panelSrc)
      && !/class="pp-confirm-btn pp-peek-max"/.test(panelSrc)
      && /max-width:\s*56px/.test(maxRule)
      && /flex:\s*0 0 44px/.test(maxRule)
      && /flex:\s*1 1 auto/.test(confirmRule)
      && /width:\s*auto/.test(confirmRule)
      && !/(?<!max-)width:\s*100%/.test(confirmRule));
  }
  check('pair grammar covers deploy / mobilize / attack / fortify',
    shouldUsePhonePairGrammar({
      mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT,
    }) === true
    && shouldUsePhonePairGrammar({
      mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.MOBILIZE,
    }) === true
    && shouldUsePhonePairGrammar({
      mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.COMBAT_MOVE,
    }) === true
    && shouldUsePhonePairGrammar({
      mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.NON_COMBAT_MOVE,
    }) === true
    && shouldUsePhonePairGrammar({
      mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.PURCHASE,
    }) === false
    && shouldUsePhonePairGrammar({
      mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT,
    }) === false);
  check('Max waits for a named land except purchase',
    shouldShowPhonePeekMax({
      mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT,
      hasNamedLand: true, hasUnitType: true,
    }) === true
    && shouldShowPhonePeekMax({
      mobile: true, phase: GAME_PHASES.UNIT_PLACEMENT,
      hasNamedLand: false, hasUnitType: true,
    }) === false
    && shouldShowPhonePeekMax({
      mobile: true, phase: GAME_PHASES.PLAYING, turnPhase: TURN_PHASES.PURCHASE,
      hasNamedLand: false, hasUnitType: true,
    }) === true
    && shouldShowPhonePeekMax({
      mobile: true, phase: GAME_PHASES.CAPITAL_PLACEMENT,
      hasNamedLand: true, hasUnitType: false,
    }) === false);
  check('mobilize / move share land-then-unit hint + Confirm',
    resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.MOBILIZE, null, {
      territoryName: 'Ukraine S.S.R.',
    }) === 'Tap a unit · Ukraine S.S.R.'
    && resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.MOBILIZE, 'infantry', {
      territoryName: 'Ukraine S.S.R.',
    }) === 'To Ukraine S.S.R.'
    && resolvePhonePeekHint(GAME_PHASES.PLAYING, TURN_PHASES.COMBAT_MOVE, 'infantry', {
      territoryName: 'Ukraine S.S.R.', destName: 'West Russia',
    }) === 'Ukraine S.S.R. → West Russia'
    && /confirm-mobilize/.test(panelSrc)
    && /_commitStagedMobilize/.test(panelSrc)
    && /_maybeStagePhoneMobilizePair/.test(panelSrc)
    && /_maybeStagePhoneMovePair/.test(panelSrc));
  check('peek row / hint / CTA accept touch without eating named-land taps',
    /player-panel--peek \.phone-peek-row[\s\S]*?pointer-events:\s*auto/.test(phoneBlock)
    && /player-panel--peek \.phone-peek-pair-hint[\s\S]*?pointer-events:\s*auto/.test(phoneBlock)
    && /player-panel--peek \.pp-peek-cta-row[\s\S]*?pointer-events:\s*auto/.test(phoneBlock)
    && /player-panel--peek \.pp-bottom-actions[\s\S]*?pointer-events:\s*none/.test(phoneBlock));
  check('SCHEMA_VERSION stays 11 after the grammar sweep',
    SCHEMA_VERSION === 11);
}

console.log('=== V2.81.26 capital star / sea dest / Fit dest / pulses ===');
{
  const openingGs = {
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    isCapital: () => true,
    playerState: {},
  };
  const confirmedGs = {
    phase: GAME_PHASES.CAPITAL_PLACEMENT,
    isCapital: (n) => n === 'Mongolia',
    playerState: { ussr: { capitalTerritory: 'Mongolia' } },
  };
  check('opening Place Capital draws no capital star even if isCapital leaked',
    shouldDrawPhoneCapitalStar('French Indo China', openingGs) === false
    && shouldDrawPhoneCapitalGlow(openingGs) === false);
  check('Place Capital draws no stars (self or enemy) until Deploy',
    shouldDrawPhoneCapitalStar('Mongolia', confirmedGs) === false
    && shouldDrawPhoneCapitalStar('French Indo China', confirmedGs) === false
    && shouldDrawPhoneCapitalGlow(confirmedGs) === false);
  check('Deploy may show a confirmed capital star',
    shouldDrawPhoneCapitalStar('Mongolia', {
      phase: GAME_PHASES.UNIT_PLACEMENT,
      isCapital: (n) => n === 'Mongolia',
    }) === true);
  check('glow may return after both capitals (deploy+)',
    shouldDrawPhoneCapitalGlow({ phase: GAME_PHASES.UNIT_PLACEMENT }) === true);
  check('select / confirm pulses stay on the tile, not chrome bounce',
    PHONE_SELECT_PULSE_MS === 150
    && PHONE_CONFIRM_PULSE_MS === 250);
  const seas = [
    { name: 'Coast', isWater: false, connections: ['Open Sea'] },
    { name: 'Open Sea', isWater: true, connections: ['Coast'] },
    { name: 'Enemy Sea', isWater: true, connections: ['Coast'] },
  ];
  const farSeas = [
    ...seas,
    { name: 'Indian Ocean', isWater: true, connections: [] },
  ];
  check('legal setup sea is any empty/friendly existing ocean',
    isPhoneLegalSetupSeaDest({
      seaName: 'Open Sea',
      playerId: 'ussr',
      territories: farSeas,
      getOwner: (n) => (n === 'Coast' ? 'ussr' : null),
      getUnits: () => [],
    }) === true
    && isPhoneLegalSetupSeaDest({
      seaName: 'Indian Ocean',
      playerId: 'ussr',
      territories: farSeas,
      getOwner: (n) => (n === 'Coast' ? 'ussr' : null),
      getUnits: () => [],
    }) === true
    && isPhoneLegalSetupSeaDest({
      seaName: 'Enemy Sea',
      playerId: 'ussr',
      territories: farSeas,
      getOwner: (n) => (n === 'Coast' ? 'ussr' : null),
      getUnits: () => [{ owner: 'ger' }],
    }) === false
    && isPhoneLegalSetupSeaDest({
      seaName: 'Coast',
      playerId: 'ussr',
      territories: farSeas,
      getOwner: (n) => (n === 'Coast' ? 'ussr' : null),
      getUnits: () => [],
    }) === false);
  check('legal collect is owned land only — not every sea zone',
    collectPhoneLegalTerritoryNames({
      mobile: true,
      phase: GAME_PHASES.UNIT_PLACEMENT,
      playerId: 'ussr',
      territories: farSeas,
      getOwner: (n) => (n === 'Coast' ? 'ussr' : null),
      getUnits: () => [],
    }).join() === 'Coast'
    && collectPhoneLegalTerritoryNames({
      mobile: true,
      phase: GAME_PHASES.CAPITAL_PLACEMENT,
      playerId: 'ussr',
      territories: farSeas,
      getOwner: (n) => (n === 'Coast' ? 'ussr' : null),
      getUnits: () => [],
    }).includes('Indian Ocean') === false);
  check('legal collect is owned tiles only — not UK/Spain/Italy/Scandinavia',
    (() => {
      const names = collectPhoneLegalTerritoryNames({
        mobile: true,
        phase: GAME_PHASES.CAPITAL_PLACEMENT,
        playerId: 'ussr',
        territories: [
          { name: 'Ukraine S.S.R.', isWater: false },
          { name: 'United Kingdom', isWater: false },
          { name: 'Spain', isWater: false },
          { name: 'Italy', isWater: false },
          { name: 'Norway', isWater: false },
          { name: 'Sweden', isWater: false },
        ],
        getOwner: (n) => (n === 'Ukraine S.S.R.' ? 'ussr' : n === 'United Kingdom' ? 'uk' : null),
      });
      return names.length === 1
        && names[0] === 'Ukraine S.S.R.'
        && !names.includes('United Kingdom')
        && !names.includes('Spain')
        && !names.includes('Italy')
        && !names.includes('Norway');
    })());
  check('land dest hides sea chips; sea dest hides land-only chips',
    shouldShowPhoneDeployChip({
      destName: 'Ukraine S.S.R.', destIsWater: false,
      unitDef: { isSea: true },
    }) === false
    && shouldShowPhoneDeployChip({
      destName: 'Ukraine S.S.R.', destIsWater: false,
      unitDef: { isLand: true },
    }) === true
    && shouldShowPhoneDeployChip({
      destName: 'Black Sea Zone', destIsWater: true,
      unitDef: { isSea: true },
    }) === true
    && shouldShowPhoneDeployChip({
      destName: 'Black Sea Zone', destIsWater: true,
      unitDef: { isLand: true },
    }) === false
    && shouldShowPhoneDeployChip({
      destName: '', destIsWater: false,
      unitDef: { isSea: true },
    }) === true);
  check('legal sea tap applies on Deploy; unowned land still does not',
    shouldApplyPhoneSetupLandTap({
      mobile: true,
      phase: GAME_PHASES.UNIT_PLACEMENT,
      tappedIsOwnedLand: false,
      tappedIsLegalSea: true,
      hasHit: true,
    }) === true
    && shouldApplyPhoneSetupLandTap({
      mobile: true,
      phase: GAME_PHASES.UNIT_PLACEMENT,
      tappedIsOwnedLand: false,
      tappedIsLegalSea: false,
      hasHit: true,
    }) === false
    && shouldApplyPhoneSetupLandTap({
      mobile: true,
      phase: GAME_PHASES.CAPITAL_PLACEMENT,
      tappedIsOwnedLand: false,
      tappedIsLegalSea: true,
      hasHit: true,
    }) === false);
  check('unwrap pulls the far copy onto the dest seed (no Pacific centroid)',
    Math.abs(unwrapFitX(3000, 200) - (3000 - 3500)) < 0.01
    && Math.abs(unwrapFitX(80, 2800) - (80 + 3500)) < 0.01);
  const worldRussians = [
    { name: 'Ukraine S.S.R.', connections: ['West Russia'], center: [1300, 400] },
    { name: 'West Russia', connections: ['Ukraine S.S.R.'], center: [1400, 380] },
    { name: 'Mongolia', connections: ['Buryatia S.S.R.'], center: [2800, 420] },
    { name: 'Buryatia S.S.R.', connections: ['Mongolia'], center: [2750, 380] },
    { name: 'Alaska', connections: [], center: [80, 280] },
  ];
  const mongolFit = resolvePhoneFitRegionNames({
    ownedNames: ['Ukraine S.S.R.', 'West Russia', 'Mongolia', 'Buryatia S.S.R.', 'Alaska'],
    capitalName: 'Mongolia',
    territories: worldRussians,
  });
  check('worldwide + capital Mongolia frames that cluster, not UK/Pacific',
    mongolFit.includes('Mongolia')
    && mongolFit.includes('Buryatia S.S.R.')
    && !mongolFit.includes('Ukraine S.S.R.')
    && !mongolFit.includes('Alaska'));
  check('phone hides names at world Fit so stacks are the read',
    PHONE_MAP_LABEL_MIN_ZOOM === 0.45
    && shouldHidePhoneMapLabel({ mobile: true, name: 'Germany', zoom: 0.11 }) === true
    && shouldHidePhoneMapLabel({ mobile: true, name: 'Germany', zoom: 0.6 }) === false);
  const rendererSrc = readFileSync(join(root, 'src/map/territoryRenderer.js'), 'utf8');
  const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
  const placeCapital = mainSrc.slice(
    mainSrc.indexOf("case 'place-capital'"),
    mainSrc.indexOf("case 'open-purchase'"),
  );
  check('renderer gates capital stars and pulses the confirmed tile',
    /shouldDrawPhoneCapitalStar/.test(rendererSrc)
    && /shouldDrawPhoneCapitalGlow/.test(rendererSrc)
    && /setPhoneTilePulse/.test(rendererSrc)
    && /renderPhoneTilePulse/.test(mainSrc)
    && /PHONE_CONFIRM_PULSE_MS/.test(placeCapital)
    && !/fitPhoneCamera/.test(placeCapital));
  check('country outlines take zoom so world Fit is not a 1px hairline',
    /renderTerritoryOutlines\(ctx, zoom/.test(rendererSrc)
    && /renderTerritoryOutlines\(ctx, camera\.zoom\)/.test(mainSrc));
  check('ownership fill seals seams with same-color hairline, not dark Fit strokes',
    /renderOwnershipOverlays\(ctx, zoom/.test(rendererSrc)
    && /renderOwnershipOverlays\(ctx, camera\.zoom\)/.test(mainSrc)
    && /strokeStyle = color/.test(rendererSrc)
    && /phoneOwnershipSeamWidth/.test(rendererSrc));
  check('user Fit that does not move the camera widens to world',
    shouldWidenPhoneUserFit({
      beforeZoom: 0.32, afterZoom: 0.32, beforeX: 1800, afterX: 1800, beforeY: 900, afterY: 900,
    }) === true
    && shouldWidenPhoneUserFit({
      beforeZoom: 0.32, afterZoom: 0.11, beforeX: 1800, afterX: 1750, beforeY: 900, afterY: 1000,
    }) === false
    && /userTapped: true/.test(mainSrc)
    && /userTapped/.test(readFileSync(join(root, 'src/ui/mobileShell.js'), 'utf8')));
  check('map-tool punch-through is blocked on document-capture peek',
    /pointHitsPhoneMapToolsChrome/.test(mainSrc)
    && /isPhoneMapToolsChromeTarget/.test(readFileSync(join(root, 'src/ui/territoryTooltip.js'), 'utf8')));
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll tablet-chrome checks passed');
