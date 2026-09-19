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
const { createSoloSession } = await import(pathToFileURL(join(root, 'src/map/uxSoloAdapter.js')));
const { territoryCombatAlreadyResolved } =
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

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('PASS ux-solo smoke');
