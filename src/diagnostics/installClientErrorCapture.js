// Capture window errors + unhandled rejections into the cloud event log.
// Also used for sync push_failed / push_exhausted (soft-lock exits).

import { EVENT_KINDS } from './eventSchema.js';
import { emitGameEvent } from './eventLog.js';

function clip(text, max = 500) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function emitClientError(source, error, extra = {}) {
  const message = clip(error?.message || error || 'unknown');
  return emitGameEvent({
    kind: EVENT_KINDS.CLIENT_ERROR,
    payload: {
      source,
      message,
      stack: clip(error?.stack, 800),
      ...extra,
    },
  });
}

export function emitSoftlockExit(reason, extra = {}) {
  return emitGameEvent({
    kind: EVENT_KINDS.SOFTLOCK_EXIT,
    payload: { reason, ...extra },
  });
}

export function installClientErrorCapture(target = globalThis) {
  if (!target || target.__trDiagErrorsInstalled) return () => {};
  target.__trDiagErrorsInstalled = true;

  const onError = (event) => {
    const err = event?.error || event?.message || event;
    emitClientError('window.onerror', err, {
      filename: event?.filename || null,
      lineno: event?.lineno || null,
    });
  };
  const onRejection = (event) => {
    emitClientError('unhandledrejection', event?.reason || event);
  };

  if (typeof target.addEventListener === 'function') {
    target.addEventListener('error', onError);
    target.addEventListener('unhandledrejection', onRejection);
  }

  return () => {
    if (typeof target.removeEventListener === 'function') {
      target.removeEventListener('error', onError);
      target.removeEventListener('unhandledrejection', onRejection);
    }
    target.__trDiagErrorsInstalled = false;
  };
}
