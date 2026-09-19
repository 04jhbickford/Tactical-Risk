# SCORE — V2.81.53-ux-preview.2
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
```

**Lineage:** follow-up on PR68 hybrid (`cursor/main-art-three-ux-9380`). James he-correct: mobile icon overlap + kill coach overlay.

## Layout strategy
Idle at every zoom is **one pip+N**. Piece size is the min of a phone cap (30px), the land’s screen footprint, and **32% of the nearest neighbor** so Germany/West Europe and Japan/Japan Sea Zone do not collide at 390 mid.

**Expand** (stack toggle or selected, not far) only if a 2–3 chit cluster still fits inside that budget. Dense / small lands (Japan, UK, islands) and max-type rosters stay pip+N at mid. Phone/dense typed cap is 2 + overflow. Coach “Got it” card is gone on hybrid entry.

## Layer A — art (main)
| Gate | Verdict | Note |
|---|---|---|
| Hero art is main tiles | **PASS** | Unchanged from preview.1. |
| Unit chits | **PASS** | Main `units/{Faction}/*.png`. Pip+N default; expand uses the same chits. |
| Imagine / art-gap bake | **ABSENT** | `worldPlate: false`. |

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| Stack overlap 390 | **PASS** | Computed: idle + expand at z=0.22 / 0.42 / 0.70 / 1.15, no neighbor circle hits. |
| Japan crowded | **PASS** | Classic 6-type and 8-type crowd stay pip at mid. |
| Stack toggle | **PASS** | Mid stays pip where density is high; near Germany may cluster inside the land. |
| Coach overlay | **PASS** | No `#three-phase-guide` / “Got it” on hybrid boot. |
| Confirm exclusive gold | **PASS** | Unchanged. |
| Select outline-only | **PASS** | Unchanged. |

## Computed proof (390)
```
artSource=main uxSource=threePreview sideProject=true doNotMerge=true
version:      V2.81.53-ux-preview.2
coachGuide:   false
lod:          mid @390 Fit Europe
japan:        pip (6-type + 8-type crowd)
overlap:      none at out/mid/in
```

## Stills
- `japan-crowded.png` — Japan max-type, pip+N, no spill
- `europe-mid.png` — Europe mid zoom
- `mobile-390-chrome.png` — 390 CSS + phone chrome
- `stack-collapsed.png` / `stack-expanded.png` — toggle

**PR:** follow-up draft on the PR68 side branch. Do not merge to main.
