# SCORE — V2.81.53-ux-preview.8
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
tesla=off
scenario=karelia-ukraine-max
tryCombatMove=false
maxQuery=?three=1&max=1
```

**Lineage:** Sheet / casualty / combat IA on PR76 hybrid tip (preview.7-max wins kept). Do not merge to main.

## Playable pocket
Default `?three=1` is still the small Karelia (INF×3+FTR×1) → Finland pocket.

**Fat seed** — `?three=1&max=1` (aliases `?stress=1`, `?demo=max`):

| Side | Land | Counts |
|---|---|---|
| **FROM · Russians** | **Karelia S.S.R.** | INF×10 ART×6 TNK×6 FTR×4 BMB×3 (29) |
| **TO · Germans** | **Ukraine S.S.R.** | INF×8 ART×4 TNK×4 FTR×3 AA×3 (19 combat + 3 AA) |
| Alternate dest | Finland Norway | GER INF×2 |
| Landable | Karelia, Russia | RUS INF×1 on Russia |

Demo dice: AA miss · every combat round 2 ATK / 1 DEF hits. YOU assign the 1 attacker loss; THEY (defender) auto-take 2 in local/solo. Air must land after the take (planes-only Confirm).

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Partial select | **PASS** | INF `[-] 0/10 [+]` etc. Send 2 of 10. Not chip-all. |
| Zoom vs sheet | **PASS** | + / − / Fit hidden while unit sheet or battle is open. |
| Congo click-through | **PASS** | Sheet +/− eat touches. Canvas ignores sheet rects. |
| Air land planes-only | **PASS** | No dest stack sheet. FTR+BMB + Confirm land. |
| Manual path | **PASS** | FROM → units → TO → Confirm. No Try. |
| Casualties | **PASS** | YOU assign unlocks Confirm. THEY auto local/solo. |
| Combat IA | **PASS** | ATK gold / DEF steel dice, hit counts, You/They mapped. |
| 390 density | **PASS** | Compact steppers, 48px Confirm, more map. |
| Tesla / Viz | **OFF** | Quiet James. Arc gates Viz. |

## How-to (390 · fat)
1. Open `?three=1&max=1`.
2. **Combat move** — Tap **Karelia** → steppers (partial OK, e.g. INF 2/10) → tap **Ukraine** → gold **Confirm: Attack Ukraine S.S.R.** Zoom controls are gone while the sheet is open.
3. **Battle** — Fire AA (miss) → Continue → Roll. ATK vs DEF dice are labeled. Tap YOUR loss (e.g. ART) → gold **Confirm: Take hits**. THEY already took cheapest defender losses.
4. **Air land** — Planes-only card (FTR+BMB) + **Confirm land**. Tap teal **Russia** or **Karelia** → **Confirm: Land in …**.

## Stills @390
- `a-unit-sheet-no-zoom-390.png` — fat Karelia steppers, no Fit overlap
- `b-you-assign-confirm-390.png` — ART−1, Confirm: Take hits
- `c-compact-sheet-390.png` — denser 390 sheet, more map
- `d-combat-atk-def-dice-390.png` — labeled ATK/DEF dice + You/They

**PR:** draft on hybrid lineage · do not merge to main
