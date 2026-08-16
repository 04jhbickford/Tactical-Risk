// Unit checks for V2.61 tablet chrome (tooltip clamp predicate)
// plus V2.63 phone-shell predicates. Desktop ≥768 stays on the V2.61 checks.
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
  shouldUseMobileShell,
  applyMobileShellClass,
  pickMobilePrimaryButtons,
  shouldHideAllGameChrome,
  shouldHideTurnActionChrome,
} = await import(pathToFileURL(join(root, 'src/ui/mobileShell.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

console.log('=== Version stamps ===');
check('GAME_VERSION is V2.63', GAME_VERSION === 'V2.63');
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

console.log('=== V2.63 mobile shell breakpoint (390×844 vs 1280×800) ===');
check('breakpoint is 767', MOBILE_SHELL_MAX_WIDTH === 767);
check('390px iPhone → mobile shell', shouldUseMobileShell(390) === true);
check('767px → mobile shell', shouldUseMobileShell(767) === true);
check('768px desktop → no mobile shell', shouldUseMobileShell(768) === false);
check('1280×800 desktop → no mobile shell', shouldUseMobileShell(1280) === false);
{
  const root = { classList: { on: new Set(), toggle(name, force) {
    if (force) this.on.add(name); else this.on.delete(name);
  }, contains(name) { return this.on.has(name); } } };
  applyMobileShellClass(390, root);
  check('apply at 390 sets mobile-shell', root.classList.contains('mobile-shell'));
  applyMobileShellClass(1280, root);
  check('apply at 1280 clears mobile-shell', !root.classList.contains('mobile-shell'));
}

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

console.log('=== V2.63 CSS is phone-scoped; desktop HUD geometry stays ===');
{
  const css = readFileSync(join(root, 'style.css'), 'utf8');
  const unscopedHud = css.match(/^#hud \{[\s\S]*?^\}/m);
  check('unscoped #hud is still 48px', !!unscopedHud && /height:\s*48px/.test(unscopedHud[0]));
  check('phone layout is inside max-width: 767px',
    /@media \(max-width:\s*767px\)/.test(css));
  check('unscoped zoom still parks left of the 320px panel',
    /#zoom-controls \{[\s\S]*?right:\s*calc\(320px \+ 12px\)/.test(css));
  const beforePhone = css.split('@media (max-width: 767px)')[0];
  check('phone 100dvh is not unscoped on html/body',
    !/html,\s*body \{[^}]*100dvh/.test(beforePhone));
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll tablet-chrome checks passed');
