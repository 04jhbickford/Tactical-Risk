// V2.81.52-three-polish.41 silhouette-first. Select outline-only, no interior wash.
// Chrome locks from .26. Faction plastic from .29. Run: node tools/test-three-art-gap.mjs

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { GAME_VERSION, SCHEMA_VERSION } =
  await import(pathToFileURL(join(root, 'src/version.js')));
const {
  lodBand,
  hexPack,
  spiralPack,
  separatePoints,
  isSupportType,
  isDenseBand,
  showMinis,
  nearLayout,
  primaryType,
  shouldCollapse,
  worldSizeFromScreen,
  NEAR_MAX,
  PIP_PX,
  PIECE_PX,
  clusterPack,
  packPitchFor,
  footprintPiecePx,
  pieceWorldCap,
  isSmallLand,
  territoryFootprint,
  DENSE_LANDS,
  JAPAN_HOME_CENTER,
  denseFootprint,
} = await import(pathToFileURL(join(root, 'src/map/threeMapDensity.js')));

const chits = readFileSync(join(root, 'src/map/threeMapChits.js'), 'utf8');
const palette = readFileSync(join(root, 'src/map/threeMapPalette.js'), 'utf8');
const spike = readFileSync(join(root, 'src/map/threeMapSpike.js'), 'utf8');
const chrome = readFileSync(join(root, 'src/map/threeMapChrome.js'), 'utf8');
const art = readFileSync(join(root, 'src/map/threeMapArt.js'), 'utf8');
const terrain = readFileSync(join(root, 'src/map/threeMapTerrain.js'), 'utf8');
const baker = readFileSync(join(root, 'tools/bake-james-hecorrect.py'), 'utf8');
const albedoBaker = readFileSync(join(root, 'tools/bake-world-land-albedo.py'), 'utf8');
const outlineSrc = readFileSync(join(root, 'src/map/threeMapOutline.js'), 'utf8');
const { territoryOutlineRings } = await import(pathToFileURL(join(root, 'src/map/threeMapOutline.js')));
const territories = JSON.parse(readFileSync(join(root, 'data/territories.json'), 'utf8'));

let failures = 0;
const check = (label, cond) => {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', label);
  } else {
    console.log('ok  :', label);
  }
};

function pngOk(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) return false;
  const buf = readFileSync(p);
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

check('GAME_VERSION is V2.81.52-three-polish.41', GAME_VERSION === 'V2.81.52-three-polish.41');
check('SCHEMA stays 11', SCHEMA_VERSION === 11);
check('land mini atlas is real PNG', pngOk('assets/three/units/units-land-minis.png'));
check('naval mini atlas is real PNG', pngOk('assets/three/units/units-naval-minis.png'));
check('terrain forest tile', pngOk('assets/three/board/terrain-forest.png'));
check('terrain mountain tile', pngOk('assets/three/board/terrain-mountain.png'));
check('terrain arid tile', pngOk('assets/three/board/terrain-arid.png'));
check('terrain snow tile', pngOk('assets/three/board/terrain-snow.png'));
check('generated parchment tile', pngOk('assets/three/board/board-parchment-tile.png'));
check('generated ocean tile', pngOk('assets/three/board/board-ocean-tile.png'));
check('generated Europe wash', pngOk('assets/three/board/wash-europe.png'));
check('generated USSR wash', pngOk('assets/three/board/wash-ussr.png'));
check('generated Africa wash', pngOk('assets/three/board/wash-africa.png'));
check('continent ref on disk', pngOk('briefs/2026-09-17-three-art-gap/refs/aa-board-continents.png'));
check('plastic ref on disk', pngOk('briefs/2026-09-17-three-art-gap/refs/aa-plastic-units.png'));

check('plastic atlas cells INF/TNK/ART/FTR',
  /infantry: \{ atlas: 'land', col: 0, row: 0 \}/.test(chits)
  && /armour: \{ atlas: 'land', col: 1, row: 0 \}/.test(chits)
  && /artillery: \{ atlas: 'land', col: 2, row: 0 \}/.test(chits)
  && /fighter: \{ atlas: 'land', col: 3, row: 0 \}/.test(chits));
check('mid pip stays cream token (not a mini parade)',
  /drawCreamToken/.test(chits)
  && /paintPip/.test(chits)
  && /glyph: null/.test(chits)
  && /ZERO type parade/.test(chits)
  && !/paintMoldedMini/.test(chits.slice(chits.indexOf('export function paintPip'))));
check('near/tray uses molded plastic minis, not glyph-on-disc',
  /paintMoldedMini/.test(chits)
  && /units-land-plastic\.png/.test(chits)
  && /faction-tinted molded plastic/.test(chits)
  && /paintPiece[\s\S]*paintMoldedMini/.test(chits)
  && !/paintPiece[\s\S]{0,80}paintCreamChit/.test(chits));
check('peek roster uses the same mini paint',
  /pieceIconDataUrl/.test(chrome) && /paintPiece/.test(chits));
