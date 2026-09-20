# Lookpass — V2.81.56-ux-solo.5

**Hold merge.** Off main. Tesla / Viz off. SoT = [PR76](https://github.com/04jhbickford/Tactical-Risk/pull/76).

**Tip:** https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
**Pocket:** `?three=1&max=1` (Karelia fixture, unchanged)  
**Skip lobby:** `?three=1&solo=1&go=1`

## Pulled from main

| Surface | Source | On Three |
|---|---|---|
| Local Play → New Local Game | `src/ui/lobby.js` | `#three-lobby` main + setup |
| How to Play | lobby tile + `rulesPanel` phases | Lobby How to Play + setup tutorial |
| Faction seats 2–5 | `setup.risk.factions` | Same 5 powers, tap to add |
| Occupant Human / Easy / Medium / Hard | `AI_DIFFICULTIES` exported from `lobby.js` | Per-seat tiles |
| Starting IPCs 40–150 | `STARTING_IPC_OPTIONS` | Risk only |
| Teams 1 / 2 / − | `TEAM_COLORS` | Risk only |
| Start Game (N Players) | lobby Start CTA | Same copy; disabled under 2 |
| Classic 1942 | Three addition (main local is Risk-only) | Mode tile · historical stacks |
| Play Online | main Firebase | Shown, disabled — off this tip |

Persist P0 from main `V2.81.56` / PR82 remains: `1bef077` (`persistState.js`, `logCombat` losses 0).

PR84 `soloMatch.js` not imported — this tip already has `threeSoloMatch.js`. Prefer one SoT = PR76.

## Tutorial

`src/map/threeSetupTutorial.js` + `#three-tutorial`. Shows on first entry into capital / deploy. Dismiss **Got it** (localStorage). Reopen via L0 **?**. Copy: Place Capital · Deploy 6 then Pass · turn loop.

## Deploy-6 UX

`deployWave()` uses `getUnitsPerRoundLimit()` (always 6) + `placementBudgetCopy`. Peek meter: `Deployed this round X/6`. Confirm: `Deploy N of 6` (idle) until 6 placed, then gold **Pass · 6 of 6**. Fail-closed in sealed bottom chrome — map cannot eat Pass.

## Stubs left

Retreat / bombard tiles. S11 diagnostics sheet. Tech tiles reuse casualty picker. Naval leftover still `allowNavalSkip`. Play Online. My Games list (autosave still exists).
