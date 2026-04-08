/**
 * Content script entry point — v2 with idempotency guard.
 *
 * In v2, this script is injected programmatically (not via manifest).
 * It may be injected multiple times into the same frame — the guard
 * ensures only one CaptureEngine instance exists per frame.
 */

import { CaptureEngine } from './capture.js'
import { MSG } from '../shared/types.js'

// ─── Idempotency guard ────────────────────────────────────────────────────────
// Prevents duplicate engines if the script is injected more than once.

const GUARD_KEY = '__ledgerium_capture_engine_v2__';

if ((window as any)[GUARD_KEY]) {
  console.debug('[LDG-CS] Already injected, skipping duplicate initialization')
} else {
  (window as any)[GUARD_KEY] = true;

  console.log('[LDG-CS] Content script loaded on', location.href)
  const engine = new CaptureEngine()

  // ─── Message listener (receives START/PAUSE/STOP from background) ──────────
  chrome.runtime.onMessage.addListener((message: { type: string; payload: Record<string, unknown> }, _sender, sendResponse) => {
    // PING handler — allows injection manager to detect this script is present
    if (message.type === 'PING') {
      sendResponse({ ok: true })
      return true
    }

    switch (message.type) {
      case MSG.START_SESSION:
        console.log('[LDG-CS] START_SESSION received, sessionId:', message.payload['sessionId'])
        engine.startCapture(
          message.payload['sessionId'] as string,
          message.payload['startedAt'] as string | undefined,
        )
        break
      case MSG.PAUSE_SESSION:
        engine.pauseCapture()
        break
      case MSG.RESUME_SESSION:
        engine.resumeCapture()
        break
      case MSG.STOP_SESSION:
      case MSG.DISCARD_SESSION:
        engine.stopCapture()
        break
    }
  })

  // ─── Self-recovery: only join if this is the active tab ─────────────────────
  // v2 trust model: Content scripts load on every page (via manifest), but
  // capture should ONLY activate on the tab the user is currently viewing.
  // The background will send START_SESSION explicitly when the user visits
  // this tab. We do NOT auto-join from every tab on load.
  //
  // Exception: if this script was programmatically injected by the background
  // (which only happens for the active tab), it will receive START_SESSION
  // immediately after injection via the background's message send.
}
