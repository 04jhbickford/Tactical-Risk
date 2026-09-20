# Lookpass — V2.81.56-ux-solo.17

**Hold merge.** Quiet James. Tesla off. Seat cards Human / AI / Empty + keep `.15` lobby touch-pan + `.16` combat stages + stamp SoT.
Fail-closed **A1 / occupant chrome / Start gate / T1**. Do not merge.

Tip: https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&solo=1  
Hard reload @390×844: L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.17`. `/` is `Cache-Control: no-store`.

## Steal vs invent

Catalog SoT: `briefs/2026-09-20-boardgame-sandbox-ref/` (SANDBOX-RECS §A #3, GAPS P0 #4). Not present in this checkout; James tip brief named the steal list.

**Stole**
- `aa-1942-seat-combatants` — nation/seat cards; occupant Human / AI / Empty; Start dead until legal
- `bgio-lobby-seat-picker` / `bgio-local-pass-and-play` — explicit 5-seat list; Empty clears; local pass-and-play
- `root-digital-lobby-hud` — faction card is seat identity; home Local / Online (Online off this tip)
- Easy / Med / Hard as AI tiers under AI occupant (not a fourth occupant kind)

**Invented**
- None of the grammar. `seatOccupantView()` + `setLobbyOccupant(..., 'empty'|'ai'|tier)` is glue over `selectedPlayers` / `playerAI`.

**Kept**
- `.15` lobby touch-pan + `.14` stamp SoT
- `.16` `playStage()` combat machine (untouched)

## Fail-closed

| # | Gate | Fail-closed | Proof |
|---|---|---|---|
| **A1** | Stamp exact `.17` after hard reload (L0 + lobby + `__TR_GAME_VERSION`) | yes | still + CDP |
| **S1** | All 5 seats show Human · AI · Empty + Easy · Med · Hard; grow-to-fit; no clip; Americans not collapsed | yes | still @390 |
| **S2** | Start disabled at 0 seats and at all-AI; enabled at 1 Human + AI / 2+ Humans | yes | unit + still |
| **T1** | Lobby still pans (do not regress `.15`) | yes | CDP touch smoke |

## QC @390 tip + local (PASS)

Tip `?three=1&solo=1` after hard reload. `/` is `Cache-Control: no-store`. Live HTML + L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.17`.

| # | Ask | QC @390 |
|---|---|---|
| **A1** | Stamp `.17` after hard reload | **PASS** — tip L0 + lobby + `__TR_GAME_VERSION` = `V2.81.56-ux-solo.17` |
| **S1** | All 5 seats full occupant chrome | **PASS** — Human/AI/Empty + Easy/Med/Hard; height 144; overflow visible; Americans unclipped |
| **S2** | Start gate | **PASS** — dead at 0 seats and all-AI; `Start Game (3 Players)` after 3 Humans |
| **T1** | Lobby MAIN still pans | **PASS** — CDP touch `scrollTop` 0 → 118 → 366; footer sibling; Americans gap 95px |

Unit: `test-three-solo-lobby`, `test-three-solo-play`, `test-ux-preview-chrome-hit`.

Stills: `/opt/cursor/artifacts/screenshots/lookpass17_a1_stamp_hard_reload_390.png`, `lookpass17_seats_empty_start_dead_390.png`, `lookpass17_t1_setup_top_390.png`, `lookpass17_t5_scroll_end_last_seat_390.png`.

Do not merge.
