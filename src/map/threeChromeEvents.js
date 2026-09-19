// Hybrid Three HUD hit isolation. Preview only.
// Classic click-through: a stepper / zoom tap must not select the land
// under the chrome (Congo / FEA under INF + at 390).

import { isPointInPanelRect } from '../ui/panelClickLock.js';

export const CHROME_DOWN_EVENTS = ['pointerdown', 'touchstart', 'mousedown'];
export const CHROME_UP_EVENTS = ['pointerup', 'touchend', 'mouseup', 'click'];

export function sealChromeEvent(e, { prevent = true } = {}) {
  if (!e) return;
  if (typeof e.stopPropagation === 'function') e.stopPropagation();
  if (prevent && e.cancelable !== false && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
}

export function isPointInAnyRect(clientX, clientY, rects = []) {
  return (Array.isArray(rects) ? rects : []).some(
    (rect) => isPointInPanelRect(clientX, clientY, rect),
  );
}

export function eventElement(e) {
  if (!e) return null;
  const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
  if (path?.length) {
    const fromPath = path.find((n) => n && typeof n.closest === 'function');
    if (fromPath) return fromPath;
  }
  const t = e.target;
  if (t && typeof t.closest === 'function') return t;
  return t?.parentElement || null;
}

export function clientPointOf(e) {
  if (!e) return null;
  if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
    return { x: e.clientX, y: e.clientY };
  }
  const t = e.changedTouches?.[0] || e.touches?.[0];
  if (t && Number.isFinite(t.clientX) && Number.isFinite(t.clientY)) {
    return { x: t.clientX, y: t.clientY };
  }
  return null;
}

export function rectFromElement(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
  };
}

export function chromeHitRectsFrom(api = {}) {
  const els = [];
  const push = (el) => {
    if (el) els.push(el);
  };
  push(api.zoom);
  push(api.l0);
  if (api.isSheetOpen?.() || api.sheet?.classList?.contains('is-open')) {
    push(api.sheet);
  }
  const peekOn = api.peek?.classList?.contains('is-on');
  const battleOn = api.battleEl?.classList?.contains('is-on');
  if (peekOn) push(api.peek);
  if (battleOn) push(api.battleEl);
  if (peekOn || battleOn) push(api.bottom);
  push(api.confirm);
  return els.map(rectFromElement).filter(Boolean);
}

export function shouldIgnoreMapHit({
  sheetOpen = false,
  targetInChrome = false,
  clientX,
  clientY,
  rects = [],
} = {}) {
  if (sheetOpen) return true;
  if (targetInChrome) return true;
  return isPointInAnyRect(clientX, clientY, rects);
}

export function sealChromeControl(el) {
  if (!el || el.dataset?.chromeSealed === '1') return el;
  if (el.dataset) el.dataset.chromeSealed = '1';
  for (const type of CHROME_DOWN_EVENTS) {
    el.addEventListener(type, (e) => sealChromeEvent(e, { prevent: true }), {
      capture: true,
      passive: false,
    });
  }
  for (const type of CHROME_UP_EVENTS) {
    el.addEventListener(type, (e) => {
      sealChromeEvent(e, { prevent: type === 'click' });
    }, { capture: true });
  }
  return el;
}

// pointerdown preventDefault can swallow click. Activate on pointerup,
// ignore a trailing click in the same gesture.
export function bindSealedActivate(root, selector, handler) {
  if (!root || typeof handler !== 'function') return;
  sealChromeControl(root);
  let lastAt = 0;
  const fire = (e) => {
    const node = eventElement(e);
    const hit = selector ? node?.closest?.(selector) : root;
    if (!hit || hit.disabled) return;
    const now = Date.now();
    if (now - lastAt < 280) return;
    lastAt = now;
    handler(e, hit);
  };
  root.addEventListener('pointerdown', fire, { capture: true });
  root.addEventListener('pointerup', fire, { capture: true });
  root.addEventListener('click', fire, { capture: true });
}
