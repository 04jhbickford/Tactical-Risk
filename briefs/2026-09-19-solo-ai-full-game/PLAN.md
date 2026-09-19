# PLAN — Solo vs AI full game on Three hybrid (side only)

**Hold merge. Do not merge to main.**
**Base SoT:** PR76 tip `.11` `cursor/unit-sheet-clickthrough-d314` @ `0af9fc7` (`V2.81.53-ux-preview.11`)
**Main SoT:** `origin/main` @ `2064788` (`V2.81.55` + AA-wipe / NCM / game-log)
**Preview target:** `?three=1&solo=1`
**Keep:** `?three=1` pocket + `?three=1&max=1` battle demo unchanged

```
doNotMerge=true
base=PR76 .11 hybrid
entry=?three=1&solo=1
noLobby=true
noFirebase=true
preserveUx=.11 tiles +/−, partial air land, YOU casualty Confirm, dense sheets
```

---

## 1. Inventory — main vs hybrid tip

| Phase | Main (`/`, V2.81.55) | Hybrid tip (`?three=1`, `.11`) | Gap |
|---|---|---|---|
| **Boot / setup** | `main.js` → Firebase optional → `Lobby` → **risk** `initGame` (capital + 6/7-unit deploy). Classic `_initClassicMode` exists but local lobby never calls it. | `wantsUxPreview()` hijacks boot into `bootUxPreview()`. Sealed `uxPreviewScenario` pocket (Karelia / Ukraine). No `GameState`, no lobby, no setup. | No full-board start. No capital/deploy Three UI. No classic historical start on this shell. |
| **Purchase** | `PurchasePopup` + `playerPanel` Actions: tap factory / sea, cart, `gameState.purchaseUnit`. | L0 shows IPC only. No buy sheet. Scenario IPC is a sticker (24 / 48). | No factory tap, no cart tiles, no pending-purchase list. |
| **Combat move** | `MovementUI` + phone Actions: stage units, tap dest, Confirm → `gameState.moveUnits` (range, blitz, amphib, load). | `.11` Three tiles +/− → dest → Confirm. **Toy rules** in `uxPreviewScenario` (fixed origin, 1–2 dests, demo dice). | IA is SoT. Rules are not. Need `moveUnits` behind the same tiles. |
| **Combat** | `CombatUI` (~3.5k): AA → dice → YOU/THEY casualties → retreat/take. Main has **V2.81.54 fail-close after AA wipe**. AI auto-`resolveCombat`. | `.11` battle sheet: ATK/DEF lanes, compact dice, YOU assign + Confirm, THEY cheapest read-only, casualty tiles. **Scripted rolls**. Ends at one take. | IA is SoT. Missing: combat queue, naval/amphib/subs, AA wipe fail-close, multi-battle, real RNG. |
| **Air land** | `AirLandingUI` + `pendingAirLandings` (V2.81.52 persist). NCM Done enabled at 0 remaining (V2.81.53). | `.11` planes-only sheet, type/count + dest, split land (2 FTR Russia / 1 BMB Karelia). | IA is SoT. Must call `upsertPendingAirLanding` / apply landings on real state. |
| **NCM** | Same `MovementUI` / `moveUnits` with enemy dests rejected. Done / End Phase. | None. Scenario `DONE` is idle Replay. | Need combat-move tiles with friendly-only dests + End Phase. |
| **Place / mobilize** | Risk setup: `PlacementUI` + `placeInitialUnit`. Playing: `MobilizeUI` disabled; Actions tab places pending buys on factories. | None. | Need factory/sea tap + tiles for pending buys. Setup place only if we pick Risk. |
| **Collect IPC** | `nextPhase()` → `_collectIncome()` (territory production + continent bonus; blocked if capital captured). HUD shows new IPC. | None. | Need Confirm “Collect N IPC” then `nextPhase`. |
| **Tech** | `TechUI` / `purchaseTechDice` + roll. AI may buy 0–3 dice. | None. | v1: Skip / End Phase. AI still may research. |
| **AI opponent** | `AIController` + `AIPlayer`: capital, deploy, every playing phase. Host-only in MP (`canActCheck`). Local: always on. | None. Pocket Germans never act. | Wire `AIController` local, `canAct` always true, Three status strip while they think. |
| **Win / loss** | `VictoryScreen` on `gameOver`. Classic/alliances: Axis 2 Allied caps + hold both Axis; Allies take both Axis + hold 3 Allied. Risk: majority / all capitals. | Scenario `DONE` = replay pocket. | Need Three overlay from `gameState.gameOver` (alliance victory for classic). |
| **Lobby / Firebase** | Required for `/` online. Local Play still uses in-page `Lobby` overlay. | Preview never opens lobby. | Keep that. Solo must not touch Auth / Lobby / Sync. |

### Engine delta (do not silent-merge)

Hybrid `gameState.js` / `combatUI.js` are **behind** main: missing `gameEventLog`, `combatTelemetry`, AA-wipe dequeue (`territoryCombatAlreadyResolved`). Solo adapter must **not** import `gameEventLog` (file is not on this branch). Copy the small AA-wipe fail-close predicate into the solo combat bridge if needed. Do **not** cherry-pick main wholesale (would pull MP diagnostics onto the side branch).

---

## 2. Proposed wire — main rules/AI behind Three shell

```
?three=1              → bootUxPreview()     KEEP pocket
?three=1&max=1        → bootUxPreview()     KEEP fat Karelia→Ukraine
?three=1&solo=1       → bootUxSolo()        NEW full game
```

If `solo=1` and `max=1` both set, **solo wins** (full board, not the pocket seed).

### Cold start (no lobby)

`bootUxSolo()` loads the same map art + `injectThreeChrome`, then:

