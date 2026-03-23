import { CaptureEngine } from './capture.js'
import { MSG } from '../shared/types.js'

const engine = new CaptureEngine()

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
