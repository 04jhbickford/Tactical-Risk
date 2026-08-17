// Panel gesture lock. A mid-gesture re-render (queue + / remote snapshot)
// must not retarget the same tap onto Done, Log, Deploy, or another row.

export const PANEL_QUEUE_GUARD_MS = 400;
export const PANEL_MAP_GUARD_MS = 400;

const QUEUE_ACTIONS = new Set(['place-queue', 'place-queue-max']);
const AFTER_QUEUE_BLOCK = new Set([
  'finish-placement',
  'phone-detent-tab',
]);

export function capturePanelPointerLock({
  tabId = null,
  action = null,
  disabled = false,
  dataset = {},
} = {}) {
  if (action && QUEUE_ACTIONS.has(action)) {
    if (disabled) return { kind: 'ignore' };
    return { kind: 'action', action, dataset: { ...dataset, action } };
  }
  if (tabId) {
    return { kind: 'tab', tab: tabId, dataset: { tab: tabId } };
  }
  if (action && disabled) return { kind: 'ignore' };
  if (action) {
    return { kind: 'action', action, dataset: { ...dataset, action } };
  }
  return { kind: 'none' };
}

export function isPointInPanelRect(clientX, clientY, rect = null) {
  if (!rect) return false;
  const x = Number(clientX);
  const y = Number(clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function actionButtonFrom(el) {
  if (!el) return null;
  if (el.dataset?.action) return el;
  return el.closest?.('[data-action]') || null;
}

function tabFrom(el) {
  if (!el) return null;
  if (el.dataset?.tab && (el.className || '').toString().includes('pp-tab')
    && !(el.className || '').toString().includes('pp-tab-content')) {
    return el;
  }
  return el.closest?.('.pp-tab') || el.closest?.('.phone-detent-tab') || null;
}

// Hover can say Max while the top of the stack is LOG or the canvas (B31).
// Walk the full hit stack; queue controls win over tabs.
export function pickPanelHitFromStack(stack = [], { panelEl = null } = {}) {
  const inPanel = (el) => {
    if (!el) return false;
    if (!panelEl) return true;
    if (typeof panelEl.contains === 'function') return panelEl.contains(el);
    return true;
  };

  for (const el of stack) {
    const btn = actionButtonFrom(el);
    if (btn && inPanel(btn) && QUEUE_ACTIONS.has(btn.dataset.action)) {
      return capturePanelPointerLock({
        action: btn.dataset.action,
        disabled: !!btn.disabled,
        dataset: { ...btn.dataset },
      });
    }
  }

  for (const el of stack) {
    const btn = actionButtonFrom(el);
    if (btn && inPanel(btn) && btn.dataset.action !== 'phone-detent-tab') {
      return capturePanelPointerLock({
        action: btn.dataset.action,
        disabled: !!btn.disabled,
        dataset: { ...btn.dataset },
      });
    }
  }

  for (const el of stack) {
    const tab = tabFrom(el);
    if (!tab || !inPanel(tab)) continue;
    if (tab.dataset?.action === 'phone-detent-tab' || (tab.className || '').toString().includes('phone-detent-tab')) {
      return capturePanelPointerLock({
        action: 'phone-detent-tab',
        dataset: { ...(tab.dataset || {}), action: 'phone-detent-tab' },
      });
    }
    if (tab.dataset?.tab) {
      return capturePanelPointerLock({ tabId: tab.dataset.tab });
    }
  }

  return capturePanelPointerLock({});
}

export function resolveLockedPanelClick({
  lock = null,
  clickTabId = null,
  clickAction = null,
  clickDataset = {},
  now = 0,
  lastQueueGestureAt = 0,
  queueGuardMs = PANEL_QUEUE_GUARD_MS,
} = {}) {
  const queuedRecently = lastQueueGestureAt > 0
    && now - lastQueueGestureAt < queueGuardMs;

  if (lock?.kind === 'ignore') return null;

  // B31: Max / + wins over LOG even if pointerdown hit the tab on top.
  if (lock?.kind === 'tab' && QUEUE_ACTIONS.has(clickAction)) {
    return { kind: 'action', action: clickAction, dataset: { ...clickDataset, action: clickAction } };
  }

  if (lock?.kind === 'tab') {
    if (queuedRecently) return null;
    return { kind: 'tab', tab: lock.tab };
  }

  if (lock?.kind === 'action') {
    if (QUEUE_ACTIONS.has(lock.action)) {
      return { kind: 'action', action: lock.action, dataset: lock.dataset || {} };
    }
    if (queuedRecently && AFTER_QUEUE_BLOCK.has(lock.action)) return null;
    return { kind: 'action', action: lock.action, dataset: lock.dataset || {} };
  }

  // No lock (keyboard / tests): still refuse a Done / Log ghost after +.
  if (queuedRecently && (clickTabId || AFTER_QUEUE_BLOCK.has(clickAction))) {
    return null;
  }
  if (clickTabId) return { kind: 'tab', tab: clickTabId };
  if (clickAction) {
    return { kind: 'action', action: clickAction, dataset: { ...clickDataset, action: clickAction } };
  }
  return null;
}

export function shouldBlockMapSelectAfterPanel({
  panelPointerAt = 0,
  now = 0,
  guardMs = PANEL_MAP_GUARD_MS,
  pointInPanel = false,
} = {}) {
  if (pointInPanel) return true;
  return panelPointerAt > 0 && now - panelPointerAt < guardMs;
}

export function isQueueGestureAction(action) {
  return QUEUE_ACTIONS.has(action);
}

// One gesture changes one unitType. A mid-render retarget onto Transport
// after Destroyer + must be ignored (B30 / B14 family).
export function shouldIgnoreQueueRetarget({
  lockedType = null,
  incomingType = null,
  elapsedMs = 0,
  windowMs = PANEL_QUEUE_GUARD_MS,
} = {}) {
  if (!lockedType || !incomingType) return false;
  if (lockedType === incomingType) return false;
  return Number(elapsedMs) >= 0 && Number(elapsedMs) < Number(windowMs);
}

export function resolveQueueUnitType({
  lockedType = null,
  incomingType = null,
} = {}) {
  return lockedType || incomingType || null;
}
