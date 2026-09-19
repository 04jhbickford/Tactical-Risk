# SCORE — V2.81.53-ux-preview.9
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
version=V2.81.53-ux-preview.9
```

**Lineage:** PR76 / preview.8 tip. P0.2 hotfix. Hold merge.

## P0 bars
| Gate | Verdict | Note |
|---|---|---|
| Zoom overlap | **KEEP** | Zoom hidden while unit sheet / battle open. Sheet owns +/−. |
| Casualty YOU | **FIX** | YOU count matching required hits enables Confirm. THEY cheapest-auto, tappable, does not gate. Re-tap does not toggle off. |
| Shrink sheet | **KEEP** | Denser 36px stepper rows, compact head, more map. |
| Combat IA | **KEEP** | You attack (gold) / they defend (steel). Hits + who absorbs. |
| Steppers / Congo / land / no Try | **KEEP** | preview.7 wins. |

## How-to (390 · fat)
Open `?three=1&max=1`. Tap **Karelia** → steppers (no zoom over +/−) → tap **Ukraine** → Confirm Attack. AA miss → Roll. YOU take 1 DEF hit (tap ART) → gold **Confirm: Take hits** (THEY can stay cheapest). Then land planes on teal Russia / Karelia.

## Counts (unchanged)
Karelia RUS INF×10 ART×6 TNK×6 FTR×4 BMB×3. Ukraine GER INF×8 ART×4 TNK×4 FTR×3 AA×3.

## Stills @390
- `preview9-you-assign-gold-390.png` — YOU ART−1, gold **Confirm: Take hits**

**Vercel:** https://tactical-risk20-git-cursor-casua-adb3da-james-projects-20d8de40.vercel.app/?three=1&max=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/79 (draft · hold merge · base PR76 tip)
