import { RecorderStateMachine } from './state-machine.js'
import { SessionStore } from './session-store.js'
import { normalizeRawEvent } from './normalizer.js'
import { uploadBundle } from './uploader.js'
import { buildBundle } from './bundle-builder.js'
import { LiveStepBuilder } from './live-steps.js'
import { nowIso } from '../shared/utils.js'
import { STORAGE_KEY_SETTINGS } from '../shared/constants.js'
import { MSG } from '../shared/types.js'
import type { ExtensionSettings, RawEvent, SessionBundle } from '../shared/types.js'

// ─── Global state ─────────────────────────────────────────────────────────────

const sm = new RecorderStateMachine()
const store = new SessionStore()
let liveBuilder: LiveStepBuilder | null = null
let settings: ExtensionSettings = { uploadUrl: '', allowedDomains: [], blockedDomains: [] }
let lastBundle: SessionBundle | null = null

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSettings(): void {
  chrome.storage.sync.get([STORAGE_KEY_SETTINGS], result => {
    const saved = result[STORAGE_KEY_SETTINGS] as ExtensionSettings | undefined
    if (saved) settings = saved
  })
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function broadcastToExtension(message: unknown): void {
  chrome.runtime.sendMessage(message).catch(() => { /* side panel may not be open */ })
}

function broadcastStateUpdate(): void {
  const meta = store.getMeta()
  broadcastToExtension({
    type: MSG.SESSION_STATE_UPDATED,
    payload: { state: sm.state, meta },
  })
}

// ─── Lifecycle actions ────────────────────────────────────────────────────────

function handleStart(activityName: string, uploadUrl?: string): void {
  try {
    sm.transition('arming')
    broadcastStateUpdate()

    const meta = store.initSession(activityName, uploadUrl ?? settings.uploadUrl)
    liveBuilder = new LiveStepBuilder(meta.sessionId, step => {
      store.updateLiveStep(step)
      broadcastToExtension({ type: MSG.LIVE_STEP_UPDATED, payload: { step } })
    })

    // Notify content scripts to start capture
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: MSG.START_SESSION,
            payload: { sessionId: meta.sessionId },
          }).catch(() => { /* tab may not have content script */ })
        }
      }
    })

    sm.transition('recording')
    store.updateState('recording')
    broadcastStateUpdate()
  } catch (err) {
    transitionToError(err)
  }
}

function handlePause(): void {
  try {
    sm.transition('paused')
    store.updateState('paused')
    broadcastAllTabs({ type: MSG.PAUSE_SESSION, payload: {} })
    broadcastStateUpdate()
  } catch (err) {
    transitionToError(err)
  }
}

function handleResume(): void {
  try {
    sm.transition('recording')
    store.updateState('recording')
    broadcastAllTabs({ type: MSG.RESUME_SESSION, payload: {} })
    broadcastStateUpdate()
  } catch (err) {
    transitionToError(err)
  }
}

async function handleStop(): Promise<void> {
  try {
    sm.transition('stopping')
    store.updateState('stopping')
    broadcastAllTabs({ type: MSG.STOP_SESSION, payload: {} })
    broadcastStateUpdate()

    // Finalize live steps
    liveBuilder?.finalize()

    const bundle = await buildBundle(store)
    lastBundle = bundle
    sm.transition('review_ready')
    store.updateState('review_ready')

    broadcastToExtension({ type: MSG.FINALIZATION_COMPLETE, payload: { bundle } })
    broadcastStateUpdate()

    // Upload if URL is configured
    const uploadUrl = store.getMeta()?.uploadUrl
    if (uploadUrl) {
      broadcastToExtension({ type: MSG.UPLOAD_PROGRESS, payload: { percent: 0, status: 'uploading' } })
      const result = await uploadBundle(bundle, uploadUrl, percent => {
        broadcastToExtension({ type: MSG.UPLOAD_PROGRESS, payload: { percent, status: 'uploading' } })
      })
      broadcastToExtension({
        type: MSG.UPLOAD_PROGRESS,
        payload: {
          percent: 100,
          status: result.success ? 'complete' : 'failed',
          error: result.error,
        },
      })
    }
  } catch (err) {
    transitionToError(err)
  }
}

function handleDiscard(): void {
  broadcastAllTabs({ type: MSG.DISCARD_SESSION, payload: {} })
  liveBuilder?.reset()
  liveBuilder = null
  lastBundle = null
  store.clear()
  sm.reset()
  broadcastStateUpdate()
}

function transitionToError(err: unknown): void {
  const message = err instanceof Error ? err.message : 'Unknown error'
  if (sm.canTransition('error')) sm.transition('error')
  broadcastToExtension({
    type: MSG.SESSION_STATE_UPDATED,
    payload: { state: sm.state, meta: store.getMeta(), error: message },
  })
}

function broadcastAllTabs(message: unknown): void {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => { /* ignore */ })
      }
    }
  })
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: { type: string; payload: Record<string, unknown> }, _sender, sendResponse) => {
  switch (message.type) {
    case MSG.GET_STATE:
      sendResponse({ state: sm.state, meta: store.getMeta(), steps: store.getLiveSteps() })
      return true

    case MSG.EXPORT_BUNDLE:
      sendResponse(lastBundle)
      return true

    case MSG.START_SESSION:
      handleStart(
        message.payload['activityName'] as string,
        message.payload['uploadUrl'] as string | undefined,
      )
      break

    case MSG.PAUSE_SESSION:
      handlePause()
      break

    case MSG.RESUME_SESSION:
      handleResume()
      break

    case MSG.STOP_SESSION:
      void handleStop()
      break

    case MSG.DISCARD_SESSION:
      handleDiscard()
      break

    case MSG.RAW_EVENT_CAPTURED: {
      if (sm.state !== 'recording') break
      const raw = message.payload['event'] as RawEvent
      store.addRawEvent(raw)
      const { canonical, policyEntry } = normalizeRawEvent(raw, settings.blockedDomains)
      if (policyEntry) store.addPolicyEntry(policyEntry)
      if (canonical) {
        store.addCanonicalEvent(canonical)
        liveBuilder?.processEvent(canonical)
        broadcastToExtension({ type: MSG.NORMALIZED_EVENT_ADDED, payload: { event: canonical } })
      }
      break
    }

    case MSG.SETTINGS_UPDATED: {
      const updated = message.payload as Partial<ExtensionSettings>
      settings = { ...settings, ...updated }
      chrome.storage.sync.set({ [STORAGE_KEY_SETTINGS]: settings })
      break
    }
  }
  return false
})

// ─── Initialisation ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  loadSettings()
  // Open the side panel on install
  chrome.sidePanel.setOptions({ enabled: true }).catch(() => { /* ignore */ })
})

chrome.action.onClicked.addListener(tab => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => { /* ignore */ })
  }
})

loadSettings()
