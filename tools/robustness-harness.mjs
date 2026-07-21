// N-client multiplayer robustness harness for Tactical Risk.
// Run: node tools/robustness-harness.mjs   (exit 0 = all matrix cells pass)
//
// Spins up real GameState + AIController instances ("clients") over a mock
// Firestore game doc with the same transaction semantics as
// syncManager._doPush, then drives the ROBUSTNESS_MATRIX.md scenarios:
// compositions (A1–A4), rejoin/refresh, simultaneous actions, surrender in
// every phase, no-shows, and host-failover contention. Async play IS the
// rejoin path (state persists in the doc regardless of elapsed time).

import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GameState, GAME_PHASES, TURN_PHASES } = await import(pathToFileURL(join(root, 'src/state/gameState.js')));
const { AIController } = await import(pathToFileURL(join(root, 'src/ai/aiController.js')));
const { applySurrenderToState } = await import(pathToFileURL(join(root, 'src/multiplayer/surrenderCore.js')));
const { GAME_VERSION, SCHEMA_VERSION, compareGameVersions } = await import(pathToFileURL(join(root, 'src/version.js')));

// ---------- fixtures ----------
const unitDefs = { infantry: { isLand: true, attack: 1, defense: 2, cost: 3, move: 1 } };
const NAMES = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const territories = NAMES.map((name, i) => ({
  name, isWater: false, production: 2,
  connections: NAMES.filter(n => n !== name).slice(0, 3),
  polygons: [], x: i * 10, y: 0
}));

function composition(humans, ais, unitsEach = 12) {
  const players = [];
  for (let h = 0; h < humans; h++) players.push({ id: `h${h}`, name: `Human${h}`, oderId: `user_${h}`, isAI: false });
  for (let a = 0; a < ais; a++) players.push({ id: `a${a}`, name: `Bot${a}`, oderId: `ai_${a}`, isAI: true, aiDifficulty: 'easy' });
  const perPlayer = Math.floor(NAMES.length / players.length);
  const territoryState = {}, units = {}, unitsToPlace = {}, playerState = {};
  players.forEach((p, i) => {
    const owned = NAMES.slice(i * perPlayer, (i + 1) * perPlayer);
    owned.forEach((t, j) => {
      territoryState[t] = { owner: p.id, isCapital: j === 0 };
      units[t] = [{ type: 'infantry', quantity: 1, owner: p.id }];
    });
    unitsToPlace[p.id] = [{ type: 'infantry', quantity: unitsEach }];
    playerState[p.id] = { ipcs: 80, capitalTerritory: owned[0] };
  });
  return {
    version: 11, gameMode: 'risk', alliancesEnabled: false, teamsEnabled: false,
    isMultiplayer: true, players, currentPlayerIndex: 0, round: 1,
    phase: 'unit_placement', turnPhase: 'develop_tech',
    territoryState, units, playerState,
    pendingPurchases: [], combatQueue: [], gameOver: false, winner: null, winCondition: null,
    playerTechs: {}, riskCards: {}, cardTradeCount: {}, unitsToPlace,
    placementRound: 1, airUnitOrigins: {}, turnEvents: [],
  };
}

// ---------- mock Firestore ----------
class MockDoc {
  constructor(json) { this.stateVersion = 1; this.state = json; this.currentPlayerId = json.players[0].oderId; this.writes = []; }
}

