# Tactical Risk — Bug & Debug Log

---

## 8.16.26 — V2.63 desktop-safe iPhone chrome (James V2.62 playtest)

Live V2.62 on iPhone (~390×844) was the desktop HUD stuffed into a phone: map was a ~110px postage stamp beside a 280px sidebar; title + five player chips overlapped; End Turn and Done could stack; Max sat next to zoom +/−; touch targets were 18px; “Pass the device” painted over live chrome; nothing used the Dynamic Island or home-indicator safe areas.

Fix (chrome only — iPhone shell via `html.mobile-shell` + `@media (max-width: 480px)` so the V2.61 tablet band 481–900 and desktop ≥901 stay on their existing trees):
- `viewport-fit=cover` (already on) + `100dvh` + `env(safe-area-inset-*)` on the top bar and bottom CTA
- Compact 44–52pt top bar: `{color} {faction} · {3/7 Combat Movement}` at ≥11pt. Do not copy the tablet hide-dots / 9px phase-name path. Wordmark / player list / settings behind ⋯
- Hide the persistent 280px right rail. Actions + `End ${phase}` move to a bottom tray (`max-height: 42dvh`). Map is full-bleed and the majority of the screen at idle
- Tray peek: PHASE_HINTS one-liner next to the one primary `End ${phase}` CTA (min-height 48px) above the home indicator. End Turn and Done never coexist; illegal/disabled actions stay hidden
- Max stays on the unit-count row; zoom +/− parks top-left (≥44px, away from the CTA; pinch is primary)
- Handoff is an opaque full-screen modal that hides HUD / panel / zoom / chips (one dismiss control)
- Combat / auto-battle hides End Turn, Done, and Max
- Every phone control ≥44 CSS px with ≥8px gap
- Hover-only facts get a tap equivalent: Surrendered is a visible OUT; IPC is visible on the ⋯ player list (not `title=` only)

QA: 390×844 (iPhone shell) and 1280×800 (desktop). 772×635 stays on the V2.61 tablet chrome path. SCHEMA_VERSION stays 11. Rules / map / combat math / economy / victory / multiplayerGuard / Firebase / touchInput zoom math / territory-label collision / bottom-sheet detents / turn emails unchanged.

Harness: `node tools/test-tablet-chrome.mjs` (480px shell predicates, 3/7 phase label, PHASE_HINTS peek, existing 772px tooltip checks). Existing `test-possessive.mjs`, `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.62 turn-badge possessive (V2.61 playtest)

Live V2.61 HUD turn badge read **"Germans's Turn"** (double possessive). Cause: HUD / player-panel / action-log copy concatenated `name + "'s Turn"`.

Fix (UI/copy only): shared `possessiveName` / `possessivePhrase` in `src/utils/possessive.js`.
- Plural / sibilant names (Germans, Russians, Americans, James, Max): `Germans' Turn`
- Adjectival demonyms (British, Japanese): `British Turn` (no `'s`)
- Other names: `Alice's Turn`

Same helper on the sidebar turn header, action-log "turn begins" line, and lobby default "… Game" name. Combat headers already used the bare faction name.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup-rules / map / multiplayerGuard / touchInput.js / zoom math unchanged.

Harness: `node tools/test-possessive.mjs`. Existing `test-tablet-chrome.mjs`, `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.61 tablet chrome (V2.59 narrow-window playtest, ~772×635)

Playtest on a ~770px window (sidebar ~280px, map ~490px):

### 1 — Territory tooltip covered the Actions panel

A ~280px hover/click card (`z-index: 100`) painted over the phase header, tabs, and +/Max. `_position` only flipped at the viewport edge.

Fix (display-only): `clampTooltipToMapArea` / `resolveMapRightEdge` keep the card in the map gutter (left of `#sidebar`). If it cannot fit, the tooltip is dismissed. CSS `max-width: min(280px, 100vw − sidebar − pad)` as a backup.

### 2 — Minimap ate the lower-left map

