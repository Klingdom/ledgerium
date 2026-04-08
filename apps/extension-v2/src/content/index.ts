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
  chrome.runtime.onMessage.addListener((message: { type: string; payload: Record<string, unknown> }) => {
    switch (message.type) {
      case MSG.START_SESSION:
        engine.startCapture(message.payload['sessionId'] as string)
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

  // ─── Self-recovery: query background for current state ──────────────────────
  // If injected into a tab that's already in a recording session, start capture.
  chrome.runtime.sendMessage(
    { type: MSG.GET_STATE, payload: {} },
    (response: { state: string; meta?: { sessionId: string } } | undefined) => {
      if (chrome.runtime.lastError) {
        console.debug('[LDG-CS] GET_STATE error:', chrome.runtime.lastError.message)
        return
      }
      if (response?.state === 'recording' && response?.meta?.sessionId) {
        console.log('[LDG-CS] Joining active session:', response.meta.sessionId)
        engine.startCapture(response.meta.sessionId)
      }
    },
  )
}
