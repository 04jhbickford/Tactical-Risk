# Tactical Risk — Bug & Debug Log

---

## 7.21.26 — V2.55 robustness audit (compositions × play modes × version upgrades)

Systematic audit against `ROBUSTNESS_MATRIX.md`, backed by an executable
N-client harness (`tools/robustness-harness.mjs`, 33 checks, all green).

### Dimension C (version upgrade) — NEW capability, not a bug fix

Mid-game redeploys previously had no signal: a tab left open across a deploy
kept running old code with no prompt to refresh. Added:

- `src/version.js` — dependency-free `GAME_VERSION` / `SCHEMA_VERSION` /
  `compareGameVersions` (fail-safe: a missing or malformed stamp never prompts).
- Every game-doc push now stamps `clientVersion` + `schemaVersion`. Old clients
  ignore the extra doc-level fields; state schema (v11) is unchanged.
- On loading a doc written by a strictly-newer client, syncManager fires a
  one-shot `version_outdated` event → main.js shows a persistent, dismissible
  "refresh to update" banner. Non-blocking on purpose: an async player mid-turn
  must still be able to finish.

### Bug (surfaced during the audit) — lobby init crash

Extracting the version constant into `src/version.js` and re-exporting it from
`lobby.js` via a bare `export { GAME_VERSION } from '../version.js'` left the
name undefined *inside* lobby.js, so `_renderMainMenu` threw
`GAME_VERSION is not defined` and init aborted. Fixed by importing locally and
re-exporting. Caught by in-browser verification (would have broken every load).

### Refactor

Pure surrender transform extracted to `src/multiplayer/surrenderCore.js` (no
Firebase imports) so the harness exercises the exact live-session logic.

---

## 7.20.26 — V2.53 playtest (2 humans + 2 easy AI) → fixed in V2.54

### Bug 2 (deployment turn-stuck) — ROOT CAUSE

Robert (host) refreshed his tab mid-game. `presenceManager` DELETES the
presence doc on unload, and `getPlayerPresence` treats a missing doc as
instantly OFFLINE — so Bastion's client saw "host offline" for the few
seconds of the refresh, seized AI authority via the V2.52 host-failover,
and BOTH clients ran the AI deployment turns concurrently. The V2.49
transactions prevented same-version clobber but the two runners
interleaved semantically divergent states: the turn rewound
(doc currentPlayerId=British-AI vs state currentPlayerIndex=0/Bastion in
the debug dump), and a racing client that transiently computed
phase=PLAYING ran tech→purchase AI logic, pushing the impossible
`phase=unit_placement + turnPhase=purchase` combination that wedged the
game. (Presence rules only started working in V2.51's deploy — this
failover path had never fired in a real game before this playtest.)

Fixes (V2.54):
1. Failover requires the host to be CONTINUOUSLY offline for 90s before
   takeover (refresh windows no longer trigger it), with clear toasts on
   takeover and on returning control.
2. AIController re-checks authority BETWEEN actions and aborts a
   mid-run AI turn the moment authority is lost.
3. `nextPhase()` refuses to run outside the PLAYING phase (turnPhase
   corruption structurally impossible).
4. `loadFromJSON` normalizes invalid phase/turnPhase combinations —
   the currently wedged live game self-heals on next load+push.
5. Same-version snapshots with a different currentPlayerId now load the
   doc state (doc is authoritative) instead of only flipping the cached
   flag.
- Verified by a 2-client race harness (real GameState+AIController vs a
  mock transactional doc, 11/11 assertions): host-refresh no longer
  hands over authority; under forced instant-takeover contention the
  second writer lands ZERO writes (7 transaction aborts); corrupted docs
  normalize on load.

### Bug 1 — game missing from My Games before start

A pre-start game exists only as a `waiting` LOBBY doc; My Games queried
only the `games` collection. Fixed: My Games now shows a "Waiting to
start" section with lobbies you're a member of; tapping one returns you
to that lobby.

### Bug 3 — sidebar said one player, state said another

Two contributors: (a) the sidebar trusted the cached `isActivePlayer`
flag OR'd with the state check, so it could disagree with what the guard
actually allowed; now both use the identical live state check.
(b) The same-version/different-player snapshot case updated the flag
without loading state (see fix 5 above). ("Sean" vs "Bastion" is the
same person — account display name vs table name; the debug dump's
state was authoritative and consistent with the HUD.)

