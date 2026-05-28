import { injectIntoTab, onTabActivatedDuringRecording, clearInjectionState } from './injection-manager.js'
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
import { STORAGE_KEY_SETTINGS, STORAGE_KEY_APIKEY } from '../shared/constants.js'
import { MSG } from '../shared/types.js'
import type { ExtensionSettings, RawEvent, SessionBundle } from '../shared/types.js'

// ─── Global state ─────────────────────────────────────────────────────────────

const sm = new RecorderStateMachine()
const store = new SessionStore()
const historyStore = new HistoryStore()
let liveBuilder: LiveStepBuilder | null = null
let settings: ExtensionSettings = { uploadUrl: '', allowedDomains: [], blockedDomains: [] }
let apiKey = ''
let lastBundle: SessionBundle | null = null
let lastWorkflowReport: WorkflowReport | null = null

// Key used to persist recording state across service worker restarts
const SESSION_STATE_KEY = 'ledgerium_sw_state'

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSettings(): void {
  // Load sync settings (uploadUrl, domain lists)
  chrome.storage.sync.get([STORAGE_KEY_SETTINGS], syncResult => {
    const saved = syncResult[STORAGE_KEY_SETTINGS] as (ExtensionSettings & { apiKey?: string; telemetryEnabled?: boolean }) | undefined
    if (saved) {
      const { apiKey: _legacyApiKey, telemetryEnabled: _legacy, ...rest } = saved
      settings = rest

      // One-time migration: if apiKey was previously stored in sync, move it to local
      if (_legacyApiKey) {
        chrome.storage.local.get([STORAGE_KEY_APIKEY], localResult => {
          const existingLocal = localResult[STORAGE_KEY_APIKEY] as string | undefined
          if (!existingLocal) {
            // Migrate to local — apiKey must not live in sync storage (CHROME-002)
            chrome.storage.local.set({ [STORAGE_KEY_APIKEY]: _legacyApiKey })
            apiKey = _legacyApiKey
            // Remove from sync
            const cleaned: ExtensionSettings = { uploadUrl: settings.uploadUrl, allowedDomains: settings.allowedDomains, blockedDomains: settings.blockedDomains }
            chrome.storage.sync.set({ [STORAGE_KEY_SETTINGS]: cleaned })
          } else {
            apiKey = existingLocal
          }
        })
      }
    }
  })

  // Load apiKey from local storage (its canonical home after CHROME-002)
  chrome.storage.local.get([STORAGE_KEY_APIKEY], localResult => {
    const stored = localResult[STORAGE_KEY_APIKEY] as string | undefined
    if (stored) apiKey = stored
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

  // v2 trust model: Only re-activate capture on the currently active tab
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([activeTab]) => {
    if (activeTab?.id) {
      chrome.tabs.sendMessage(activeTab.id, {
        type: MSG.START_SESSION,
        payload: { sessionId: persisted.sessionId, startedAt: store.getMeta()?.startedAt },
      }).catch(() => { /* content script may not be present */ })
    }
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

  // Update extension badge to show recording state
  if (sm.state === 'recording') {
    chrome.action.setBadgeText({ text: 'REC' }).catch(() => {})
    chrome.action.setBadgeBackgroundColor({ color: '#2563EB' }).catch(() => {})
  } else if (sm.state === 'paused') {
    chrome.action.setBadgeText({ text: '❚❚' }).catch(() => {})
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }).catch(() => {})
  } else {
    chrome.action.setBadgeText({ text: '' }).catch(() => {})
  }
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

    // Transition to 'recording' BEFORE telling content scripts to start, so the
    // RAW_EVENT_CAPTURED guard at the message-handler ("if (sm.state !== 'recording')
    // break") admits the very first event the content script emits. Pre-iter-099
    // the auto-emit captureNavigation() page_loaded event was the first thing through
    // and it was silently dropped at this guard; removing that auto-emit per CEO
    // directive (2026-05-27) exposed the latent race for real user clicks that
    // arrive fast after Start Recording. See CLAUDE.md § Extension Reliability
    // Invariant — known regression history.
    sm.transition('recording')
    store.updateState('recording')
    broadcastStateUpdate()

    // v2 trust model: Only capture on the tab the user is currently viewing.
    // We do NOT inject or activate capture on all tabs — that would break trust.
    // Capture activates when the user clicks into a tab (onActivated) or
    // navigates within the active tab (onUpdated).
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (activeTab?.id) {
      await injectIntoTab(activeTab.id)
      // Mirror the onActivated handler's 100ms post-injection delay (line 479).
      // The programmatically-injected ES module needs a microtask window to
      // evaluate fully and register its chrome.runtime.onMessage listener BEFORE
      // START_SESSION is dispatched. Without this delay, START_SESSION can be
      // dropped silently, leaving attachDOMListeners() un-called → zero capture.
      await new Promise(resolve => setTimeout(resolve, 100))
      chrome.tabs.sendMessage(activeTab.id, {
        type: MSG.START_SESSION,
        payload: { sessionId: meta.sessionId, startedAt: meta.startedAt },
      }).catch(() => { /* content script may not be ready yet */ })
      console.log(`[LDG-BG] Recording started on active tab ${activeTab.id}: ${activeTab.url}`)
    }

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

    // Generate canonical workflow report from deterministic engine outputs
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
      }, apiKey || undefined)
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

    case MSG.GET_BUNDLE: {
      const requestedSessionId = message.payload['sessionId'] as string
      // Check in-memory lastBundle first (current session may not be in history yet)
      if (lastBundle && lastBundle.sessionJson.sessionId === requestedSessionId) {
        sendResponse(lastBundle)
      } else {
        void historyStore.getBundle(requestedSessionId).then(sendResponse)
      }
      return true
    }

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
      const updated = message.payload as Partial<ExtensionSettings & { apiKey?: string }>
      const { apiKey: newApiKey, ...restUpdated } = updated
      settings = { ...settings, ...restUpdated }
      // Persist non-sensitive settings to sync; apiKey goes to local only (CHROME-002)
      chrome.storage.sync.set({ [STORAGE_KEY_SETTINGS]: settings })
      if (newApiKey !== undefined) {
        apiKey = newApiKey
        chrome.storage.local.set({ [STORAGE_KEY_APIKEY]: newApiKey })
      }
      break
    }
  }
  return false
})

