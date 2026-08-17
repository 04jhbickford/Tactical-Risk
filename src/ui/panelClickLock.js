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
  if (tabId) {
    return { kind: 'tab', tab: tabId, dataset: { tab: tabId } };
  }
  if (action && disabled) return { kind: 'ignore' };
  if (action) {
    return { kind: 'action', action, dataset: { ...dataset, action } };
  }
  return { kind: 'none' };
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
} = {}) {
  return panelPointerAt > 0 && now - panelPointerAt < guardMs;
}

export function isQueueGestureAction(action) {
  return QUEUE_ACTIONS.has(action);
}