233×133 (coarse-pointer 300×171) covered Southern Africa / South Atlantic on a ~490px map.

Fix: shrink `#minimap` to 140×80 on narrow/short viewports (156×89 when coarse). Do not remove it. `_panFromEvent` now uses the displayed CSS box so clicks stay mapped after the shrink.

### 3 — Header wrap / flag-strip clip

“TACTICAL RISK” wrapped onto two lines; the turn-order flags were cut by the turn badge. Cause: default flex-shrink on the title plus the duplicate `.hud-legend` name strip.

Fix: nowrap + smaller title, compact turn badge, hide `.hud-legend` / phase-dots below 900px. Title, turn badge, and flag strip stay on the 48px row.

### 4 — Local setup dead space + unreadable faction names

`.lobby-overlay.modern::before` is more specific than the tablet hide, so the splash half still reserved space. `.lobby-container.modern` max-width 600px left ~180px empty. Unselected names are a disabled placeholder at opacity 0.4 / `#475569`.

Fix: hide the modern splash at ≤900px, let the setup column use the width, raise disabled/placeholder name color to `#cbd5e1`.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup-rules / map / multiplayerGuard / touchInput.js / zoom math unchanged.

Harness: `node tools/test-tablet-chrome.mjs`. Existing `test-recent-move-display.mjs`, `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.60 zoom-vs-Max overlap + empty Recent Moves (V2.59 playtest)

Playtest on live V2.59 (tablet-relevant):

### Bug 1 — map zoom +/− sat on INITIAL DEPLOYMENT Max buttons

`#zoom-controls` is `position: absolute; right: 12px; z-index: 50` on `document.body`. The player panel is 320px at the right edge with z-index 20, so the circular +/− landed on the unit-row Max column. Clicking Max zoomed the map.

Fix (CSS only — `touchInput.js` / zoom math unchanged):
- Park zoom in the visible map gutter: `right: calc(320px + 12px)`.
- Raise `.player-panel` to z-index 55 so Max/steppers keep the hit target if they ever overlap.

### Bug 2 — RECENT MOVES row after Confirm Attack was icon-only

A later global `.pp-undo-btn { width: 100% }` (mobilize-era) overrode the compact history-row undo. In the flex row, the full-width button ate `.pp-move-desc` (`overflow: hidden`), so a real Novosibirsk → Evenki National Okrug attack rendered as an empty bar with only ↩.

Fix (display-only):
- Scope a compact `.pp-move-item .pp-undo-btn` so the description stays visible.
- Exported `formatRecentMove` — skip rows with no unit/from/to string; do not change undo or `moveHistory` writes.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup / map / multiplayerGuard / touchInput.js unchanged.

