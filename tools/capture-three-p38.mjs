#!/usr/bin/env node
// Capture 390 stills for polish.38. Requires a local or remote ?three=1 URL.
// Usage: node tools/capture-three-p38.mjs [baseUrl]

import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { spawnSync } from 'child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p38');
mkdirSync(outDir, { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function serveLocal() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = join(root, rel.replace(/^\/+/, ''));
    if (!file.startsWith(root)) {
      res.writeHead(403); res.end(); return;
    }
    try {
      const buf = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404); res.end('nope');
    }
  });
  await new Promise((resolve) => server.listen(4182, '127.0.0.1', resolve));
  return { server, url: 'http://127.0.0.1:4182/index.html?three=1' };
}

function composePair(left, right, dest, leftLabel, rightLabel) {
  if (!existsSync(left) || !existsSync(right)) return;
  const py = `
from PIL import Image, ImageDraw
left = Image.open(${JSON.stringify(left)}).convert('RGB')
right = Image.open(${JSON.stringify(right)}).convert('RGB')
h = max(left.height, right.height)
scale = h / right.height
rw = int(right.width * scale)
right = right.resize((rw, h), Image.Resampling.LANCZOS)
out = Image.new('RGB', (left.width + rw, h), (24, 26, 24))
out.paste(left, (0, 0))
out.paste(right, (left.width, 0))
d = ImageDraw.Draw(out)
d.rectangle((8, 8, 140, 36), fill=(24, 26, 24))
d.rectangle((left.width + 8, 8, left.width + 160, 36), fill=(24, 26, 24))
d.text((16, 14), ${JSON.stringify(leftLabel)}, fill=(232, 226, 212))
d.text((left.width + 16, 14), ${JSON.stringify(rightLabel)}, fill=(232, 226, 212))
out.save(${JSON.stringify(dest)}, 'PNG')
print('wrote', ${JSON.stringify(dest)})
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) console.error(r.stderr || r.stdout);
  else console.log(r.stdout.trim());
}

async function main() {
  const puppeteer = await import('puppeteer-core');
  const given = process.argv.slice(2).find((a) => !a.startsWith('--'));
  let server = null;
  const url = given || (await (async () => {
    const local = await serveLocal();
    server = local.server;
    return local.url;
  })());

  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--hide-scrollbars',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[three-spike]') || t.includes('error') || t.includes('albedo')) console.log('PAGE', t);
  });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__threeSpike && window.__threeSpike.inspect, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1400));

  const shot = async (name, fn) => {
    if (fn) await page.evaluate(fn);
    await new Promise((r) => setTimeout(r, 700));
    const dest = join(outDir, name);
    await page.screenshot({ path: dest, type: 'png' });
    console.log('wrote', dest);
  };

  await page.evaluate(() => window.__threeSpike.frameEuropeAfrica());
  await shot('europe-mid-390.png');
  await shot('mid-painted-relief.png');
  await shot('mid-land-sea.png');
  await shot('mid-continents.png');
  await shot('continents-wash.png');
  await shot('land-borders.png');
  await shot('mountains-relief.png');
  await shot('vegetation-coast.png');
  await shot('ocean-clean.png');
  await shot('sea-zones-ink.png');
  await shot('europe-mid-hud-390.png');

  await page.evaluate(() => window.__threeSpike.frameAfrica({ lift: 210, south: 30 }));
  await shot('africa-even.png');

  await page.evaluate(() => {
    window.__threeSpike.frameAustralia({ lift: 168, south: 22 });
    window.__threeSpike.selectLand(null);
  });
  await shot('australia-no-seam.png');
  await shot('aus-no-slivers.png');

  await page.evaluate(() => {
    window.__threeSpike.frameAustralia({ lift: 72, south: 10 });
    window.__threeSpike.selectLand(null);
  });
  await shot('near-opaque-plastic.png');

  await page.evaluate(() => window.__threeSpike.selectLand('Australia'));
  await shot('aus-select-clean.png');

  await page.evaluate(() => {
    window.__threeSpike.frameNear('United Kingdom');
    window.__threeSpike.selectLand('United Kingdom');
  });
  await shot('tan-units-contrast.png');
  await shot('unit-count-one.png');

  await page.evaluate(() => window.__threeSpike.selectLand('East US'));
  await shot('east-us-peek-one.png');

  await page.evaluate(() => window.__threeSpike.selectLand('Germany'));
  await shot('europe-mid-select-390.png');
  await shot('stack-expand.png');
  const stackExpand = await page.evaluate(() => window.__threeSpike.stackState('Germany'));
  const stackCollapse = await page.evaluate(() => window.__threeSpike.toggleStack('Germany'));
  await shot('stack-collapse.png');

  const eastMed = await page.evaluate(() => window.__threeSpike.frameEastMed({ lift: 78, south: 11 }));
  await shot('east-med-select-no-clip.png');
  const centralMed = await page.evaluate(() => window.__threeSpike.frameCentralMed({ lift: 78, south: 9 }));
  await shot('med-no-clip.png');
  await shot('unit-bg-unified.png');

  await page.evaluate(() => {
    window.__threeSpike.frameNearGermany();
    window.__threeSpike.selectLand('Germany');
  });
  await shot('europe-near-select-390.png');

  await page.evaluate(() => window.__threeSpike.frameChina({ lift: 118 }));
  await shot('china-hold.png');
  await shot('china-select-hold.png');

  await page.evaluate(() => window.__threeSpike.frameNearJapan());
  await shot('japan-near.png');
  await shot('japan-near-hold.png');

  const computed = await page.evaluate(() => {
    const confirm = document.getElementById('three-confirm');
    const zoom = document.querySelector('#three-zoom button');
    const place = document.querySelector('#three-phase');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const peek = document.getElementById('three-peek');
    return {
      version: window.__threeSpike.inspect().version,
      inspect: window.__threeSpike.inspect(),
      confirmReady: {
        background: cs(confirm)?.backgroundColor,
        copy: confirm?.textContent,
        class: confirm?.className,
      },
      zoom: cs(zoom)?.backgroundColor,
      place: cs(place)?.backgroundColor,
      lod: window.__threeSpike.lodBand(),
      peekBadges: peek ? peek.querySelectorAll('.three-peek-unit b').length : 0,
      peekIconCount: peek ? peek.querySelectorAll('.three-peek-unit img').length : 0,
      roster: {
        germany: window.__threeSpike.rosterOf('Germany'),
        japan: window.__threeSpike.rosterOf('Japan'),
        unitedKingdom: window.__threeSpike.rosterOf('United Kingdom'),
        eastUs: window.__threeSpike.rosterOf('East US'),
      },
      continents: window.__threeSpike.continents?.map((c) => ({ name: c.name, bonus: c.bonus })),
      china: window.__threeSpike.frameChina({ lift: 118 }),
      eastMed: window.__threeSpike.frameEastMed({ lift: 78, south: 11 }),
      centralMed: window.__threeSpike.frameCentralMed({ lift: 78, south: 9 }),
      australia: window.__threeSpike.frameAustralia({ lift: 168, south: 22 }),
    };
  });

  await page.evaluate(() => window.__threeSpike.selectLand(null));
  await new Promise((r) => setTimeout(r, 400));
  const idle = await page.evaluate(() => {
    const confirm = document.getElementById('three-confirm');
    return {
      confirm: getComputedStyle(confirm).backgroundColor,
      copy: confirm.textContent,
      class: confirm.className,
    };
  });
  computed.idle = idle;
  computed.eastMedCapture = eastMed;
  computed.centralMedCapture = centralMed;
  computed.stackExpand = stackExpand;
  computed.stackCollapse = stackCollapse;
  writeFileSync(join(outDir, 'computed.json'), JSON.stringify(computed, null, 2));
  console.log(JSON.stringify(computed.inspect, null, 2));

  await browser.close();
  if (server) server.close();

  const styleRef = join(root, 'briefs/2026-09-17-three-art-gap/refs/p37-gen/p37-oceania-style-lock.png');
  composePair(
    join(outDir, 'europe-mid-390.png'),
    styleRef,
    join(outDir, 'mid-vs-style-ref.png'),
    'p38 mid',
    'STYLE REF',
  );
  composePair(
    join(outDir, 'australia-no-seam.png'),
    styleRef,
    join(outDir, 'australia-vs-style-ref.png'),
    'p38 AU',
    'STYLE REF',
  );

  const held = [
    'stack-expand.png', 'stack-collapse.png', 'africa-even.png',
    'med-no-clip.png', 'china-hold.png', 'japan-near.png',
  ];
  for (const name of held) {
    if (existsSync(join(outDir, name))) console.log('held', name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
