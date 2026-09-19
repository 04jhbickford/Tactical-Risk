# SCORE — V2.81.53-ux-preview.1
**Preview only** `?three=1` or `?ux=1`. Live Canvas / main production untouched. Do not merge.

```
artSource=main
uxSource=threePreview
sideProject=true
doNotMerge=true
```

**Lineage:** stacked on latest **main** `V2.81.53` (NCM/air), not on the Imagine / Three art-gap bake.
**James (t3069u):** main branch art and tiles + the updated UX/UI. Keep as a side project.

## Layer A — art (main)
| Gate | Verdict | Note |
|---|---|---|
| Hero art is main tiles | **PASS** | `MapRenderer` draws `map/baseTiles` + `map/reliefTiles` + `smallMap.jpeg`. No `assets/three/board/world-land-albedo.png`. |
| Continent washes | **PASS** | Main `territoryRenderer.renderOwnershipOverlays` + `data/continents.json`. |
| Unit chits | **PASS** | Main `units/{Faction}/*.png` via `getUnitIconPath`. No Three plastic atlases. |
| Polygons / borders | **PASS** | Same `data/territories.json` + merged external edges as live Canvas. No coast-registration fight. |
| Imagine / art-gap bake | **ABSENT** | World plate / silhouette-painted basemap not loaded. |

## Layer B — UX (Three preview)
| Gate | Verdict | Note |
|---|---|---|
| DOM HUD L0/L1/L2 | **PASS** | Frosted ☰ · phase · seat · IPC; peek; one sheet. |
| Confirm exclusive gold | **PASS** | Ready `#C4A35A`. Idle `rgba(30,36,32,0.88)` / Select a territory. |
| Stack expand/collapse | **PASS** | Mid idle pip+N. Toggle + select/near expands main chits. |
| Select outline-only | **PASS** | Gold `#C4A35A` stroke, no fill. China uses main merged outer edges. |
| Mobile chrome | **PASS** | 390 safe-area L0 + Confirm + zoom 44pt. |
| Phase guide | **PASS** | Frosted Got it card; click-through stopped. |

## Stills
- `mid-board-main-art-hud.png` — Europe mid, main tiles + new HUD
- `stack-toggle.png` — Expand stacks
- `select-outline.png` — Germany gold outline, no wash fill
- `mobile-390.png` — 390×844

**Vercel:** _pending preview URL_
**PR:** _pending draft PR_