```
gameState = new GameState(setup, territories, continents)
gameState.isMultiplayer = false
gameState.initGame('classic', roster, { alliancesEnabled: true })
```

**Roster (default):**

| Seat | Role |
|---|---|
| Russians | James (human) |
| Germans, British, Japanese, Americans | Medium AI |

Query knobs (optional, no UI required): `?seat=Germans` `?ai=easy|medium|hard`.

Why **classic**, not Risk:

- Three UX was built on the historical board (Karelia / Ukraine / factories already down).
- Local main lobby is Risk (long capital + deploy) — that setup IA is a later slice.
- Classic starts `GAME_PHASES.PLAYING` immediately; James hits Purchase → Combat Move on the developed shell.
- Alliance victory is the “real WWII” win/loss.

Tiny Three splash (not a lobby): seat + “You vs AI · Confirm to start”. One tap. No Firebase.

### Adapter (do not reuse sealed scenario rules)

New modules (preview-only, side branch):

| File | Job |
|---|---|
| `src/map/uxPreviewFlag.js` | `isSoloRequested()` |
| `src/map/uxSolo.js` | Boot, camera, stacks, chrome, `window.__uxSolo` |
| `src/map/uxSoloAdapter.js` | Phase machine: map taps + Confirm → `GameState` |
| `src/map/uxSoloCombat.js` | Combat queue + AA/dice/YOU casualties → `.11` battle sheet |

`AIController.setGameState` + `setUnitDefs` + `setCanAct(() => true)` + status → phase strip.

Human Confirm / tiles **only** when `currentPlayer` is James. AI turns: Confirm idle, strip = “Germans thinking…”.

### Phase → Three IA (preserve `.11`)

| Phase | Three chrome | Commit |
|---|---|---|
| Develop Tech | Guide + Confirm **Skip** | `nextPhase()` |
| Purchase | Tap factory / legal sea · horizontal buy tiles +/− · cart · Confirm buy · End Phase | `purchaseUnit` |
| Combat Move | **Same `.11` tiles** · dest gold · Confirm | `moveUnits` |
| Combat | **Same `.11` battle** (ATK/DEF, YOU Confirm, THEY cheapest, casualty tiles) | AA / `resolveCombat` rolls / `applyCasualtiesManual` |
| Air land | **Same `.11` planes-only split dest** | pending air landing APIs |
| NCM | Combat-move tiles, friendly dests only · End Phase | `moveUnits` |
| Mobilize (place) | Tap factory / sea · pending tiles +/− · Confirm | `mobilizeUnit` |
| Collect IPC | Confirm “Collect N IPC” | `nextPhase()` → `_collectIncome` |
| AI turn | Status strip, map live | `AIController` |
| Game over | Three overlay, New Game = reload `?three=1&solo=1` | `gameState.gameOver` |

End Phase is the gold Confirm when the phase allows skip / done (tech, empty combat-move, NCM, collect). Combat Confirm stays named (Roll AA / Roll dice / Confirm hits / Confirm land).

### Out of scope (v1)

- Firebase lobby, sync, host handoff, rematch
- Risk capital + initial deploy Three UI (`?risk=1` later)
- Naval/sub/amphib *chrome* polish (rules still run; sheet may be land-first)
- Merging main `gameEventLog` / V2.81.55 diagnostics
- Changing `?three=1` / `?max=1` pocket
- Merge to main

---

## 3. Work slices

| # | Slice | Files | Done when |
|---|---|---|---|
| 0 | **This plan** | `briefs/…/PLAN.md` | Committed before port |
| 1 | Flag + boot fork | `uxPreviewFlag.js`, `main.js`, `version.js` | `?three=1&solo=1` enters `bootUxSolo`; pocket URLs unchanged |
| 2 | Cold start + AI | `uxSolo.js` | Classic 5-faction board, James Russians, 4 AI, no lobby |
| 3 | Phase shell | `uxSoloAdapter.js`, chrome strip | Phase word + End Phase / Skip / Collect; AI status |
| 4 | Combat-move + combat + air land | `uxSoloCombat.js` + adapter | `.11` tiles/casualty/split-land on **real** `GameState` |
| 5 | Purchase + mobilize | adapter | Factory tap + tiles buy/place |
| 6 | NCM + collect + tech skip | adapter | Full human turn cycle |
| 7 | Win/loss | `uxSolo.js` overlay | Alliance victory overlay |
| 8 | Verify | browser + stills | Solo path playable; `?three=1&max=1` still `.11` |

---

## 4. Risks

- CombatUI is DOM-bound; **do not** mount `#combatPopup` on solo. Bridge GameState APIs into existing `setBattle` / tile steppers.
- Classic `capitalTerritory` is null at init — mobilize uses factories on the board, not Risk capitals. Collect uses territory `production` (capital +10 only if `capitalTerritory` set). Accept classic production as-is (main’s classic path).
- Hybrid missing AA-wipe fail-close — copy the 0-attacker dequeue into the solo bridge so James cannot sit on Roll Dice after AA wipes the stack.
- `AIController` `resolveCombat` auto-cheapest is fine for AI; James keeps YOU-assign.
- Do not bump live Firebase `GAME_VERSION` contract in a way that implies main deploy. Side-branch version: `V2.81.53-ux-preview.12-solo`.

---

## 5. How James cold-starts

1. Open preview `…/?three=1&solo=1`
2. Splash: **Russians vs 4 AI · Confirm**
3. Historical board. Purchase → Combat Move (`.11` tiles) → Battle (`.11` casualty) → Air land (split) → NCM → Place buys → Collect IPC
4. AI seats play themselves. Game ends on Axis/Allied capital victory.

No sign-in. No lobby code. No Firebase.