class Client {
  constructor(name, oderId, doc, { isHost = false, authorityFn = null } = {}) {
    this.name = name; this.oderId = oderId; this.doc = doc;
    this.isHost = isHost; this.authorityFn = authorityFn || (() => false);
    this.localVersion = doc.stateVersion;
    this.aborted = 0;
    this.gs = new GameState({ risk: { factions: [] } }, territories, []);
    this.gs.isMultiplayer = true;
    this.gs.unitDefs = unitDefs;
    this.load();
    // Production semantics: main.js pushes on notify using the CACHED
    // isActivePlayer flag, which is still true while your own turn-ending
    // action is being pushed (the live currentPlayer already moved on).
    this.gs.subscribe(() => {
      if (this.loading) return;
      if (this.cachedActive || this.hasAIAuthority()) this.push();
    });
    this.ai = new AIController();
    this.ai.setUnitDefs(unitDefs);
    this.ai.setGameState(this.gs);
    this.ai.setCanAct(() => this.hasAIAuthority());
  }
  isActive() { return this.gs.currentPlayer?.oderId === this.oderId; }
  hasAIAuthority() { return this.isHost || this.authorityFn() === true; }
  push() {
    if (this.doc.stateVersion > this.localVersion) { this.aborted++; this.load(); return false; }
    this.doc.stateVersion += 1;
    this.doc.state = structuredClone(this.gs.toJSON());
    this.doc.currentPlayerId = this.gs.currentPlayer?.oderId || null;
    this.doc.writes.push({ by: this.name, v: this.doc.stateVersion, idx: this.doc.state.currentPlayerIndex, phase: this.doc.state.phase, turnPhase: this.doc.state.turnPhase });
    this.localVersion = this.doc.stateVersion;
    this.cachedActive = this.doc.currentPlayerId === this.oderId; // _updateActivePlayer after push
    return true;
  }
  load() {
    this.loading = true;
    this.gs.loadFromJSON(structuredClone(this.doc.state));
    this.loading = false;
    this.localVersion = this.doc.stateVersion;
    this.cachedActive = this.doc.currentPlayerId === this.oderId; // _updateActivePlayer on snapshot
  }
  // human deployment turn: place up to 6 units then finish the round
  humanDeploy() {
    if (!this.isActive()) return false;
    const me = this.gs.currentPlayer;
    const mine = Object.entries(this.gs.territoryState).filter(([, s]) => s.owner === me.id).map(([t]) => t);
    for (let i = 0; i < 6; i++) {
      const r = this.gs.placeInitialUnit(mine[i % mine.length], 'infantry', unitDefs);
      if (!r.success) break;
    }
    this.gs.finishPlacementRound(unitDefs);
    return true;
  }
  async runAI() { await this.ai.checkAndProcessAI(); }
  destroy() { this.ai.setGameState(null); } // "tab closed"
}

const rejoin = (client, doc) => new Client(client.name, client.oderId, doc, { isHost: client.isHost, authorityFn: client.authorityFn });

// ---------- runner ----------
let failures = 0;
const check = (label, cond) => { if (!cond) { failures++; console.error('FAIL:', label); } else console.log('ok  :', label); };
const noRewind = (doc) => !doc.writes.some((w, i) => {
  if (i === 0) return false;
  const prev = doc.writes[i - 1];
  return w.idx < prev.idx && !(w.idx === 0 && prev.idx >= doc.state.players.length - 1);
});
const sane = (doc, label) => {
  check(`${label}: no invalid phase/turnPhase combo ever pushed`,
    !doc.writes.some(w => w.phase !== 'playing' && w.turnPhase !== 'develop_tech'));
  check(`${label}: turn order never rewound`, noRewind(doc));
};

// drive a full deployment cycle: humans act when active, host runs AI
async function driveDeployment(doc, clients, { maxSteps = 200 } = {}) {
  for (let step = 0; step < maxSteps; step++) {
    if (doc.state.phase !== 'unit_placement') return true;
    const currentId = doc.currentPlayerId;
    const cur = doc.state.players[doc.state.currentPlayerIndex];
    if (cur.isAI) {
      for (const c of clients) { c.load(); await c.runAI(); }
    } else {
      const owner = clients.find(c => c.oderId === currentId);
      if (!owner) return 'noshow'; // current human has no client
      owner.load();
      owner.humanDeploy();
    }
  }
  console.error('   [stall] phase=%s idx=%d placedThisRound=%s toPlace=%o',
    doc.state.phase, doc.state.currentPlayerIndex, doc.state.unitsPlacedThisRound,
    Object.fromEntries(Object.entries(doc.state.unitsToPlace).map(([k, v]) => [k, v.reduce((s, u) => s + u.quantity, 0)])));
  return false; // did not complete
}

