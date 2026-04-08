import { injectIntoAllTabs, injectOnTabLoad, injectOnTabActivated, clearInjectionState } from './injection-manager.js'
import { RecorderStateMachine } from './state-machine.js'
import { SessionStore } from './session-store.js'
import { HistoryStore } from './history-store.js'
import { normalizeRawEvent } from './normalizer.js'
import { uploadBundle } from './uploader.js'
import { buildBundle } from './bundle-builder.js'
import { LiveStepBuilder } from './live-steps.js'
import { buildWorkflowReport } from './workflow-report-builder.js'
import type { WorkflowReport } from './workflow-report-builder.js'
import { nowIso } from '../shared/utils.js'
import { STORAGE_KEY_SETTINGS } from '../shared/constants.js'
import { MSG } from '../shared/types.js'
import type { ExtensionSettings, RawEvent, SessionBundle } from '../shared/types.js'

// ─── Global state ─────────────────────────────────────────────────────────────

const sm = new RecorderStateMachine()
const store = new SessionStore()
const historyStore = new HistoryStore()
let liveBuilder: LiveStepBuilder | null = null
let settings: ExtensionSettings = { uploadUrl: '', apiKey: '', allowedDomains: [], blockedDomains: [] }
let lastBundle: SessionBundle | null = null
let lastWorkflowReport: WorkflowReport | null = null

// Key used to persist recording state across service worker restarts
const SESSION_STATE_KEY = 'ledgerium_sw_state'

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSettings(): void {
  chrome.storage.sync.get([STORAGE_KEY_SETTINGS], result => {
    const saved = result[STORAGE_KEY_SETTINGS] as ExtensionSettings | undefined
    if (saved) settings = saved
  })
}

// ─── Keepalive alarm ──────────────────────────────────────────────────────────
// MV3 service workers sleep after ~30 seconds of inactivity and lose all
// in-memory state. The alarm fires every 25 seconds to keep the SW alive
// during an active recording session.

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'ledgerium-keepalive') return
  // Cancel keepalive when not recording — no need to stay alive
  if (sm.state !== 'recording' && sm.state !== 'paused') {
    chrome.alarms.clear('ledgerium-keepalive')
  }
})

function startKeepalive(): void {
  chrome.alarms.create('ledgerium-keepalive', { periodInMinutes: 0.4 })
}

function stopKeepalive(): void {
  chrome.alarms.clear('ledgerium-keepalive')
}

// ─── State persistence (survive SW restart) ───────────────────────────────────

interface PersistedState {
  recording: boolean
  sessionId: string
  activityName: string
}

function persistRecordingState(sessionId: string, activityName: string): void {
  const payload: PersistedState = { recording: true, sessionId, activityName }
  chrome.storage.session.set({ [SESSION_STATE_KEY]: payload })
}

function clearPersistedState(): void {
  chrome.storage.session.remove(SESSION_STATE_KEY)
}