check('cream plastic face #F0E6D2', /#F0E6D2/.test(chits) && /CREAM/.test(chits));
check('molded bevel + thick outline ≥2.5px screen',
  /Emboss \/ bevel/.test(chits)
  && /outlineW = Math\.max\(14/.test(chits)
  && /≥2\.5px screen/.test(chits));
check('faction rim + dark outline on cream token',
  /Faction rim/.test(chits) && /#1A1610/.test(chits) && /strokeStyle = faction/.test(chits));
check('mixRgb returns hex so tint cannot collapse to grey', /padStart\(2, '0'\)/.test(chits) && !/return `rgb\(\$\{m\[0\]\}/.test(chits));
check('mid pip large enough to read token', PIP_PX === 64);
check('mid pip keeps contact shadow', /shadow: true/.test(chits) && /drawContactShadow/.test(chits));
check('no photoreal photo-scan figurine path', !/drawPhotorealPlastic/.test(chits));
check('baker cream-lifts atlas (no baked black halo)',
  /def cream_lift/.test(baker) && /def strip_black_halo/.test(baker) && !/MaxFilter\(11\)/.test(baker));
check('baker flattens parchment blotches', /def flatten_blotch/.test(baker) && /make_tileable\(parchment, 96\)/.test(baker));
check('paper UV offsets break tile seams', /PAPER_UV_SHIFT/.test(palette) && /PAPER_UV = 20/.test(palette));
check('thick dark outline', /#1A1610/.test(chits));
check('contact shadow under plastic', /drawContactShadow/.test(chits));
check('glossy toy-plastic specular lobe',
  /glossy toy-plastic specular/.test(chits)
  && /tight lobe/.test(chits)
  && /rgba\(255,255,255,0\.92\)/.test(chits)
  && /createRadialGradient/.test(chits));
check('faction plastic DE/SU/UK/US/JP',
  /#6A6C68/.test(palette) && /#2F7A2A/.test(palette) && /#8E6A38/.test(palette)
  && /#4E6828/.test(palette) && /#D24A1C/.test(palette));

check('continent Europe olive (AA-PALETTE)', /Europe: '#6B7A4A'/.test(palette));
check('continent USSR leftover only, not a bonus group', /USSR: '#8A7355'/.test(palette));
check('continent Africa ochre', /Africa: '#B08948'/.test(palette));
check('continent Asia muted green (not USSR brown)', /Asia: '#5F7A5A'/.test(palette));
check('continent NA green', /'North America': '#6A8B6E'/.test(palette));
check('continent SA warm tan', /'South America': '#9B7E5A'/.test(palette));
check('continent Oceania teal-sage', /Oceania: '#6A8B8A'/.test(palette));
check('continent ME dusty khaki', /'Middle East': '#A09058'/.test(palette));
check('continent wash quiet stain', /CONTINENT_WASH_STRENGTH = 0\.16/.test(palette));
check('Viz wash is 18-28% over parchment not solid',
  /WASH_STRENGTH = 0\.28/.test(baker)
  && /np\.clip\(strength.*0\.18, 0\.28\)/.test(baker)
  && !/WASH_COLORIZE = 0\.70/.test(baker)
  && /exact hex @ 18–28% over parchment/.test(baker));
check('AA-RISK-HOMAGE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/AA-RISK-HOMAGE.md')));
check('ownership wash 15-22%', /OWNER_WASH_STRENGTH = 0\.18/.test(palette));
check('faction wash SU/DE/UK/US/JP',
  /#8B3A3A/.test(palette) && /#5A5A52/.test(palette) && /#4A5C7A/.test(palette)
  && /#5C6B4A/.test(palette) && /#8A6B3A/.test(palette));
check('ocean pale washed STYLE REF', /oceanDeep: '#C4C2B0'/.test(palette) && /oceanShelf: '#D0CCC0'/.test(palette));
check('no charcoal ocean leftover', !/#7A90A0/.test(palette));
check('baked wash is albedo not 14% flatten',
  /imageToTex\(washes\[i\]/.test(palette) && !/GRAIN_MULTIPLY = 0\.14/.test(palette));
check('no greyscale contrastGrain', !/function contrastGrain/.test(palette));
check('loads generated wash tiles', /WASH_TEX/.test(palette) && /wash-europe\.png/.test(palette));
check('James parchment macro on disk', pngOk('briefs/2026-09-17-three-art-gap/refs/board-parchment-macro-tile.png'));
check('James ocean macro on disk', pngOk('briefs/2026-09-17-three-art-gap/refs/board-ocean-print-macro-tile.png'));
check('James hi-detail unit atlas on disk', pngOk('briefs/2026-09-17-three-art-gap/refs/units-molded-plastic-atlas-hi.png'));
check('land lids use wash map not flat side',
  /const mats = \[materials\.top, materials\.side\]/.test(art)
  && !/\[materials\.side, materials\.top/.test(art));
check('board textures keep fiber (no mipmaps)', /generateMipmaps = false/.test(palette));
check('land/ocean are MeshStandard not MeshBasic',
  /MeshStandardMaterial/.test(palette) && /roughness: world \? 0\.88 : 0\.76/.test(palette)
  && /roughness: 0\.90/.test(palette)
  && /vertexColors: true/.test(palette)
  && !/new THREE\.MeshBasicMaterial/.test(palette));
check('parchment normal + AO maps',
  pngOk('assets/three/board/board-parchment-normal.png')
  && pngOk('assets/three/board/board-parchment-ao.png')
  && pngOk('assets/three/board/board-ocean-normal.png'));
check('PRODUCTION-PATH standing SoT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/PRODUCTION-PATH.md')));
check('ASK-REFRAME SoT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/ASK-REFRAME.md')));
check('AA-RISK-HOMAGE SoT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/AA-RISK-HOMAGE.md')));
check('ART-PIPELINE SoT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/ART-PIPELINE.md')));
check('AA-PALETTE SoT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/AA-PALETTE.md')));
check('BAR-POLYTOPIA-ROOT-TTR scorecard on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/BAR-POLYTOPIA-ROOT-TTR.md')));
check('PRODUCTION-PATH is standing SoT in spike', /PRODUCTION-PATH\.md/.test(spike));
check('hemi + warm key + ACES',
  /HemisphereLight/.test(spike) && /DirectionalLight\(0xFFE2B0/.test(spike)
  && /ACESFilmicToneMapping/.test(spike));
check('key/fill drama: warm key + cool fill/hemi',
  /warm-key-cool-fill/.test(spike)
  && /HemisphereLight\(0xD8D2C4, 0x5A5040/.test(spike)
  && /DirectionalLight\(0x7E9AAB/.test(spike)
  && /0\.24/.test(spike));
check('p37 paper-preserving lights keep STYLE REF watercolor',
  /HemisphereLight\(0xD8D2C4, 0x5A5040, 1\.08\)/.test(spike)
  && /toneMappingExposure = 2\.08/.test(spike)
  && /LinearToneMapping/.test(spike)
  && /ACESFilmicToneMapping/.test(spike));
check('parchment tooth punches at 390 mid',
  /TOOTH_STRENGTH = 0\.42/.test(palette)
  && /GRAIN_MULTIPLY = 0\.78/.test(palette)
  && /macro paper tooth/.test(palette)
  && /TOOTH_NORMAL_MID = 2\.05/.test(palette)
  && /IMHOF_NORMAL_SCALE = 0\.20/.test(palette)
  && /normalScale\.set\(n, n\)/.test(palette));
check('lod tooth is loud mid / clean near',
  /TOOTH_NORMAL_NEAR = 1\.08/.test(palette)
  && /TOOTH_ROUGH_NEAR = 0\.86/.test(palette)
  && /applyLodTooth/.test(palette)
  && /loud mid tooth/.test(palette)
  && /applyLodTooth\(landMats/.test(spike));
check('RoomEnvironment for ocean spec', /RoomEnvironment/.test(spike) && /PMREMGenerator/.test(spike));
check('coast foam mask band', /makeFoamBandMeshes/.test(art) && /makeFoamMaterial/.test(palette));
check('soft coast AO band', /makeCoastAoMeshes/.test(art) && /makeCoastAoMeshes/.test(spike));
check('ocean open-sea vertex darken', /OCEAN_OPEN_DARKEN = 0\.04/.test(palette) && /vertexColors/.test(palette));
check('foam coast is a hairline', /makeLineMat\(PALETTE\.foam, 1\.15/.test(spike));
check('select stack lift 2-4px / 150ms micro-settle',
  /liftSelected/.test(spike)
  && /SELECT_LIFT_MS = 150/.test(spike)
  && /SELECT_LIFT_PX = 3\.2/.test(spike)
  && /micro-settle/.test(spike)
  && !/bobSelected/.test(spike));
check('tiny land bevel for crease AO', /bevelEnabled: true/.test(art));
check('atlas board texture ref', pngOk('briefs/2026-09-17-three-art-gap/refs/aa-board-continents-texture.png')
  || pngOk('briefs/2026-09-17-three-art-gap/refs/aa-board-continents.png'));
check('atlas plastic photo ref', pngOk('briefs/2026-09-17-three-art-gap/refs/aa-plastic-units-photo.png')
  || pngOk('briefs/2026-09-17-three-art-gap/refs/aa-plastic-units.png'));
check('Arc target unit atlas', pngOk('briefs/2026-09-17-three-art-gap/refs/arc-units-molded-atlas.png'));
check('Arc target ocean tile', pngOk('briefs/2026-09-17-three-art-gap/refs/arc-ocean-print-tile.png'));
check('Arc target parchment tile', pngOk('briefs/2026-09-17-three-art-gap/refs/arc-parchment-grain-tile.png'));
check('select gold only', /select: '#C4A35A'/.test(palette));
check('no neon teal leftover', !/#00ced1/i.test(palette) && !/#44C5BD/.test(palette));

check('LOD far/mid/near', lodBand(240) === 'far' && lodBand(160) === 'mid' && lodBand(80) === 'near');
check('dense mid is pip band', isDenseBand('mid') && isDenseBand('far') && !isDenseBand('near'));
check('near max 4', NEAR_MAX === 4);
check('primaryType is first priority', primaryType([
  { type: 'factory', quantity: 1 },
  { type: 'infantry', quantity: 4 },
]) === 'infantry');
const six = [
  { type: 'infantry', quantity: 4 },
  { type: 'armour', quantity: 2 },
  { type: 'fighter', quantity: 1 },
  { type: 'bomber', quantity: 1 },
  { type: 'factory', quantity: 1 },
  { type: 'aaGun', quantity: 1 },
];
const near = nearLayout(six);
check('near overflows 6 types to 3 +K', near.shown.length === 3 && near.overflowQty === 3);
check('near 4 types has no overflow', nearLayout(six.slice(0, 4)).overflowQty === 0);
check('screen clamp grows with distance',
  worldSizeFromScreen(36, 200, 42, 844) > worldSizeFromScreen(36, 80, 42, 844));
check('collapse when spiral exceeds drift', shouldCollapse(8, 6, 10) && !shouldCollapse(2, 6, 14));

const packed = spiralPack(4, 6);
const minPacked = packed.slice(1).reduce((m, p) => Math.min(m, Math.hypot(p.x, p.z)), Infinity);
check('spiral pack spreads 4 tokens', packed.length === 4 && minPacked > 4);
check('hexPack alias still spreads', hexPack(3, 5).length === 3);

const piled = [
  { x: 0, z: 0, homeX: 0, homeZ: 0, maxDrift: 10 },
  { x: 0.2, z: 0, homeX: 6, homeZ: 0, maxDrift: 10 },
];
separatePoints(piled, 6);
check('collision spacing separates piles', Math.hypot(piled[0].x - piled[1].x, piled[0].z - piled[1].z) >= 5.4);

check('spike uses STACK-LOD not dual parade',
  /nearLayout/.test(spike) && /isDenseBand\(band\)/.test(spike)
  && /ZERO type parade/.test(spike));
check('spike mid pip ignores type / primaryType',
  !/primaryType\(stacks\)/.test(spike)
  && /pipTexture\(owner, total\)/.test(spike)
  && !/makePipTexture\([^)]+type/.test(spike));
check('near never collapses typed chits back to pip',
  /Near\/select never falls back to pip/.test(spike)
  && /isStackExpanded/.test(spike)
  && !/dense \|\| shouldCollapse/.test(spike));
check('select or near shows molded minis; mid idle stays pip',
  showMinis('near', false) && showMinis('mid', true) && !showMinis('mid', false)
  && !showMinis('far', false) && PIECE_PX >= 96);
check('continent chroma punch at runtime', /CONTINENT_CHROMA_PUNCH = 0\.22/.test(palette));
check('ocean shelf + grain', /oceanShelf/.test(palette) && /OCEAN_GRAIN/.test(palette));
check('gold select emissive on land', /0xC4A35A/.test(spike) && /emissiveIntensity/.test(spike));
check('iPhone two-finger pinch',
  /touchstart/.test(spike) && /dollyBy\(factor/.test(spike)
  && /touches\.TWO = THREE\.TOUCH\.ROTATE/.test(spike)
  && /worldOnPlane/.test(spike) && /panByWorld/.test(spike));
check('spike gold select not blue glow',
  /never a blue glow ring/.test(spike) && /select: '#C4A35A'/.test(palette));
check('chrome frosted + SF + 44pt',
  /backdrop-filter:saturate\(1\.35\) blur\(22px\)/.test(chrome)
  && /-apple-system/.test(chrome)
  && /min-height:50px/.test(chrome)
  && /calc\(16px \+ env\(safe-area-inset-bottom/.test(chrome)
  && /width:44px; height:44px/.test(chrome)
  && /min-height:44px/.test(chrome)
  && /THREE-IPHONE-UI\.md/.test(chrome));
check('L0 frost is thin vibrancy not slab',
  /saturate\(1\.35\) blur\(22px\)/.test(chrome)
  && /rgba\(30,36,32,0\.12\)/.test(chrome)
  && /native vibrancy/.test(chrome)
  && !/rgba\(30,36,32,0\.26\) 0%/.test(chrome)
  && !/rgba\(30,36,32,0\.50\) 0%/.test(chrome));
check('zoom chrome is quiet frost, never mustard/gold',
  /#three-zoom button/.test(chrome)
  && /P26 HARD: zoom is quiet L0 frost/.test(chrome)
  && /background:rgba\(30,36,32,0\.62\)/.test(chrome)
  && !/linear-gradient\(180deg, rgba\(255,255,255,0\.16\)/.test(chrome)
  && !/#three-zoom button[\s\S]*#C4A35A/.test(chrome));
check('PLACE phase chip is quiet frost, never Confirm gold',
  /#three-phase/.test(chrome)
  && /PLACE must never wear Confirm gold/.test(chrome)
  && /#three-l0 \.three-l0-chip \{[\s\S]*?background:rgba\(30,36,32,0\.42\)/.test(chrome)
  && !/#three-phase[\s\S]{0,80}#C4A35A/.test(chrome));
check('chrome gold fill is Confirm-only (no sheet/zoom/PLACE mustard)',
  /#three-confirm\.is-ready:not\(:disabled\):not\(\.is-idle\) \{[\s\S]*?background:#C4A35A/.test(chrome)
  && !/rgba\(196,163,90/.test(chrome)
  && /P26: sheet hairline is quiet frost/.test(chrome)
  && (chrome.match(/background:#C4A35A/g) || []).length === 1);
check('chrome pale parchment-sea page bg', /#C4C8B8/.test(chrome));
check('zoom clears peek (has-l1)', /has-l1 #three-zoom/.test(chrome));
check('chrome peek is icon row not telegraph',
  /three-peek-unit/.test(chrome) && /pieceIconDataUrl/.test(chrome)
  && /width:60px; height:60px/.test(chrome));
check('idle Confirm is Select a territory', /Select a territory/.test(chrome));
check('idle CTA is quiet-dark, never Confirm gold',
  /is-idle/.test(chrome)
  && /setConfirmIdle/.test(chrome)
  && /rgba\(30,36,32,0\.88\)/.test(chrome)
  && /idle never wears Confirm gold/.test(chrome)
  && /is-ready:not\(:disabled\):not\(\.is-idle\)/.test(chrome));
check('named Confirm colon form', /Confirm: \$\{land\.name\}/.test(chrome));
check('peek roster total stays synced to map stacks',
  /dataset\.rosterTotal/.test(chrome)
  && /rosterOf/.test(spike)
  && /stackTotal/.test(spike));
check('continent punch holds at near', /LOD-invariant/.test(palette) && /CONTINENT_CHROMA_PUNCH/.test(palette));
check('preview gate stays ?three=1', /isThreeSpikeRequested/.test(spike));
check('support types are FAC/AA', isSupportType('factory') && isSupportType('aaGun') && !isSupportType('infantry'));
check('p22 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p22/europe-mid-390.png'));
check('p22 mid HUD 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p22/europe-mid-hud-390.png'));
check('p22 near select 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p22/europe-near-select-390.png'));
check('p22 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p22/vercel-live-mid-390.png'));
check('p23 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p23/europe-mid-390.png'));
check('p23 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p23/europe-mid-hud-390.png'));
check('p23 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p23/europe-near-select-390.png'));
check('p23 near units closeup still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p23/europe-near-units-390.png'));
check('p23 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p23/vercel-live-mid-390.png'));
check('p23 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p23/SCORE.md')));
check('p24 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p24/europe-mid-390.png'));
check('p24 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p24/europe-mid-hud-390.png'));
check('p24 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p24/europe-near-select-390.png'));
check('p24 near units closeup still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p24/europe-near-units-390.png'));
check('p24 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p24/SCORE.md')));
check('p24 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p24/vercel-live-mid-390.png'));
check('p25 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p25/europe-mid-390.png'));
check('p25 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p25/europe-mid-hud-390.png'));
check('p25 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p25/europe-near-select-390.png'));
check('p25 near units specular closeup still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p25/europe-near-units-390.png'));
check('p25 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p25/SCORE.md')));
check('p25 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p25/vercel-live-mid-390.png'));
check('p26 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p26/SCORE.md')));
check('p26 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p26/europe-mid-390.png'));
check('p26 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p26/europe-mid-hud-390.png'));
check('p26 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p26/europe-near-select-390.png'));
check('p26 near units still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p26/europe-near-units-390.png'));
check('p26 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p26/vercel-live-mid-390.png'));
check('p27 geography module on disk', existsSync(join(root, 'src/map/threeMapTerrain.js')));
check('biome climate washes snow/lush/arid',
  /BIOME/.test(terrain) && /snow/.test(terrain) && /arid/.test(terrain) && /forest/.test(terrain)
  && /bakeWorldLandAtlas/.test(terrain));
check('mountain relief + soft shadow',
  /sculptLandRelief/.test(terrain) && /RIDGES/.test(terrain) && /Soft SE mountain shadow/.test(terrain));
check('forest as massed clumps, not a green blob',
  /stampClumps/.test(terrain) && /terrain-forest/.test(terrain));
check('coast shelf turquoise fringe',
  /makeCoastShelfMeshes/.test(art) && /oceanReef/.test(palette) && /#7AADB0/.test(palette));
check('rivers / inland water',
  /RIVERS/.test(terrain) && /addRiverLines/.test(art) && /Nile/.test(terrain));
check('land undulation sculpt',
  /sculptLandRelief/.test(art) && /BIOME_LIFT/.test(terrain) && /landUndulation/.test(spike));
check('world land atlas bake wired',
  /bakeWorldLandAtlas/.test(spike) && /setWorldLandMap/.test(spike) && /applyWorldLandUVs/.test(art));
check('IPC values live in peek, not baked on paper',
  /printIpc\(land\)/.test(chrome) && /IPC/.test(chrome)
  && /never bake IPC fillText/.test(terrain)
  && !/drawIpcDot\(ctx, cx/.test(terrain));
check('no low-poly Civ chrome stolen',
  !/ROMA/.test(terrain) && !/hex-sawtooth/.test(art) && !/tilt-shift/.test(spike));
check('p27 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p27/SCORE.md')));
check('p27 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p27/europe-mid-390.png'));
check('p27 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p27/europe-mid-hud-390.png'));
check('p27 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p27/europe-near-select-390.png'));
check('p27 near units still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p27/europe-near-units-390.png'));
check('p27 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p27/vercel-live-mid-390.png'));
check('world atlas UVs un-mirror mesh X onto orig map X',
  /Un-mirror/.test(terrain) && /origX = MAP_WIDTH - flippedX/.test(terrain));
check('p28 louder mountain + forest stipple',
  /paintMountainMass/.test(terrain) && /stampForestStipple/.test(terrain)
  && /CAPITAL_ROUNDELS/.test(terrain) && /0x6a8488/.test(terrain));
check('p29 mini tint is luminance colorize (no primer-grey army)',
  /P29 HARD: luminance colorize/.test(chits)
  && /body = 0\.55 \+ sculpt \* 0\.75/.test(chits)
  && /pieceIconDataUrl[\s\S]*128/.test(chits));
check('p29 pip rim muted vs Confirm gold',
  /mutePipRim/.test(chits) && /pip rim chroma/.test(chits)
  && /paintPip[\s\S]*mutePipRim\(ownerColor\)/.test(chits));
check('p29 coast shelf is a wide turquoise fringe',
  /inflateRing\(ring, 8\.2\)/.test(art));
check('p29 parchment wash not solid biome fill',
  /P29 HARD: parchment ink wash/.test(terrain)
  && /Never solid charcoal GIS fills/.test(terrain));
check('p31 painted mountains, not hatch-tick ridges',
  /P31 HARD: painted tabletop ranges/.test(terrain)
  && /paintMountainMass/.test(terrain)
  && !/drawRidgeHatch/.test(terrain)
  && !/tick = 28/.test(terrain));
check('p29 frameNear helper for faction stills',
  /frameNear\(name/.test(spike) && /frameNearGermany/.test(spike));
check('p28 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P28.md')));
check('p29 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P29.md')));
check('p28 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p28/SCORE.md')));
check('p28 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p28/europe-mid-390.png'));
check('p28 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p28/europe-mid-hud-390.png'));
check('p28 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p28/europe-near-select-390.png'));
check('p28 near units still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p28/europe-near-units-390.png'));
check('p28 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p28/vercel-live-mid-390.png'));
check('p29 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p29/SCORE.md')));
check('p29 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/europe-mid-390.png'));
check('p29 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/europe-mid-hud-390.png'));
check('p29 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/europe-near-select-390.png'));
check('p29 near units still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/europe-near-units-390.png'));
check('p29 tray still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/europe-near-tray-390.png'));
check('p29 second faction UK tan still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/uk-near-select-390.png'));
check('p29 third faction SU green still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/russia-near-select-390.png'));
check('p29 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p29/vercel-live-mid-390.png'));
check('p30 even parchment luma floor',
  /PARCHMENT_LUMA_FLOOR = 0\.48/.test(terrain)
  && /floorParchmentLuminance/.test(terrain)
  && /P30 HARD: every land texel stays stained parchment/.test(terrain));
check('p30 wash multiply cannot crush to void',
  /P30: lighter multiply/.test(terrain)
  && /globalAlpha = 0\.20/.test(terrain));
check('p30 quiet printed sea lanes, not cyan neon',
  /addSeaLaneLines/.test(art) && /addSeaLaneLines/.test(spike)
  && /sea-lane/.test(art)
  && /#B8B09A/.test(spike)
  && /dashed: true/.test(spike)
  && !/#2E6470/.test(spike)
  && !/0x9ed4d4/.test(terrain));
check('p31 select is crystal-clear gold, not candy flood',
  /Soft gold ring\/ink/.test(spike)
  && /emissiveIntensity = 0\.30/.test(spike)
  && /makeSelectWashMeshes/.test(spike)
  && /selectHaloMat/.test(spike)
  && /makeLineMat\(PALETTE\.select/.test(spike)
  && !/emissiveIntensity = hex \? 0\.58/.test(spike));
check('p30 coast shelf is printed ink not neon turquoise',
  /printed shelf ink/.test(terrain)
  && /color: 0x6a8488/.test(terrain)
  && /opacity: 0\.14/.test(terrain));
check('p30 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P30.md')));
check('p30 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p30/SCORE.md')));
check('p30 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/europe-mid-390.png'));
check('p30 mid HUD idle CTA still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/europe-mid-hud-390.png'));
check('p30 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/europe-near-select-390.png'));
check('p30 near units still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/europe-near-units-390.png'));
check('p30 tray still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/europe-near-tray-390.png'));
check('p30 second faction UK tan still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/uk-near-select-390.png'));
check('p30 third faction SU green still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/russia-near-select-390.png'));
check('p30 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p30/vercel-live-mid-390.png'));
check('p31 live Risk bonus continents, no USSR remap',
  /P31 HARD: live Risk bonus continents/.test(palette)
  && /LIVE_CONTINENTS/.test(palette)
  && /bonusContinent/.test(palette)
  && /bonusContinent/.test(terrain)
  && !/if \(USSR_LANDS\.has\(territory\.name\)\) return 'USSR'/.test(palette)
  && !/if \(USSR_LANDS\.has\(territory\.name\)\) return REGION_WASH\.USSR/.test(terrain)
  && /CONTINENT_BADGES/.test(terrain)
  && /addTerritoryInk\(group, land, landBorderMat, height \+ 0\.05, continentMats/.test(spike));
check('p37 units never depth-clipped by map or sheet',
  /depthTest: false/.test(spike)
  && /sprite\.center\.set\(0\.5, 0\.16\)/.test(spike)
  && /polygonOffsetFactor = 4\.5/.test(art)
  && /renderOrder = t\.isWater \? 36 : 24/.test(spike));
check('p31 Japan / multi-type footprint LOD',
  DENSE_LANDS.has('Japan')
  && isSmallLand('Japan', { min: 286 })
  && /clusterPack/.test(spike)
  && /packPitchFor/.test(spike)
  && /pieceWorldCap/.test(spike)
  && /territoryFootprint/.test(spike)
  && /frameNearJapan/.test(spike)
  && /byHome/.test(spike)
  && /'Japan Sea Zone': \{ x: 2695/.test(spike));
check('p31 cluster pack is tighter than spiral',
  clusterPack(4, 6).length === 4
  && Math.hypot(clusterPack(4, 6)[0].x, clusterPack(4, 6)[0].z) < 4);
check('p31 footprint cap shrinks pieces on small lands',
  pieceWorldCap(13.5, { min: 90 }, 4) < 8
  && footprintPiecePx({ min: 90 }, 'near', true, 4) < PIECE_PX);
check('p31 feathered fills + coast tooth',
  /fillFeathered/.test(terrain)
  && /paintCoastTooth/.test(terrain)
  && /smoothRing/.test(art));
check('p31 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P31.md')));
check('p31 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p31/SCORE.md')));
check('p31 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/europe-mid-390.png'));
check('p31 mid HUD 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/europe-mid-hud-390.png'));
check('p31 mid select 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/europe-mid-select-390.png'));
check('p31 near select Confirm still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/europe-near-select-390.png'));
check('p31 near units still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/europe-near-units-390.png'));
check('p31 Japan near multi-type still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/japan-near-select-390.png'));
check('p31 UK tan still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/uk-near-select-390.png'));
check('p31 SU green still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/russia-near-select-390.png'));
check('p31 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p31/vercel-live-mid-390.png'));
check('p32 quiet continent wash under select gold',
  /CONTINENT_FILL_ALPHA = 0\.08/.test(terrain)
  && /CONTINENT_OVERLAY_ALPHA = 0\.11/.test(terrain)
  && /fillStain/.test(terrain)
  && /quietContinentWash/.test(terrain)
  && /CONTINENT_CHROMA_PUNCH = 0\.22/.test(palette)
  && /CONTINENT_WASH_STRENGTH = 0\.16/.test(palette)
  && /quiet continent tint/.test(palette)
  && /Europe: '#6B7A4A'/.test(palette)
  && !/fillFeathered\(ctx, poly, w, h, continent, 0\.38\)/.test(terrain)
  && !/CONTINENT_CHROMA_PUNCH = 0\.42/.test(palette));
check('p32 Japan home-island frame, not sea-zone centroid',
  JAPAN_HOME_CENTER.x === 2594
  && JAPAN_HOME_CENTER.y === 736
  && /LAND_ANCHORS/.test(spike)
  && /frameMidJapan/.test(spike)
  && /lift: 90/.test(spike)
  && /'Japan Sea Zone': \{ x: 2695/.test(spike)
  && /water pin — keep east of home islands/.test(spike)
  && /applyLiveContinents/.test(spike));
check('p32 Japan multi-type pieces are tighter than .31 bbox cap',
  footprintPiecePx({ min: 286 }, 'near', true, 4, 'Japan') <= 52
  && pieceWorldCap(13.5, { min: 286 }, 4, 'Japan') < pieceWorldCap(13.5, { min: 286 }, 4)
  && denseFootprint('Japan', { min: 286 }).min === 92
  && packPitchFor(4, 6, { min: 286 }, 'Japan') < packPitchFor(4, 6, { min: 286 }));
check('p32 inspect proves Japan LOD + quiet wash',
  /japanHome: true/.test(spike)
  && /quietContinentWash: true/.test(spike)
  && /japanLod: true/.test(spike));
check('p32 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P32.md')));
check('p32 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p32/SCORE.md')));
check('p32 mid 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p32/europe-mid-390.png'));
check('p32 mid select 390 still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p32/europe-mid-select-390.png'));
check('p32 required Japan near multi-type still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p32/near-japan-multitype-390.png'));
check('p32 Japan theater mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p32/japan-mid-390.png'));
check('p32 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p32/vercel-live-mid-390.png'));
check('p32 SCORE states Japan LOD proven',
  /Japan multi-type LOD/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p32/SCORE.md'), 'utf8'))
  && /\*\*PASS\*\*/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p32/SCORE.md'), 'utf8'))
  && /near-japan-multitype-390\.png/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p32/SCORE.md'), 'utf8')));

check('p33 painted world albedo on disk (4096+)', (() => {
  const p = join(root, 'assets/three/board/world-land-albedo.png');
  if (!pngOk('assets/three/board/world-land-albedo.png')) return false;
  const buf = readFileSync(p);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return w >= 4096 && h >= 2048;
})());
check('p33 albedo baker is image-gen + polygon clip',
  /p37-world-watercolor\.png/.test(albedoBaker)
  && /land_mask/.test(albedoBaker)
  && /NOT a copyright scan/.test(albedoBaker)
  && /ATLAS_W = 4096/.test(albedoBaker));
check('p34 land samples painted albedo, stain is OFF',
  /WORLD_LAND_ALBEDO/.test(terrain)
  && /loadWorldLandAlbedo/.test(terrain)
  && /painted atlas is the hero/.test(terrain)
  && /fail closed/.test(terrain)
  && /stain is OFF/.test(terrain)
  && /WORLD_LAND_ALBEDO_REV/.test(terrain)
  && /painted albedo is the hero/.test(palette)
  && /paper floor so MeshStandard cannot crush/.test(palette));
check('p33 no permanent name sprites',
  /permanent name sprites are gone/.test(spike)
  && !/labelTexture\(t\.name\)/.test(spike)
  && !/makeLabelTexture\(name\)/.test(spike)
  && !/kind = 'label'/.test(spike));
check('p33 dissolve multipolygon select + ink',
  /territoryOutlineRings/.test(outlineSrc)
  && /rasterUnionRings/.test(outlineSrc)
  && /outer union only/.test(art)
  && /dissolve multipolygons/.test(art)
  && /territoryOutlineRings\(territory\)/.test(spike)
  && /frameChina/.test(spike));
{
  const china = territories.find((t) => t.name === 'China');
  const rings = territoryOutlineRings(china);
  check('p33 China union is one outer ring (no internal seam)',
    (china?.polygons || []).length === 2
    && rings.length === 1
    && rings[0].length >= 12);
  const philippines = territories.find((t) => t.name === 'Philippines');
  const isleRings = territoryOutlineRings(philippines);
  check('p33 archipelago keeps multiple outer rings',
    (philippines?.polygons || []).length >= 4
    && isleRings.length >= 2);
}
check('p33 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P33.md')));
check('p34 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P34.md')));
check('p34 printed theater plates on disk',
  pngOk('briefs/2026-09-17-three-art-gap/refs/p34-gen/p34-europe-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p34-gen/p34-asia-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p34-gen/p34-world-painted.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p34-gen/p34-plate-forest.png'));
check('p37 baker composites STYLE REF through live masks',
  /p37-oceania-style-lock/.test(albedoBaker)
  && /paste_through_mask/.test(albedoBaker)
  && /stain is OFF/.test(albedoBaker)
  && /never a rectangular alpha/.test(albedoBaker));
check('p34 inspect proves albedo bind (not hardcoded true)',
  /albedoBound/.test(spike)
  && /getWorldLandTex\(\)/.test(spike)
  && /stainFallback/.test(spike)
  && /dissolveSelect: true/.test(spike)
  && /noMapLabels: true/.test(spike)
  && /noBakedIpc: true/.test(spike)
  && !/paintedAlbedo: true/.test(spike));
check('p33 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p33/SCORE.md')));
check('p33 mid painted board still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p33/europe-mid-390.png'));
check('p33 China select no-internal-border still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p33/china-select-390.png'));
check('p33 Japan near multi-type held still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p33/near-japan-multitype-390.png'));
check('p33 Japan mid pip still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p33/japan-mid-390.png'));
check('p33 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p33/vercel-live-mid-390.png'));
check('p33 SCORE states painted albedo + dissolve',
  /Painted world albedo/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p33/SCORE.md'), 'utf8'))
  && /Dissolve China select/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p33/SCORE.md'), 'utf8'))
  && /rings=1/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p33/SCORE.md'), 'utf8')));
check('p34 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p34/SCORE.md')));
check('p34 mid painted still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/mid-painted.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/europe-mid-390.png'));
check('p34 mid vs p32 leap stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/mid-vs-p32.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/mid-vs-p32-absdiff.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/asia-mid-vs-p32.png'));
check('p34 China select hold still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/china-select-390.png'));
check('p34 Japan near hold still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/near-japan-multitype-390.png'));
check('p34 vercel live mid still', pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p34/vercel-live-mid-390.png'));
{
  const score = readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p34/SCORE.md'), 'utf8');
  const computed = readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p34/computed.json'), 'utf8');
  check('p34 SCORE states leap + bound + dissolve',
    /Painted world albedo leap/.test(score)
    && /albedoBound/.test(score)
    && /28\.97/.test(score)
    && /rings=1/.test(score));
  check('p34 computed proves live bind',
    /"albedoBound": true/.test(computed)
    && /"stainFallback": false/.test(computed)
    && /4096/.test(computed)
    && /V2.81.51-three-polish.34/.test(computed));
}

check('p35 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P35.md')));
check('p35 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p35/SCORE.md')));
check('p35 required stills held',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/mid-land-sea.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/east-med-select-no-clip.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/china-select-hold.png'));
check('p36 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P36.md')));
check('p39 albedo rev was p39 (held in SCORE)', /albedoRev=p39b/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8')));
check('p37b Cape is mask-only (no dest y=1680 L-band)',
  /flatten_region_luma/.test(albedoBaker)
  && /heal_horiz_luma_step/.test(albedoBaker)
  && /p37-africa-continent/.test(albedoBaker)
  && /1960/.test(albedoBaker)
  && !/\(560, 40, 1860, 1680\)/.test(albedoBaker));
check('p37 painted albedo stays bound (not stain fallback)',
  /WORLD_LAND_ALBEDO/.test(terrain)
  && /loadWorldLandAlbedo/.test(terrain)
  && /stain is OFF/.test(terrain)
  && /color: tint/.test(palette)
  && /watercolorParchment/.test(spike)
  && !/world \? 0 : CONTINENT_CHROMA_PUNCH/.test(palette));
check('p37 no IPC baked; watercolor plates are hero',
  /kill_blotches/.test(albedoBaker)
  && /paste_through_mask/.test(albedoBaker)
  && /even_land_luma/.test(albedoBaker)
  && /grade_chroma/.test(albedoBaker)
  && /amount=0\.18/.test(albedoBaker)
  && !/img = draw_badges/.test(albedoBaker));
check('p35 ocean stays teal, not parchment grain',
  /OCEAN_GRAIN = 0\.06/.test(palette)
  && /OCEAN_TEAL_PUNCH/.test(palette)
  && /makeSeaWaterMaterial/.test(palette)
  && /makeSeaWaterMeshes/.test(art));
check('p35 East Med pin south of Italy + sea deck',
  /'East Mediteranean Sea Zone': \{ x: 1262, y: 878 \}/.test(spike)
  && /deckHeightForSea/.test(spike)
  && /frameEastMed/.test(spike)
  && /shipsAboveItaly/.test(spike)
  && /polygonOffsetFactor = 4\.5/.test(art)
  && /sea-water/.test(art));
check('p35 land inflate does not eat Med',
  /inflateRing\(ring, 0\.55\)/.test(art)
  && /inflateRing\(ring, 8\.2\)/.test(art)
  && !/inflateRing\(ring, 26\.5\)/.test(art)
  && !/inflateRing\(ring, 1\.15\)/.test(art));
check('p35 no .31 chocolate flood',
  /CONTINENT_CHROMA_PUNCH = 0\.22/.test(palette)
  && !/CONTINENT_CHROMA_PUNCH = 0\.42/.test(palette));
check('p35 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p35/SCORE.md')));
check('p35 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/mid-land-sea.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/mid-continents.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/east-med-select-no-clip.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/china-select-hold.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p35/japan-near-hold.png'));
check('p35 SCORE states four James bars',
  /Land vs sea at mid 390/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p35/SCORE.md'), 'utf8'))
  && /East Med z-order/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p35/SCORE.md'), 'utf8'))
  && /shipsAboveItaly/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p35/SCORE.md'), 'utf8'))
  && /3\.60/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p35/SCORE.md'), 'utf8')));
check('p36 painted plates on disk',
  pngOk('briefs/2026-09-17-three-art-gap/refs/p36-gen/p36-europe-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p36-gen/p36-asia-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p36-gen/p36-world-painted.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p36-gen/p36-plate-forest-mass.png'));
check('p36 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p36/SCORE.md')));
check('p36 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/mid-painted-relief.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/mid-vs-p35.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/mid-land-sea.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/mid-continents.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/east-med-select-no-clip.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/china-select-hold.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/japan-near-hold.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p36/vercel-live-mid-390.png'));
check('p36 SCORE states Layer A + Layer B',
  /Imhof/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p36/SCORE.md'), 'utf8'))
  && /albedoBound/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p36/SCORE.md'), 'utf8'))
  && /stainFallback/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p36/SCORE.md'), 'utf8'))
  && /shipsAboveItaly/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p36/SCORE.md'), 'utf8')));

check('p37 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P37.md')));
check('p37 STYLE REF plates on disk',
  pngOk('briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-oceania-style-lock.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-world-watercolor.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-europe-africa-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-asia-continent.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-ocean-wash-tile.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-africa-continent.png'));
check('p37 sea-zone ink is closed water rings',
  /waterOutlineRings/.test(outlineSrc)
  && /addSeaZoneInk/.test(art)
  && /addSeaZoneInk/.test(spike)
  && /sea-ink/.test(art)
  && /waterInk: true/.test(spike)
  && /Kill centroid-sized dots/.test(outlineSrc));
check('p37 unit backgrounds unified (bare plastic)',
  /keyBackdrop/.test(chits)
  && /units-land-plastic\.png/.test(chits)
  && /units-naval-plastic\.png/.test(chits)
  && /unitBgUnified: true/.test(spike));
check('p37 Med ships stay above Italy and unclipped',
  /frameCentralMed/.test(spike)
  && /frameAustralia/.test(spike)
  && /depthTest: false/.test(spike)
  && /renderOrder = t\.isWater \? 36 : 24/.test(spike));
check('p37 stack icon tap toggles expand/collapse',
  /stackControl/.test(spike)
  && /toggleStack/.test(spike)
  && /forceCollapsed/.test(spike)
  && /Second tap closes/.test(spike)
  && /stackToggle: true/.test(spike));
check('p37 Confirm gold + China hold stay',
  /#three-confirm\.is-ready:not\(:disabled\):not\(\.is-idle\) \{[\s\S]*?background:#C4A35A/.test(chrome)
  && /outer union only/.test(art)
  && /noMapLabels: true/.test(spike));
check('p37 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/mid-vs-style-ref.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/australia-no-seam.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/africa-even.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/sea-zones-ink.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/med-no-clip.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/unit-bg-unified.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/china-hold.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/japan-near.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/vercel-live-mid-390.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/stack-expand.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p37/stack-collapse.png'));
check('p37 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p37/SCORE.md')));

check('p38 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P38.md')));
check('p38 peek icon has no baked leading 1',
  /P38 HARD: peek\/HUD shows ONE number/.test(chits)
  && /badge: false/.test(chits)
  && /pieceIconDataUrl\(s\.type, color, 0\)/.test(chrome)
  && /unitCountOne: true/.test(spike));
check('p38 sea lanes killed (no decorative stipple)',
  /P38 HARD: kill decorative dashed/.test(art)
  && /oceanNoStipple: true/.test(spike)
  && /seaLanes: false/.test(spike)
  && /addSeaLaneLines[\s\S]*return 0/.test(art));
check('p38 land borders match sea-zone weight family',
  /landSeaBorderFamily: true/.test(spike));
check('p38 slivers healed via outer-union + normal offset',
  /healLandRings/.test(outlineSrc)
  && /healLandRings/.test(art)
  && /outward vertex-normal offset/.test(art)
  && /landSliversHealed: true/.test(spike));
check('p38 units opaque plastic + tan rim',
  /sealSculptHoles/.test(chits)
  && /P38: close interior alpha holes/.test(chits)
  && /alphaTest: 0\.42/.test(spike)
  && /opaquePlastic: true/.test(spike)
  && /#8E6A38/.test(palette));
check('p38 baker: coastal greens + Imhof hatch + continent wash',
  /apply_coastal_greens/.test(albedoBaker)
  && /draw_imhof_peaks/.test(albedoBaker)
  && /apply_imhof_painterly/.test(albedoBaker)
  && /multiply_continent/.test(albedoBaker)
  && /USSR_HEX/.test(albedoBaker)
  && /COAST_GREEN/.test(albedoBaker)
  && /biome_cool_map/.test(albedoBaker));
check('p38 PLAYBOOK on disk',
  existsSync(join(root, 'briefs/2026-09-18-three-p38-board-polish/PLAYBOOK.md')));
check('p38 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p38/SCORE.md')));
check('p38 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/mid-vs-style-ref.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/vegetation-coast.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/ocean-clean.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/land-borders.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/mountains-relief.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/continents-wash.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/unit-count-one.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/aus-no-slivers.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/tan-units-contrast.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/near-opaque-plastic.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/africa-even.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/stack-expand.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/stack-collapse.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p38/vercel-live-mid-390.png'));
check('p38 SCORE states eight gates',
  /Vegetation/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p38/SCORE.md'), 'utf8'))
  && /albedoRev=p38/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p38/SCORE.md'), 'utf8'))
  && /unitCountOne/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p38/SCORE.md'), 'utf8')));

check('p39 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P39.md')));
check('p39 STYLE REF plates on disk',
  pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/style-ref-oceania-beautiful.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-world-watercolor.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-europe-africa-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-asia-continent.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-oceania-style-lock.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-americas-theater.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-africa-continent.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39-ocean-ripple-tile.png'));
check('p39 baker is mask-only dest-position (no grow-bbox stretch)',
  /GEN39/.test(albedoBaker)
  && /p39-oceania-style-lock/.test(albedoBaker)
  && /paste_through_mask/.test(albedoBaker)
  && /dest UV = position only/.test(albedoBaker)
  && /Do NOT grow dest to mask bbox/.test(albedoBaker)
  && /amount=0\.14/.test(albedoBaker)
  && /UNDER paint/.test(albedoBaker)
  && !/grow dest so land is never cut/.test(albedoBaker));
check('p39 land ink ≥ sea + rings dissolve before stroke',
  /makeLineMat\(PALETTE\.border, 3\.0, 0\.92\)/.test(spike)
  && /landInkGteSea: true/.test(spike)
  && /ringsDissolved: true/.test(spike)
  && /dropSliverPolygons/.test(art)
  && /outer-union BEFORE stroke/.test(art));
check('p39 ocean ripples authored and bound as sea albedo',
  /p39-ocean-ripple-tile/.test(albedoBaker)
  && /hand-ripple/.test(albedoBaker)
  && /vertexColors: false/.test(palette)
  && /oceanRipples: true/.test(spike)
  && /styleRef: 'oceania-beautiful'/.test(terrain));
check('p39b world-sea albedo — no UV hatch tile',
  pngOk('assets/three/board/world-sea-albedo.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/p39b-ocean-oceania-coast.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p39-gen/style-ref-oceania-beautiful.png')
  && /bake_world_sea/.test(albedoBaker)
  && /draw_coastal_hand_ripples/.test(albedoBaker)
  && /world-sea-albedo/.test(albedoBaker)
  && /WORLD_SEA_ALBEDO/.test(terrain)
  && /oceanNoHatch: true/.test(spike)
  && /coastalHandRipples: true/.test(spike)
  && /makeBoardSeaMesh/.test(art)
  && /applyWorldLandUVs\(geom\)/.test(art)
  && !/uv\.setXY\(i, pos\.getX\(i\) \/ OCEAN_UV/.test(palette));
check('p39 inspect flags + held .38 wins',
  /maskOnlyComposite/.test(spike)
  && /unitCountOne: true/.test(spike)
  && /opaquePlastic: true/.test(spike)
  && /stackToggle: true/.test(spike)
  && /continentPunch: 0\.14/.test(spike));
check('p39 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md')));
check('p39 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/mid-vs-style-ref.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/ocean-ripples.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/land-borders-clear.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/aus-borders-fit.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/continents-subtle.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/unit-count-one.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/near-opaque-plastic.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/africa-even.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/stack-expand.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p39/stack-collapse.png'));
check('p39 SCORE states four P0 gates',
  /albedoRev=p39b/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8'))
  && /styleRef=oceania-beautiful/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8'))
  && /oceanRipples/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8'))
  && /landInkGteSea/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8'))
  && /ringsDissolved/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8'))
  && /maskOnlyComposite/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p39/SCORE.md'), 'utf8')));

check('p40 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P40.md')));
check('p40 STYLE REF plates on disk',
  pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/style-ref-oceania-beautiful.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-world-hero.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-europe-africa-b.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-europe.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-asia.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-oceania.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-americas.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p40-gen/p40-africa.png'));
check('p40 baker is bbox+feather, mask paint off',
  /GEN40/.test(albedoBaker)
  && /basemapUnderInk/.test(albedoBaker)
  && /maskPaintOff/.test(albedoBaker)
  && /paste_bbox_feather/.test(albedoBaker)
  && /build_basemap/.test(albedoBaker)
  && /NEVER a territory mask/.test(albedoBaker)
  && /never paste_through_mask for color/.test(albedoBaker)
  && /p40-oceania/.test(albedoBaker)
  && !/img = paste_through_mask\(/.test(albedoBaker));
check('p40 select outline-only held',
  /selectOutlineOnly: true/.test(spike)
  && /selectWash: false/.test(spike)
  && /selectFill: false/.test(spike)
  && /selectEmissiveWash: false/.test(spike)
  && /never re-tint continuous art per polygon/.test(spike)
  && /Never a per-polygon wash/.test(spike)
  && /P40b HARD: never emit a fill mesh/.test(art)
  && /P40b HARD: select never touches land materials/.test(spike)
  && /oceanNoHatch: true/.test(spike)
  && /unitCountOne: true/.test(spike)
  && /opaquePlastic: true/.test(spike)
  && /stackToggle: true/.test(spike));
check('p40 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p40/SCORE.md')));
check('p40 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/mid-vs-style-ref.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/ocean-ripples.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/land-borders-ink.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/aus-fit.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/select-on-art.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/continents-subtle.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/unit-count-one.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/near-opaque-plastic.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/africa-even.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/stack-expand.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p40/stack-collapse.png'));
check('p40 SCORE states invert + four P0 gates',
  /albedoRev=p40/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p40/SCORE.md'), 'utf8'))
  && /strategy=basemapUnderInk/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p40/SCORE.md'), 'utf8'))
  && /maskPaintOff/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p40/SCORE.md'), 'utf8'))
  && /oceanCoastalRipples/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p40/SCORE.md'), 'utf8'))
  && /styleRef=oceania-beautiful/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p40/SCORE.md'), 'utf8')));

check('p41 HECORRECT on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/HECORRECT-P41.md')));
check('p41 silhouette guide + STYLE REF on disk',
  pngOk('briefs/2026-09-17-three-art-gap/refs/p41-gen/silhouette-guide.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/silhouette-guide.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p41-gen/style-ref-imagine-world.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p41-gen/style-ref-oceania-beautiful.png')
  && pngOk('briefs/2026-09-17-three-art-gap/refs/p41-gen/p41-world-into-silhouette-b.png'));
check('p41 baker is silhouette-first, mask paint off',
  /GEN41/.test(albedoBaker)
  && /silhouetteFirst/.test(albedoBaker)
  && /watercolor_into_silhouette/.test(albedoBaker)
  && /wrap_standard_world_to_game/.test(albedoBaker)
  && /register_plate_to_silhouette/.test(albedoBaker)
  && /build_silhouette_guide/.test(albedoBaker)
  && /coastRegistered/.test(albedoBaker)
  && /maskPaintOff/.test(albedoBaker)
  && /basemapUnderInk/.test(albedoBaker)
  && /never paste_through_mask for color/.test(albedoBaker)
  && !/img = paste_through_mask\(/.test(albedoBaker));
check('p41 runtime flags + select outline only',
  /WORLD_LAND_ALBEDO_REV = 'p41'/.test(terrain)
  && /strategy: 'silhouetteFirst'/.test(terrain)
  && /silhouetteFirst: true/.test(terrain)
  && /coastRegistered: true/.test(terrain)
  && /maskPaintOff: true/.test(terrain)
  && /basemapUnderInk: true/.test(terrain)
  && /oceanCoastalRipples: true/.test(terrain)
  && /styleRef: 'grok-imagine-world'/.test(terrain)
  && /selectOutlineOnly: true/.test(spike)
  && /selectWash: false/.test(spike)
  && /selectFill: false/.test(spike)
  && /selectEmissiveWash: false/.test(spike)
  && /oceanNoHatch: true/.test(spike)
  && /unitCountOne: true/.test(spike)
  && /opaquePlastic: true/.test(spike)
  && /stackToggle: true/.test(spike));
check('p41 SCORE on disk', existsSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md')));
check('p41 required stills',
  pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/silhouette-guide.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/mid-vs-style-ref.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/coast-register-aus.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/coast-register-med.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/coast-register-uk.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/ocean-ripples.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/select-on-art.png')
  && pngOk('briefs/2026-09-17-three-art-gap/qa-loop/p41/land-borders-ink.png'));
check('p41 SCORE states silhouette-first + four P0 gates',
  /albedoRev=p41/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8'))
  && /strategy=silhouetteFirst/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8'))
  && /coastRegistered/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8'))
  && /basemapUnderInk/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8'))
  && /maskPaintOff/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8'))
  && /selectOutlineOnly/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8'))
  && /styleRef=grok-imagine-world/.test(readFileSync(join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p41/SCORE.md'), 'utf8')));

if (failures) {
  console.error(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall ok');