Harness: `node tools/test-recent-move-display.mjs`. Existing `test-placement-ux.mjs`, `test-mp-turn-sync.mjs`, `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.59 initial-deploy naval remainder near-lock (V2.58 playtest)

After 18 land/air units, Remaining = 6 (all naval). Selecting a land tile (e.g. Novosibirsk) showed “No land/air units to place”, DEPLOYED 0/6, and **no Done / Next Player button**. A random sea zone greys the naval list and still hides Done. Only a sea zone adjacent to the player’s own coast unlocks +/Max; Done appears after the 6 ships are placed.

Root cause (UI gating, not a placement-rule bug): `hasPlaceableUnits` stays true while leftover ships have a legal coastal sea zone, so `showDone` is false. The selected land tile offers no +/Max, and the panel had no hint pointing at a legal sea zone. Landlocked / enemy-occupied-only coasts already make `hasPlaceableUnits` false (Done was allowed) but that path had no copy.

Fix (UI only — `src/ui/playerPanel.js`):
- Exported `computeInitialPlacementUX`. When only naval remain and a legal drop exists, show a sticky hint to click a sea zone adjacent to an owned coast; **do not** offer Done (ships still cannot skip onto land).
- When only naval remain and there is **no** legal sea zone, show Done plus a “no legal sea zone” message so the player is not hard-locked. `finishPlacementRound` already skips unplaceable leftovers via `hasPlaceableUnits`.
- `_isValidPlacementTerritory` now treats enemy-occupied seas as invalid for the +/Max controls, matching `hasPlaceableUnits` / `placeInitialUnit`.

SCHEMA_VERSION stays 11. Combat math / economy / victory / setup / map / multiplayerGuard / touchInput.js unchanged.

Left for later (V2.57 nits, not a clean small fix here): confirm-bar click deselect / one dump to main menu mid-placement; post-Deploy selection jump (Russia→Kwangtung); remaining-count once staying 24 after a 6-unit deploy.

Harness: `node tools/test-placement-ux.mjs` (Done/hint predicates + `hasPlaceableUnits` landlocked / coastal / enemy-sea). Existing `test-mp-turn-sync.mjs` + `robustness-harness.mjs` still pass.

---

## 8.16.26 — V2.58 multiplayer turn-bar + auto-battle soft-lock (Robert Watts playtest)

Playtest on live V2.57: Robert (non-active) saw Sean's green **End Combat Movement →** button. After naval deployment, Sean auto-battled Eire, got "connecting error" toasts, ended the turn, then stuck on a greyscale **End Mobilize Units →**.

### Bug A — spectator saw the active player's End-phase bar (display-only)

`_render()` already computed `isLocalPlayerTurn` (live `oderId === localUserId`, including `isWaitingForSync`) and `_renderActionsTab` hid on waiting. `_renderBottomActions` never used that flag: it skipped AI, then always drew the green `End ${TURN_PHASE_NAMES[turnPhase]} →` during PLAYING. `multiplayerGuard` still blocked `nextPhase` on live oderId, so Robert could see the button but not advance Sean's turn.

Fix (`src/ui/playerPanel.js`): pass `isLocalPlayerTurn` into `_renderBottomActions` and return empty when multiplayer && !local turn (same predicate as the Actions tab). Exported `computeIsLocalPlayerTurn` / `shouldShowBottomTurnActions` for the harness. Did **not** change multiplayerGuard oderId logic, hasAIAuthority, schema 11, or touchInput.js.

### Bug B — auto-battle push storm + failed reload left a grey mobilize button

No literal "connecting error" string. Closest: `push_failed` / `push_exhausted` toasts in `main.js`. `_autoBattle` called `_syncCombatStateToGame()` → `_notify()` → `syncManager.pushState()` (100ms debounce) every combat round, so one Eire auto-battle hammered Firestore. Each retry cycle toasted "Connection hiccup"; exhaustion toasted "re-synced to the last confirmed state."

Two follow-on bugs made that a soft-lock:

1. **`_reloadRemoteState` no-op'd on equal versions.** After a failed write, remote version === local version, but local `gameState` still held uncommitted combat/mobilize mutations. The exhaust path claimed to snap back and never did. Combat UI local state could stay ahead of the doc.
2. **Exhaust handler only re-rendered the player panel.** It did not reset combat UI or put the Actions/place UI in front. The bottom bar's grey **End Mobilize Units →** is `disabled` when `getPendingPurchases()` qty > 0 — correct rule — but after a fake re-sync the place UI and the combat overlay could disagree with that bar.

Fixes:
- `GameState.pauseNotifications()` / `resumeNotifications({ flush })` — auto-battle suppresses per-round notify, then one flush + `pushStateNow()`.
- `_reloadRemoteState({ force: true })` on exhaust applies the remote doc even when versions are equal; emit `push_exhausted` *after* the reload.
- Exhaust handler calls `combatUI.syncFromAuthoritativeState()` and `playerPanel.revealActionsAfterResync()` so the player can retry the move (or place purchased units) instead of staring at a dead bar.
- `push_failed` toasts only on attempt 1 (not every retry). Disabled mobilize bar now says *why* (place purchased units on a factory / sea zone via the Actions tab).

No turn timers. SCHEMA_VERSION stays 11. Combat math / unit stats / economy / victory / setup / map unchanged.

Harness: P6 added (notify pause + equal-version exhaust reload). `node tools/test-mp-turn-sync.mjs` covers the bottom-bar predicate and pause/resume.

---

## 7.27.26 — V2.56 push-persistence fix (Robert's V2.55 playtest, 4 bugs)

Harness now at **59 checks, all green** (`tools/robustness-harness.mjs`).

### Bug 1 (GAME-BREAKING) — push-persistence failure, not turn-authority

Root cause: Robert's client advanced its *local* state through
combat → mobilize → the next player's turn, but **none of it committed to
Firestore** — the doc stayed frozen at v132, phase=combat. Every downstream
symptom (lost combat, "playing ahead," being able to act on the next player's
turn after refresh) fell out of that one fact: after refresh, Firestore
authoritatively said it was still Robert's turn, so he legitimately re-controlled
his own un-ended turn.

Decisive evidence: Robert and Bastion both reported Local Version 132 — they
*agreed*, so the doc genuinely never moved. The `state_push: version=133` log
lines were NOT commit confirmations; they were logged in `gameState.subscribe`
(main.js) as `localVersion + 1` on every notify, *before* the debounced push ran.
15 notifies at v132 → 15 "133" lines, zero commits. `push_failed` events were
real transaction throws that `_doPush` swallowed with no retry and no rollback.

Fixes (all in `src/multiplayer/syncManager.js`):
1. **Serialize + coalesce `_doPush`** — one in-flight transaction; a change
   during flight sets `_pushDirty` and re-pushes once on completion. Kills the
   contention storm from racing debounced/`pushStateNow` transactions.
2. **Retry transient failures** (3× exp backoff + jitter). On exhaustion,
   **reload the authoritative doc** so a client can never proceed on (or hand
   the turn off from) un-persisted state. New `push_exhausted` event → user sees
   "re-synced to last confirmed state."
3. **`checkIsActivePlayer()` now derives from live `gameState.currentPlayer`** —
   single source of truth for title/guard/debug. New `canPushLocalChange()`
   keeps the cached-flag *push authorization* (so a turn-ending push, which has
   already advanced the live currentPlayer, still fires).
4. **`push_failed` now logs the payload** `{attemptedVersion, currentPlayerId,
   phase, attempt, error}` instead of the bare error — no more blind debugging.

Harness reproduces the exact Robert/Bastion sequence with old semantics (local
diverges, doc frozen), then proves the fix (client reloads to truth, the waiting
human never sees a phantom handoff, recovery commits cleanly).

### Bug 2 — AI ran even when no human was present (see PHASE_4_PLAN.md)

Default is now **wait-for-human-present**: AI pauses when no non-AI,
non-surrendered player is connected, resumes on reconnect. Configurable via
doc-level `aiRunsWhenUnattended` (additive field, no schema bump). Policy logic
in `src/multiplayer/aiPolicy.js`; three options + trade-offs documented in
PHASE_4_PLAN.md.

### Bug 3 — turn indicator flipped back and forth — RESOLVED by Bug 1 fix #3

The cached-flag divergence was the cause; live-derived `checkIsActivePlayer()`
means guard, sidebar, title, and debug panel now share one source. Verified in
the harness (B3): a stale cached flag can no longer make a client think it's
still their turn.

### Bug 4 — "dice rolls seem predetermined" — INVESTIGATION ONLY, no gameplay change

Rolls are unseeded `Math.floor(Math.random()*6)+1` — there is no seeding
anywhere in the code. The "predetermined" impression was almost certainly a
byproduct of Bug 1: Robert re-resolved the *identical* combat repeatedly across
refreshes (same un-persisted state each time → similar outcomes). Added a central
`gameState._rollDie(context)` that all three d6 sites route through, logging each
roll (value + context + timestamp) to a bounded in-memory ring buffer
(`getRollLog()`, 500 entries, never serialized to Firestore) so future fairness
claims can be checked empirically. Distribution is unchanged.

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
