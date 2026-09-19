# SCORE — V2.81.53-ux-preview.7-max
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

**Lineage:** Fat battle seed on PR76 hybrid tip (preview.7 wins kept). Do not merge to main.

## Playable pocket
Default `?three=1` is still the small Karelia (INF×3+FTR×1) → Finland pocket.

**Fat seed** — `?three=1&max=1` (aliases `?stress=1`, `?demo=max`):

| Side | Land | Counts |
|---|---|---|
| **FROM · Russians** | **Karelia S.S.R.** | INF×10 ART×6 TNK×6 FTR×4 BMB×3 (29) |
| **TO · Germans** | **Ukraine S.S.R.** | INF×8 ART×4 TNK×4 FTR×3 AA×3 (19 combat + 3 AA) |
| Alternate dest | Finland Norway | GER INF×2 |
| Landable | Karelia, Russia | RUS INF×1 on Russia |

Demo dice: AA miss · every combat round 2 ATK / 1 DEF hits so both sides get optional mixed-type casualty picks. Air must land after the take (planes-only Confirm).

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Partial select | **PASS** | INF `[-] 0/10 [+]` etc. Send 2 of 10. Not chip-all. |
| Congo click-through | **PASS** | Sheet +/− eat touches. Canvas ignores sheet/zoom rects. |
| Air land planes-only | **PASS** | No dest stack sheet. FTR+BMB + Confirm land. |
| Manual path | **PASS** | FROM → units → TO → Confirm. No Try. |
| Casualties | **PASS** | Picker when a choice exists; can assign 2+ of one type. |
| Chip mouseup | **PASS** | Kept from preview.6. |
| Tesla / Viz | **OFF** | Quiet James. Arc gates Viz. |
| Mobile ~390 | **PASS** | Fat steppers compact (`is-fat`). 64px Confirm. |

## How-to (390 · fat)
1. Open `?three=1&max=1`.
2. **Combat move** — Tap **Karelia** → steppers (partial OK, e.g. INF 2/10) → tap **Ukraine** → gold **Confirm: Attack Ukraine S.S.R.**
3. **Battle** — Fire AA (miss) → Continue → Roll → tap mixed types for 2 GER / 1 RUS hits → Take hits → repeat until Take Ukraine.
4. **Air land** — Planes-only card (FTR+BMB) + **Confirm land**. Tap teal **Russia** or **Karelia** → **Confirm: Land in …**.

## Stills @390
- `combat-move-steppers-390.png` — small pocket INF 0/3 FTR 0/1
- `combat-move-partial-inf-390.png` — INF 1/3 after +
- `air-land-planes-390.png` — fighter only + Confirm land
- `max-karelia-ukraine-stacks-390.png` — fat Karelia / Ukraine stacks (when captured)

**Vercel (fat):** https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&max=1
**Vercel (small):** https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/76 (draft · hybrid lineage · do not merge to main)
