// V2.81.55 diagnostics: shared d6 roller + append-only event log.
// Run: node tools/test-diagnostics.mjs

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const {
  createDiceRoller,
  rollD6,
  faceFromUnit,
  getSharedRoller,
} = await import(pathToFileURL(join(root, 'src/diagnostics/diceRoller.js')));
const {
  EVENT_KINDS,
  EVENT_SCHEMA_VERSION,
  EVENT_RETENTION_CAP,
  normalizeEvent,
  isKnownEventKind,
} = await import(pathToFileURL(join(root, 'src/diagnostics/eventSchema.js')));
const {
  createEventLog,
  eventLog,
  emitGameEvent,
} = await import(pathToFileURL(join(root, 'src/diagnostics/eventLog.js')));
const {
  createCloudEventSink,
  shouldPruneAfterAppend,
  eventsCollectionPath,
} = await import(pathToFileURL(join(root, 'src/diagnostics/cloudEventSink.js')));
const {
  emitClientError,
  emitSoftlockExit,
  installClientErrorCapture,
} = await import(pathToFileURL(join(root, 'src/diagnostics/installClientErrorCapture.js')));
const { GameState } = await import(pathToFileURL(join(root, 'src/state/gameState.js')));

let failures = 0;
const check = (label, cond) => {
  if (!cond) { failures++; console.error('FAIL:', label); }
  else console.log('ok  :', label);
};

console.log('=== Version + schema ===');
check('GAME_VERSION is V2.81.55', GAME_VERSION === 'V2.81.55');
check('SCHEMA_VERSION stays 11 (event log is a subcollection, not state)', SCHEMA_VERSION === 11);
check('EVENT_SCHEMA_VERSION is 1', EVENT_SCHEMA_VERSION === 1);
check('retention cap is 5000', EVENT_RETENTION_CAP === 5000);

console.log('=== Shared d6 roller ===');
{
  const seq = [0, 0.16, 0.33, 0.5, 0.66, 0.99];
  let i = 0;
  const roller = createDiceRoller({ rng: () => seq[i++ % seq.length] });
  const faces = [roller.roll('aa'), roller.roll('combat'), roller.roll('bombard'),
    roller.roll('tech'), roller.roll('rocket'), roller.roll('sub')];
  check('deterministic rng maps to faces 1–6', faces.join(',') === '1,1,2,4,4,6');
  check('log records context + face', roller.getLog().length === 6
    && roller.getLog()[0].context === 'aa'
    && roller.getLog()[0].face === 1);
  check('faceFromUnit clamps', faceFromUnit(-1) === 1 && faceFromUnit(0.999) === 6);
  const sharedFace = rollD6('shared-test');
  check('shared rollD6 returns 1–6', sharedFace >= 1 && sharedFace <= 6);
  check('shared log is append-only', getSharedRoller().getLog().some((e) => e.context === 'shared-test'));
}

console.log('=== Event schema ===');
{
  const ev = normalizeEvent({
    kind: EVENT_KINDS.AA,
    rolls: [1, 1, 5],
    hits: 2,
    territory: 'Western Europe',
    wiped: true,
  }, { gameId: 'game_1', joinCode: 'ABC123', lobbyName: 'boysenberry', turn: 4, playerId: 'p1' });
  check('known kinds include required set',
    isKnownEventKind('phase') && isKnownEventKind('move') && isKnownEventKind('aa')
    && isKnownEventKind('combat') && isKnownEventKind('losses') && isKnownEventKind('ipc')
    && isKnownEventKind('queue_exit') && isKnownEventKind('softlock_exit')
    && isKnownEventKind('client_error'));
  check('normalize denormalizes query fields + faces',
    ev.v === 1 && ev.kind === 'aa' && ev.gameId === 'game_1'
    && ev.joinCode === 'ABC123' && ev.lobbyName === 'boysenberry'
    && ev.turn === 4 && ev.territory === 'Western Europe'
    && ev.playerId === 'p1' && ev.faces.join(',') === '1,1,5' && ev.hits === 2
    && ev.payload.wiped === true);
}