// On SW startup, check if a recording was in progress when SW was last killed.
// If so, restore enough state so that incoming RAW_EVENT_CAPTURED messages are
// processed rather than silently dropped.
async function restoreStateIfNeeded(): Promise<void> {
  const result = await chrome.storage.session.get(SESSION_STATE_KEY)
  const persisted = result[SESSION_STATE_KEY] as PersistedState | undefined
  if (!persisted?.recording) return

  // Restore session meta from chrome.storage.local (SessionStore persists meta there)
  const restored = await store.loadFromStorage()
  if (!restored) return

  // Rebuild the state machine and live builder
  try {
    sm.transition('arming')
    sm.transition('recording')
  } catch {
    // SM might already be in a state that doesn't accept these transitions
    return
  }

  liveBuilder = new LiveStepBuilder(persisted.sessionId, step => {
    store.updateLiveStep(step)
    broadcastToExtension({ type: MSG.LIVE_STEP_UPDATED, payload: { step } })
  })

  // Re-broadcast recording state so the sidepanel reflects reality
  broadcastStateUpdate()

  // Re-send START_SESSION to all tabs so content scripts resume capturing
  broadcastAllTabs({
    type: MSG.START_SESSION,
    payload: { sessionId: persisted.sessionId },
  })
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

// Send a message to extension pages (sidepanel, popup, options) but NOT to
// content scripts.  chrome.runtime.sendMessage broadcasts to every listener
// in the extension — including content scripts — which wastes resources and
// can interfere with message channels when large payloads (e.g. the full
// session bundle) are serialized to every open tab.
//
// Strategy: use chrome.runtime.sendMessage for lightweight state updates
// (these are small and harmless).  For the FINALIZATION_COMPLETE message
// that carries the full bundle, we skip the broadcast entirely — the
// sidepanel's ProcessScreen fetches it on-demand via EXPORT_BUNDLE instead.
function broadcastToExtension(message: Record<string, unknown>): void {
  // Skip broadcasting the full bundle to avoid serialization overhead and
  // message-channel interference with content scripts in multiple tabs.
  if (message.type === MSG.FINALIZATION_COMPLETE) {
    // ProcessScreen will fetch the bundle via EXPORT_BUNDLE on mount.
    // We only need to broadcast a lightweight notification that finalization
    // is complete so the sidepanel can transition its state.
    chrome.runtime.sendMessage({
      type: MSG.FINALIZATION_COMPLETE,
      payload: { ready: true },
    }).catch(() => { /* side panel may not be open */ })
    return
  }
  chrome.runtime.sendMessage(message).catch(() => { /* side panel may not be open */ })
}

function broadcastStateUpdate(): void {
  const meta = store.getMeta()
  broadcastToExtension({
    type: MSG.SESSION_STATE_UPDATED,
    payload: { state: sm.state, meta },
  })
}

function broadcastAllTabs(message: unknown): void {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => { /* tab may not have content script */ })
      }
    }
  })
}

// ─── Lifecycle actions ────────────────────────────────────────────────────────

async function handleStart(activityName: string, uploadUrl?: string): Promise<void> {
  console.log('[LDG-BG] handleStart', activityName)
  try {
    sm.transition('arming')
    broadcastStateUpdate()

    const meta = store.initSession(activityName, uploadUrl ?? settings.uploadUrl)
    liveBuilder = new LiveStepBuilder(meta.sessionId, step => {
      console.log('[LDG-BG] liveBuilder onUpdate step:', step.stepId, step.status, step.title)
      store.updateLiveStep(step)
      broadcastToExtension({ type: MSG.LIVE_STEP_UPDATED, payload: { step } })
    })

    // v2: Programmatic injection — inject content scripts into ALL open tabs
    // This eliminates the need for manual tab refresh. Scripts are injected on
    // demand when recording starts, not on every page load.
    await injectIntoAllTabs()

    // Notify ALL tabs — content scripts are now present and ready
    broadcastAllTabs({
      type: MSG.START_SESSION,
      payload: { sessionId: meta.sessionId },
    })

    sm.transition('recording')
    store.updateState('recording')
    broadcastStateUpdate()

    // Persist state and start keepalive so the SW survives the session
    persistRecordingState(meta.sessionId, activityName)
    startKeepalive()
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

    stopKeepalive()
    clearPersistedState()

    // Finalize live steps
    liveBuilder?.finalize()

    console.log('[LDG-BG] buildBundle starting, events:', store.getCanonicalEvents().length)
    const bundle = await buildBundle(store)
    console.log('[LDG-BG] buildBundle complete, steps:', bundle.derivedSteps.length)
    lastBundle = bundle

    // Generate canonical workflow report from deterministic outputs
    lastWorkflowReport = buildWorkflowReport(bundle)
    console.log('[LDG-BG] workflowReport generated, steps:', lastWorkflowReport.metrics.stepCount)

    // Persist to activity history before transitioning — this way history is
    // always available even if the user discards the review screen immediately.
    void historyStore.addEntry(bundle)

    // v2: Clear injection tracking — content scripts will be re-injected next session
    clearInjectionState()

    sm.transition('review_ready')
    store.updateState('review_ready')

    broadcastToExtension({ type: MSG.FINALIZATION_COMPLETE, payload: { bundle } })
    broadcastStateUpdate()

    // Upload if URL is configured — sends API key for Ledgerium web app auth
    const uploadUrl = store.getMeta()?.uploadUrl
    if (uploadUrl) {
      broadcastToExtension({ type: MSG.UPLOAD_PROGRESS, payload: { percent: 0, status: 'uploading' } })
      const result = await uploadBundle(bundle, uploadUrl, percent => {
        broadcastToExtension({ type: MSG.UPLOAD_PROGRESS, payload: { percent, status: 'uploading' } })
      }, settings.apiKey || undefined)
      broadcastToExtension({
        type: MSG.UPLOAD_PROGRESS,
        payload: {
          percent: 100,
          status: result.success ? 'complete' : 'failed',
          ...(result.error ? { error: result.error } : {}),
        },
      })
    }
  } catch (err) {
    transitionToError(err)
  }
}

