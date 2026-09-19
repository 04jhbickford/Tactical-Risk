# SCORE — V2.81.53-ux-preview.8
**Preview only** `?three=1&max=1`. Live Canvas / main untouched. Do not merge.

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
version=V2.81.53-ux-preview.8
```

**Lineage:** James he-correct on preview.7-max stills, PR76 tip. Hold merge.

## P0 bars
| Gate | Verdict | Note |
|---|---|---|
| Zoom overlap | **PASS** | Zoom hidden while unit sheet / battle open. Sheet owns +/−. |
| Casualty YOU | **PASS** | YOU pick enables Confirm. THEY cheapest-auto, still tappable. |
| Shrink sheet | **PASS** | Denser 36px stepper rows, compact head, more map. |
| Combat IA | **PASS** | You attack (gold) / they defend (steel). Hits + who absorbs. |
| Steppers / Congo / land / no Try | **KEEP** | preview.7 wins. |

## How-to (390 · fat)
Open `?three=1&max=1`. Tap **Karelia** → steppers (no zoom over +/−) → tap **Ukraine** → Confirm Attack. AA miss → Roll. YOU take 1 DEF hit (tap ART) → gold **Confirm: Take hits**. THEY take 2 ATK (cheapest, tap to change). Then land planes on teal Russia / Karelia.

## Counts (unchanged)
Karelia RUS INF×10 ART×6 TNK×6 FTR×4 BMB×3. Ukraine GER INF×8 ART×4 TNK×4 FTR×3 AA×3.

## Stills @390
- `preview8-sheet-no-zoom-390.png` — sheet open, zoom gone
- `preview8-you-assign-gold-390.png` — YOU pick, Confirm gold
- `preview8-dense-sheet-390.png` — denser bottom sheet
- `preview8-battle-ia-split-390.png` — ATK/DEF lanes

**Vercel:** https://tactical-risk20-git-cursor-unit-199216-james-projects-20d8de40.vercel.app/?three=1&max=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/76 (draft · hold merge)
