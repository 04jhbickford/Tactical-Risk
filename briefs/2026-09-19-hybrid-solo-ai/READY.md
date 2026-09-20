# READY — V2.81.56-ux-solo.17

**Hold merge.** Quiet James. Tip only. Do not merge to main.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Stamp after hard reload: `V2.81.56-ux-solo.17` · `/` `Cache-Control: no-store`

Arc confirmed: proceed `.17` seats. Combat casualty YOU steppers stay **NOT-REACHED** — do not expand this tip.

## Steal vs invent

Catalog SoT: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A #3, GAPS P0 #4). Not in this checkout; James named the list.

| Piece | Steal / invent | Cite |
|---|---|---|
| Seat card occupant Human / AI / Empty | **STEAL** | `aa-1942-seat-combatants` |
| Start dead until legal (≥2 + one Human) | **STEAL** | `aa-1942-seat-combatants` + main `selectedCount >= 2` |
| Explicit 5-seat list; Empty clears; 2+ Humans = pass-and-play | **STEAL** | `bgio-lobby-seat-picker` / `bgio-local-pass-and-play` |
| Faction card is seat identity; Local / Online on home | **STEAL** | `root-digital-lobby-hud` |
| Easy / Med / Hard as AI tiers under AI | **STEAL** | same + existing `playerAI` |
| Touch-pan + stamp SoT + combat stages | **KEEP** | `.15` / `.14` / `.16` |

Invented: none of the grammar. Glue only: `seatOccupantView()`.

## Viz SCORE .16 carry-forward

`.16` T-hold was **PARTIAL** — `overflow:visible` only. After `.17` seat CSS, READY is **not** from CSS inspection.

Fail-closed is CDP `Input.dispatchTouchEvent` on an occupant chip → **MAIN `scrollTop` moves** and **`window`/`body` `scrollY` stays 0**. Footer stays a `flex:none` sibling outside MAIN. `touch-action:pan-y`. No `preventDefault` on lobby pan. `overscroll-behavior:contain`.

## Fail-closed QC @390 — PASS (local + tip)

| # | Gate | Result |
|---|---|---|
| **A1** | Stamp `.17` after hard reload (L0 + lobby + `__TR_GAME_VERSION`) | **PASS** |
| **S1** | All 5 seats Human·AI·Empty + Easy·Med·Hard; Americans unclipped | **PASS** |
| **S2** | Start dead at 0 seats and all-AI; live at 3 Humans | **PASS** |
| **T1** | No `preventDefault` on lobby `touchstart`/`touchmove` during pan | **PASS** — CDP |
| **T2** | MAIN `overflow-y:auto; touch-action:pan-y; overscroll-behavior:contain`; seats `pan-y`; html/body `overflow:hidden` | **PASS** — supporting |
| **T3** | CDP touch on occupant chip moves MAIN `scrollTop`; body `scrollY` 0 | **PASS** — `0 → 117 → 366`; body/window `scrollY` 0/0/0 |
| **T4** | Gesture started on Human/AI/Empty chip still pans MAIN | **PASS** — mid still |
| **T5** | Footer outside MAIN; last seat above Teams+Start with a gap | **PASS** — scroll-end still |

Unit: `test-three-solo-lobby` PASS. Combat stages untouched (`test-three-solo-play` PASS). Casualty YOU steppers **not** this tip.

Do not merge.
