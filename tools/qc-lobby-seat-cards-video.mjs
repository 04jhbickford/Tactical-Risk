#!/usr/bin/env node
// Record a 390×844 walkthrough of seat occupant chrome + Start gate.
//   node tools/qc-lobby-seat-cards-video.mjs [url] [outfile]

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const STAMP = 'V2.81.56-ux-solo.18';
const URL = process.argv[2] || 'http://127.0.0.1:4173/?three=1&solo=1';
const OUT = process.argv[3] || '/opt/cursor/artifacts/lookpass17_seat_cards_qc_390.webm';
mkdirSync(dirname(OUT), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function swipe(cdp, { x, y, dy, steps = 18, stepDelay = 16 }) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 0.7 }],
  });
  for (let i = 1; i <= steps; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + (dy * i) / steps, radiusX: 8, radiusY: 8, force: 0.7 }],
    });
    await sleep(stepDelay);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: '/tmp/seat17-video', size: { width: 390, height: 844 } },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#three-lobby.is-open', { timeout: 30000 });
  await sleep(700);
  const stamp = await page.evaluate(() => ({
    lobby: document.querySelector('.three-lobby-ver')?.textContent?.trim() || '',
    html: window.__TR_GAME_VERSION || '',
  }));
  if (stamp.lobby !== STAMP || stamp.html !== STAMP) {
    throw new Error(`stamp ${JSON.stringify(stamp)}`);
  }
  await page.locator('[data-lobby="screen"][data-value="setup"]').first().click();
  await sleep(800);

  const start = () => page.locator('.three-lobby-start');
  const wrap = (i) => page.locator('.three-lobby-seat-wrap').nth(i);
  const chip = (i, text) => wrap(i).locator('.three-lobby-occupants .three-lobby-tile', { hasText: new RegExp(`^${text}$`) });

  if (!/Select at least 2 players/i.test(await start().innerText())) {
    throw new Error(`empty start ${(await start().innerText())}`);
  }
  await sleep(900);

  await chip(0, 'AI').click();
  await sleep(350);
  await chip(1, 'AI').click();
  await sleep(900);
  if (!/Need at least one Human/i.test(await start().innerText())) {
    throw new Error(`all-AI start ${(await start().innerText())}`);
  }

  await chip(0, 'Human').click();
  await sleep(900);
  if (!/Start Game \(2 Players\)/i.test(await start().innerText())) {
    throw new Error(`human+ai start ${(await start().innerText())}`);
  }

  await chip(1, 'Empty').click();
  await sleep(900);
  if (!/Select at least 2 players/i.test(await start().innerText())) {
    throw new Error(`cleared start ${(await start().innerText())}`);
  }

  await chip(1, 'Human').click();
  await sleep(300);
  await chip(2, 'Human').click();
  await sleep(900);
  if (!/Start Game \(3 Players\)/i.test(await start().innerText())) {
    throw new Error(`3 human start ${(await start().innerText())}`);
  }

  const cdp = await context.newCDPSession(page);
  const seat = await page.evaluate(() => {
    const el = document.querySelector('.three-lobby-seat-wrap.is-on .three-lobby-seat')
      || document.querySelector('.three-lobby-seat');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + 40), y: Math.round(r.top + r.height / 2) };
  });
  await swipe(cdp, { x: seat.x, y: seat.y, dy: -360, steps: 22, stepDelay: 16 });
  await sleep(1100);

  const video = page.video();
  await context.close();
  const src = await video.path();
  const { copyFileSync } = await import('node:fs');
  copyFileSync(src, OUT);
  await browser.close();
  console.log(JSON.stringify({ stamp, out: OUT, src }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
