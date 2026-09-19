#!/usr/bin/env node
/**
 * Arc / admin reader for the append-only cloud game log.
 *
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{...}' node tools/pull-game-events.mjs --joinCode ABC123
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{...}' node tools/pull-game-events.mjs --gameId game_… --turn 4
 *
 * Fail-closed: exits 2 if the secret is missing or unparseable.
 * Never invents keys. Admin SDK bypasses Firestore rules.
 *
 * Filters: --gameId --joinCode --lobbyName --turn --territory --playerId
 *          --kind --since --until --limit
 *
 * Primary path: resolve gameId from games.lobbyCode / games.lobbyName / id,
 * then read games/{id}/events orderBy ts. Collection-group is a fallback
 * when the game doc cannot be resolved (needs deployed indexes).
 */

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const EXIT_NO_SECRET = 2;
const EXIT_USAGE = 3;
const EXIT_NOT_FOUND = 4;
const EXIT_QUERY = 5;

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const out = { limit: 400 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      out[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) {
      out[a.slice(2)] = true;
    }
  }
  if (out.limit) out.limit = Math.min(5000, Math.max(1, Number(out.limit) || 400));
  if (out.turn) out.turn = Number(out.turn);
  if (out.since) out.since = Date.parse(out.since) || Number(out.since);
  if (out.until) out.until = Date.parse(out.until) || Number(out.until);
  return out;
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) {
    console.error('FAIL CLOSED: FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    console.error('Inject the Firebase Admin service-account JSON as that env var.');
    console.error('Do not invent keys. This script will not run without the secret.');
    process.exit(EXIT_NO_SECRET);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.error('FAIL CLOSED: service account JSON missing project_id / client_email / private_key.');
      process.exit(EXIT_NO_SECRET);
    }
    return parsed;
  } catch (err) {
    console.error('FAIL CLOSED: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    console.error(err.message);
    process.exit(EXIT_NO_SECRET);
  }
}

function usage() {
  console.log(`Usage:
  FIREBASE_SERVICE_ACCOUNT_JSON='{...}' node tools/pull-game-events.mjs [filters]

Filters:
  --gameId game_…          Firestore game document id
  --joinCode ABC123        6-char lobby / join code
  --lobbyName boysenberry  Lobby display name (substring, case-insensitive)
  --turn 4                 Round number
  --territory "Western Europe"
  --playerId germany
  --kind aa|combat|phase|move|ipc|losses|queue_exit|softlock_exit|client_error|rocket|tech
  --since 2026-09-19T17:30:00Z
  --until 2026-09-19T18:00:00Z
  --limit 400              Max events (default 400, cap 5000)
  --json                   Print JSON only (default is JSON)

See briefs/2026-09-19-tr-diagnostics/DIAGNOSTICS.md
`);
}

async function initAdmin(sa) {
  let admin;
  try {
    const require = createRequire(import.meta.url);
    admin = require('firebase-admin');
  } catch {
    try {
      admin = (await import('firebase-admin')).default;
    } catch {
      console.error('firebase-admin is not installed. From the repo root:');
      console.error('  npm install firebase-admin --no-save');
      console.error('The secret was present; only the Admin SDK package is missing.');
      process.exit(EXIT_QUERY);
    }
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id,
    });
  }
  return admin.firestore();
}

function dataOf(doc) {
  return { id: doc.id, ...doc.data() };
}

async function resolveGames(db, args) {
  if (args.gameId) {
    const snap = await db.collection('games').doc(args.gameId).get();
    if (!snap.exists) return [];
    return [{ id: snap.id, ...snap.data() }];
  }
  if (args.joinCode) {
    const code = String(args.joinCode).toUpperCase();
    const byCode = await db.collection('games').where('lobbyCode', '==', code).get();
    if (!byCode.empty) return byCode.docs.map(dataOf);
    const byCode2 = await db.collection('games').where('code', '==', code).get();
    return byCode2.docs.map(dataOf);
  }
  if (args.lobbyName) {
    const needle = String(args.lobbyName).toLowerCase();
    const named = await db.collection('games').where('lobbyName', '==', args.lobbyName).get();
    if (!named.empty) return named.docs.map(dataOf);
    // Fallback: scan recent games (no composite required). Cap 200.
    const recent = await db.collection('games').orderBy('updatedAt', 'desc').limit(200).get();
    return recent.docs.map(dataOf).filter((g) => {
      const name = String(g.lobbyName || g.lobbyData?.name || g.name || '').toLowerCase();
      return name.includes(needle);
    });
  }
  return [];
}

