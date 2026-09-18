# A&A-inspired P0 palette (Three preview)
**As-of:** 17 Sep 2026 (rev continent washes) · James: A&A board homage + Risk-style continent colors  
**Owner craft:** Viz · **Build:** TR · Preview only · Quiet to James · Tesla off  
**SoT for this lookpass:** hex below. Supersedes neon teal / cold grey plastic in prior QA.

Physical board read: parchment base, **Risk-readable continent tint blocks** (printed A&A feel — muted, not candy Risk primaries), faction ownership as a second soft wash, ink-muted sea, paper grain, **cream plastic** armies with painted faction rims — not UI flat fills / GIS olive slab.

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


### Continent washes (Risk-readable · A&A printed feel)
Region tint over `--land-base` + grain. **18–28% multiply/opacity** so parchment shows through. Not saturated Risk toy colors; not flat GIS olive.

| Continent / block | Token | Hex wash | Print read |
|---|---|---|---|
| Europe | `--cont-europe` | `#6B7A4A` | Olive / drab green (classic A&A Europe) |
| USSR / Soviet territories | `--cont-ussr` | `#8A7355` | Brown-tan / khaki-brown |
| Asia (non-USSR) | `--cont-asia` | `#5F7A5A` | Muted sage green |
| Africa | `--cont-africa` | `#B08948` | Ochre / sand-ochre |
| Middle East / N. Africa hinge | `--cont-mideast` | `#A09058` | Dusty khaki-gold (optional bridge) |
| North America | `--cont-na` | `#6A8B6E` | Soft green |
| South America | `--cont-sa` | `#5A8A72` | Soft teal-green |
| Pacific / ANZAC / islands | `--cont-pacific` | `#7A6B8A` | Muted mauve-grey (quiet; don’t purple-candy) |
| Sea zones | — | use ocean tokens | No continent wash |

**Stacking order (bottom → top):** parchment albedo + grain → **continent wash** → faction ownership wash (15–22%, only if occupied) → border ink → units.

**Rules**
- Continent color = geography literacy (Risk glance). Faction rim/wash = who owns it (A&A). Never replace continent tint with faction at 100%.
- Same continent = one wash family; don’t per-territory random hues.
- Kill: candy Risk red/yellow/blue blocks, neon, uniform olive planet, grey ocean noise.

### Ownership washes (15–22% over `--land-base`; soft, printable)
| Faction feel | Hex wash | Note |
|---|---|---|
| Soviets | `#8B3A3A` | Dried red on parchment |
| Germans | `#5A5A52` | Field grey |
| British | `#4A5C7A` | Muted navy |
| US | `#5C6B4A` | Olive drab |
| Japan | `#8A6B3A` | Warm ochre (not candy yellow) |
| Neutral / open | none | Keep `--land-base` only |

Do **not** flat-fill ownership at 100%. Ownership sits **on top of** continent wash; both must leave parchment + grain readable (Poly/Root soft tint).

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
1. Swap materials to this hex table (kill old teal/grey / flat olive planet).  
2. Grain overlay on land.  
3. **Continent washes** (table above) — Risk glance, A&A print.  
4. Soft faction ownership wash on top (occupied only).  
5. Cream pip/chit + faction rim.  
6. Continuous `--select-gold` ring; Confirm CTA = `--cta-confirm`.

Done when a 390 screenshot reads **printed A&A board with Risk-clear continents**, not debug GIS.