console.log('=== Event log append + sink ===');
{
  const written = [];
  const log = createEventLog({ maxLocal: 3 });
  log.bindContext({ gameId: 'game_x', joinCode: 'ZUJMNP', turn: () => 2 });
  log.attachSink((ev) => { written.push(ev); });
  log.append({ kind: 'phase', payload: { to: 'combat' } });
  log.append({ kind: 'move', territory: 'Berlin' });
  log.append({ kind: 'ipc', payload: { delta: -5 } });
  log.append({ kind: 'aa', faces: [1] });
  check('local ring drops oldest past cap', log.getLocal().length === 3
    && log.getLocal()[0].kind === 'move');
  check('sink received every append', written.length === 4
    && written[0].gameId === 'game_x'
    && written[0].joinCode === 'ZUJMNP'
    && written[0].turn === 2);
  check('sink errors do not throw', (() => {
    log.attachSink(() => { throw new Error('nope'); });
    log.append({ kind: 'client_error' });
    return true;
  })());
}

console.log('=== Cloud sink (mocked Firestore) ===');
{
  check('events path is games/{id}/events',
    eventsCollectionPath('game_9').join('/') === 'games/game_9/events');
  check('prune every 40 appends', shouldPruneAfterAppend(40) && !shouldPruneAfterAppend(39));
  const added = [];
  const sink = createCloudEventSink({
    db: { name: 'fake' },
    gameId: 'game_9',
    addDoc: async (col, ev) => { added.push({ col, ev }); },
    collection: (_db, ...path) => path.join('/'),
  });
  const result = await sink({ kind: 'aa', ts: 1 });
  check('addDoc writes the event', result.written === true && added[0].ev.kind === 'aa'
    && added[0].col === 'games/game_9/events');
  const missing = await createCloudEventSink({})({ kind: 'aa' });
  check('missing db/gameId fail-closed', missing.written === false && missing.reason === 'missing-db');
}

console.log('=== Client error + soft-lock capture ===');
{
  eventLog.reset();
  emitClientError('window.onerror', new Error('boom'), { filename: 'x.js' });
  emitSoftlockExit('push_exhausted', { attemptedVersion: 12 });
  const kinds = eventLog.getLocal().map((e) => e.kind);
  check('client_error + softlock_exit recorded',
    kinds.includes('client_error') && kinds.includes('softlock_exit'));
  const target = {
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener(type) { delete this.listeners[type]; },
  };
  const uninstall = installClientErrorCapture(target);
  target.listeners.error({ message: 'paint fail' });
  check('window error listener emits',
    eventLog.getLocal().some((e) => e.payload?.source === 'window.onerror'));
  uninstall();
}

console.log('=== GameState roller + events ===');
{
  eventLog.reset();
  const gs = new GameState({ risk: { factions: [] } }, [], []);
  gs.round = 3;
  gs.turnPhase = 'combat';
  gs.players = [{ id: 'p1', name: 'Sean' }];
  gs.currentPlayerIndex = 0;
  gs.playerState = { p1: { ipcs: 40 }, p2: { ipcs: 12 } };
  const face = gs._rollDie('aa');
  check('_rollDie returns 1–6 via shared roller', face >= 1 && face <= 6);
  check('getRollLog still works', gs.getRollLog().some((e) => e.context === 'aa'));
  gs._changeIPCs('p1', -5, 'purchase', { unitType: 'infantry' });
  check('IPC helper records delta', gs.playerState.p1.ipcs === 35
    && eventLog.getLocal().some((e) => e.kind === 'ipc' && e.payload?.delta === -5));
  gs.recordCombatTelemetry({
    kind: 'aa',
    territory: 'Western Europe',
    hits: 2,
    rolls: [1, 1, 5],
    wiped: true,
  });
  const aa = eventLog.getLocal().find((e) => e.kind === 'aa' && e.territory === 'Western Europe');
  check('recordCombatTelemetry emits aa faces',
    aa && aa.faces.join(',') === '1,1,5' && aa.payload.wiped === true);
}

