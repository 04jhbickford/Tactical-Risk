// Lobby → setup → deploy-6 → classic match. Run: node tools/test-three-solo-lobby.mjs

import { readFileSync } from 'node:fs';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
}

import {
  createSoloLobby,
  applyLobbyAction,
  setLobbyMode,
  toggleLobbySeat,
  setLobbyOccupant,
  setLobbyIpc,
  lobbyStartOptions,
  lobbyCanStart,
  lobbyStartLabel,
  lobbyBuildPlayers,
  parseSoloLobbySearch,
  STARTING_IPC_OPTIONS,
  AI_DIFFICULTIES,
} from '../src/map/threeSoloLobby.js';
import { startSoloMatch, buildSoloPlayers } from '../src/map/threeSoloMatch.js';
import {
  createSoloPlay,
  tapLand,
  adjustUnit,
  confirm,
  confirmLabel,
  confirmEnabled,
  capitalDests,
  deployPool,
  deployDests,
  deployWave,
  inspectPlay,
  legalDests,
  selectionBudget,
  capSelectedToBudget,
  canEndPhase,
  canUndo,
  undoLast,
  eligibleStacks,
  cargoManifest,
  chromeModel,
  pickShip,
  applyCargoSeed,
  CARGO_SEED,
  BATTLE_STEP,
} from '../src/map/threeSoloPlay.js';
import {
  SETUP_TUTORIAL_STEPS,
  shouldShowSetupTutorial,
  dismissTutorial,
  tutorialWasDismissed,
} from '../src/map/threeSetupTutorial.js';
import { GAME_PHASES, TURN_PHASES } from '../src/state/gameState.js';
import { findUndefinedPaths } from '../src/state/persistState.js';
import { GAME_VERSION } from '../src/version.js';
import { cubeDieHtml, isDieType, unitArtHtml, liveGameVersion, applyLiveStamp } from '../src/map/threeMapChrome.js';
import { getUnitIconPath } from '../src/utils/unitIcons.js';

const setup = JSON.parse(readFileSync(new URL('../data/setup.json', import.meta.url)));
const territories = JSON.parse(readFileSync(new URL('../data/territories.json', import.meta.url)));
const continents = JSON.parse(readFileSync(new URL('../data/continents.json', import.meta.url)));
const unitDefs = JSON.parse(readFileSync(new URL('../data/units.json', import.meta.url)));

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', msg);
  }
}

