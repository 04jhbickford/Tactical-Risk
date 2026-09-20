# READY — V2.81.56-ux-solo.17

**Hold merge.** Quiet James. Tip only. Do not merge to main.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Stamp after hard reload: `V2.81.56-ux-solo.17` · `/` `Cache-Control: no-store`

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

## Fail-closed QC @390 — PASS (local + tip)

| # | Gate | Result |
|---|---|---|
| **A1** | Stamp `.17` after hard reload (L0 + lobby + `__TR_GAME_VERSION`) | **PASS** |
| **S1** | All 5 seats Human·AI·Empty + Easy·Med·Hard; height 144; overflow visible; Americans not collapsed / unclipped | **PASS** |
| **S2** | Start dead at 0 seats (`Select at least 2 players`) and all-AI (`Need at least one Human`); live at 3 Humans | **PASS** |
| **T1** | CDP touch pan on seat card: `scrollTop` 0 → 118 → 366; `defaultPrevented` false; Americans above footer gap 95px | **PASS** |

Unit: `test-three-solo-lobby` PASS. Combat stages untouched (`test-three-solo-play` PASS).

Do not merge.
