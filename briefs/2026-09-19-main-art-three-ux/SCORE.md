# SCORE — V2.81.53-ux-preview.1
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
```

**Lineage:** stacked on latest **main** `V2.81.53` (NCM/air PR67). Not on the Imagine / Three art-gap bake.
**James (t3069u):** main branch art and tiles + the updated UX/UI. Keep as a side project.

## Layer A — art (main)
| Gate | Verdict | Note |
|---|---|---|
| Hero art is main tiles | **PASS** | Live + local: `MapRenderer` 112 base + 112 relief + `smallMap.jpeg`. No `world-land-albedo`. |
| Continent washes | **PASS** | Main `renderOwnershipOverlays` + `data/continents.json`. Europe olive / Africa ochre read on mid 390. |
| Unit chits | **PASS** | Main `units/{Faction}/*.png`. Pip+N at mid; expand uses the same chits. |
| Polygons / borders | **PASS** | Same `data/territories.json`. China `polys=2` `rings=1`. No coast-registration fight. |
| Imagine / art-gap bake | **ABSENT** | World plate / silhouette-painted basemap not loaded. Inspect `worldPlate: false`. |

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| DOM HUD L0/L1/L2 | **PASS** | Frosted ☰ · PLACE · Russians · IPC 24. Peek names Germany. One sheet. |
| Confirm exclusive gold | **PASS** | Ready `rgb(196, 163, 90)` / `Confirm: Germany`. Idle `Select a territory`. PLACE chip `rgba(30, 36, 32, 0.42)`. |
| Stack expand/collapse | **PASS** | Mid idle pip+N. Toggle → Collapse stacks; Germany INF/TNK/FTR + overflow. |
| Select outline-only | **PASS** | Gold `#C4A35A` stroke, no fill wash. |
| Mobile chrome | **PASS** | 390×844 safe-area L0 + Confirm + 44pt zoom. |
| Phase guide | **PASS** | Frosted Got it card; pointer stopped. |

## Computed proof (390)
```
artSource=main uxSource=threePreview sideProject=true doNotMerge=true
tiles:        112 base / 112 relief / smallMap
lod:          mid @390 Fit Europe
china:        rings=1 polys=2
confirm:      ready rgb(196, 163, 90) · idle Select a territory
PLACE:        rgba(30, 36, 32, 0.42)
select:       outline-only #C4A35A
worldPlate:   false
```

## Stills
- `mid-board-main-art-hud.png` — Europe mid, main tiles + new HUD
- `stack-toggle.png` — Expand/Collapse stacks
- `select-outline.png` — Germany gold outline, no wash fill
- `mobile-390.png` — 390×844
- `vercel-live-mid-390.png` — live preview `?three=1`

**Vercel:** https://tactical-risk20-4tbh1qis4-james-projects-20d8de40.vercel.app/?three=1  (HTTP 200)
**PR:** https://github.com/04jhbickford/Tactical-Risk/pull/68 (draft · do not merge)
