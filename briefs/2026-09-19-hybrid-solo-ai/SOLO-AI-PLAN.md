# Solo AI on Three hybrid — Phase 1 plan

**Status:** PLAN ONLY. Do not implement Phase 2 in this commit.  
**Branch / PR:** `cursor/unit-sheet-clickthrough-d314` · [PR76](https://github.com/04jhbickford/Tactical-Risk/pull/76) (draft · **hold merge**)  
**Tip:** `V2.81.53-ux-preview.11` · SCHEMA 11  
**Tip URL:** https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&max=1  
**Live main:** https://tactical-risk20.vercel.app/ · `V2.81.55` · SCHEMA 11  
**Tesla / Viz:** off. Side / hybrid only. **Keep off `main` until a separate yes.**

This brief tells Arc how to port a **real solo match vs AI** onto the tip `.11` Three UX without rewriting the rules engine and without touching lobby / multiplayer / `main`.

---

## 0. How the two trees actually sit

| Tree | Version | What boots |
|---|---|---|
| Tip `?three=1` / `?ux=1` | `V2.81.53-ux-preview.11` | `src/main.js` → `bootUxPreview()` only. **Never** constructs `GameState`, lobby, AI, or Firebase. |
| Tip `/` (no query) | same checkout | Full `init()` — same engine as the fork point of main. |
| Live main `/` | `V2.81.55` | Local lobby → **Risk** + optional AI, or Firebase multiplayer. |

Merge-base with `origin/main`: `a94b27f` (**V2.81.53** NCM air-landing Done).  
Tip-only: 33 commits (Three chrome + Karelia seed).  
Main-only since fork: **4 commits** — V2.81.54 AA-wipe fail-close + V2.81.55 cloud game-log / diagnostics.

**Hybrid files (tip-only, not on main):**

```
src/map/uxPreview.js            boot + canvas + chrome bind
src/map/uxPreviewScenario.js    toy rules: Combat Move → Battle → Air Land
src/map/uxPreviewFlag.js        ?three=1 / ?ux=1 / ?max=1
src/map/uxPreviewUnits.js       main-art chits + LOD stacks
src/map/threeMapChrome.js       L0 / peek tiles / battle sheet / Confirm
src/map/threeChromeEvents.js    sealed hits (Congo-eat)
src/map/threeMapDensity.js      stack density
tools/test-ux-preview-*.mjs     seed + chrome unit tests
briefs/2026-09-19-main-art-three-ux/
```

`src/main.js` change on tip is a **12-line gate** (`wantsUxPreview()`). `src/version.js` is the preview stamp. `gameState.js` / `ai/` / `combatUI.js` on this branch are the **V2.81.53** copies — they are not wired into `?three=1`.

---

## 1. Diff hybrid tip vs main

### 1.1 Rules engine

| | Tip `.11` UX (`?three=1`) | Main / tip `/` (`GameState`) |
|---|---|---|
| Authority | `uxPreviewScenario.js` (~1100 lines) | `src/state/gameState.js` (~5400 lines) + `airLanding.js` + `placementPass.js` |
| Board | Classic 1942 placements **overwritten** on 4 lands (Karelia pocket / max Ukraine) | Full `data/setup.json` classic **or** Risk random + capital / deploy |
| Factions | Hardcoded Russians (human) vs Germans | 5 factions; local lobby starts **Risk** with any mix of human / AI |
| Legality | `legalDests = [Finland Norway, Ukraine S.S.R.]` | `moveUnits()` — adjacency, land bridges, air range, sea range, amphib, load/unload |
| Dice | Scripted `DEMO_ROLLS` / `DEMO_ROLLS_MAX` (seed 1941) | Live d6 in `resolveCombat()` + `CombatUI` |
| Units | Land + FTR/BMB/TAC/AA. No navy, no transport, no sub first-strike | Full `data/units.json` (BB/CV/CA/DD/SUB/TRN, cargo, damaged BB) |
| Persistence | None (Replay reseeds pocket) | `autoSave()` → `localStorage` (`tacticalRisk_autoSave`) |

**Verdict:** tip already **paints** main map art + unit chits. It does **not** run the rules engine. Growing `uxPreviewScenario.js` into a full match would fork combat, movement, IPC, and victory a second time.

### 1.2 Phases

Main `TURN_PHASES` (`src/state/gameState.js`):

1. `develop_tech` — buy 5-IPC dice, unlock from `TECHNOLOGIES`
2. `purchase` — queue units, spend IPC (industrial-tech −1)
3. `combat_move` — `moveUnits(..., combat)`
4. `combat` — queue + `resolveCombat` / `CombatUI` (AA, bombard, subs, casualties, retreat, land)
5. `non_combat_move` — friendly only; air remaining = 0 enables Done (V2.81.53)
6. `mobilize` — place pending at factories (capital 20 / other 5)
7. `collect_income` — production + continent bonus + capital 10; then `nextTurn()`

Setup (Risk only): `GAME_PHASES.CAPITAL_PLACEMENT` → `UNIT_PLACEMENT` → `PLAYING`.  
Classic `_initClassicMode` jumps straight to `PLAYING` (historical stacks).

**What tip wires today**

| Phase | Tip `.11` | Notes |
|---|---|---|
| Combat Move | **Demo wired** | One origin (Karelia), tile +/−, Confirm attack |
| Combat | **Demo wired** | AA → roll → YOU assign / THEY cheapest-auto → take / hold |
| Air Land | **Demo wired** | Planes-only sheet, split dests (Russia / Karelia) |
| Purchase | Missing | IPC chip is a **label** (24 / 48), not an economy |
| Tech | Missing | `createScenario` never touches `playerTechs` |
| NCM | Missing | |
| Mobilize / place | Missing | |
| Collect / end turn | Missing | Confirm on DONE = **Replay scenario** |
| Capital / deploy | Missing (and unused by classic) | |
| Win | Missing | No `gameOver` / `VictoryScreen` |

### 1.3 AI opponent

Main (present on this checkout, **idle under `?three=1`**):

- `src/ai/aiController.js` — all setup + playing phases; `setCanAct` (solo: always true)
- `src/ai/aiPlayer.js` + `strategyAI.js` — purchase / attack / NCM heuristics
- Local lobby: `src/ui/lobby.js` `_startGame()` sets `isAI` + `aiDifficulty` per seat, then `GameState.initGame('risk', …)`
- `orderRiskSetupSeats()` seats the single human first (V2.81.32)

**Classic AI purchase hole (must fix if we start classic):** `_initClassicMode` sets `capitalTerritory: null` and `isCapital: false` on every land. `_handlePurchase` **skips the entire buy** when there is no capital. Alliance victory (`_checkAllianceVictory`) still works off **named** capitals (`Russia`, `United Kingdom`, `East US`, `Germany`, `Japan`) via owner, but IPC steal-on-capture and factory caps will not.

Tip AI: **none**. Defender casualties are cheapest-auto. No opposing turns.

### 1.4 Setup / new game

| | Tip | Main local |
|---|---|---|
| Cold start | URL only (`?three=1`, optional `?max=1`) | Home lobby → pick ≥2 Risk factions → Start Game |
| New Game | Menu sheet: “Back to board” / “Open live Canvas” | Lobby + autosave load |
| Seat pick | Forced Russians | Per-faction human / easy / medium / hard |
| Classic mode | Pocket overlay on classic owners | `initGame('classic')` exists; **lobby UI does not expose it** (live players use Risk) |

### 1.5 Win, IPC, tech

- **Win (main):** classic / alliances → Axis 2/3 Allied capitals while holding both Axis, or Allies both Axis while holding all 3 Allied. Risk (no alliances) → majority / all placed capitals. Also last-player-standing. UI: `src/ui/victoryScreen.js`.
- **IPC (main):** `playerState[id].ipcs`; purchase / tech / collect / capital loot. Tip shows a static number.
- **Tech (main):** `TECHNOLOGIES` (jets, rockets, superSubs, longRangeAircraft, heavyBombers, industrialTech). UI: `src/ui/techUI.js`. Classic init **does not** seed `playerTechs` (Risk does). Tip: none.

### 1.6 Combat / air-land / diagnostics (main vs tip)

Main combat is **two layers**: `GameState.resolveCombat` (AI auto-loop) and `src/ui/combatUI.js` (~3500 lines: AA, bombard, sub strike, YOU casualties, retreat, air landing overlay). Human play goes through CombatUI.

Main-only since the fork (not on tip `gameState` / `combatUI`):

- **V2.81.54** — AA casualties sync immediately; attacker wipe **fail-closes** so reload cannot reopen a 0-unit Roll Dice overlay; last 40 combat dice snapshots persist on the game doc.
- **V2.81.55** — `src/multiplayer/gameEventLog.js` + `DIAGNOSTICS.md` + `tools/query-game-events.mjs`.

Tip combat is a **happy-path subset** (AA on 1, cheapest air removed, no retreat, no navy, no bombard, no fail-close). Air land is UX-complete for the pocket (`airLanding.js` is unused).

---

## 2. Gaps for full solo AI

### Already works on tip `.11` UX (keep)

- Main canvas art + chits, 390 layout, zoom hidden while sheets are open
- Horizontal icon tiles with in-tile +/− (combat-move, YOU casualties, air-land)
- Exclusive gold Confirm; YOU-assign unlocks Confirm; THEY read-only cheapest
- Split air land (type/count then dest); planes-only sheet
- Pointer sealing (sheet does not select Congo)
- Max seed `?three=1&max=1` as a **regression fixture**

### Missing to cold-start a full match

1. **Boot path** — `?three=1` never calls `GameState` / `AIController`. Need `?three=1&solo=1` (and a menu **New Game vs AI**) that does.
2. **Match shape** — 5-faction board, human seat + AI seats, first turn = human (classic) or human-first Risk setup.
3. **Phase machine** — L0 + Confirm must drive `TURN_PHASE_ORDER` + `nextPhase()`, not `PHASE.DONE → Replay`.
4. **Legal combat-move / NCM** — replace hardcoded dests with `moveUnits` + highlights from real connections / range.
5. **Real combat** — queue (naval then land), AA wipe fail-close, multi-round, retreat, bombard/subs if those units are present. Map CombatUI **state** onto the `.11` battle sheet; do not keep scripted dice.
6. **Air land on `GameState`** — `pendingAirLandings` + `src/state/airLanding.js` (V2.81.52/53 persistence + NCM Done when remaining = 0).
7. **Economy** — live IPC, purchase tiles, mobilize-at-factory, collect income. Stamp historical capitals for classic.
8. **Tech** — seed `playerTechs` on classic; thin skip-or-research sheet (or auto-skip) so the phase cannot soft-lock.
9. **AI turns** — `AIController.setGameState` + subscribe; Three chrome shows “Germans thinking…” and blocks human Confirm.
10. **Win + New Game** — `VictoryScreen` (or Three equivalent) + menu restart. No lobby.
11. **Bring main 54/55 onto the side branch** before teaching Three combat. Tip is two combat/diagnostics fixes behind live.
12. **390** — purchase / NCM / multi-battle / AI status must fit the same bottom-sheet budget as `.11`.

Demo `?three=1` / `?max=1` stays as the pocket fixture. Solo is a **second** boot, not a mutation of the seed.

---

## 3. Recommended architecture

**Recommendation: reuse main `GameState` + `AIController` + local `subscribe` / `autoSave` behind the Three UX shell. Do not reimplement rules. Do not wire Firebase / `syncManager` / lobby for this milestone.**

```
?three=1&solo=1
    → threeSoloBoot.js
        → GameState.initGame('classic', [human, …AI])
        → stampHistoricalCapitals()          // classic purchase/win economy
        → AIController (canAct = true)
        → threeSoloAdapter
              maps GameState + unitDefs → threeMapChrome
              combat-move / casualty / air-land tiles stay .11
        → canvas from uxPreviewUnits (full board, not pocket-only)
```

**Why this, not a bigger seed engine**

- Combat, movement, IPC, tech, victory, and AI already exist and are what live main plays.
- Tip UX is the scarce asset (tiles, Confirm, 390, air-land split). Keep it as a **paint + input** layer.
- `CombatUI` DOM stays off-screen. Reuse its **helpers** (`resolveCombatNextLine`, casualty math, AA wipe fail-close once 54 is on the branch) and `GameState.resolveCombat` for AI auto-resolve.
- “Sync” for solo = `gameState.subscribe` + `autoSave()`. Firebase `syncManager` is multiplayer authority; out of scope. Adapter can accept a later `syncManager` without changing chrome.

**Why classic-first, Risk-second**

- Classic starts in `PLAYING` with a real 1942 board — first human turn can use the existing combat-move tiles the same day.
- Live lobby is Risk (capital + 6/7 deploy). That is a later **L** slice (`placementUI` / `phaseGuide` → Three). Not required to play a WWII match vs AI.
- Must stamp `capitalTerritory` / `isCapital` for Germany, Russia, United Kingdom, Japan, East US or AI will never purchase.

**Do not**

- Grow `uxPreviewScenario.js` into purchase / NCM / navy / win.
- Call `wireUpGameComponents()` wholesale (pulls HUD, sidebar, lobby, CombatUI overlay, handoff).
- Merge to `main`.

**Do** merge or cherry-pick `origin/main` **into this side branch** (54 + 55) as slice 0 so Three combat is not built on a known soft-lock.

---

## 4. Effort slices

Ordered. Sizes are relative (S hours-ish / M a working pass / L multi-pass). Phase 2 starts at S0, not S3.

| # | Slice | Size | Depends | Outcome |
|---|---|---|---|---|
| **S0** | Side-branch hygiene: merge/cherry-pick main `V2.81.54` + `V2.81.55` onto PR76 lineage. Keep `?three=1` green. | S | — | AA wipe + dice snapshots + `gameEventLog` exist on the hybrid tree |
| **S1** | Solo boot: `?three=1&solo=1` + menu **New Game vs AI**. `GameState` classic, 1 human (default Russians) + 4× medium AI. Stamp capitals. No lobby. Keep `?three=1` seed. | S | S0 | Cold start lands on a real board, human’s first playing phase |
| **S2** | Phase shell: L0 phase chip + strip from `TURN_PHASE_NAMES`. Confirm **End phase** when legal. Live IPC. AI status on L0. Skip empty combat/mobilize via `nextPhase`. | S–M | S1 | Can tab through a full turn with AI filling other seats (even if human sheets are still stubs) |
| **S3** | Combat-move adapter: tile steppers from `gameState.units`, dests from `moveUnits` / connections, multi-origin. | M | S2 | Human can stage a legal attack anywhere, not just Karelia |
| **S4** | Combat + casualty adapter: queue, AA, YOU tiles, THEY cheapest, gold Confirm, **AA wipe fail-close**, multi-round. Port 54 snapshots into the battle sheet / menu log. | **L** | S0, S3 | Human battles use `.11` IA on real dice |
| **S5** | Air land adapter: `airLanding.js` + `.11` split tiles; crash if no options; do not block Done at 0 remaining. | M | S4 | Post-take land works on the full map |
| **S6** | NCM: friendly dests, air leftover, V2.81.53 Done-when-0. | M | S3, S5 | Turn can leave combat without a leftover-air lock |
| **S7** | Purchase + mobilize tiles (cost, IPC, factory caps). | M | S2 (capitals from S1) | Economy loop |
| **S8** | Tech: seed `playerTechs`; skip or 0–N dice sheet. | S | S2 | Phase cannot wedge |
| **S9** | Win chrome + New Game vs AI + 390 pass on purchase/NCM/AI-wait. | S | S2, S4 | Match can end and restart on the tip URL |
| **S10** | Risk capital + initial deploy in Three (live-lobby parity). | **L** | S1–S9 | Optional. Not needed for first playable WWII match |
| **S11** | Diagnostics in Three menu (action log + last-40 dice). | S | S0, S4 | Boysenberry-style audit without opening `/` |

**Suggested Phase 2 first ship:** S0 → S1 → S2 → S8 → S3 → S4 → S5 → S6 → S7 → S9.  
S10 only if James wants Risk-random, not 1942.

---

## 5. Risks

| Risk | Why it will show up | Mitigation |
|---|---|---|
| **Combat soft-lock** | Live main already hit AA-wipe + 0-attacker Roll Dice (V2.81.54). Tip seed never fail-closes. Adapter that wraps old CombatUI without 54 will re-ship it. | S0 first. After every AA / last-hit, dequeue if attackers = 0. Tests from `tools/test-combat-ui.mjs` on the side branch. |
| **Air land** | Main needed persist + NCM Done at 0 remaining (V2.81.52/53). Tip split-land is UX-only and hardcoded `landable`. | Bind `pendingAirLandings`; reuse `remainingAirLandingsToAssign`. Keep `.11` tiles. |
| **Casualty Confirm** | Preview.9/10: THEY chips stole taps; Confirm stayed Assign. `.11` rule: Confirm waits on **YOU only**. | Do not make THEY writable. Same-type re-tap must not clear a need=1 pick. |
| **Dice log / diagnostics** | Human will distrust scripted-looking fights; V2.81.55 exists to audit. | Persist last-40 snapshots (54) + show a Three menu log (S11). No Firebase write. |
| **Mobile 390** | Purchase lists, multi-battle, AI “thinking”, NCM air leftover will blow the sheet that `.11` just fit. | Zoom stays hidden with L1/battle. Scroll IA body, pin Confirm (preview.10). Still every new sheet at 390. |
| **Phase gating** | `nextPhase()` no-ops unless `phase === PLAYING`; leftover `turnPhase=purchase` during setup was V2.53. Classic skips setup — good. Ending combat with a non-empty `combatQueue` **refuses** NCM. | Never call `nextPhase` from chrome unless `shouldDrivePlayingTurnPhase`. Confirm End combat only when queue is empty (or skip with 54 fail-close). |
| **Classic capitals** | AI purchase no-ops; factory caps / capital loot dead. | S1 stamps the five historical capitals. |
| **Navy / amphib** | First classic turns include sea fights. If S4 is land-only, naval queue head wedges the phase. | S4 must at least auto-resolve naval via `resolveCombat` (AI path) if Three navy UX is not ready — never leave a sea battle un-dequeued. |
| **AI vs human chrome** | Controller will `resolveCombat` and `nextPhase` while Three still shows a human sheet. | Disable Confirm + map input while `currentPlayer.isAI`. |

---

## 6. Success criteria

A playtester on a **390-wide** viewport, **no lobby**, can:

1. Cold-open `https://<pr76-preview>/?three=1&solo=1` **or** open `?three=1` menu → **New Game vs AI**.
2. Land on a full classic 1942 board, human Russians (or chosen seat), other seats Medium AI, IPC live, phase = Develop Tech or first actionable playing phase.
3. Play a **complete human turn** with `.11` IA: purchase (or skip) → combat-move tiles → combat YOU-confirm → air land split if needed → NCM → mobilize if bought → income / handoff.
4. Sit through AI turns without a combat/air-land/phase soft-lock.
5. Reach `gameOver` (alliance capitals or concession) and tap **New Game vs AI** again.
6. `?three=1` and `?three=1&max=1` **still** run the Karelia fixture (no regression).
7. Nothing merges to `main`. Tesla stays off.

---

## 7. Out of scope

- Lobby UI (`src/ui/lobby.js`, `multiplayerLobby.js`)
- Firebase Auth / Firestore / `syncManager` / presence / host failover / rematch
- Pass-and-play handoff between two humans
- Merge to `main` (or any “is it on live?” deploy of this tree to the production host)
- Tesla / Viz
- Replacing main `/` HUD
- S10 Risk deploy unless James asks after the classic match plays

---

## Kickoff note for Phase 2

**READY FOR PHASE 2 GO.**

Not blocked on product questions. First Phase 2 commit should be **S0 + S1 only** (bring 54/55 onto the side branch, add `?three=1&solo=1` boot). Do not start S4 combat-adapter until S0 is on the branch.

Hold PR76 merge. This file is the SoT for the solo-AI port.
