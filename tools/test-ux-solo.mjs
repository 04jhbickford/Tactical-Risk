// Solo vs-AI adapter smoke. Run: node tools/test-ux-solo.mjs

import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(String(key), String(value)); },
    removeItem(key) { store.delete(key); },
  };
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GAME_VERSION } = await import(pathToFileURL(join(root, 'src/version.js')));
const {
  isUxPreviewRequested,
  isMaxBattleRequested,
  isSoloRequested,
  soloSeatRequested,
  soloAiRequested,
} = await import(pathToFileURL(join(root, 'src/map/uxPreviewFlag.js')));
const { GameState, GAME_PHASES, TURN_PHASES, SETUP_TURN_PHASE, CLASSIC_CAPITALS } =
  await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const { createSoloSession, COMBAT_SHELL, combatShellIndex } =
  await import(pathToFileURL(join(root, 'src/map/uxSoloAdapter.js')));
const { territoryCombatAlreadyResolved, BATTLE_STEP } =
  await import(pathToFileURL(join(root, 'src/map/uxSoloCombat.js')));
const {
  SOLO_SAVE_KEY,
  writeSoloSave,
  readSoloSave,
  clearSoloSave,
  hasSoloSave,
  soloNewGameHref,
} = await import(pathToFileURL(join(root, 'src/map/uxSoloSave.js')));

const setup = JSON.parse(readFileSync(join(root, 'data/setup.json'), 'utf8'));
const territories = JSON.parse(readFileSync(join(root, 'data/territories.json'), 'utf8'));
const continents = JSON.parse(readFileSync(join(root, 'data/continents.json'), 'utf8'));
const unitDefs = JSON.parse(readFileSync(join(root, 'data/units.json'), 'utf8'));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  } else {
    console.log('ok ', msg);
  }
}

assert(GAME_VERSION === 'V2.81.55-ux-preview.12-solo', `version ${GAME_VERSION}`);
assert(isUxPreviewRequested('?three=1'), 'three preview flag');
assert(isMaxBattleRequested('?three=1&max=1'), 'max flag');
assert(!isSoloRequested('?three=1&max=1'), 'max is not solo');
assert(isSoloRequested('?three=1&solo=1'), 'solo flag');
assert(isSoloRequested('?three=1&solo=1&max=1'), 'solo still true with max');
assert(!isSoloRequested('?solo=1'), 'solo alone is not enough');
assert(soloSeatRequested('?seat=Germans') === 'Germans', 'seat query');
assert(soloAiRequested('?ai=hard') === 'hard', 'ai query');
assert(soloAiRequested('?ai=nope') === 'medium', 'ai default');

const factions = setup.classic.factions.map((f) => ({
  ...f,
  isAI: f.id !== 'Russians',
  aiDifficulty: f.id === 'Russians' ? 'human' : 'easy',
}));
const gameState = new GameState(setup, territories, continents);
gameState.isMultiplayer = false;
gameState.soloLocal = true;
gameState.unitDefs = unitDefs;
gameState.initGame('classic', factions, { alliancesEnabled: true });
assert(gameState.phase === GAME_PHASES.PLAYING, 'classic starts PLAYING');
if (gameState.turnPhase === SETUP_TURN_PHASE) gameState.turnPhase = TURN_PHASES.DEVELOP_TECH;
gameState._initFriendlyTerritoriesAtTurnStart();
assert(gameState.turnPhase === TURN_PHASES.DEVELOP_TECH, 'tech after prepare');
assert(gameState.currentPlayer.id === 'Russians', 'James is Russians first');
assert(gameState.getIPCs('Russians') > 0, 'Russians have IPC');
assert((gameState.getUnitsAt('Karelia S.S.R.') || []).length > 0, 'Karelia has units');
assert(gameState.playerState.Russians.capitalTerritory === 'Russia', 'Russia stamped');
assert(gameState.playerState.Germans.capitalTerritory === 'Germany', 'Germany stamped');
assert(gameState.playerState.British.capitalTerritory === 'United Kingdom', 'UK stamped');
assert(gameState.playerState.Japanese.capitalTerritory === 'Japan', 'Japan stamped');
assert(gameState.playerState.Americans.capitalTerritory === 'East US', 'East US stamped');
assert(gameState.isCapital('Russia') && gameState.isCapital('Germany'), 'capitals marked');
assert(gameState.getMobilizationCapacity('Germans') >= 20, 'AI can buy at capital');
assert(gameState.getMobilizationCapacity('Russians') >= 20, 'James can buy at capital');
assert(CLASSIC_CAPITALS.Russians === 'Russia', 'classic capital table');