function handleDiscard(): void {
  broadcastAllTabs({ type: MSG.DISCARD_SESSION, payload: {} })
  clearInjectionState()
  liveBuilder?.reset()
  liveBuilder = null
  lastBundle = null
  lastWorkflowReport = null
  store.clear()
  sm.reset()
  stopKeepalive()
  clearPersistedState()
  broadcastStateUpdate()
}

function transitionToError(err: unknown): void {
  console.error('[LDG-BG] transitionToError:', err)
  const message = err instanceof Error ? err.message : 'Unknown error'
  if (sm.canTransition('error')) sm.transition('error')
  stopKeepalive()
  clearPersistedState()
  broadcastToExtension({
    type: MSG.SESSION_STATE_UPDATED,
    payload: { state: sm.state, meta: store.getMeta(), error: message },
  })
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: { type: string; payload: Record<string, unknown> }, _sender, sendResponse) => {
  switch (message.type) {
    case MSG.GET_STATE:
      sendResponse({ state: sm.state, meta: store.getMeta(), steps: store.getLiveSteps(), rawEventCount: store.getRawEventCount() })
      return true

    case MSG.EXPORT_BUNDLE:
      sendResponse(lastBundle)
      return true

    case MSG.GET_WORKFLOW_REPORT:
      sendResponse(lastWorkflowReport)
      return true

    case MSG.GET_HISTORY:
      void historyStore.getIndex().then(sendResponse)
      return true

    case MSG.GET_BUNDLE:
      void historyStore.getBundle(message.payload['sessionId'] as string).then(sendResponse)
      return true

    case MSG.DELETE_HISTORY_ENTRY:
      void historyStore.deleteEntry(message.payload['sessionId'] as string).then(() => sendResponse({ ok: true }))
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
      console.log('[LDG-BG] RAW_EVENT_CAPTURED state=', sm.state, 'type=', (message.payload['event'] as RawEvent)?.event_type)
      if (sm.state !== 'recording') break
      const raw = message.payload['event'] as RawEvent
      store.addRawEvent(raw)
      let normalized: ReturnType<typeof normalizeRawEvent>
      try {
        normalized = normalizeRawEvent(raw, settings.blockedDomains, settings.allowedDomains)
      } catch (err) {
        console.error('[LDG-BG] normalizeRawEvent threw:', err, 'raw.url=', raw.url)
        break
      }
      const { canonical, policyEntry } = normalized
      console.log('[LDG-BG] canonical:', canonical?.event_type ?? 'null')
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

// ─── Tab lifecycle listeners ───────────────────────────────────────────────────

// v2: When a tab finishes loading during recording, inject the content script
// and then send START_SESSION. This handles new tabs and navigations.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (sm.state !== 'recording') return
  const sessionId = store.getMeta()?.sessionId
  if (!sessionId) return

  // Inject content script (idempotent — safe if already injected)
  await injectOnTabLoad(tabId, tab.url)

  // Then tell it to start capturing
  chrome.tabs.sendMessage(tabId, {
    type: MSG.START_SESSION,
    payload: { sessionId },
  }).catch(() => { /* content script may not have loaded yet */ })
})

// v2: When the user switches to a tab during recording, inject if needed
// and start capture. Ensures pre-existing tabs get scripts on first visit.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (sm.state !== 'recording') return
  const sessionId = store.getMeta()?.sessionId
  if (!sessionId) return

  // Inject content script (no-op if already injected)
  await injectOnTabActivated(tabId)

  chrome.tabs.sendMessage(tabId, {
    type: MSG.START_SESSION,
    payload: { sessionId },
  }).catch(() => { /* content script may not be present */ })
})

// ─── Initialisation ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  loadSettings()
  chrome.sidePanel.setOptions({ enabled: true }).catch(() => { /* ignore */ })
})

chrome.action.onClicked.addListener(tab => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => { /* ignore */ })
  }
})

loadSettings()

// Restore any recording session that was in progress when the SW was last killed
void restoreStateIfNeeded()
