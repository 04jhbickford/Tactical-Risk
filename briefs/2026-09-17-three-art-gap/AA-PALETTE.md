# A&A-inspired P0 palette (Three preview)
**As-of:** 17 Sep 2026 · James: closer to physical Axis & Allies board  
**Owner craft:** Viz · **Build:** TR · Preview only · Quiet to James · Tesla off  
**SoT for this lookpass:** hex below. Supersedes neon teal / cold grey plastic in prior QA.

Physical board read: parchment continents, olive-drab ownership washes, ink-muted sea, paper grain under print, **cream plastic** army pieces with painted faction rims — not UI flat fills.

---

## P0 hex lock (ship these)

### World
| Token | Hex | Role |
|---|---|---|
| `--land-base` | `#C4B896` | Parchment / khaki land albedo (warm, matte) |
| `--land-shadow` | `#8F8468` | Extrusion wall / undercut (olive-khaki) |
| `--land-grain` | `#B7AA82` @ 8–14% overlay | Paper grain multiply (see Texture) |
| `--ocean-deep` | `#3D5A66` | Muted slate-teal deep water |
| `--ocean-shelf` | `#4F6E78` | Shallower shelf (subtle; no neon) |
| `--coast-foam` | `#D9D2C0` @ 35–45% on 1px rim | Quiet foam hairline — **never emissive cyan** |
| `--border-ink` | `#3A3428` @ 55–70% | Soft dark hairline between lands |
| `--select-gold` | `#C4A35A` | Selection edge only (Civ/A&A amber, continuous) |
| `--legal-ink` | `#6B7F4A` @ 40% | Legal-move edge wash if shown (olive, not glow) |

### Ownership washes (15–22% over `--land-base`; soft, printable)
| Faction feel | Hex wash | Note |
|---|---|---|
| Soviets | `#8B3A3A` | Dried red on parchment |
| Germans | `#5A5A52` | Field grey |
| British | `#4A5C7A` | Muted navy |
| US | `#5C6B4A` | Olive drab |
| Japan | `#8A6B3A` | Warm ochre (not candy yellow) |
| Neutral / open | none | Keep `--land-base` only |

Do **not** flat-fill ownership at 100%. Wash must leave parchment + grain readable (Poly/Root soft tint).

### Units (plastic cream chits)
| Token | Hex | Role |
|---|---|---|
| `--chit-face` | `#F0E6D2` | Cream plastic top |
| `--chit-side` | `#D4C4A8` | Bevel / thickness |
| `--chit-glyph` | `#2C2820` | Silhouette ink on cream |
| `--chit-rim-*` | match faction wash hex at 100% | 2–3px rim = owner ID |
| `--pip-face` | `#F0E6D2` | Collapsed stack pip (same cream) |
| `--pip-ink` | `#2C2820` | Total **N** on pip |

Dense mid-zoom: **cream pip + faction rim + N only**. Type glyphs only on select / zoom-in.

### Chrome (edge only — board stays hero)
| Token | Hex | Role |
|---|---|---|
| `--hud-panel` | `#1E2420` @ 88% | Thin L0 / peek (warm near-black, not pure #000) |
| `--hud-ink` | `#E8E2D4` | Type on HUD |
| `--cta-confirm` | `#C4A35A` | **Named Confirm** only (same family as select-gold) |
| `--cta-ink` | `#1E2420` | Text on Confirm |

Kill: neon `#00ced1`-class ocean, cyan coast bloom, royal-blue debug quads, cold `#9e9e9e` land, grey scrap unit icons, mustard dashed vomit selection.

---

## Texture notes (P0 — cheap, in-repo)

1. **Paper grain on land** — tileable mono noise (256–512px), multiply or overlay at **8–14%** on `--land-base`; slight UV scale so Europe isn’t wallpaper-repeat obvious. No photo scan of a real A&A board (rights); procedural grain only.
2. **Land material** — matte / low roughness; soft hemisphere + one warm key; extrusion walls use `--land-shadow`. No glossy plastic continents.
3. **Ocean** — flat or tiny noise; **desaturated**; optional 5–8% depth darken toward open sea. **No** emissive coastline fringe.
4. **Chits** — opaque cream disc or short cylinder; soft contact shadow under piece; glyph = simple black silhouette (INF/TNK/FTR/ship), not Lucide UI icons.
5. **Coasts** — 1px `--coast-foam` or dark hairline against ocean; foam is paint, not glow.

---

## TR apply order
1. Swap materials to this hex table (kill old teal/grey).  
2. Grain overlay on land.  
3. Cream pip/chit + faction rim.  
4. Soft ownership wash.  
5. Continuous `--select-gold` ring; Confirm CTA = `--cta-confirm`.

Done when a 390 screenshot reads **tabletop A&A**, not debug GIS.