const session = createSoloSession({ gameState, unitDefs, seatId: 'Russians' });
assert(session.inspect().mode === 'splash', 'splash before start');
const splash = session.chromeModel([]);
assert(splash.label === 'New Game vs AI', `splash label ${splash.label}`);
assert(/classic 1942/.test(splash.route || ''), `splash route ${splash.route}`);
session.start();
assert(session.inspect().mode === 'tech', 'tech after start');
session.confirm();
assert(gameState.turnPhase === TURN_PHASES.PURCHASE, 'skip tech → purchase');
session.adjustUnit('infantry', 1);
const bought = gameState.getPendingPurchases().reduce((n, p) => n + p.quantity, 0);
assert(bought >= 1, 'purchase + buys infantry');
session.confirm();
assert(gameState.turnPhase === TURN_PHASES.COMBAT_MOVE, 'end purchase → combat move');

session.tap('Karelia S.S.R.');
session.adjustUnit('infantry', 1);
session.tap('Finland Norway');
const beforeMove = session.inspect();
assert(beforeMove.dest === 'Finland Norway' || beforeMove.picked.infantry > 0, `staged move ${JSON.stringify(beforeMove)}`);
session.confirm();
assert(gameState.combatQueue?.length >= 0, 'combat queue exists');

session.confirm(); // end combat move if still there, or start battle
if (gameState.turnPhase === TURN_PHASES.COMBAT_MOVE) session.confirm();
assert(
  gameState.turnPhase === TURN_PHASES.COMBAT
  || gameState.turnPhase === TURN_PHASES.NON_COMBAT_MOVE
  || session.inspect().mode === 'combat'
  || session.inspect().mode === 'ncm',
  `after combat-move phase=${gameState.turnPhase} mode=${session.inspect().mode}`,
);

assert(
  territoryCombatAlreadyResolved([], 'Russians', gameState, unitDefs) === true,
  'empty hex is resolved (AA wipe fail-close)',
);