---

---

## 7.14.26 — V2.52 pass-and-play / save-state / multiplayer-mode audit

Systematic audit of all play modes and their combinations. Findings:

### Mode support matrix (verified against code)

| Mode | Supported? | Notes |
|---|---|---|
| Pure pass-and-play (1 device, 2+ humans, optional AI) | ✅ | Handoff overlay on every human→human transition (V2.51); localStorage autosave + lobby "My Games → Continue" resume |
| Pure online, live | ✅ | Firestore sync, presence indicators, host runs AI, host-failover if host offline |
| Pure online, async | ✅ | State persists in Firestore indefinitely; rejoin via My Games / Open Games; NEW: tab title flags "● Your turn" for backgrounded tabs |
| Mixed (hotseat pair + remote players) | ❌ by design | One signed-in account = one player; the multiplayer lobby has no "add local player" option, so the scenario cannot be constructed — it fails safely by being unofferable, not silently. Roadmapped in PHASE_4_PLAN.md |
| Reconnect / resume online | ✅ | Rejoin loads latest Firestore state; presence shows the player again; NEW: "X is back online / went offline" toasts |

### Real gaps found and FIXED in V2.52

1. **Online games clobbered the hotseat autosave.** `gameState.autoSave()`
   had no multiplayer guard, so every online turn overwrote the local
   autosave slot — and "My Games → Continue" would then load a broken
   half-multiplayer state with no sync manager. Fixed: autosave is now
   local-games-only (online persistence is Firestore's job).
2. **Setup phases never autosaved.** Autosave only ran on nextTurn/nextPhase
   (playing phase), so a hotseat game closed during capital placement or
   deployment was silently lost despite the resume UI existing. Fixed:
   `placeCapital` and `finishPlacementRound` now autosave.
3. **No async-turn awareness.** A backgrounded/async player had no signal
   it was their turn without switching to the tab. Fixed: browser tab title
   becomes "● Your turn — Tactical Risk" while it's your turn (reset on
   turn end / exit / auth error). Push/email notifications roadmapped.
4. **No connect/disconnect visibility.** Presence dots existed (and only
   work as of the V2.51 rules deploy) but transitions were silent. Fixed:
   "X is back online" / "X went offline" toasts for other players.

### Audit answers with no code change needed

- **Handoff overlay context**: fires only when `!isMultiplayer` and ≥2
  human players — verified in V2.51 (fires per human→human transition in
  hotseat incl. setup phases; never in online or vs-AI games). The
  mixed-device ordering question is moot while mixed mode is unsupported.
- **Mid-turn refresh (online)**: phase/turn transitions push immediately
  (`pushStateNow`); fine-grained actions debounce 100ms, so at most the
  final click before a hard-close is lost. Rejoin restores the latest
  pushed state and correct turn.
- **Write races**: `_doPush` runs in a Firestore transaction — a stale
  client's push aborts and triggers a state reload (V2.49, re-verified).
  Two clients cannot both win the same version number.
- **Stall behavior — documented, not changed**: async games have no turn
  timer (hang forever by design until someone acts; Leave/surrender and
  admin delete are the escape hatches). Live human disconnect mid-turn
  blocks the game until they return (host-failover only covers AI turns).
  Turn timers / skip-votes are roadmapped in PHASE_4_PLAN.md. Hotseat
  idle: no timeout, intentionally.

---

Running list of playtest debug rounds. Newest first. Status values:
**OPEN** / **FIXED (pending live verification)** / **VERIFIED**.

---

## 7.11.26 — V2.46 playtest (2x human, 2x easy AI)

Short round — did not get past deployment.

### Bugs

1. **Open Games is not showing the current game** (though it shows under
   'Your Games'). — reported by Robert
   - Status: **FIXED (pending live verification)**
   - Root cause: the Open Games browser only queries lobbies with
     `status == 'waiting'`. Once a game starts, the lobby flips to
     `'starting'` and disappears from the list entirely. Games in progress
     were only reachable via the separate "My Games" screen.
   - Fix: Open Games now shows a "Your games in progress" section listing
     the player's own active/starting games with a Resume action
     (`multiplayerLobby.js` + `lobbyManager.getMyActiveGames()`).

