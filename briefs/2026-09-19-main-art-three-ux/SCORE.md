# SCORE — V2.81.53-ux-preview.2
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
iconPack=noOverlap
vizP1Coach=false
```

**Lineage:** follow-up on Hybrid PR68 (`cursor/main-art-three-ux-9380`). James he-correct: LOOKS GOOD, icons messy/busy on mobile. Tesla off. Quiet until Viz re-gates.

## Layer A — art (main)
| Gate | Verdict | Note |
|---|---|---|
| Hero art is main tiles | **PASS** | Unchanged: `MapRenderer` 112 base + 112 relief + `smallMap.jpeg`. |
| Continent washes | **PASS** | Main overlays. Europe olive / Africa ochre on mid 390. |
| Unit chits | **PASS** | Main `units/{Faction}/*.png`. World-capped pip+N at Fit. |
| Polygons / borders | **PASS** | Same `data/territories.json`. China `polys=2` `rings=1`. |
| Imagine / art-gap bake | **ABSENT** | `worldPlate: false`. |

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| DOM HUD L0/L1/L2 | **PASS** | Frosted ☰ · PLACE · Russians · IPC 24. Safe-area L0 + Confirm. |
| Confirm exclusive gold | **PASS** | Ready `#C4A35A` / `Confirm: Japan`. Idle `Select a territory`. |
| Stack expand/collapse | **PASS** | Far always pip+N. Mid idle pip+N; selected/toggle typed. Near typed. |
| **No icon overlap** | **PASS** | Full-pitch pack + Fit world cap + foreign shrink. `overlap.clean=true` at 0.22–2.0. |
| Small lands (Japan) | **PASS** | Home pin `(2594,736)`. Classic 6-type → 1 chit + +K. Piece ~21 world at 1.15. |
| Max unit-type (8) | **PASS** | Japan INF + +35. Germany 3 typed + +29. No collisions. Peek is a single 390 scroll row. |
| Select outline-only | **PASS** | Gold `#C4A35A` stroke, no fill wash. |
| Mobile chrome ~390 | **PASS** | 390×844. Peek chips 48px, nowrap scroll. |
| Phase guide / Got it | **OFF** | Viz P1 coach removed. `guideOn=false`. No Got it button. |

## Computed proof (390)
```
artSource=main uxSource=threePreview sideProject=true doNotMerge=true
iconPack=noOverlap  vizP1Coach=false
tiles:        112 base / 112 relief / smallMap
lod:          mid @390 Fit Europe zoom=0.422
overlap:      inner=0 foreign=0 clean=true
japan:        tokens=2 piece≈21.4 overlap=0
china:        rings=1 polys=2
confirm:      idle Select a territory · ready #C4A35A
worldPlate:   false
guideOn:      false
```

## What changed vs preview.1
- Map chits use world-px + Fit cap (no 50–96 CSS blobs at mid/far).
- Stacks pack on a full-pitch grid; count badges sit on the chit.
- Japan / small lands cap typed icons and overflow with +K.
- 8-kind stress (`?stress=1`) does not collide.
- Coach **Got it** overlay removed (Viz P1).
- Peek roster is a single horizontal scroller at 390.

## Stills @390
- `mobile-390-mid.png` — Europe mid, small pips, no Got it
- `germany-select-390.png` — Germany selected, 4 typed tokens, gold Confirm
- `japan-near-390.png` — Japan near, INF + overflow, no overlap
- `japan-stress-8types-390.png` — 8 kinds → INF + +35, peek scroll
- `germany-stress-8types-390.png` — 8 kinds → 3 typed + +29
- `vercel-live-mid-390.png` — live preview `?three=1` @390

**Vercel:** https://tactical-risk20-jf9tdzzn4-james-projects-20d8de40.vercel.app/?three=1  (HTTP 200)
**Stress:** https://tactical-risk20-jf9tdzzn4-james-projects-20d8de40.vercel.app/?three=1&stress=1
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/68 (draft · do not merge)