const soloSrc = readFileSync(join(root, 'src/map/uxSolo.js'), 'utf8');
assert(!/from ['"].*lobbyManager/.test(soloSrc) && !/from ['"].*firebase/.test(soloSrc), 'uxSolo has no lobby/firebase imports');
assert(!/uxPreviewScenario/.test(readFileSync(join(root, 'src/map/uxSoloSave.js'), 'utf8')), 'save helper is not a second engine');

clearSoloSave();
assert(!hasSoloSave(), 'solo save empty');
assert(writeSoloSave({ gameState, seatId: 'Russians', aiLevel: 'medium' }), 'solo save writes');
assert(hasSoloSave(), 'solo save exists');
assert(localStorage.getItem('tacticalRisk_autoSave') === null, 'does not clobber lobby autosave');
const envelope = readSoloSave();
assert(envelope?.kind === 'solo-classic', 'solo save kind');
assert(envelope?.state?.playerState?.Russians?.capitalTerritory === 'Russia', 'save keeps capital');
assert(localStorage.getItem(SOLO_SAVE_KEY), 'dedicated solo key');
assert(soloNewGameHref('http://localhost/index.html?three=1&max=1') === '/index.html?three=1&solo=1', 'new-game href drops max');
clearSoloSave();

const previewSrc = readFileSync(join(root, 'src/map/uxPreviewScenario.js'), 'utf8');
const previewLen = previewSrc.length;
assert(previewLen > 1000, 'preview scenario file still present');
const mainSrc = readFileSync(join(root, 'src/main.js'), 'utf8');
assert(mainSrc.includes('bootUxSolo'), 'main forks solo boot');
assert(mainSrc.includes('bootUxPreview'), 'main keeps pocket preview');
assert(mainSrc.includes('gameEventLog') || mainSrc.includes('createGameEventLog'), 'S0 diagnostics wired');

function bootClassic() {
  const gs = new GameState(setup, territories, continents);
  gs.isMultiplayer = false;
  gs.soloLocal = true;
  gs.unitDefs = unitDefs;
  gs.initGame('classic', factions, { alliancesEnabled: true });
  if (gs.turnPhase === SETUP_TURN_PHASE) gs.turnPhase = TURN_PHASES.DEVELOP_TECH;
  gs._initFriendlyTerritoriesAtTurnStart();
  return gs;
}

function skipToCombatMove(sess, gs) {
  sess.start();
  if (gs.turnPhase === TURN_PHASES.DEVELOP_TECH) sess.confirm();
  if (gs.turnPhase === TURN_PHASES.PURCHASE) sess.confirm();
}

const phaseGame = bootClassic();
const phaseSess = createSoloSession({ gameState: phaseGame, unitDefs, seatId: 'Russians' });
skipToCombatMove(phaseSess, phaseGame);
assert(phaseGame.turnPhase === TURN_PHASES.COMBAT_MOVE, 'S2 skip to combat-move');
const cmChrome = phaseSess.chromeModel([]);
assert(cmChrome.label === 'End Phase', `S2 End Phase label ${cmChrome.label}`);
assert(cmChrome.shell.steps.join('|') === COMBAT_SHELL.join('|'), 'S2 combat shell steps');
assert(cmChrome.shell.current === 1, `S2 shell on combat-move ${cmChrome.shell.current}`);
assert(combatShellIndex('combatMove', TURN_PHASES.COMBAT_MOVE) === 1, 'S2 shell index combat-move');
assert(combatShellIndex('combat', TURN_PHASES.COMBAT) === 2, 'S2 shell index battle');
assert(combatShellIndex('airLand', TURN_PHASES.COMBAT) === 3, 'S2 shell index air land');
assert(combatShellIndex('ncm', TURN_PHASES.NON_COMBAT_MOVE) === 4, 'S2 shell index NCM');
phaseSess.confirm();
assert(
  phaseGame.turnPhase === TURN_PHASES.NON_COMBAT_MOVE
  || phaseGame.turnPhase === TURN_PHASES.MOBILIZE
  || phaseGame.turnPhase === TURN_PHASES.COLLECT_INCOME
  || phaseSess.inspect().mode === 'ncm',
  `S2 End Phase nextPhase → ${phaseGame.turnPhase} ${phaseSess.inspect().mode}`,
);

const fightGame = bootClassic();
fightGame._rollDie = (ctx) => (String(ctx).includes('defense') || ctx === 'aa' ? 6 : 1);
const fight = createSoloSession({ gameState: fightGame, unitDefs, seatId: 'Russians' });
skipToCombatMove(fight, fightGame);
const kareliaInf = (fightGame.getUnitsAt('Karelia S.S.R.') || []).find((u) => u.type === 'infantry');
if (kareliaInf) kareliaInf.quantity = Math.max(8, kareliaInf.quantity || 0);
fightGame.units['Finland Norway'] = [
  { type: 'infantry', quantity: 1, owner: 'Germans' },
];
fight.tap('Karelia S.S.R.');
fight.adjustUnit('infantry', 3);
fight.adjustUnit('fighter', 1);
fight.tap('Finland Norway');
assert(fight.inspect().origin === 'Karelia S.S.R.', `S3 origin pinned ${fight.inspect().origin}`);
assert(fight.inspect().dest === 'Finland Norway', 'S3 dest Finland');
assert(fight.inspect().picked.infantry === 3, 'S3 tile +/− infantry');
assert(fight.inspect().picked.fighter === 1, 'S3 tile +/− fighter');
const attackChrome = fight.chromeModel([]);
assert(/Attack Finland/.test(attackChrome.label), `S3 attack label ${attackChrome.label}`);
const marks = fight.highlights();
assert(marks.origin === 'Karelia S.S.R.', 'S3 highlight origin');
assert(marks.dest === 'Finland Norway', 'S3 highlight dest');
fight.confirm();
assert(
  (fightGame.getUnitsAt('Finland Norway') || []).some((u) => u.owner === 'Russians' && u.type === 'infantry'),
  'S3 moveUnits put Russians in Finland',
);
assert(
  (fightGame.getUnitsAt('Finland Norway') || []).some((u) => u.owner === 'Russians' && u.type === 'fighter'),
  'S3 fighter moved with infantry',
);
const afterMove = fight.chromeModel([]);
assert(afterMove.label === 'End Phase', `S3 End Phase after move ${afterMove.label}`);
fight.confirm();
assert(
  fightGame.turnPhase === TURN_PHASES.COMBAT || fight.inspect().mode === 'combat',
  `S4 entered combat phase=${fightGame.turnPhase} mode=${fight.inspect().mode}`,
);
assert(fight.inspect().shell === 2, `S4 shell battle ${fight.inspect().shell}`);
assert(fight.inspect().combat?.territory === 'Finland Norway', 'S4 battle is Finland');

let guard = 0;
while (
  fight.inspect().mode === 'combat'
  && fight.inspect().combat
  && fight.inspect().combat.step !== BATTLE_STEP.WON
  && guard < 12
) {
  const step = fight.inspect().combat.step;
  if (step === BATTLE_STEP.COMBAT_RESULT) {
    const you = fight.ui.combat?.pendingYou || {};
    const need = Object.values(you).reduce((n, q) => n + (Number(q) || 0), 0);
    if (need === 0 && fight.ui.combat) {
      fight.adjustLoss('att', 'infantry', 1);
    }
  }
  fight.confirm();
  guard += 1;
}
assert(guard < 12, 'S4 combat resolved without soft-lock');
if (fight.inspect().mode === 'combat' && fight.inspect().combat?.step === BATTLE_STEP.WON) {
  fight.confirm();
}
assert(
  fight.inspect().mode === 'airLand' || fight.inspect().mode === 'ncm' || fightGame.turnPhase === TURN_PHASES.NON_COMBAT_MOVE,
  `S5 after battle mode=${fight.inspect().mode} phase=${fightGame.turnPhase}`,
);

if (fight.inspect().mode === 'airLand') {
  const airMarks = fight.highlights();
  assert((airMarks.landable || []).includes('Karelia S.S.R.') || (airMarks.landable || []).includes('Russia'), 'S5 teal landable friendly');
  const dest = (airMarks.landable || []).includes('Karelia S.S.R.') ? 'Karelia S.S.R.' : airMarks.landable[0];
  fight.adjustUnit('fighter', 1);
  fight.tap(dest);
  assert(fight.inspect().landingDest === dest, `S5 partial air dest ${fight.inspect().landingDest}`);
  const landChrome = fight.chromeModel([]);
  assert(landChrome.airLand === true, 'S5 air-land sheet');
  assert(/Confirm land/.test(landChrome.label), `S5 land confirm ${landChrome.label}`);
  fight.confirm();
}

if (fight.inspect().mode !== 'ncm' && fightGame.turnPhase === TURN_PHASES.COMBAT) {
  fight.confirm();
}
if (fightGame.turnPhase === TURN_PHASES.COMBAT && fight.inspect().mode === 'combatIdle') {
  fight.confirm();
}
assert(
  fight.inspect().mode === 'ncm' || fightGame.turnPhase === TURN_PHASES.NON_COMBAT_MOVE,
  `S6 NCM phase=${fightGame.turnPhase} mode=${fight.inspect().mode}`,
);
if (fight.inspect().mode === 'ncm') {
  fight.tap('Karelia S.S.R.');
  fight.adjustUnit('infantry', 1);
  const beforeDest = fight.inspect().dest;
  fight.tap('Ukraine S.S.R.');
  assert(fight.inspect().dest !== 'Ukraine S.S.R.', `S6 NCM rejects enemy dest ${fight.inspect().dest}`);
  const ncmMarks = fight.highlights();
  assert(!(ncmMarks.legal || []).includes('Ukraine S.S.R.'), 'S6 NCM legal dests are friendly');
  if ((ncmMarks.legal || []).includes('Russia')) {
    fight.tap('Russia');
    assert(fight.inspect().dest === 'Russia', 'S6 NCM friendly dest');
    const ncmChrome = fight.chromeModel([]);
    assert(/Move Russia/.test(ncmChrome.label), `S6 move label ${ncmChrome.label}`);
  } else {
    assert(beforeDest !== 'Ukraine S.S.R.', 'S6 kept dest off Ukraine');
  }
  const endNcm = fight.chromeModel([]);
  if (!fight.inspect().dest) {
    assert(endNcm.label === 'End Phase', `S6 End Phase ${endNcm.label}`);
  }
}

assert(!/from ['"].*lobbyManager/.test(soloSrc), 'S2–S6 still no lobby');
assert(!/createScenario/.test(soloSrc), 'S2–S6 did not expand preview scenario');

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('PASS ux-solo smoke');
