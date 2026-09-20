# Lookpass — V2.81.56-ux-solo.16

**Hold merge.** Quiet James. Tesla off. Combat nested stages + keep `.15` lobby touch-pan + stamp SoT.
Fail-closed **A1 / combat stages / T1**. Do not merge.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Hard reload @390×844: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.16`. `/` is `Cache-Control: no-store`.

## Steal vs invent

Catalog SoT: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A #2, GAPS P0 #2). Not present in this checkout; James tip brief named the steal list.

**Stole**
- `xstate-game-phases` / `bgio-moves-phases-stages` — nested stages `IDLE → ORIGIN → UNITS → DEST → CONFIRM → (battle/casualty) → done`
- `aa-combat-dice-calc-pattern` — round hits → YOU casualty steppers; COMBAT_READY odds preview ≠ commit (`phoneCombatAttackerWinPercent`)
- Existing Three locks: manual combat-move (no Try), horizontal icon +/−, YOU-only assign, no map click-through on steppers, plane-by-plane air land
- `.15` lobby touch-pan + `.14` stamp SoT

**Invented**
- None of the machine. `playStage()` is glue so chrome reads one derived stage instead of ad-hoc flags.

## Combat stages fail-closed

| # | Gate | Fail-closed | Proof |
|---|---|---|---|
| **A1** | Stamp exact `.16` after hard reload (L0 + lobby + `__TR_GAME_VERSION`) | yes | still + CDP |
| **C1** | Start Combat Move @390: IDLE pulses legal origins; no Got it coach | yes | still + inspect.stage |
| **C2** | ORIGIN → UNITS → DEST → CONFIRM without soft-lock; disabled CTA is “Tap units” / “Tap destination” | yes | unit + CDP |
| **C3** | Confirm disabled until origin+units+dest legal | yes | unit |
| **C4** | Battle with casualty choice: YOU steppers; Confirm enables after assign | yes | unit |
| **C5** | Open sheet / battleOpen: map tap does not change stage | yes | unit + chrome-hit |
| **T1** | Lobby still pans (do not regress `.15`) | yes | source + smoke |

## QC

Unit: `node tools/test-three-solo-play.mjs`, `node tools/test-three-solo-lobby.mjs`, `node tools/test-ux-preview-chrome-hit.mjs`.

@390 stills after hard reload + combat-move CDP: see SCORE-solo-16 and `/opt/cursor/artifacts/screenshots/lookpass16_*`.

Do not merge.
