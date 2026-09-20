#!/usr/bin/env node
// Browser smoke: lobby → 1 Human + AIs → Start → place 6 → Combat Move stages.
//   node tools/qc-playthrough-smoke.mjs [url] [outdir]

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const STAMP = 'V2.81.56-ux-solo.18';
const URL = process.argv[2] || 'http://127.0.0.1:4173/?three=1&solo=1';
const OUT = process.argv[3] || '/opt/cursor/artifacts/screenshots';
mkdirSync(OUT, { recursive: true });

function shot(page, name) {
  return page.screenshot({ path: join(OUT, name), fullPage: false });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.error('PAGEERROR', err.message));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#three-lobby.is-open', { timeout: 30000 });
  await page.waitForTimeout(300);

  const a1 = await page.evaluate((want) => {
    const l0 = document.querySelector('.three-l0-ver')?.textContent?.trim() || '';
    const lobby = document.querySelector('.three-lobby-ver')?.textContent?.trim() || '';
    const html = window.__TR_GAME_VERSION || '';
    return { l0, lobby, html, ok: l0 === want && lobby === want && html === want };
  }, STAMP);
  if (!a1.ok) throw new Error(`A1 FAIL ${JSON.stringify(a1)} want ${STAMP}`);
  await shot(page, 'lookpass18_a1_stamp_390.png');

  await page.click('[data-lobby="screen"][data-value="setup"]');
  await page.waitForSelector('.three-lobby-setup', { timeout: 10000 });
  await page.evaluate(() => {
    const api = window.__threeSolo;
    if (!api?.lobby) throw new Error('no lobby');
    const apply = (kind, value) => api.chrome.onLobbyChange(kind, value);
    apply('occupant', 'Russians:human');
    apply('occupant', 'Germans:medium');
    apply('occupant', 'British:easy');
    api.chrome.paintLobby(api.lobby);
  });
  await page.waitForTimeout(200);
  const seated = await page.evaluate(() => window.__threeSolo.inspect().lobby);
  if (!seated.canStart) {
    throw new Error(`Start still disabled ${JSON.stringify(seated)}`);
  }
  const start = page.locator('.three-lobby-start[data-lobby="start"]');
  if (await start.isDisabled()) throw new Error(`Start button disabled ${JSON.stringify(seated)}`);
  await shot(page, 'lookpass18_lobby_seated_390.png');
  await start.click();

  await page.waitForFunction(() => !document.getElementById('three-lobby')?.classList.contains('is-open'), { timeout: 15000 });
  const tut = page.locator('[data-tutorial="dismiss"]');
  if (await tut.count()) await tut.click();
  await page.waitForTimeout(400);
  await shot(page, 'lookpass18_capital_390.png');

  const afterSetup = await page.evaluate(async () => {
    const api = window.__threeSolo;
    if (!api) return { error: 'no __threeSolo' };
    const gs = api.gameState;
    const defs = api.play.unitDefs;
    const inspect = () => api.playInspect();
    const landOf = (id) => Object.entries(gs.territoryState)
      .filter(([name, s]) => s.owner === id && !gs.territoryByName[name]?.isWater)
      .map(([name]) => name);

    let info = inspect();
    if (info.setupPhase === 'capital_placement' && !info.isAI) {
      const dest = (info.capitalDests || landOf(gs.currentPlayer.id))[0];
      if (dest) {
        api.selectLand(dest);
        api.confirm();
      }
    }
    let guard = 0;
    while (gs.phase === 'capital_placement' && guard++ < 12) {
      if (gs.currentPlayer.isAI) {
        const owned = landOf(gs.currentPlayer.id);
        if (owned[0]) gs.placeCapital(owned[0]);
      } else {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    guard = 0;
    while (gs.phase === 'unit_placement' && guard++ < 80) {
      if (gs.currentPlayer.isAI) {
        const dests = landOf(gs.currentPlayer.id);
        const pool = gs.getUnitsToPlace?.(gs.currentPlayer.id) || [];
        const land = pool.find((p) => (p.quantity || 0) > 0 && defs[p.type] && !defs[p.type].isSea);
        let placed = 0;
        while (land && placed < 6 && dests[0]) {
          const result = gs.placeInitialUnit(dests[0], land.type, defs);
          if (result?.success === false) break;
          placed += 1;
        }
        gs.finishPlacementRound(defs, { allowNavalSkip: true });
        continue;
      }
      const dest = (inspect().deployDests || landOf(gs.currentPlayer.id))[0];
      while ((gs.unitsPlacedThisRound || 0) < 6) {
        const pool = (gs.getKnownUnitsToPlace?.(gs.currentPlayer.id, defs)
          || gs.getUnitsToPlace?.(gs.currentPlayer.id) || [])
          .find((p) => (p.quantity || 0) > 0 && defs[p.type] && !defs[p.type].isSea);
        if (!pool || !dest) break;
        api.adjustUnit(pool.type, 1);
        api.selectLand(dest);
        if (inspect().confirmEnabled) api.confirm();
        else break;
      }
      if (inspect().canEndPhase) api.confirm();
    }
    return inspect();
  });
  if (afterSetup.error) throw new Error(afterSetup.error);
  await shot(page, 'lookpass18_after_deploy_390.png');

  const playing = await page.evaluate(() => {
    const api = window.__threeSolo;
    const gs = api.gameState;
    const me = gs.currentPlayer.id;
    const steps = [];
    let info = api.playInspect();
    if (info.turnPhase === 'develop_tech' && info.confirmEnabled) {
      api.confirm();
      info = api.playInspect();
      steps.push('tech-skip');
    }
    if (info.turnPhase === 'purchase' && info.confirmEnabled) {
      api.adjustUnit('infantry', 1);
      api.confirm();
      info = api.playInspect();
      steps.push('buy-inf');
    }
    const pair = Object.keys(gs.territoryState).find((name) => {
      const t = gs.territoryByName[name];
      if (t?.isWater) return false;
      const enemy = (gs.getConnections(name) || []).find((to) => {
        const tz = gs.territoryByName[to];
        if (tz?.isWater) return false;
        const owner = gs.territoryState[to]?.owner;
        return owner && owner !== me && !gs.areAllies(me, owner);
      });
      if (!enemy) return false;
      gs.units[name] = [
        { type: 'infantry', quantity: 2, owner: me },
        { type: 'armour', quantity: 1, owner: me },
      ];
      gs.units[enemy] = [
        { type: 'infantry', quantity: 5, owner: gs.territoryState[enemy].owner },
      ];
      return true;
    });
    const origin = pair;
    const dest = origin
      ? (gs.getConnections(origin) || []).find((to) => {
        const owner = gs.territoryState[to]?.owner;
        return owner && owner !== me && !gs.areAllies(me, owner) && !gs.territoryByName[to]?.isWater;
      })
      : null;
    if (origin && dest && info.turnPhase === 'combat_move') {
      api.selectLand(origin);
      info = api.playInspect();
      steps.push(`origin:${info.stage}`);
      api.adjustUnit('infantry', 1);
      api.adjustUnit('infantry', 1);
      api.adjustUnit('armour', 1);
      info = api.playInspect();
      steps.push(`units:${info.stage}`);
      api.selectLand(dest);
      info = api.playInspect();
      steps.push(`dest:${info.stage}:${info.confirmLabel}`);
    }
    return { ...info, steps, origin, dest };
  });

  await shot(page, 'lookpass18_combat_move_stages_390.png');
  if (playing.turnPhase !== 'combat_move' && playing.turnPhase !== 'combat') {
    throw new Error(`expected combat-move after buy, got ${playing.turnPhase} setup=${afterSetup.setupPhase} ${JSON.stringify({ afterSetup, playing }, null, 2)}`);
  }
  if (playing.stage !== 'confirm' && playing.stage !== 'units' && playing.stage !== 'origin') {
    console.warn('stage after tap', playing.stage, playing.steps);
  }
  if (playing.stage === 'confirm' && playing.confirmEnabled !== true) {
    throw new Error('CONFIRM stage but Confirm disabled');
  }
  console.log(JSON.stringify({
    stamp: a1,
    afterSetup: {
      setupPhase: afterSetup.setupPhase,
      turnPhase: afterSetup.turnPhase,
      player: afterSetup.currentPlayer,
    },
    playing: {
      turnPhase: playing.turnPhase,
      stage: playing.stage,
      confirmLabel: playing.confirmLabel,
      confirmEnabled: playing.confirmEnabled,
      steps: playing.steps,
    },
  }, null, 2));
  if (playing.stage !== 'confirm') {
    throw new Error(`Combat Move Confirm stage not reached (stage=${playing.stage} steps=${playing.steps})`);
  }

  const casualty = await page.evaluate(() => {
    const api = window.__threeSolo;
    const play = api.play;
    const faces = [6, 6, 6, 1, 6, 6, 6, 6];
    let i = 0;
    play.rng = () => faces[Math.min(i++, faces.length - 1)];
    api.confirm();
    let info = api.playInspect();
    if (info.turnPhase === 'combat_move' && info.canEndPhase) {
      api.confirm();
      info = api.playInspect();
    }
    if (info.battleStep === 'aaReady') {
      api.confirm();
      info = api.playInspect();
    }
    if (info.battleStep === 'aaResult') {
      api.confirm();
      info = api.playInspect();
    }
    if (info.battleStep === 'combatReady') {
      api.confirm();
      info = api.playInspect();
    }
    const you = [...document.querySelectorAll('#three-battle [data-loss-pick]')];
    const they = [...document.querySelectorAll('#three-battle .three-picker[data-readonly="1"] [data-loss-step]')];
    const plus = document.querySelector('#three-battle [data-loss-pick] [data-loss-step="1"]');
    return {
      ...info,
      youTiles: you.length,
      theySteps: they.length,
      plusDisabled: plus ? plus.disabled : null,
      confirmText: document.getElementById('three-confirm')?.textContent || '',
      confirmDisabled: !!document.getElementById('three-confirm')?.disabled,
    };
  });
  await shot(page, 'lookpass18_casualty_you_assign_390.png');
  if (casualty.battleStep !== 'combatResult') {
    throw new Error(`casualty sheet not reached (${casualty.battleStep}) ${JSON.stringify(casualty)}`);
  }
  if (casualty.youTiles < 1) {
    throw new Error(`YOU casualty tiles missing ${JSON.stringify(casualty)}`);
  }
  if (casualty.confirmDisabled !== true && casualty.confirmText.includes('Take hits')) {
    // already assigned (forced) — still photograph
  } else if (casualty.confirmDisabled) {
    const plus = page.locator('#three-battle [data-loss-pick] [data-loss-step="1"]').first();
    if (await plus.count()) await plus.click({ force: true });
    else await page.locator('#three-battle [data-loss-pick]').first().click({ force: true });
    await page.waitForTimeout(200);
    const afterClick = await page.evaluate(() => ({
      label: document.getElementById('three-confirm')?.textContent || '',
      disabled: !!document.getElementById('three-confirm')?.disabled,
      gold: document.getElementById('three-confirm')?.classList.contains('is-ready'),
      pending: window.__threeSolo.playInspect().confirmEnabled,
    }));
    await shot(page, 'lookpass18_casualty_you_confirm_390.png');
    if (!afterClick.pending || afterClick.disabled) {
      throw new Error(`YOU stepper did not enable Confirm ${JSON.stringify(afterClick)}`);
    }
    if (!/Take hits/i.test(afterClick.label)) {
      throw new Error(`expected Take hits after YOU assign, got ${afterClick.label}`);
    }
    casualty.afterClick = afterClick;
  }
  console.log(JSON.stringify({ casualty: {
    battleStep: casualty.battleStep,
    youTiles: casualty.youTiles,
    confirmText: casualty.confirmText,
    confirmDisabled: casualty.confirmDisabled,
    afterClick: casualty.afterClick || null,
  } }, null, 2));
  await browser.close();
  console.log('playthrough smoke PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
