# SCORE — V2.81.53-ux-preview.2
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
```

**Lineage:** follow-up on Hybrid PR68 (`cursor/main-art-three-ux-9380`). James he-correct: LOOKS GOOD, icons messy/busy on mobile. Tesla off.

## Layer A — art (main)
| Gate | Verdict | Note |
|---|---|---|
| Hero art is main tiles | **PASS** | Unchanged: `MapRenderer` 112 base + 112 relief + `smallMap.jpeg`. |
| Continent washes | **PASS** | Main overlays. |
| Unit chits | **PASS** | Main `units/{Faction}/*.png`. World-capped pip+N at Fit; no continent blobs. |
| Polygons / borders | **PASS** | Same `data/territories.json`. |
| Imagine / art-gap bake | **ABSENT** | `worldPlate: false`. |

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| DOM HUD L0/L1/L2 | **PASS** | Frosted ☰ · PLACE · Russians · IPC 24. Safe-area L0 + Confirm. |
| Confirm exclusive gold | **PASS** | Ready `#C4A35A`. Idle `Select a territory`. |
| Stack expand/collapse | **PASS** | Far always pip+N. Mid idle pip+N; selected/toggle uses typed pack. Near typed. |
| **No icon overlap** | **PASS** | Full-pitch `chitGridPack` + footprint cap + foreign shrink. Japan + 8-type stress clean at 0.22–2.0 zoom. |
| Small lands (Japan) | **PASS** | Home-island pin. Max 1 typed + +K. Piece ≤ world cap. |
| Select outline-only | **PASS** | Gold `#C4A35A` stroke, no fill wash. |
| Mobile chrome ~390 | **PASS** | 390×844 safe-area. Peek chips 48px. |
| Phase guide / Got it | **OFF** | Viz P1 coach removed. `guideOn=false`. |

## Computed proof
```
artSource=main uxSource=threePreview sideProject=true doNotMerge=true
iconPack=noOverlap  vizP1Coach=false
tiles:        112 base / 112 relief / smallMap
worldPlate:   false
```

## What changed vs preview.1
- Map chits use world-px + Fit cap (no 50–96 CSS blobs at mid/far).
- Stacks pack on a full-pitch grid; badges sit on the chit.
- Japan / small lands cap typed icons and overflow with +K.
- 8-kind stress (`?stress=1` or `stressMaxTypes`) does not collide.
- Coach **Got it** overlay removed.

## Stills
Pending 390 capture after local + Vercel preview.

**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/68 (draft · do not merge)
