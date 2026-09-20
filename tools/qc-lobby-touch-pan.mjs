#!/usr/bin/env node
// Fail-closed Playwright touch-pan QC for New Local Game @390×844.
// Uses CDP TouchEvents — not mouse wheel, not scrollTop= assignment.
//
//   node tools/qc-lobby-touch-pan.mjs [url]
//
// Default URL is local `http://127.0.0.1:4173/?three=1&solo=1`.
//
// Viz SCORE .16: .15 touch hold was PARTIAL (overflow:visible only).
// After any seat/shell CSS change, T1–T5 must re-prove a real finger-pan:
// Input.dispatchTouchEvent on a seat/occupant chip → MAIN.scrollTop moves
// AND window/body scrollY stays 0. CSS inspection is supporting, not READY.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const STAMP = 'V2.81.56-ux-solo.19';
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
  await page.screenshot({ path: shot('lookpass17_a1_stamp_hard_reload_390.png'), fullPage: false });
  await page.evaluate(() => {
    const lobby = document.getElementById('three-lobby');
    const l0 = document.getElementById('three-l0');
    if (lobby) lobby.style.visibility = 'hidden';
    if (l0) l0.style.zIndex = '90';
  });
  // .three-l0-ver hangs below the bar (position:absolute; top:100%+4px).
  await page.screenshot({
    path: shot('lookpass17_a1_l0_bar_hard_reload_390.png'),
    clip: { x: 0, y: 0, width: 390, height: 100 },
  });
  await page.evaluate(() => {
    const lobby = document.getElementById('three-lobby');
    const l0 = document.getElementById('three-l0');
    if (lobby) lobby.style.visibility = '';
    if (l0) l0.style.zIndex = '';
  });

  const local = page.locator('[data-lobby="screen"][data-value="setup"]').first();
  if (await local.count()) {
    await local.click();
    await page.waitForTimeout(250);
  }

  const chrome = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.three-lobby-seat-wrap')];
    const start = document.querySelector('.three-lobby-start');
    return {
      seats: wraps.map((el) => {
        const kinds = [...el.querySelectorAll('.three-lobby-occupants .three-lobby-tile')].map((b) => b.textContent.trim());
        const tiers = [...el.querySelectorAll('.three-lobby-ai-tiers .three-lobby-tile')].map((b) => b.textContent.trim());
        const r = el.getBoundingClientRect();
        const chips = [...el.querySelectorAll('.three-lobby-occupants .three-lobby-tile, .three-lobby-ai-tiers .three-lobby-tile')];
        return {
          name: el.querySelector('.three-lobby-seat-name')?.textContent?.trim() || '',
          kind: el.getAttribute('data-occupant-kind') || '',
          kinds,
          tiers,
          height: Math.round(r.height),
          overflow: getComputedStyle(el).overflow,
          clipped: chips.some((c) => c.getBoundingClientRect().bottom > r.bottom + 1),
        };
      }),
      startDisabled: !!start?.disabled,
      startLabel: start?.textContent?.trim() || '',
    };
  });
  if (chrome.seats.length !== 5) throw new Error(`need 5 seats, got ${chrome.seats.length}`);
  for (const seat of chrome.seats) {
    if (seat.kinds.join('|') !== 'Human|AI|Empty') {
      throw new Error(`occupant chrome ${seat.name}: ${seat.kinds.join('|')}`);
    }
    if (seat.tiers.join('|') !== 'Easy|Med|Hard') {
      throw new Error(`AI tiers ${seat.name}: ${seat.tiers.join('|')}`);
    }
    if (seat.clipped) throw new Error(`clipped occupant chrome ${seat.name}`);
    if (seat.overflow === 'hidden') throw new Error(`overflow:hidden clip ${seat.name}`);
    if (seat.height < 96) throw new Error(`collapsed ${seat.name} height ${seat.height}`);
  }
  if (!chrome.startDisabled || !/Select at least 2 players/i.test(chrome.startLabel)) {
    throw new Error(`Start should be dead at 0 seats: ${JSON.stringify(chrome.startLabel)}`);
  }
  await page.screenshot({ path: shot('lookpass17_seats_empty_start_dead_390.png'), fullPage: false });

  const firstAi = page.locator('.three-lobby-seat-wrap').nth(0).locator('.three-lobby-occupants .three-lobby-tile', { hasText: /^AI$/ });
  const secondAi = page.locator('.three-lobby-seat-wrap').nth(1).locator('.three-lobby-occupants .three-lobby-tile', { hasText: /^AI$/ });
  await firstAi.click();
  await page.waitForTimeout(280);
  await secondAi.click();
  await page.waitForTimeout(280);
  const allAi = await page.evaluate(() => {
    const start = document.querySelector('.three-lobby-start');
    const kinds = [...document.querySelectorAll('.three-lobby-seat-wrap')].map((el) => el.getAttribute('data-occupant-kind'));
    return { disabled: !!start?.disabled, label: start?.textContent?.trim() || '', kinds };
  });
  if (!allAi.disabled || !/Need at least one Human/i.test(allAi.label)) {
    throw new Error(`Start should stay dead for all-AI: ${JSON.stringify(allAi)}`);
  }
  await page.locator('.three-lobby-seat-wrap').nth(0).locator('.three-lobby-occupants .three-lobby-tile', { hasText: /^Empty$/ }).click();
  await page.waitForTimeout(220);
  await page.locator('.three-lobby-seat-wrap').nth(1).locator('.three-lobby-occupants .three-lobby-tile', { hasText: /^Empty$/ }).click();
  await page.waitForTimeout(220);

  const wraps = page.locator('.three-lobby-seat-wrap');
  const n = await wraps.count();
  for (let i = 0; i < Math.min(n, 3); i += 1) {
    const wrap = wraps.nth(i);
    const human = wrap.locator('.three-lobby-occupants .three-lobby-tile', { hasText: /^Human$/ });
    if (!(await human.evaluate((el) => el.classList.contains('is-on')))) {
      await human.click();
      await page.waitForTimeout(320);
    }
  }
  const humans = await page.locator('.three-lobby-occupants .three-lobby-tile.is-on').evaluateAll(
    (els) => els.filter((el) => /^human$/i.test(el.textContent || '')).length,
  );
  if (humans < 3) {
    throw new Error(`T1 FAIL need ≥3 Humans, got ${humans}`);
  }
  const startOn = await page.evaluate(() => {
    const start = document.querySelector('.three-lobby-start');
    return { disabled: !!start?.disabled, label: start?.textContent?.trim() || '' };
  });
  if (startOn.disabled || !/Start Game \(3 Players\)/i.test(startOn.label)) {
    throw new Error(`Start gate FAIL after 3 Humans: ${JSON.stringify(startOn)}`);
  }

  const t2 = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    const wrap = document.querySelector('.three-lobby-seat-wrap');
    const chip = document.querySelector('.three-lobby-occupants .three-lobby-tile');
    const footer = document.querySelector('.three-lobby-footer');
    const setup = document.querySelector('.three-lobby-setup');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const m = cs(main);
    const w = cs(wrap);
    const c = cs(chip);
    const html = cs(document.documentElement);
    const body = cs(document.body);
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent || '').join('\n');
    return {
      mainOverflow: m?.overflowY,
      mainTouch: m?.touchAction,
      mainFlex: m?.flexGrow,
      mainMin: m?.minHeight,
      mainOverscroll: m?.overscrollBehavior || m?.overscrollBehaviorY,
      mainWebkit: /#three-lobby \.three-lobby-main \{[\s\S]*?-webkit-overflow-scrolling:\s*touch/.test(css),
      wrapTouch: w?.touchAction,
      chipTouch: c?.touchAction,
      footerOutside: !!(footer && main && !main.contains(footer) && setup?.contains(footer)),
      chipsUnclipped: w?.overflow === 'visible' || w?.overflowY === 'visible',
      htmlOverflow: html?.overflow,
      bodyOverflow: body?.overflow,
      supportingOnly: 'overflow:visible / pan-y CSS is supporting — T3 gesture is fail-closed',
    };
  });
  if (t2.mainOverflow !== 'auto' || !String(t2.mainTouch).includes('pan-y') || !t2.mainWebkit) {
    throw new Error(`T2 FAIL MAIN scroll/touch ${JSON.stringify(t2)}`);
  }
  if (!String(t2.mainOverscroll || '').includes('contain')) {
    throw new Error(`T2 FAIL MAIN overscroll-behavior contain ${JSON.stringify(t2.mainOverscroll)}`);
  }
  if (!String(t2.wrapTouch).includes('pan-y') || !String(t2.chipTouch).includes('pan-y')) {
    throw new Error(`T2 FAIL seat/chip touch-action ${JSON.stringify(t2)}`);
  }
  if (!t2.footerOutside) throw new Error('T5 FAIL footer is inside MAIN');
  if (t2.htmlOverflow !== 'hidden' || t2.bodyOverflow !== 'hidden') {
    throw new Error(`T2 FAIL html/body must overflow:hidden so body scrollY stays 0 ${JSON.stringify(t2)}`);
  }

  await page.screenshot({ path: shot('lookpass17_t1_setup_top_390.png'), fullPage: false });

  await page.evaluate(() => {
    window.__trLobbyTouchPrevented = false;
    const mark = (e) => {
      if (e && e.defaultPrevented) window.__trLobbyTouchPrevented = true;
    };
    const main = document.querySelector('.three-lobby-main');
    main?.addEventListener('touchstart', mark, { passive: true });
    main?.addEventListener('touchmove', mark, { passive: true });
    document.addEventListener('touchstart', mark, { passive: true, capture: true });
    document.addEventListener('touchmove', mark, { passive: true, capture: true });
  });
  const before = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    const chip = document.querySelector('.three-lobby-seat-wrap.is-on .three-lobby-occupants .three-lobby-tile.is-on')
      || document.querySelector('.three-lobby-seat-wrap.is-on .three-lobby-seat')
      || document.querySelector('.three-lobby-seat');
    const r = chip.getBoundingClientRect();
    const bodyY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return {
      scrollTop: main.scrollTop,
      scrollHeight: main.scrollHeight,
      clientHeight: main.clientHeight,
      bodyScrollY: bodyY,
      windowScrollY: window.scrollY,
      startOn: 'occupant-chip',
      x: Math.round(r.left + Math.min(24, r.width / 2)),
      y: Math.round(r.top + r.height / 2),
    };
  });
  if (before.scrollHeight <= before.clientHeight + 8) {
    throw new Error(`setup is not below-fold: ${before.scrollHeight} ≤ ${before.clientHeight}`);
  }
  if (before.scrollTop !== 0) {
    throw new Error(`T5 FAIL test assigned scrollTop before gesture (${before.scrollTop})`);
  }
  if (before.bodyScrollY !== 0 || before.windowScrollY !== 0) {
    throw new Error(`T3 FAIL body/window scrollY already ${before.bodyScrollY}/${before.windowScrollY} before pan`);
  }

  const cdp = await context.newCDPSession(page);
  // Finger-pan MAIN downward = finger moves up. Starts on Human/AI/Empty
  // occupant chip after the .17 seat CSS. Short first swipe so mid-pan
  // still differs from scroll-end. Never assign MAIN.scrollTop=.
  await dispatchSwipe(cdp, { x: before.x, y: before.y, dy: -120, steps: 14, stepDelay: 18 });
  await page.waitForTimeout(250);

  const mid = await page.evaluate(() => {
    const main = document.querySelector('.three-lobby-main');
    const bodyY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return {
      scrollTop: main.scrollTop,
      bodyScrollY: bodyY,
      windowScrollY: window.scrollY,
    };
  });
  if (!(mid.scrollTop > before.scrollTop)) {
    throw new Error(`T3 FAIL CDP Input.dispatchTouchEvent did not move MAIN.scrollTop (${before.scrollTop} → ${mid.scrollTop}) — overflow:visible is not enough`);
  }
  if (mid.bodyScrollY !== 0 || mid.windowScrollY !== 0) {
    throw new Error(`T3 FAIL body/window scrolled (${mid.bodyScrollY}/${mid.windowScrollY}); only MAIN may move`);
  }
  const t1 = await page.evaluate(() => !!window.__trLobbyTouchPrevented);
  if (t1) throw new Error('T1 FAIL touchstart/touchmove defaultPrevented during lobby pan');
  await page.screenshot({ path: shot('lookpass17_t4_mid_pan_390.png'), fullPage: false });

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
    const bodyY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return {
      scrollTop: main.scrollTop,
      bodyScrollY: bodyY,
      windowScrollY: window.scrollY,
      lastBottom: lastR.bottom,
      footerTop: footR.top,
      gap: footR.top - lastR.bottom,
      name,
      footerOutside: !main.contains(footer),
      chips: [...last.querySelectorAll('.three-lobby-occupants .three-lobby-tile, .three-lobby-ai-tiers .three-lobby-tile')].map((el) => ({
        text: el.textContent.trim(),
        bottom: el.getBoundingClientRect().bottom,
        clipped: el.getBoundingClientRect().bottom > lastR.bottom + 1,
      })),
    };
  });
  if (!(end.scrollTop > before.scrollTop)) {
    throw new Error(`T3 FAIL end MAIN.scrollTop not from CDP gesture (${before.scrollTop} → ${end.scrollTop})`);
  }
  if (end.bodyScrollY !== 0 || end.windowScrollY !== 0) {
    throw new Error(`T3 FAIL body/window scrollY ${end.bodyScrollY}/${end.windowScrollY} after pan (must stay 0)`);
  }
  if (end.lastBottom > end.footerTop - 8) {
    throw new Error(`T3/T5 FAIL last seat ${end.name} bottom ${end.lastBottom} not above footer ${end.footerTop}`);
  }
  if (end.gap < 8) throw new Error(`T5 FAIL gap ${end.gap}px`);
  if (end.chips.some((c) => c.clipped)) throw new Error(`T4 FAIL chips clipped ${JSON.stringify(end.chips)}`);
  await page.screenshot({ path: shot('lookpass17_t5_scroll_end_last_seat_390.png'), fullPage: false });

  await browser.close();
  const report = {
    stamp: STAMP,
    url: URL,
    a1,
    t2,
    t1: { preventDefaultDuringPan: false, startOn: before.startOn },
    t3: {
      scrollTopBefore: before.scrollTop,
      scrollTopMid: mid.scrollTop,
      scrollTopEnd: end.scrollTop,
      bodyScrollY: { before: before.bodyScrollY, mid: mid.bodyScrollY, end: end.bodyScrollY },
      windowScrollY: { before: before.windowScrollY, mid: mid.windowScrollY, end: end.windowScrollY },
      causedBy: 'CDP Input.dispatchTouchEvent touchStart/touchMove/touchEnd on occupant chip',
      not: 'CSS overflow:visible inspection / wheel / scrollTop= assignment',
    },
    t4: { startedOn: before.startOn, scrollTopMoved: mid.scrollTop > before.scrollTop },
    t5: end,
    chrome,
    shots: [
      'lookpass17_a1_stamp_hard_reload_390.png',
      'lookpass17_a1_l0_bar_hard_reload_390.png',
      'lookpass17_t1_setup_top_390.png',
      'lookpass17_t4_mid_pan_390.png',
      'lookpass17_t5_scroll_end_last_seat_390.png',
    ],
  };
  console.log(JSON.stringify(report, null, 2));
  console.log('TOUCH-PAN QC PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
