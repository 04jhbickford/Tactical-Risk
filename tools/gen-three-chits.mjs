// Regenerates preview unit-chit SVGs. No paid stock. Run: node tools/gen-three-chits.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/three/chits');
mkdirSync(outDir, { recursive: true });

const files = {
  'inf.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1c1812" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="32" cy="16" r="7"/>
  <path d="M32 24v16M20 30l12-6 14 8M26 40l-4 12M38 40l6 12"/>
</svg>
`,
  'tnk.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1c1812" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="34" width="44" height="12" rx="4"/>
  <path d="M24 34V26h16v8M40 30h12"/>
  <circle cx="16" cy="50" r="3"/><circle cx="26" cy="50" r="3"/><circle cx="36" cy="50" r="3"/><circle cx="46" cy="50" r="3"/>
</svg>
`,
  'ftr.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#1c1812">
  <path d="M32 6l6 24 20 8-20-2 4 18-10-10-10 10 4-18-20 2 20-8z"/>
</svg>
`,
  'ship.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#1c1812">
  <path d="M8 34l8 12h30l10-14H42L38 20H28l-4 14H8z"/>
  <rect x="32" y="10" width="3" height="12"/>
</svg>
`,
  'art.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1c1812" stroke-width="5" stroke-linecap="round">
  <circle cx="24" cy="42" r="7"/><circle cx="42" cy="42" r="7"/>
  <path d="M20 34L50 16"/>
</svg>
`,
};

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(outDir, name), svg);
  console.log('wrote', name);
}
