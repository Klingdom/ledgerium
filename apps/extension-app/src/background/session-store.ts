import type {
  SessionMeta, RawEvent, CanonicalEvent, PolicyLogEntry, LiveStep, RecorderState,
} from '../shared/types.js'
import { generateId, nowIso } from '../shared/utils.js'
import {
  SCHEMA_VERSION, RECORDER_VERSION, STORAGE_KEY_SESSION, STORAGE_KEY_EVENTS,
  EVENT_PERSIST_INTERVAL,
} from '../shared/constants.js'

export class SessionStore {
  private meta: SessionMeta | null = null
  private rawEvents: RawEvent[] = []
  private canonicalEvents: CanonicalEvent[] = []
  private policyLog: PolicyLogEntry[] = []
  private liveSteps: LiveStep[] = []
  /** Count of events added since last persistEvents() call. */
  private eventsSinceLastPersist = 0
  /** Count of events dropped due to normalization errors in this session. */
  private droppedEventCount = 0

  initSession(activityName: string, uploadUrl?: string): SessionMeta {
    const meta: SessionMeta = {
      sessionId: generateId(),
      activityName,
      startedAt: nowIso(),
      state: 'idle',
      pauseIntervals: [],
      schemaVersion: SCHEMA_VERSION,
      recorderVersion: RECORDER_VERSION,
      ...(uploadUrl ? { uploadUrl } : {}),
    }
    this.meta = meta
    this.rawEvents = []
    this.canonicalEvents = []
    this.policyLog = []
    this.liveSteps = []
    this.eventsSinceLastPersist = 0
    this.droppedEventCount = 0
    // Clear any stale persisted events from a previous session
    chrome.storage.local.remove(STORAGE_KEY_EVENTS)
    this.persist()
    return meta
  }

  getMeta(): SessionMeta | null {
    return this.meta
  }

  updateState(state: RecorderState): void {
    if (!this.meta) return
    this.meta = { ...this.meta, state }
    if (state === 'paused') {
      this.meta.pauseIntervals.push({ pausedAt: nowIso() })
    }
    if (state === 'recording' && this.meta.pauseIntervals.length > 0) {
      const last = this.meta.pauseIntervals[this.meta.pauseIntervals.length - 1]
      if (last && !last.resumedAt) {
        last.resumedAt = nowIso()
      }
    }
    if (state === 'stopping') {
      this.meta.endedAt = nowIso()
    }
    this.persist()
  }

  addRawEvent(event: RawEvent): void {
    this.rawEvents.push(event)
  }

  addCanonicalEvent(event: CanonicalEvent): void {
    this.canonicalEvents.push(event)
    // Periodically persist events to chrome.storage.local so they survive
    // service worker restarts. Without this, a SW restart mid-recording
    // loses all previously captured events.
    this.eventsSinceLastPersist++
    if (this.eventsSinceLastPersist >= EVENT_PERSIST_INTERVAL) {
      this.persistEvents()
    }
  }

  incrementDroppedEvents(): void {
    this.droppedEventCount++
  }

  getDroppedEventCount(): number {
    return this.droppedEventCount
  }

  addPolicyEntry(entry: PolicyLogEntry): void {
    this.policyLog.push(entry)
  }

  updateLiveStep(step: LiveStep): void {
    const idx = this.liveSteps.findIndex(s => s.stepId === step.stepId)
    if (idx >= 0) {
      this.liveSteps[idx] = step
    } else {
      this.liveSteps.push(step)
    }
  }

  getLiveSteps(): LiveStep[] {
    return [...this.liveSteps]
  }

  getRawEventCount(): number {
    return this.rawEvents.length
  }

  getRawEvents(): RawEvent[] {
    return [...this.rawEvents]
  }

  getCanonicalEvents(): CanonicalEvent[] {
    return [...this.canonicalEvents]
  }

  getPolicyLog(): PolicyLogEntry[] {
    return [...this.policyLog]
  }

  clear(): void {
    this.meta = null
    this.rawEvents = []
    this.canonicalEvents = []
    this.policyLog = []
    this.liveSteps = []
    this.eventsSinceLastPersist = 0
    this.droppedEventCount = 0
    chrome.storage.local.remove(STORAGE_KEY_SESSION)
    chrome.storage.local.remove(STORAGE_KEY_EVENTS)
  }

  async loadFromStorage(): Promise<boolean> {
    return new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEY_SESSION], result => {
        const saved = result[STORAGE_KEY_SESSION] as SessionMeta | undefined
        if (saved) {
          this.meta = saved
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }

  /**
   * Restore canonical events persisted before a SW restart.
   * Returns the count of recovered events (0 if none found).
   */
  async loadEventsFromStorage(): Promise<number> {
    return new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEY_EVENTS], result => {
        const saved = result[STORAGE_KEY_EVENTS] as CanonicalEvent[] | undefined
        if (saved && Array.isArray(saved) && saved.length > 0) {
          this.canonicalEvents = saved
          resolve(saved.length)
        } else {
          resolve(0)
        }
      })
    })
  }

  /**
   * Persist current canonical events to chrome.storage.local.
   * Called periodically during recording (every EVENT_PERSIST_INTERVAL events)
   * and once during finalization.
   */
  persistEvents(): void {
    this.eventsSinceLastPersist = 0
    chrome.storage.local.set({ [STORAGE_KEY_EVENTS]: this.canonicalEvents })
  }

  private persist(): void {
    if (!this.meta) return
    chrome.storage.local.set({ [STORAGE_KEY_SESSION]: this.meta })
  }
}
