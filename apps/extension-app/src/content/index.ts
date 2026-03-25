import { CaptureEngine } from './capture.js'
import { MSG } from '../shared/types.js'

console.log('[LDG-CS] content script loaded on', location.href)
const engine = new CaptureEngine()

// ─── Message listener (receives START/PAUSE/STOP from background) ──────────────

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

// ─── Self-recovery on load ─────────────────────────────────────────────────────
// If this content script loads AFTER recording has already started (e.g. the tab
// was navigated to after Start Recording was clicked, or the extension was just
// installed into an already-open tab), query the background and start capture.
chrome.runtime.sendMessage(
  { type: MSG.GET_STATE, payload: {} },
  (response: { state: string; meta?: { sessionId: string } } | undefined) => {
    if (chrome.runtime.lastError) {
      console.log('[LDG-CS] GET_STATE error:', chrome.runtime.lastError.message)
      return
    }
    console.log('[LDG-CS] GET_STATE response:', response?.state)
    if (response?.state === 'recording' && response?.meta?.sessionId) {
      engine.startCapture(response.meta.sessionId)
    }
  },
)