console.log('=== Roll sites do not call Math.random ===');
{
  const combatUI = readFileSync(join(root, 'src/ui/combatUI.js'), 'utf8');
  const gameState = readFileSync(join(root, 'src/state/gameState.js'), 'utf8');
  const rollD6Fn = combatUI.match(/_rollD6\(context = 'combat'\) \{[\s\S]*?\n  \}/)[0];
  const bombardFn = combatUI.match(/_fireBombardment\(\) \{[\s\S]*?this\.combatState\.bombardmentFired/)[0];
  const subFn = combatUI.match(/_rollSubmarineFirstStrike\(\) \{[\s\S]*?submarineFirstStrikeFired = true/)[0];
  const rollDieFn = gameState.match(/_rollDie\(context = 'combat'\) \{[\s\S]*?\n  \}/)[0];
  const rocketFn = gameState.match(/\/\/ Roll for damage[\s\S]*?this\._changeIPCs\(targetOwner/)[0];
  check('_rollD6 uses shared roller, not Math.random',
    /rollD6\(/.test(rollD6Fn) && !/Math\.random/.test(rollD6Fn));
  check('bombard uses _rollD6',
    /_rollD6\('bombard'\)/.test(bombardFn) && !/Math\.random/.test(bombardFn));
  check('sub first strike uses _rollD6',
    /_rollD6\('sub:attack'\)/.test(subFn) && /_rollD6\('sub:defense'\)/.test(subFn)
    && !/Math\.random/.test(subFn));
  check('_rollDie uses rollD6', /rollD6\(/.test(rollDieFn) && !/Math\.random/.test(rollDieFn));
  check('rocket damage uses _rollDie', /_rollDie\('rocket'\)/.test(rocketFn) && !/Math\.random/.test(rocketFn));
}

console.log('=== Firestore rules + indexes ===');
{
  const rules = readFileSync(join(root, 'firestore.rules'), 'utf8');
  const indexes = JSON.parse(readFileSync(join(root, 'firestore.indexes.json'), 'utf8'));
  check('events subcollection is append-only (no update)',
    /match \/events\/\{eventId\}/.test(rules)
    && /allow update: if false/.test(rules)
    && /allow create: if request\.auth != null/.test(rules));
  const fields = new Set();
  for (const idx of indexes.indexes || []) {
    for (const f of idx.fields || []) fields.add(f.fieldPath);
  }
  check('indexes cover joinCode/lobbyName/gameId/turn/territory/playerId/ts',
    ['joinCode', 'lobbyName', 'gameId', 'turn', 'territory', 'playerId', 'ts']
      .every((f) => fields.has(f)));
}

console.log('=== Admin pull script fail-closed ===');
{
  const result = spawnSync(process.execPath, [join(root, 'tools/pull-game-events.mjs'), '--joinCode', 'ABC123'], {
    env: { ...process.env, FIREBASE_SERVICE_ACCOUNT_JSON: '' },
    encoding: 'utf8',
  });
  check('missing secret exits 2', result.status === 2
    && /FAIL CLOSED/.test(result.stderr));
  const bad = spawnSync(process.execPath, [join(root, 'tools/pull-game-events.mjs'), '--joinCode', 'ABC123'], {
    env: { ...process.env, FIREBASE_SERVICE_ACCOUNT_JSON: '{not-json' },
    encoding: 'utf8',
  });
  check('invalid JSON exits 2', bad.status === 2);
  const incomplete = spawnSync(process.execPath, [join(root, 'tools/pull-game-events.mjs'), '--joinCode', 'ABC123'], {
    env: { ...process.env, FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"x"}' },
    encoding: 'utf8',
  });
  check('incomplete service account exits 2', incomplete.status === 2);
}

console.log(failures === 0 ? '\nALL DIAGNOSTICS CHECKS PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
