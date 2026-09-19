# Cloud game log + diagnostics (V2.81.55)

James product YES via Arc. Screenshot → pull events for that game/moment → diagnose + fix.

Tesla branding stays off. Hybrid PR68 / Three preview art are untouched.

## What landed

Append-only events at `games/{gameId}/events`. Schema version **1**
(`EVENT_SCHEMA_VERSION` in `src/diagnostics/eventSchema.js`). This is **not**
a `SCHEMA_VERSION` bump — serialized game state stays **SCHEMA 11**. New
fields on the game doc (`lobbyName`, `lobbyData.name`) are additive.

Every scored d6 goes through `src/diagnostics/diceRoller.js` (`rollD6` /
`GameState._rollDie`). Combat UI AA, bombard, sub first-strike, regular
combat, tech, and rocket damage no longer call `Math.random()` for scored
faces. Cosmetic animation flicker (rolling dice sprites) still uses
`Math.random` and is **not** logged.

`combatTelemetry` from V2.81.54 (last 40 AA/combat snapshots on the game
doc) is unchanged and still the cheap in-doc dump.

## Event kinds

| kind | when |
| --- | --- |
| `phase` | `nextPhase` / `nextTurn` |
| `move` | successful `moveUnits` |
| `aa` | AA volley (faces + hits + wipe) |
| `combat` | combat / bombard / sub-strike dice |
| `losses` | AA or combat casualties applied |
| `ipc` | any IPC delta (buy, income, rocket, capital, cards) |
| `queue_exit` | combat-queue head dequeued as already resolved |
| `softlock_exit` | AA wipe fail-close, or `push_exhausted` resync |
| `client_error` | `window.onerror`, unhandledrejection, `push_failed` |
| `rocket` | rocket d6 + IPC damage |
| `tech` | research dice faces |

Each document denormalizes query fields at the root:

`v, kind, ts, gameId, lobbyName, joinCode, turn, turnPhase, territory, playerId, faces?, hits?, payload, seq`

## Retention

**Last 5000 events per game.** Writing clients prune oldest docs every 40
appends (or once the count is over the cap). Documented alternative (not
used): 14-day TTL. Pick is the 5k cap so a long weekend playtest still
has the boysenberry-style AA dump.

## How Arc pulls events (screenshot → log)

1. Read the screenshot: join code / lobby name (e.g. `boysenberry`),
   approximate time, turn/phase, territory, who was moving.
2. Inject the **real** Admin secret. Do not invent keys.

```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='<service account JSON>'
# optional: npm install firebase-admin --no-save
node tools/pull-game-events.mjs --joinCode BOYSEN
node tools/pull-game-events.mjs --lobbyName boysenberry --since 2026-09-19T17:30:00Z
node tools/pull-game-events.mjs --gameId game_123 --turn 4 --territory "Western Europe"
node tools/pull-game-events.mjs --joinCode ABC123 --kind aa --playerId germany
```

3. The script **fails closed** (exit 2) if `FIREBASE_SERVICE_ACCOUNT_JSON`
   is missing, not JSON, or missing `project_id` / `client_email` /
   `private_key`.
4. Primary query: resolve `games` by `lobbyCode` / `lobbyName` / id, then
   `games/{id}/events` `orderBy ts desc`. Collection-group fallback uses
   the indexes in `firestore.indexes.json` (joinCode, lobbyName, gameId,
   turn, territory, playerId + timestamp).
5. Diagnose from `kind=aa|combat` faces, `ipc` deltas, `queue_exit` /
   `softlock_exit`, and `client_error`. Then patch.

Without the secret, this environment cannot read live games. The script
and this brief are the contract.

## Indexes (Arc / Admin)

`firestore.indexes.json` is no longer empty. Added composites for:

- collection `events`: `turn+ts`, `territory+ts`, `playerId+ts`, `kind+ts`
- collection group `events`: `joinCode+ts`, `lobbyName+ts`, `gameId+ts`,
  `playerId+ts`, `territory+ts`

Live clients still only `addDoc` and prune with single-field `orderBy ts`.
They do not use compound inequality filters.

## Rules

`games/{id}/events/{eventId}`: authenticated create + read + delete;
**update is denied** (append-only). Admin SDK bypasses rules.

## Files

- `src/diagnostics/diceRoller.js`
- `src/diagnostics/eventSchema.js`
- `src/diagnostics/eventLog.js`
- `src/diagnostics/cloudEventSink.js`
- `src/diagnostics/bindBrowserSink.js`
- `src/diagnostics/installClientErrorCapture.js`
- `tools/pull-game-events.mjs`
- `tools/test-diagnostics.mjs`

## Preview / test notes

No visual HUD change. No Hybrid / Three art. Tesla off.

```bash
node tools/test-diagnostics.mjs
node tools/test-combat-ui.mjs
node tools/test-mp-turn-sync.mjs
```

Playtest: start a MP lobby, fight one AA combat, then
`node tools/pull-game-events.mjs --joinCode <code> --kind aa` (with the
secret) and confirm faces are present.
