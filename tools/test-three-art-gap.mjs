// V2.81.51-three-polish.22 cream pip+N, no mid type parade, punched washes.
// Run: node tools/test-three-art-gap.mjs

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
  nearLayout,
  primaryType,
  shouldCollapse,
  worldSizeFromScreen,
  NEAR_MAX,
  PIP_PX,
} = await import(pathToFileURL(join(root, 'src/map/threeMapDensity.js')));

const chits = readFileSync(join(root, 'src/map/threeMapChits.js'), 'utf8');
const palette = readFileSync(join(root, 'src/map/threeMapPalette.js'), 'utf8');
const spike = readFileSync(join(root, 'src/map/threeMapSpike.js'), 'utf8');
const chrome = readFileSync(join(root, 'src/map/threeMapChrome.js'), 'utf8');
const art = readFileSync(join(root, 'src/map/threeMapArt.js'), 'utf8');
const baker = readFileSync(join(root, 'tools/bake-james-hecorrect.py'), 'utf8');

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

check('GAME_VERSION is V2.81.51-three-polish.22', GAME_VERSION === 'V2.81.51-three-polish.22');
check('SCHEMA stays 11', SCHEMA_VERSION === 11);
check('land plastic atlas is real PNG', pngOk('assets/three/units/units-land-plastic.png'));
check('naval plastic atlas is real PNG', pngOk('assets/three/units/units-naval-plastic.png'));
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
check('paintCreamChit is the only unit mark', /paintCreamChit/.test(chits) && /drawCreamToken/.test(chits));
check('mid pip is cream chit + N, ZERO type parade',
  /ZERO type parade/.test(chits)
  && /glyph: null/.test(chits)
  && /paintPip/.test(chits)
  && !/drawPhotorealPlastic/.test(chits)
  && !/tintAtlasCell/.test(chits));
check('near chits keep type glyphs on cream', /glyph: type/.test(chits) && /drawTypeGlyph/.test(chits));
check('cream plastic face #F0E6D2', /#F0E6D2/.test(chits) && /CREAM/.test(chits));
check('faction rim + dark outline on cream token',
  /Faction rim/.test(chits) && /#1A1610/.test(chits) && /strokeStyle = faction/.test(chits));
check('mixRgb returns hex so tint cannot collapse to grey', /padStart\(2, '0'\)/.test(chits) && !/return `rgb\(\$\{m\[0\]\}/.test(chits));
check('mid pip large enough to read token', PIP_PX === 64);
check('mid pip keeps contact shadow', /shadow: true/.test(chits) && /drawContactShadow/.test(chits));
check('no grey figurine atlas paint', !/drawPhotorealPlastic/.test(chits) && !/drawImage\(tinted/.test(chits));
check('baker cream-lifts atlas (no baked black halo)',
  /def cream_lift/.test(baker) && /def strip_black_halo/.test(baker) && !/MaxFilter\(11\)/.test(baker));
check('baker flattens parchment blotches', /def flatten_blotch/.test(baker) && /make_tileable\(parchment, 96\)/.test(baker));
check('paper UV offsets break tile seams', /PAPER_UV_SHIFT/.test(palette) && /PAPER_UV = 26/.test(palette));
check('thick dark outline', /#1A1610/.test(chits));
check('contact shadow under plastic', /drawContactShadow/.test(chits));
check('toy sheen on plastic', /Toy sheen on cream plastic/.test(chits) && /createRadialGradient/.test(chits));
check('faction plastic DE/SU/UK/US/JP',
  /#5A5C59/.test(palette) && /#2F5A28/.test(palette) && /#B08948/.test(palette)
  && /#3F4F22/.test(palette) && /#B8441E/.test(palette));

check('continent Europe olive', /Europe: '#6B7A4A'/.test(palette));
check('continent USSR tan', /USSR: '#8A7355'/.test(palette));
check('continent Africa ochre', /Africa: '#B08948'/.test(palette));
check('continent Asia sage', /Asia: '#5F7A5A'/.test(palette));
check('continent NA green', /'North America': '#6A8B6E'/.test(palette));
check('continent SA teal', /'South America': '#5A8A72'/.test(palette));
check('continent Pacific mauve', /Oceania: '#7A6B8A'/.test(palette));
check('continent ME khaki', /'Middle East': '#A09058'/.test(palette));
check('continent wash 18-28%', /CONTINENT_WASH_STRENGTH = 0\.28/.test(palette));
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
check('ocean slate-teal AA-PALETTE', /oceanDeep: '#3D5A66'/.test(palette) && /oceanShelf: '#4F6E78'/.test(palette));
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
  /MeshStandardMaterial/.test(palette) && /roughness: 0\.86/.test(palette)
  && /roughness: 0\.40/.test(palette)
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
  /HemisphereLight/.test(spike) && /DirectionalLight\(0xFFF6E4/.test(spike)
  && /ACESFilmicToneMapping/.test(spike));
check('RoomEnvironment for ocean spec', /RoomEnvironment/.test(spike) && /PMREMGenerator/.test(spike));
check('coast foam mask band', /makeFoamBandMeshes/.test(art) && /makeFoamMaterial/.test(palette));
check('select idle bob/turn', /bobSelected/.test(spike) && /2 \* Math.PI \/ 180/.test(spike));
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
check('continent chroma punch at runtime', /CONTINENT_CHROMA_PUNCH = 0\.42/.test(palette));
check('ocean shelf + grain', /oceanShelf/.test(palette) && /OCEAN_GRAIN/.test(palette));
check('gold select emissive on land', /0xC4A35A/.test(spike) && /emissiveIntensity/.test(spike));
check('iPhone two-finger pinch',
  /touchstart/.test(spike) && /dollyBy\(factor/.test(spike)
  && /touches\.TWO = THREE\.TOUCH\.ROTATE/.test(spike)
  && /worldOnPlane/.test(spike) && /panByWorld/.test(spike));
check('spike gold select not blue glow',
  /never a blue glow ring/.test(spike) && /select: '#C4A35A'/.test(palette));
check('chrome frosted + SF + 44pt',
  /backdrop-filter:blur\(28px\)/.test(chrome)
  && /-apple-system/.test(chrome)
  && /min-height:50px/.test(chrome)
  && /calc\(18px \+ env\(safe-area-inset-bottom/.test(chrome)
  && /width:44px; height:44px/.test(chrome)
  && /min-height:44px/.test(chrome)
  && /THREE-IPHONE-UI\.md/.test(chrome));
check('chrome slate-teal page bg', /#3D5A66/.test(chrome));
check('zoom clears peek (has-l1)', /has-l1 #three-zoom/.test(chrome));
check('chrome peek is icon row not telegraph',
  /three-peek-unit/.test(chrome) && /pieceIconDataUrl/.test(chrome));
check('idle Confirm is Select a territory', /Select a territory/.test(chrome));
check('named Confirm colon form', /Confirm: \$\{land\.name\}/.test(chrome));
check('preview gate stays ?three=1', /isThreeSpikeRequested/.test(spike));
check('support types are FAC/AA', isSupportType('factory') && isSupportType('aaGun') && !isSupportType('infantry'));

if (failures) {
  console.error(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall ok');
