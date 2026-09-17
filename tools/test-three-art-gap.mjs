// V2.81.51-three-polish.9 A&A atlas / palette / LOD lock.
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
  LOD_FAR,
  LOD_NEAR,
  hexPack,
  separatePoints,
  isSupportType,
  tokenSizeFor,
} = await import(pathToFileURL(join(root, 'src/map/threeMapDensity.js')));

const chits = readFileSync(join(root, 'src/map/threeMapChits.js'), 'utf8');
const palette = readFileSync(join(root, 'src/map/threeMapPalette.js'), 'utf8');
const spike = readFileSync(join(root, 'src/map/threeMapSpike.js'), 'utf8');
const chrome = readFileSync(join(root, 'src/map/threeMapChrome.js'), 'utf8');

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

check('GAME_VERSION is V2.81.51-three-polish.9', GAME_VERSION === 'V2.81.51-three-polish.9');
check('SCHEMA stays 11', SCHEMA_VERSION === 11);
check('land-air atlas is real PNG', pngOk('assets/three/units/units-land-air-cream.png'));
check('naval atlas is real PNG', pngOk('assets/three/units/units-naval-cream.png'));
check('parchment tile is real PNG', pngOk('assets/three/board/board-parchment-tile.png'));
check('ocean tile is real PNG', pngOk('assets/three/board/board-ocean-tile.png'));

check('atlas cells INF/TNK/FTR/BMB',
  /infantry: \{ atlas: 'land', col: 0, row: 0 \}/.test(chits)
  && /armour: \{ atlas: 'land', col: 1, row: 0 \}/.test(chits)
  && /fighter: \{ atlas: 'land', col: 0, row: 1 \}/.test(chits)
  && /bomber: \{ atlas: 'land', col: 1, row: 1 \}/.test(chits));
check('atlas cells BB/CV/SS/TR',
  /battleship: \{ atlas: 'naval', col: 0, row: 0 \}/.test(chits)
  && /carrier: \{ atlas: 'naval', col: 1, row: 0 \}/.test(chits)
  && /submarine: \{ atlas: 'naval', col: 0, row: 1 \}/.test(chits)
  && /transport: \{ atlas: 'naval', col: 1, row: 1 \}/.test(chits));
check('no stick-figure glyph drawers',
  !/function drawInf/.test(chits) && !/function drawTnk/.test(chits));
check('chit face stays cream', /#F0E6D2/.test(chits));

check('AA land base', /#C4B896/.test(palette));
check('AA ocean deep/shelf', /#3D5A66/.test(palette) && /#4F6E78/.test(palette));
check('AA foam / select / confirm', /#D9D2C0/.test(palette) && /#C4A35A/.test(palette));
check('faction washes locked',
  /#8B3A3A/.test(palette) && /#5A5A52/.test(palette) && /#4A5C7A/.test(palette)
  && /#5C6B4A/.test(palette) && /#8A6B3A/.test(palette));
check('parchment multiply grain', /multiply/.test(palette) && /board-parchment-tile/.test(palette));
check('ocean tile wired', /board-ocean-tile/.test(palette));
check('no neon teal leftover', !/#00ced1/i.test(palette) && !/#44C5BD/.test(palette) && !/#1b2624/.test(palette));

check('LOD far/mid/near', lodBand(240) === 'far' && lodBand(160) === 'mid' && lodBand(80) === 'near');
check('LOD thresholds', LOD_FAR > LOD_NEAR && tokenSizeFor('near', false) > tokenSizeFor('mid', false));
check('support types are FAC/AA', isSupportType('factory') && isSupportType('aaGun') && !isSupportType('infantry'));

const packed = hexPack(4, 6);
const minPacked = packed.slice(1).reduce((m, p) => Math.min(m, Math.hypot(p.x, p.z)), Infinity);
check('hex pack spreads 4 tokens', packed.length === 4 && minPacked > 5);

const piled = [
  { x: 0, z: 0, homeX: 0, homeZ: 0, maxDrift: 10 },
  { x: 0.2, z: 0, homeX: 6, homeZ: 0, maxDrift: 10 },
];
separatePoints(piled, 6);
check('collision spacing separates piles', Math.hypot(piled[0].x - piled[1].x, piled[0].z - piled[1].z) >= 5.4);

check('spike uses collision + atlas + foam',
  /separatePoints/.test(spike) && /loadUnitAtlases/.test(spike) && /addFoamCoast/.test(spike));
check('chrome confirm is AA gold', /#C4A35A/.test(chrome));
check('preview gate stays ?three=1', /isThreeSpikeRequested/.test(spike));

if (failures) {
  console.error(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall ok');
