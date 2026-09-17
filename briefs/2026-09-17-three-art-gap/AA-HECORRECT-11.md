# AA he-correct · pass 11 (James 17 Sep ~4:20pm PT)
Preview only. No merge. Live Canvas V2.81.51.

## James fails (must fix)
1. **No map texture** — cardboard/parchment grain must be obvious at phone zoom.
2. **No continent colors** — classic A&A region washes (not flat bone sand).
3. **Icons washed out / hard to read** — cream-on-sand fails; need faction-colored molded plastic + contrast.
4. **Placement breaks** across zoom and mixed unit counts/types — implement stack LOD.

## Art bar
| Element | Spec |
|---|---|
| Board | Visible paper grain on land + ocean (refs/aa-board-continents.png) |
| Continents | Soft but unmistakable washes: Europe olive, USSR brown-tan, Africa/ME ochre, Asia muted green, Americas soft green |
| Ocean | Muted printed blue-grey; textured; no neon/cyan bloom |
| Units | Faction-colored A&A plastic silhouettes (refs/aa-plastic-units.png): DE grey, SU green, UK tan, US olive, JP orange-red. Thick dark outline + shadow. Kill cream discs / UI glyphs |

## Stack / zoom LOD (see ux/STACK-LOD.md)
- **Screen-space clamp** — chits never ant-size, never blow past territory
- **Far/mid:** one faction pip + total **N** badge (+ tiny type dots if mixed). No type parade
- **Near:** ≤3–4 typed plastic silhouettes + **+K** overflow; spiral/arc ≥4px gap
- **Select/peek:** full type×count list in peek only
- **Count badge:** high-contrast dark pill / white numeral always

## Done when
Europe @390 mid (pip+N readable) + near (typed spaced) + continent colors/texture obvious + unit closeup contrasts. Vercel preview URL + shots. Tesla off.
