#!/usr/bin/env node
// Fail-closed Playwright touch-pan QC for New Local Game @390×844.
// Uses CDP TouchEvents — not mouse wheel, not scrollTop= assignment.
//
//   node tools/qc-lobby-touch-pan.mjs [url]
//
// Default URL is local `http://127.0.0.1:4173/?three=1&solo=1`.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const STAMP = 'V2.81.56-ux-solo.15';
const URL = process.argv[2] || 'http://127.0.0.1:4173/?three=1&solo=1';
const OUT = process.argv[3] || '/opt/cursor/artifacts/screenshots';
mkdirSync(OUT, { recursive: true });

function shot(name) {
  return join(OUT, name);
}

async function dispatchSwipe(cdp, { x, y, dy, steps = 16, stepDelay = 16 }) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 0.7 }],
  });
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + dy * t, radiusX: 8, radiusY: 8, force: 0.7 }],
    });
    await new Promise((r) => setTimeout(r, stepDelay));
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#three-lobby.is-open', { timeout: 30000 });
  await page.waitForTimeout(400);

  const a1 = await page.evaluate((want) => {
    const l0 = document.querySelector('.three-l0-ver')?.textContent?.trim() || '';
    const lobby = document.querySelector('.three-lobby-ver')?.textContent?.trim() || '';
    const html = window.__TR_GAME_VERSION || '';
    return {
      l0, lobby, html,
      ok: l0 === want && lobby === want && html === want,
    };
  }, STAMP);
  if (!a1.ok) {
    throw new Error(`A1 FAIL stamp ${JSON.stringify(a1)} want ${STAMP}`);
  }
  await page.screenshot({ path: shot('lookpass15_a1_stamp_hard_reload_390.png'), fullPage: false });

  const local = page.locator('[data-lobby="screen"][data-value="setup"]').first();
  if (await local.count()) {
    await local.click();
    await page.waitForTimeout(250);
  }

  const wraps = page.locator('.three-lobby-seat-wrap');
  const n = await wraps.count();
  for (let i = 0; i < Math.min(n, 3); i += 1) {
    const wrap = wraps.nth(i);
    if (!(await wrap.evaluate((el) => el.classList.contains('is-on')))) {
      await wrap.locator('.three-lobby-seat').click();
      await page.waitForTimeout(320);
    }
    const human = wrap.locator('.three-lobby-occupants .three-lobby-tile', { hasText: 'Human' });
    if (!(await human.evaluate((el) => el.classList.contains('is-on')))) {
      await human.click();
      await page.waitForTimeout(320);
    }
  }
  const humans = await page.locator('.three-lobby-occupants .three-lobby-tile.is-on').evaluateAll(
    (els) => els.filter((el) => /human/i.test(el.textContent || '')).length,
  );
  if (humans < 3) {
    throw new Error(`T1 FAIL need ≥3 Humans, got ${humans}`);
  }

  const t2 = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    const wrap = document.querySelector('.three-lobby-seat-wrap');
    const chip = document.querySelector('.three-lobby-occupants .three-lobby-tile');
    const footer = document.querySelector('.three-lobby-footer');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const m = cs(main);
    const w = cs(wrap);
    const c = cs(chip);
    return {
      mainOverflow: m?.overflowY,
      mainTouch: m?.touchAction,
      mainFlex: m?.flexGrow,
      mainMin: m?.minHeight,
      wrapTouch: w?.touchAction,
      chipTouch: c?.touchAction,
      footerOutside: !!(footer && main && !main.contains(footer)),
      chipsUnclipped: w?.overflow === 'visible' || w?.overflowY === 'visible',
    };
  });
  if (t2.mainOverflow !== 'auto' || !String(t2.mainTouch).includes('pan-y')) {
    throw new Error(`T2 FAIL MAIN scroll/touch ${JSON.stringify(t2)}`);
  }
  if (!String(t2.wrapTouch).includes('pan-y') || !String(t2.chipTouch).includes('pan-y')) {
    throw new Error(`T2 FAIL seat/chip touch-action ${JSON.stringify(t2)}`);
  }
  if (!t2.footerOutside) throw new Error('T5 FAIL footer is inside MAIN');

  await page.screenshot({ path: shot('lookpass15_t1_setup_top_390.png'), fullPage: false });

  const before = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    const chip = document.querySelector('.three-lobby-occupants .three-lobby-tile');
    const r = chip.getBoundingClientRect();
    return {
      scrollTop: main.scrollTop,
      scrollHeight: main.scrollHeight,
      clientHeight: main.clientHeight,
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
    };
  });
  if (before.scrollHeight <= before.clientHeight + 8) {
    throw new Error(`setup is not below-fold: ${before.scrollHeight} ≤ ${before.clientHeight}`);
  }
  if (before.scrollTop !== 0) {
    throw new Error(`T5 FAIL test assigned scrollTop before gesture (${before.scrollTop})`);
  }

  const cdp = await context.newCDPSession(page);
  // Finger-pan MAIN downward = finger moves up. Short first swipe so
  // mid-pan still differs from scroll-end.
  await dispatchSwipe(cdp, { x: before.x, y: before.y, dy: -120, steps: 14, stepDelay: 18 });
  await page.waitForTimeout(250);

  const mid = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    return { scrollTop: main.scrollTop };
  });
  if (!(mid.scrollTop > before.scrollTop)) {
    throw new Error(`T3 FAIL touch gesture did not move scrollTop (${before.scrollTop} → ${mid.scrollTop})`);
  }
  await page.screenshot({ path: shot('lookpass15_t4_mid_pan_390.png'), fullPage: false });

  const lastChip = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.three-lobby-seat-wrap')];
    const last = wraps[wraps.length - 1];
    const chip = last?.querySelector('.three-lobby-occupants .three-lobby-tile');
    const r = (chip || last).getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(Math.min(620, r.top + 10)) };
  });
  await dispatchSwipe(cdp, { x: lastChip.x, y: 520, dy: -360, steps: 24, stepDelay: 16 });
  await page.waitForTimeout(300);

  const end = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    const wraps = [...document.querySelectorAll('.three-lobby-seat-wrap')];
    const last = wraps[wraps.length - 1];
    const footer = document.querySelector('.three-lobby-footer');
    const lastR = last.getBoundingClientRect();
    const footR = footer.getBoundingClientRect();
    const name = last.querySelector('.three-lobby-seat-name')?.textContent?.trim() || '';
    return {
      scrollTop: main.scrollTop,
      lastBottom: lastR.bottom,
      footerTop: footR.top,
      gap: footR.top - lastR.bottom,
      name,
      footerOutside: !main.contains(footer),
      chips: [...last.querySelectorAll('.three-lobby-occupants .three-lobby-tile')].map((el) => ({
        text: el.textContent.trim(),
        bottom: el.getBoundingClientRect().bottom,
        clipped: el.getBoundingClientRect().bottom > lastR.bottom + 1,
      })),
    };
  });
  if (!(end.scrollTop > before.scrollTop)) {
    throw new Error(`T3 FAIL end scrollTop not from gesture (${before.scrollTop} → ${end.scrollTop})`);
  }
  if (end.lastBottom > end.footerTop - 8) {
    throw new Error(`T3/T5 FAIL last seat ${end.name} bottom ${end.lastBottom} not above footer ${end.footerTop}`);
  }
  if (end.gap < 8) throw new Error(`T5 FAIL gap ${end.gap}px`);
  if (end.chips.some((c) => c.clipped)) throw new Error(`T4 FAIL chips clipped ${JSON.stringify(end.chips)}`);
  await page.screenshot({ path: shot('lookpass15_t5_scroll_end_last_seat_390.png'), fullPage: false });

  await browser.close();
  const report = {
    stamp: STAMP,
    url: URL,
    a1,
    t2,
    t3: {
      scrollTopBefore: before.scrollTop,
      scrollTopMid: mid.scrollTop,
      scrollTopEnd: end.scrollTop,
      causedBy: 'CDP Input.dispatchTouchEvent touchStart/touchMove/touchEnd',
    },
    t5: end,
    shots: [
      'lookpass15_a1_stamp_hard_reload_390.png',
      'lookpass15_t1_setup_top_390.png',
      'lookpass15_t4_mid_pan_390.png',
      'lookpass15_t5_scroll_end_last_seat_390.png',
    ],
  };
  console.log(JSON.stringify(report, null, 2));
  console.log('TOUCH-PAN QC PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