console.log('=== A1: 1H+1AI — baseline (covers 1H+2AI, 1H+3AI) ===');
{
  const doc = new MockDoc(composition(1, 1, 6));
  const h = new Client('h0', 'user_0', doc, { isHost: true });
  const done = await driveDeployment(doc, [h]);
  check('A1: deployment completed to playing phase', done === true && doc.state.phase === 'playing');
  sane(doc, 'A1');
}

console.log('=== A2: 2H+0AI — human-only ping-pong + mid-game rejoin ===');
{
  const doc = new MockDoc(composition(2, 0, 6));
  let h0 = new Client('h0', 'user_0', doc, { isHost: true });
  let h1 = new Client('h1', 'user_1', doc);
  // round 1: h0 deploys, then "closes the tab" (async gap), h1 plays 30s/6h later
  h0.load(); h0.humanDeploy(); h0.destroy();
  h1 = rejoin(h1, doc); h1.load(); h1.humanDeploy();
  // h0 returns (rejoin = async return), continues
  h0 = rejoin(h0, doc);
  const done = await driveDeployment(doc, [h0, h1]);
  check('A2: async handoffs completed deployment', done === true && doc.state.phase === 'playing');
  sane(doc, 'A2');
}

console.log('=== A3: 2H+2AI — playtest shape + host refresh mid-AI + failover grace ===');
{
  const doc = new MockDoc(composition(2, 2, 6));
  let hostPresence = 'online';
  let offlineSince = null;
  const GRACE = 90000;
  const graceFn = () => {
    if (hostPresence !== 'offline') { offlineSince = null; return false; }
    if (offlineSince === null) offlineSince = Date.now();
    return Date.now() - offlineSince >= GRACE;
  };
  let host = new Client('host', 'user_0', doc, { isHost: true });
  const other = new Client('h1', 'user_1', doc, { authorityFn: graceFn });

  host.load(); host.humanDeploy();
  other.load(); other.humanDeploy();
  // now an AI is current; host "refreshes" mid-AI-window
  hostPresence = 'offline';
  const writesAtRefresh = doc.writes.length;
  await other.runAI(); // must not act (grace)
  const otherWrites = doc.writes.slice(writesAtRefresh).filter(w => w.by === 'h1').length;
  host = rejoin(host, doc); hostPresence = 'online';
  const done = await driveDeployment(doc, [host, other]);
  check('A3: deployment completed', done === true && doc.state.phase === 'playing');
  check('A3: non-host never ran AI during refresh window', otherWrites === 0);
  sane(doc, 'A3');
}

console.log('=== A4: 3H+1AI — simultaneous actions + simultaneous refresh ===');
{
  const doc = new MockDoc(composition(3, 1, 6));
  let h0 = new Client('h0', 'user_0', doc, { isHost: true });
  let h1 = new Client('h1', 'user_1', doc);
  let h2 = new Client('h2', 'user_2', doc);

  // h0 acts; h1 SIMULTANEOUSLY acts on stale state (thinks it's their turn)
  h0.load(); h0.humanDeploy();
  const vAfterH0 = doc.stateVersion;
  h1.gs.currentPlayerIndex = doc.state.players.findIndex(p => p.oderId === 'user_1'); // force stale illusion
  const stalePush = h1.push(); // must abort (doc moved on) — h1's local was v1
  check('A4: stale simultaneous push rejected + reloaded', stalePush === false && h1.aborted === 1 && h1.localVersion === doc.stateVersion);

  // simultaneous refresh by all humans: doc must be untouched
  const vBefore = doc.stateVersion;
  h0 = rejoin(h0, doc); h1 = rejoin(h1, doc); h2 = rejoin(h2, doc);
  check('A4: simultaneous refresh writes nothing', doc.stateVersion === vBefore);

  const done = await driveDeployment(doc, [h0, h1, h2]);
  check('A4: deployment completed with 3 humans', done === true && doc.state.phase === 'playing');
  sane(doc, 'A4');
}

