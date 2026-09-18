// Capture 390 mid / near / HUD stills for polish.21. Preview only.
// Run: node tools/capture-three-qa-p21.mjs
import { mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dest = join(root, 'briefs/2026-09-17-three-art-gap/qa-loop/p21');
const destAlias = join(root, 'briefs/2026-09-17-three-art-gap/qa-p21');
const url = process.env.THREE_URL || 'http://127.0.0.1:8765/?three=1';

mkdirSync(dest, { recursive: true });
mkdirSync(destAlias, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
page.setDefaultTimeout(60000);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__threeSpike && document.querySelector('#threeCanvas'), { timeout: 45000 });
await page.waitForTimeout(900);
await page.evaluate(() => {
  window.__threeSpike.frameEuropeAfrica();
});
await page.waitForTimeout(700);
const mid = join(dest, 'europe-mid-390.png');
await page.screenshot({ path: mid, fullPage: false });
await page.screenshot({ path: join(dest, 'europe-mid-hud-390.png'), fullPage: false });

await page.evaluate(() => {
  window.__threeSpike.dollyBy(0.42, 195, 422);
  window.__threeSpike.selectLand('Germany');
});
await page.waitForTimeout(900);
await page.screenshot({ path: join(dest, 'europe-near-select-390.png'), fullPage: false });

for (const name of ['europe-mid-390.png', 'europe-mid-hud-390.png', 'europe-near-select-390.png']) {
  copyFileSync(join(dest, name), join(destAlias, name));
}
await browser.close();
console.log('wrote', dest);