function matchEvent(ev, args) {
  if (args.turn != null && Number.isFinite(args.turn) && Number(ev.turn) !== args.turn) return false;
  if (args.territory && String(ev.territory || '') !== args.territory) return false;
  if (args.playerId && String(ev.playerId || '') !== args.playerId) return false;
  if (args.kind && String(ev.kind || '') !== args.kind) return false;
  if (args.joinCode && String(ev.joinCode || '').toUpperCase() !== String(args.joinCode).toUpperCase()) return false;
  if (Number.isFinite(args.since) && Number(ev.ts) < args.since) return false;
  if (Number.isFinite(args.until) && Number(ev.ts) > args.until) return false;
  return true;
}

async function pullEventsForGame(db, gameId, args) {
  const snap = await db.collection('games').doc(gameId)
    .collection('events')
    .orderBy('ts', 'desc')
    .limit(args.limit)
    .get();
  return snap.docs.map(dataOf).filter((ev) => matchEvent(ev, args));
}

async function pullCollectionGroup(db, args) {
  let q = db.collectionGroup('events');
  if (args.joinCode) q = q.where('joinCode', '==', String(args.joinCode).toUpperCase());
  else if (args.lobbyName) q = q.where('lobbyName', '==', args.lobbyName);
  else if (args.gameId) q = q.where('gameId', '==', args.gameId);
  else return [];
  q = q.orderBy('ts', 'desc').limit(args.limit);
  const snap = await q.get();
  return snap.docs.map(dataOf).filter((ev) => matchEvent(ev, args));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (!args.gameId && !args.joinCode && !args.lobbyName) {
    usage();
    process.exit(EXIT_USAGE);
  }

  const sa = loadServiceAccount();
  const db = await initAdmin(sa);

  let games = [];
  try {
    games = await resolveGames(db, args);
  } catch (err) {
    console.error('Game lookup failed:', err.message);
    process.exit(EXIT_QUERY);
  }

  let events = [];
  let source = 'games/{id}/events';
  if (games.length) {
    for (const game of games) {
      const rows = await pullEventsForGame(db, game.id, args);
      events.push(...rows.map((ev) => ({ ...ev, _gameId: game.id })));
    }
  } else {
    try {
      events = await pullCollectionGroup(db, args);
      source = 'collectionGroup(events)';
    } catch (err) {
      console.error('No game doc matched, and collection-group fallback failed.');
      console.error(err.message);
      console.error('Deploy firestore.indexes.json or pass --gameId.');
      process.exit(EXIT_NOT_FOUND);
    }
    if (!events.length) {
      console.error('No game or events matched the filters.');
      process.exit(EXIT_NOT_FOUND);
    }
  }

  events.sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));

  const { EVENT_SCHEMA_VERSION } = await import(
    pathToFileURL(join(root, 'src/diagnostics/eventSchema.js'))
  );

  const report = {
    pulledAt: new Date().toISOString(),
    source,
    schema: EVENT_SCHEMA_VERSION,
    filters: {
      gameId: args.gameId || null,
      joinCode: args.joinCode || null,
      lobbyName: args.lobbyName || null,
      turn: args.turn ?? null,
      territory: args.territory || null,
      playerId: args.playerId || null,
      kind: args.kind || null,
      since: args.since || null,
      until: args.until || null,
    },
    games: games.map((g) => ({
      id: g.id,
      lobbyCode: g.lobbyCode || g.code || null,
      lobbyName: g.lobbyName || g.lobbyData?.name || null,
      status: g.status || null,
      clientVersion: g.clientVersion || null,
    })),
    count: events.length,
    events,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(EXIT_QUERY);
});