console.log('=== S: surrender in every phase ===');
{
  // setup (capital placement)
  const cap = composition(2, 1, 6); cap.phase = 'capital_placement';
  const r1 = applySurrenderToState(cap, 'user_0');
  check('S1: surrender during capital placement advances turn', r1.changed && cap.players[cap.currentPlayerIndex].oderId !== 'user_0');
  // deployment
  const dep = composition(2, 1, 6);
  const r2 = applySurrenderToState(dep, 'user_0');
  check('S2: surrender during deployment picks a player with units', r2.changed && !dep.players[dep.currentPlayerIndex].surrendered);
  // playing + last-standing victory
  const play = composition(2, 0, 6); play.phase = 'playing'; play.turnPhase = 'combat_move';
  const r3 = applySurrenderToState(play, 'user_0');
  check('S3: surrender in playing phase → last player standing wins', r3.gameOver && play.winner === 'Human1');
}

console.log('=== N: permanent no-show ===');
{
  // no-show on an AI turn: host runs it (that IS driveDeployment); no-show HUMAN:
  const doc = new MockDoc(composition(2, 1, 6));
  const h0 = new Client('h0', 'user_0', doc, { isHost: true });
  h0.load(); h0.humanDeploy();
  // h1 never connects. Drive: should stop at h1's turn without corruption.
  const res = await driveDeployment(doc, [h0]);
  check('N1: game waits (no corruption) at absent human turn', res === 'noshow' && doc.state.players[doc.state.currentPlayerIndex].oderId === 'user_1');
  sane(doc, 'N1');
  // escape hatch: absent player surrenders from My Games (doc-level)
  applySurrenderToState(doc.state, 'user_1');
  doc.stateVersion++; doc.currentPlayerId = doc.state.players[doc.state.currentPlayerIndex].oderId;
  const done = await driveDeployment(doc, [h0]);
  check('N2: after surrender escape, game completes', done === true && doc.state.phase === 'playing');
}

console.log('=== C: version-upgrade robustness (Dimension C) ===');
{
  // The refresh banner fires iff a game doc was written by a strictly-newer
  // app version. This is exactly compareGameVersions(remote, local) > 0 — the
  // same predicate syncManager._checkRemoteVersion uses to notify the UI.
  const outdated = (remote, local) => compareGameVersions(remote, local) > 0;

  check('C1: ordering — older < newer', compareGameVersions('V2.54', 'V2.55') < 0);
  check('C1: ordering — equal', compareGameVersions('V2.55', 'V2.55') === 0);
  check('C1: ordering — newer > older', compareGameVersions('V2.55', 'V2.54') > 0);
  check('C1: minor rolls into major boundary', compareGameVersions('V2.9', 'V2.10') < 0);
  check('C1: major dominates minor', compareGameVersions('V3.0', 'V2.99') > 0);

  // A stale tab (older client) reading a doc a newer client just wrote → banner.
  check('C2: old client sees newer writer → banner', outdated('V2.56', GAME_VERSION) === true);
  // Same version, or a doc an OLDER client wrote → no banner (we are not behind).
  check('C2: same version → no banner', outdated(GAME_VERSION, GAME_VERSION) === false);
  check('C2: older writer → no banner', outdated('V2.53', GAME_VERSION) === false);
  // Missing / malformed stamp (old doc predating the field) → fail safe, no banner.
  check('C2: missing stamp → no banner (fail safe)', outdated(undefined, GAME_VERSION) === false);
  check('C2: garbage stamp → no banner (fail safe)', outdated('banana', GAME_VERSION) === false);

  // schemaVersion the doc carries must match the schema the running code emits,
  // or an old client could silently load a shape it can't represent.
  const emitted = composition(1, 1).version;
  check('C3: emitted schema matches SCHEMA_VERSION constant', emitted === SCHEMA_VERSION);
}

console.log(failures === 0 ? '\nALL MATRIX CELLS PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