2. **Unable to get past deployment: game state keeps reverting to a single
   player's turn repeating.** Sequence: Sean capital → Robert capital →
   Sean deployment 1 → Robert deployment 1 → Benson (AI) skipped, back to
   Robert. — reported by Robert/Sean
   - Status: **FIXED (pending live verification)**
   - Root causes (several compounding):
     a. `main.js` created an **AIController on every client**, not just the
        host (`shouldInitAI || hasAIPlayers`). Both human clients tried to
        play Benson's turn.
     b. `multiplayerGuard` used a **cached** `isActivePlayer` flag that lags
        the real turn by the push debounce + network round-trip, so the
        non-host client's AI run was NOT blocked during that window. Two
        clients pushed conflicting states, each stamped `localVersion + 1`,
        clobbering each other → turn reverts/loops.
     c. `syncManager._doPush` blind-wrote with `updateDoc`, so a stale
        client could overwrite a newer remote state.
     d. The prior V2.46 worktree fixes (live-oderId guard, deployment
        skip-loop, `pushStateNow`) were **never merged to main**, so the
        deployed build still had the old bugs.
     e. Committed `main.js` called `playerPanel.setWaitingForSync()`, which
        only existed in an uncommitted diff → TypeError when ending the
        income phase in multiplayer on the deployed build.
   - Fixes: host-only AIController; live oderId turn check in the guard;
     transaction-guarded pushes that refuse to clobber newer state;
     immediate (non-debounced) push on phase/turn transitions; deployment
     round skip-loop; `setWaitingForSync` + missing auth methods
     implemented and committed together.

### Additional defects found during the V2.49 end-to-end audit

4. **Presence (online indicators) never worked.** Presence docs are written
   to the `games/{id}/presence/{userId}` subcollection but firestore.rules
   only covered a top-level `/presence` collection — every write was
   silently denied. Fixed with a subcollection rule. Also: game-doc delete
   rule referenced a nonexistent `hostId` field (admin delete always
   failed) — now admin-email based.
   - Status: **FIXED (pending live verification)**

5. **AI turns crawl/stall when the host's tab is hidden.** Browsers clamp
   chained timers in hidden tabs to ≥1s (eventually 1/minute), so an AI
   turn could take minutes if the host alt-tabbed — reads as "the AI's
   turn is stuck". Fixed: AI skips cosmetic delays and uses microtask
   scheduling while `document.hidden`; a `visibilitychange` listener kicks
   the AI when the tab returns. Verified in-browser: hidden-tab AI turns
   now complete in under a second.
   - Status: **FIXED (verified locally)**

6. **Game stalls forever if the host disconnects during an AI turn.**
   No other client was allowed to run AI. Fixed: host-failover — when
   presence marks the host offline, the first online non-surrendered human
   in turn order takes over AI duty (safe under the new transaction-guarded
   pushes). Eliminated players (no territories, no units) are also now
   skipped by turn advance so an absent wiped-out player can't block the
   game, and last-player-standing ends the game.
   - Status: **FIXED (needs live 2-client verification)**

### V2.49 end-to-end verification (local, 1 human + 1 easy AI)

Full game loop driven in-browser with zero console errors: lobby setup →
random turn order → AI capital auto-placement → human capital → 5
interleaved deployment rounds (AI ↔ human, skip-loop verified) →
transition to playing phase → human full turn → AI full turn (all 7
phases) → round wrap → Round 2. Multiplayer-specific paths (Firestore
sync, surrender, Open Games) still need a live 2-account session.

### Notes / feature requests

3. **'Your Games' needs a way to exit (or surrender) a game in progress.**
   — requested by Robert
   - Status: **IMPLEMENTED (pending live verification)**
   - Each game row in "My Games" now has a Leave button: confirms, marks
     the player surrendered, neutralizes their territories/units, advances
     the turn if it was theirs, removes the game from their list, and ends
     the game if fewer than 2 players (or no humans) remain.

---

## Earlier rounds

Screenshots from earlier rounds are in `Bugs V2.45/` and
`Naval Placement bugs/`. (Pre-dates this log; not itemized.)
