# Arc workflow scorecard — cloud diagnostics

Use this after James drops a screenshot. Goal is diagnose-from-log, not guess.

| Step | Pass? | Notes |
| --- | --- | --- |
| 1. Screenshot has join code / lobby name / time |  | e.g. boysenberry, ~10:34 PT |
| 2. `FIREBASE_SERVICE_ACCOUNT_JSON` injected (real secret) |  | Fail-closed without it — do not invent keys |
| 3. `node tools/pull-game-events.mjs --joinCode …` returns events |  | Or `--lobbyName` / `--gameId` |
| 4. Filter to the moment (`--since` / `--turn` / `--territory`) |  | |
| 5. AA/combat events include **dice faces** |  | `faces: [1,1,5]` not just hit counts |
| 6. IPC deltas explain reported swings |  | `kind=ipc` before/after/reason |
| 7. Queue / soft-lock exits present if overlay stuck |  | `queue_exit` / `softlock_exit` |
| 8. Client errors if sync died |  | `client_error` / `push_exhausted` |
| 9. Patch + unit test + GAME_VERSION bump |  | Additive schema only |
| 10. Draft PR — do not merge |  | James product gate |

## Scoring

- **5/5** — events for that game/moment exist, faces + IPC + exits, fix is evidenced.
- **3/5** — game resolved but events sparse (old client, pre-V2.81.55).
- **1/5** — no secret / no game doc / empty events. Stop; do not invent a diagnosis.

Live V2.81.54 and older have `combatTelemetry` (last 40) on the game doc
only. Use that as a fallback dump when `events` is empty.

Tesla off. Hybrid PR68 / Three polish branches untouched.