// ─── Tab lifecycle listeners ───────────────────────────────────────────────────

// v2 trust model: Only capture on tabs the user actively visits.
// When a tab finishes loading during recording, only activate if it's
// the active tab in its window (user navigated within the active tab).
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (sm.state !== 'recording') return
  if (!tab.active) return  // Only the active tab — never background tabs
  const sessionId = store.getMeta()?.sessionId
  if (!sessionId) return
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  const startedAt = store.getMeta()?.startedAt
  await injectIntoTab(tabId)
  // Mirror the onActivated handler's 100ms post-injection delay (see line 479).
  // Without this delay the freshly-injected ES module can miss START_SESSION
  // before its chrome.runtime.onMessage listener registers, causing zero
  // capture after page navigation during a recording session.
  await new Promise(resolve => setTimeout(resolve, 100))
  chrome.tabs.sendMessage(tabId, {
    type: MSG.START_SESSION,
    payload: { sessionId, startedAt },
  }).catch(() => { /* content script may not have loaded yet */ })
  console.log(`[LDG-BG] Activated capture on tab load: ${tabId} (${tab.url})`)
})

// When user switches to a different tab during recording, activate capture
// on that tab. This is the core "follow the user" behavior.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (sm.state !== 'recording') return
  const sessionId = store.getMeta()?.sessionId
  if (!sessionId) return

  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  // Always try injection first (handles tabs opened before extension loaded)
  await injectIntoTab(tabId)

  // Small delay to let the content script initialize after injection
  await new Promise(resolve => setTimeout(resolve, 100))

  // Send START_SESSION — always, even if we think the script is already there
  const startedAt2 = store.getMeta()?.startedAt
  chrome.tabs.sendMessage(tabId, {
    type: MSG.START_SESSION,
    payload: { sessionId, startedAt: startedAt2 },
  }).catch(() => {
    console.warn(`[LDG-BG] Could not reach content script on tab ${tabId} after injection`)
  })
  console.log(`[LDG-BG] Activated capture on tab switch: ${tabId} (${tab.url})`)
})

// ─── Service worker suspend flush ─────────────────────────────────────────────
// chrome.runtime.onSuspend fires when Chrome is about to evict the service
// worker.  We cancel the pending debounce and perform a synchronous event-array
// write here so that the persisted snapshot is up-to-date before the SW dies.
// Chrome gives the SW approximately 5 seconds in the onSuspend callback.

chrome.runtime.onSuspend.addListener(() => {
  store.flushOnSuspend()
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