assert(GAME_VERSION === 'V2.81.56-ux-solo.15', 'tip stamp ux-solo.15');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert(indexHtml.includes('V2.81.56-ux-solo.15'), 'index.html cache-busts .15');
assert(indexHtml.includes("window.__TR_GAME_VERSION='V2.81.56-ux-solo.15'"), 'index.html inline stamp .15');
assert(indexHtml.includes('src/main.js?v=V2.81.56-ux-solo.15'), 'index.html module cache-bust .15');
assert(indexHtml.includes('serviceWorker') && indexHtml.includes('caches.keys'), 'tip boot drops SW / Cache Storage');
const bootSrc = String(readFileSync(new URL('../src/map/threeSoloBoot.js', import.meta.url)));
assert(bootSrc.includes('threeMapChrome.js?v=V2.81.56-ux-solo.15'), 'boot cache-busts chrome .15');
assert(bootSrc.includes('applyLiveStamp'), 'boot overwrites L0/lobby stamp every paint');
const chromeSrc = String(readFileSync(new URL('../src/map/threeMapChrome.js', import.meta.url)));
assert(chromeSrc.includes('function applyLiveStamp'), 'chrome applyLiveStamp from live GAME_VERSION');
assert(chromeSrc.includes('window.__TR_GAME_VERSION'), 'live stamp reads HTML SoT');
assert(chromeSrc.includes('el.textContent = v'), 'applyLiveStamp always overwrites stamp text');
assert(!chromeSrc.includes('${liveGameVersion()}'), 'stamps not baked into inject HTML');
const vercelJson = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
assert(vercelJson.includes('"source": "/"') && vercelJson.includes('no-store'), 'root HTML is no-store');
const prevWin = globalThis.window;
globalThis.window = { __TR_GAME_VERSION: 'V2.81.56-ux-solo.12' };
assert(liveGameVersion() === 'V2.81.56-ux-solo.15', 'stale HTML loses to newer module');
globalThis.window = { __TR_GAME_VERSION: 'V2.81.56-ux-solo.15' };
assert(liveGameVersion() === 'V2.81.56-ux-solo.15', 'HTML SoT when current');
const stampEls = [{ textContent: 'V2.81.56-ux-solo.12' }, { textContent: 'stale' }];
const prevDoc = globalThis.document;
globalThis.document = {
  documentElement: { dataset: {}, setAttribute() {} },
  querySelectorAll: () => stampEls,
};
assert(applyLiveStamp() === 'V2.81.56-ux-solo.15', 'applyLiveStamp returns live .15');
assert(stampEls.every((el) => el.textContent === 'V2.81.56-ux-solo.15'), 'every paint overwrites L0+lobby');
if (prevWin === undefined) delete globalThis.window;
else globalThis.window = prevWin;
if (prevDoc === undefined) delete globalThis.document;
else globalThis.document = prevDoc;
assert(chromeSrc.includes('#three-l0 .three-l0-ver') && chromeSrc.includes('position:absolute'), 'L0 stamp hangs on-screen, not flex-clipped');
assert(chromeSrc.includes('three-lobby-occupants'), 'seat occupants 4-col grid');
assert(chromeSrc.includes('three-lobby-colors'), 'seat colors on their own row');
assert(chromeSrc.includes('occupantChipLabel'), 'Human/Easy/Med/Hard chips');
assert(!/three-lobby-seat-wrap \{[^}]*overflow:\s*hidden/.test(chromeSrc), 'seat wrap does not overflow:hidden');
assert(chromeSrc.includes('three-lobby-seat-wrap') && chromeSrc.includes('overflow:visible'), 'seat cards grow, overflow visible');
assert(chromeSrc.includes('three-lobby-main') && chromeSrc.includes('three-lobby-footer'), 'setup header/main/footer shell');
assert(chromeSrc.includes('100dvh') && chromeSrc.includes('100svh'), 'lobby shell uses dvh/svh not 100vh-only');
assert(!/#three-lobby[^{]*\{[^}]*height:\s*100vh/.test(chromeSrc), 'no 100vh-only lobby height');
assert(/#three-lobby \.three-lobby-setup-head \{ flex:none/.test(chromeSrc), 'A2 header flex:none');
assert(/#three-lobby \.three-lobby-main \{[\s\S]*?flex:1[\s\S]*?min-height:0[\s\S]*?overflow-y:auto/.test(chromeSrc), 'A2/A3 main is the only setup scroller');
assert(/#three-lobby \.three-lobby-footer \{[\s\S]*?flex:none/.test(chromeSrc), 'A7 footer flex:none sibling');
assert(chromeSrc.includes('bindSealedActivate(lobby,') && chromeSrc.includes('{ prevent: false }'), 'lobby activate does not preventDefault');
assert(!chromeSrc.includes('ontouchstart = activate'), 'no ontouchstart=activate preventDefault on chips');
assert(chromeSrc.includes('has-lobby #mapCanvas') && chromeSrc.includes('pointer-events:none'), 'canvas ignores touches while lobby open');
assert(/#three-lobby \.three-lobby-main \{[\s\S]*?touch-action:pan-y/.test(chromeSrc), 'MAIN touch-action pan-y');
assert(/#three-lobby \.three-lobby-seat-wrap[\s\S]*?touch-action:pan-y/.test(chromeSrc), 'seat wrap allows vertical pan');
assert(!/for \(const el of \[[^\]]*lobby/.test(chromeSrc), 'lobby not blanket-sealed with preventDefault');
const eventsSrc = String(readFileSync(new URL('../src/map/threeChromeEvents.js', import.meta.url)));
assert(eventsSrc.includes('{ passive: !doPrevent }'), 'lobby touch listeners are passive when prevent:false');
assert(eventsSrc.includes("if (prevent)") && eventsSrc.includes("root.addEventListener('click', fire)"), 'scroll surfaces activate on click, not pointerdown');
assert(bootSrc.includes('chrome.isLobbyOpen()') && bootSrc.includes('isTutorialOpen()'), 'canvas touchstart skips preventDefault while lobby open');
assert(!/three-lobby-main \{[\s\S]*?position:\s*sticky/.test(chromeSrc), 'Teams+Start not sticky inside scroll');
assert(!/three-lobby-seat-tools button \{[^}]*width:28px/.test(chromeSrc), 'no 28px color tile in occupant flex');
assert(getUnitIconPath('techDie', 'Americans') == null, 'techDie has no unit PNG (was empty img 404)');
assert(isDieType('techDie') && isDieType('DIE') && isDieType('die') && isDieType('x', 'DIE 5'), 'die aliases');
const die = cubeDieHtml(5, { size: 'lg' });
assert(die.includes('<svg') && die.includes('data-die-art="svg"') && die.includes('<circle') && !die.includes('<img'), 'research die is SVG pips, not img');
const aliases = ['techDie', 'DIE', 'die', 'tech_die'].map((t) => unitArtHtml(t, 'Russians', 'DIE 5', { dieSize: 'lg' }));
assert(aliases.every((html) => html.includes('<svg') && !html.includes('<img')), 'unitArtHtml never imgs a die');
assert(AI_DIFFICULTIES.map((d) => d.id).join(',') === 'human,easy,medium,hard', 'main occupant labels');
assert(STARTING_IPC_OPTIONS.join(',') === '40,60,80,100,120,150', 'main IPC ladder');

const parsed = parseSoloLobbySearch('?three=1&solo=1');
assert(parsed.mode === 'risk', 'default Risk like main local');
assert(parsed.skip === false, 'lobby open by default');
assert(parseSoloLobbySearch('?solo=1&go=1').skip === true, 'go=1 skips lobby');
assert(parseSoloLobbySearch('?mode=classic').mode === 'classic', 'mode=classic');

const lobby = createSoloLobby(setup, '?three=1&solo=1');
assert(lobby.open === true, 'lobby starts open');
assert(lobby.screen === 'main', 'main menu first');
assert(lobby.mode === 'risk', 'risk default');
assert(!lobbyCanStart(lobby), 'cannot start with 0 seats');
assert(lobbyStartLabel(lobby) === 'Select at least 2 players', 'main Start copy');

applyLobbyAction(lobby, 'screen', 'setup');
assert(lobby.screen === 'setup', 'Local Play → setup');
toggleLobbySeat(lobby, 'Russians');
toggleLobbySeat(lobby, 'Germans');
setLobbyOccupant(lobby, 'Germans', 'medium');
assert(lobbyCanStart(lobby), '2 seats can start');
assert(lobbyStartLabel(lobby) === 'Start Game (2 Players)', 'Start Game (N Players)');
setLobbyIpc(lobby, 100);
assert(lobby.startingIPCs === 100, 'IPC 100');
const players = lobbyBuildPlayers(lobby);
assert(players.length === 2, '2 players');
assert(players.find((p) => p.id === 'Russians')?.isAI === false, 'Russians human');
assert(players.find((p) => p.id === 'Germans')?.isAI === true, 'Germans AI');
assert(players.find((p) => p.id === 'Germans')?.aiDifficulty === 'medium', 'Easy/Med/Hard per seat');

const skip = createSoloLobby(setup, '?three=1&solo=1&go=1&seat=British&ai=2&diff=easy');
assert(skip.open === false, 'go=1 closed');
assert(skip.selectedPlayers[0] === 'British', 'skip human British');
assert(skip.selectedPlayers.length === 3, '1 + 2 AI');
assert(skip.playerAI.British === 'human', 'human occupant');

setLobbyMode(lobby, 'classic');
assert(lobby.mode === 'classic', 'classic mode tile');

const classicPlayers = buildSoloPlayers(setup, { mode: 'classic', humanSeat: 'British' });
assert(classicPlayers[0].id === 'British' && !classicPlayers[0].isAI, 'human first');
assert(classicPlayers.filter((p) => p.isAI).length === 4, '4 AI classic');

const classic = startSoloMatch(setup, territories, continents, {
  mode: 'classic',
  humanSeat: 'Americans',
});
classic.unitDefs = unitDefs;
assert(classic.phase === GAME_PHASES.PLAYING, 'classic skips to playing');
assert(classic.currentPlayer.id === 'Americans', 'Americans first');
assert(classic.territoryState.Russia?.isCapital === true, 'capitals stamped');
const classicPlay = createSoloPlay(classic, unitDefs);
assert(inspectPlay(classicPlay).setupPhase === GAME_PHASES.PLAYING, 'playing inspect');

const risk = startSoloMatch(setup, territories, continents, lobbyStartOptions(createSoloLobby(setup, '?go=1&mode=risk&seat=Russians&ai=2&diff=easy')));
risk.unitDefs = unitDefs;
assert(risk.gameMode === 'risk', 'risk mode');
assert(risk.phase === GAME_PHASES.CAPITAL_PLACEMENT, 'opens on capital');
assert(risk.players.length === 3, '1 human + 2 AI');
assert(risk.currentPlayer.id === 'Russians' && !risk.currentPlayer.isAI, 'human places first');
assert(shouldShowSetupTutorial(risk), 'tutorial on first setup');
dismissTutorial();
assert(tutorialWasDismissed(), 'tutorial dismiss persisted');
assert(!shouldShowSetupTutorial(risk), 'dismissed stays closed');
assert(SETUP_TUTORIAL_STEPS.length === 3, 'tutorial has 3 steps');

const play = createSoloPlay(risk, unitDefs);
const caps = capitalDests(play);
assert(caps.length > 0, 'owned capital dests');
const pick = caps[0];
tapLand(play, pick);
assert(play.destPicked === pick, 'capital dest picked');
assert(confirmEnabled(play), 'capital confirm');
assert(confirmLabel(play).includes('Capital'), 'capital label');
confirm(play);
assert(risk.playerState.Russians.capitalTerritory === pick, 'capital stamped');
assert(risk.currentPlayer.isAI, 'next seat is AI');

while (risk.phase === GAME_PHASES.CAPITAL_PLACEMENT) {
  const ai = risk.currentPlayer;
  const owned = Object.entries(risk.territoryState)
    .filter(([name, s]) => s.owner === ai.id && !risk.territoryByName[name]?.isWater)
    .map(([name]) => name);
  assert(owned.length > 0, `AI ${ai.id} has a capital dest`);
  risk.placeCapital(owned[0]);
}
assert(risk.phase === GAME_PHASES.UNIT_PLACEMENT, 'all capitals → deploy');
assert(risk.currentPlayer.id === 'Russians', 'human deploys first');

const wave0 = deployWave(play);
assert(wave0.limit === 6, 'wave cap 6');
assert(wave0.placed === 0, '0 placed');
assert(!confirmEnabled(play), 'Pass disabled at 0 of 6');
assert(confirmLabel(play).includes('0 of 6'), 'Deploy 0 of 6 copy');
assert(wave0.meter.includes('0/6'), 'budget meter');

const pool = deployPool(play);
assert(pool.some((p) => p.type === 'infantry' && p.quantity > 0), 'deploy infantry');
adjustUnit(play, 'infantry', 1);
const dests = deployDests(play);
assert(dests.includes(pick), 'can deploy on capital');
tapLand(play, pick);
assert(confirmLabel(play).includes('Deploy'), 'deploy label');
confirm(play);
const inf = (risk.units[pick] || []).find((u) => u.type === 'infantry' && u.owner === 'Russians');
assert((inf?.quantity || 0) >= 2, 'starting INF + deploy');
assert(risk.unitsPlacedThisRound === 1, '1 of 6 placed');
assert(selectionBudget(play) === 5, 'budget remaining 5');
assert(capSelectedToBudget(play, 'infantry', 20, 20) === 5, 'capSelectedToBudget = remaining');
adjustUnit(play, 'infantry', 20);
assert((play.selectedUnits.infantry || 0) <= 5, 'stepper total ≤ remaining budget');
play.selectedUnits = {};
assert(!confirmEnabled(play), 'Pass still locked after 1');

while (risk.unitsPlacedThisRound < 6) {
  adjustUnit(play, 'infantry', 1);
  tapLand(play, pick);
  if (!confirmEnabled(play)) break;
  confirm(play);
}
assert(risk.unitsPlacedThisRound === 6, 'placed 6');
assert(selectionBudget(play) === 0, 'budget 0 after 6');
assert(canEndPhase(play), 'can Pass after 6');
assert(confirmEnabled(play), 'Pass enabled at 6 of 6');
assert(confirmLabel(play).startsWith('Pass'), 'Pass CTA');
assert(canUndo(play), 'Undo after deploy');
adjustUnit(play, 'infantry', 5);
assert(pickedCountSafe(play) === 0, 'steppers cannot exceed budget 0');
const hist = (risk.placementHistory || []).length;
undoLast(play);
assert((risk.unitsPlacedThisRound || 0) === 5 || (risk.placementHistory || []).length < hist, 'Undo reverses last deploy');
while (risk.unitsPlacedThisRound < 6) {
  adjustUnit(play, 'infantry', 1);
  tapLand(play, pick);
  if (!confirmEnabled(play)) break;
  confirm(play);
}
assert(risk.unitsPlacedThisRound === 6, 're-placed 6 after undo');
assert((risk.placementHistory || []).length === 6, 'history kept until Pass');
assert((risk.toJSON().placementHistory || []).length === 6, 'history in toJSON');
assert(chromeModel(play, territories).canUndo === true, 'chrome canUndo at 6/6');
confirm(play);
assert((risk.placementHistory || []).length === 0, 'history clears on Pass');
assert(risk.currentPlayer.isAI, 'Pass advances seat');

function pickedCountSafe(p) {
  return Object.values(p.selectedUnits || {}).reduce((n, q) => n + (Number(q) || 0), 0);
}

const json = risk.toJSON();
assert(findUndefinedPaths(json).length === 0, 'risk toJSON has no undefined');

const seaPlay = createSoloPlay(classic, unitDefs);
classic.turnPhase = TURN_PHASES.COMBAT_MOVE;
const sz = Object.keys(classic.units).find((name) => {
  const t = classic.territoryByName[name];
  return t?.isWater && (classic.units[name] || []).some((u) => u.owner === 'Americans' && u.type === 'transport');
});
if (sz) {
  tapLand(seaPlay, sz);
  const ships = (classic.units[sz] || []).filter((u) => u.owner === 'Americans' && u.type !== 'factory');
  const seaElig = eligibleStacks(seaPlay, sz);
  assert(seaElig.every((s) => unitDefs[s.type]?.isSea || unitDefs[s.type]?.isAir || s.cargo), 'sea sheet is naval/air/cargo');
  const manifest = cargoManifest(seaPlay, sz);
  assert(Array.isArray(manifest), 'cargo manifest');
  if (manifest.length) {
    pickShip(seaPlay, manifest[0].key);
    assert(seaPlay.targetShipId === manifest[0].key, 'pick ship');
  }
  if (ships.some((u) => u.type === 'battleship' || u.type === 'destroyer' || u.type === 'cruiser')) {
    const type = ships.find((u) => ['battleship', 'destroyer', 'cruiser', 'submarine'].includes(u.type))?.type;
    if (type) {
      adjustUnit(seaPlay, type, 1);
      const dests = legalDests(seaPlay);
      assert(Array.isArray(dests), 'naval dests array');
    }
  }
}

const landName = Object.keys(classic.units).find((name) => {
  const t = classic.territoryByName[name];
  if (t?.isWater) return false;
  const inf = (classic.units[name] || []).some((u) => u.owner === 'Americans' && u.type === 'infantry' && (u.quantity || 0) > 0);
  if (!inf) return false;
  return (classic.getConnections(name) || []).some((to) => {
    const tz = classic.territoryByName[to];
    return tz?.isWater && (classic.units[to] || []).some((u) => u.owner === 'Americans' && u.type === 'transport');
  });
});
if (landName) {
  const landPlay = createSoloPlay(classic, unitDefs);
  tapLand(landPlay, landName);
  const landElig = eligibleStacks(landPlay, landName);
  assert(landElig.every((s) => unitDefs[s.type]?.isLand || unitDefs[s.type]?.isAir), 'land sheet is land+air');
  assert(!landElig.some((s) => unitDefs[s.type]?.isSea), 'land sheet hides navy');
  adjustUnit(landPlay, 'infantry', 1);
  const loadDests = legalDests(landPlay);
  const trnSea = (classic.getConnections(landName) || []).find((to) => (
    classic.territoryByName[to]?.isWater
    && (classic.units[to] || []).some((u) => u.owner === 'Americans' && u.type === 'transport')
  ));
  assert(loadDests.includes(trnSea), 'combat-move land can load adjacent TRN');
  tapLand(landPlay, trnSea);
  const loadModel = chromeModel(landPlay, territories);
  assert(loadModel.label.includes('Load TRN'), 'Load TRN confirm');
  assert((loadModel.cargo || []).some((s) => s.type === 'transport'), 'cargo sheet lists dest TRN');
}

classic.turnPhase = TURN_PHASES.DEVELOP_TECH;
const techPlay = createSoloPlay(classic, unitDefs);
const techModel = chromeModel(techPlay, territories);
assert(techModel.researchHint === true, 'research hint before roll');
assert(techModel.steppers?.[0]?.type === 'techDie', 'research die stepper');
assert(canUndo(techPlay) === false, 'no undo before reversible tech action');
techPlay.tech.rolls = [2, 5];
assert(canUndo(techPlay) === false, 'no undo during tech dice');
techPlay.tech.rolls = [6];
techPlay.tech.breakthrough = true;
const breakModel = chromeModel(techPlay, territories);
assert(breakModel.battle?.kicker === 'Breakthrough', 'breakthrough card');
assert((breakModel.battle?.techs || []).length >= 4, 'dense tech tiles');
assert((breakModel.battle?.techs || []).every((t) => t.info), 'tech info for (i)');
assert((breakModel.battle?.pickers || []).length === 0, 'no tall casualty pickers');
assert(canUndo(techPlay) === false, 'no undo during breakthrough');

const fightPlay = createSoloPlay(classic, unitDefs);
fightPlay.battle = { step: BATTLE_STEP.COMBAT_READY, dest: 'Karelia S.S.R.' };
assert(canUndo(fightPlay) === false, 'no undo during battle');

assert(!String(readFileSync(new URL('../src/map/threeMapChrome.js', import.meta.url))).includes('three-dice-hero'), 'no orphan research hero die');
assert(String(readFileSync(new URL('../src/map/threeMapChrome.js', import.meta.url))).includes('three-research-row'), 'compact research row');
assert(String(readFileSync(new URL('../src/map/threeMapChrome.js', import.meta.url))).includes('three-tech-grid'), 'breakthrough grid');
assert(String(readFileSync(new URL('../src/map/threeMapChrome.js', import.meta.url))).includes('data-tech-pick'), 'tech pick not loss steppers');
assert(chromeSrc.includes('three-lobby-seats-sec'), 'setup seats section');
assert(chromeSrc.includes('three-lobby-main') && chromeSrc.includes('touch-action:pan-y'), 'main-only setup scroll');

const cargoSearch = parseSoloLobbySearch('?three=1&solo=1&cargo=1');
assert(cargoSearch.cargo === true && cargoSearch.skip === true, 'cargo=1 skips lobby');
assert(cargoSearch.mode === 'classic' && cargoSearch.humanSeat === 'Americans', 'cargo seed is classic Americans');
const cargoGs = startSoloMatch(setup, territories, continents, {
  mode: 'classic',
  humanSeat: 'Americans',
});
cargoGs.unitDefs = unitDefs;
const cargoPlay = createSoloPlay(cargoGs, unitDefs);
applyCargoSeed(cargoPlay);
const seeded = chromeModel(cargoPlay, territories);
assert(seeded.label.includes('Load TRN'), 'cargo seed Load TRN CTA');
assert((seeded.cargo || []).some((s) => s.type === 'transport'), 'cargo seed lists TRN');
assert(cargoPlay.selected === CARGO_SEED.land && cargoPlay.destPicked === CARGO_SEED.sea, 'East US → East US SZ');

console.log(failures ? `${failures} lobby/setup check(s) failed` : 'All lobby/setup checks passed');
process.exit(failures ? 1 : 0);
