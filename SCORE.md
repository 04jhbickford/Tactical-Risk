# SCORE — V2.81.55 cloud game-log + diagnostics

Draft PR. Not production. SCHEMA 11 unchanged (events are a subcollection).

## James want

Screenshot → Arc pulls cloud events for that game/moment → verify where
in play it happened → diagnose/fix.

## Delivered

| Ask | Score | Notes |
|---|---|---|
| Append-only `games/{id}/events` | **yes** | Fail-closed fire-and-forget `addDoc` |
| Fields ts/turn/phase/player/kind/territory/payload | **yes** | Plus turnPhase, writerUid, clientVersion, eventSchema, lobbyCode |
| Instrument meaningful paths | **yes** | phase, move/attack, AA/combat (via `_rollDie` + telemetry), purchase, retreat, dequeue, soft-lock exits, cheap uncaught errors, UI leftovers |
| Keep `combatTelemetry` | **yes** | Still last 40 on the game doc; events are the fuller timeline. AI `resolveCombat` now also records telemetry |
| Lookup helpers | **yes** | `tools/query-game-events.mjs`, `parseScreenshotHint`, `describeEventQuery`, `window.__TR_DIAG__` |
| DIAGNOSTICS.md | **yes** | Schema, Arc pull, screenshot workflow, retention |
| Rules: append own / admin read | **yes** | Seated or `startedBy` create; admin-only read; no update/delete |
| Version + this scorecard | **yes** | `V2.81.55` patch. SCHEMA 11 |

## Out of scope (held)

- Merge to main
- Three.js hybrid / PR68
- Inventing Firebase admin keys / service accounts
- Cloud Function retention sweeper

## Gaps

- Live Arc pull still needs James’s admin ID token (documented; not invented).
- Event orphans after `deleteDoc(game)` until an admin recursive delete.
- Solo/hotseat does not write cloud events (no `gameId`).
- `buy-max` emits one `purchase` event per unit (accurate, chatty).
