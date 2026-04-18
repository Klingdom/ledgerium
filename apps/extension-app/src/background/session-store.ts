import type {
  SessionMeta, RawEvent, CanonicalEvent, PolicyLogEntry, LiveStep, RecorderState,
} from '../shared/types.js'
import { generateId, nowIso } from '../shared/utils.js'
import {
  SCHEMA_VERSION,
  RECORDER_VERSION,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_SESSION_EVENTS_PREFIX,
  PERSIST_SCHEMA_VERSION,
  PERSIST_DEBOUNCE_MS,
} from '../shared/constants.js'

// ─── Persisted event payload shape ───────────────────────────────────────────

/**
 * The full payload written to chrome.storage.local under
 *   ledgerium_active_session_events_<sessionId>
 *
 * `persistSchemaVersion` allows future restore logic to detect a stale or
 * incompatible payload (e.g. after an extension update that changed the event
 * shape) and reset cleanly to [] rather than parsing corrupt data.
 */
export interface PersistedSessionEvents {
  persistSchemaVersion: number
  rawEvents: RawEvent[]
  canonicalEvents: CanonicalEvent[]
  policyLog: PolicyLogEntry[]
  liveSteps: LiveStep[]
}

// ─── SessionStore ─────────────────────────────────────────────────────────────

export class SessionStore {
  private meta: SessionMeta | null = null
  private rawEvents: RawEvent[] = []
  private canonicalEvents: CanonicalEvent[] = []
  private policyLog: PolicyLogEntry[] = []
  private liveSteps: LiveStep[] = []

  /**
   * Pending debounce timer handle.  Stored as ReturnType<typeof setTimeout>
   * so it is compatible with both browser and Node environments (the latter
   * is used in Vitest).
   */
  private persistDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

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
    // State transitions (pause / resume / stop) flush the debounce immediately
    // so the persisted snapshot is always consistent with the meta state written
    // by persist() below.
    this.flushEventsPersist()
    this.persist()
  }

  // ─── Event write points ────────────────────────────────────────────────────

  addRawEvent(event: RawEvent): void {
    this.rawEvents.push(event)
    this.schedulePersistEvents()
  }

  addCanonicalEvent(event: CanonicalEvent): void {
    this.canonicalEvents.push(event)
    this.schedulePersistEvents()
  }

  addPolicyEntry(entry: PolicyLogEntry): void {
    this.policyLog.push(entry)
    this.schedulePersistEvents()
  }

  updateLiveStep(step: LiveStep): void {
    const idx = this.liveSteps.findIndex(s => s.stepId === step.stepId)
    if (idx >= 0) {
      this.liveSteps[idx] = step
    } else {
      this.liveSteps.push(step)
    }
    this.schedulePersistEvents()
  }

  // ─── Read accessors ────────────────────────────────────────────────────────

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

  // ─── Clear ─────────────────────────────────────────────────────────────────

  clear(): void {
    // Cancel any pending debounce — we don't want a stale write after clear.
    this.cancelPersistDebounce()

    const sessionId = this.meta?.sessionId
    this.meta = null
    this.rawEvents = []
    this.canonicalEvents = []
    this.policyLog = []
    this.liveSteps = []

    chrome.storage.local.remove(STORAGE_KEY_SESSION)
    if (sessionId) {
      chrome.storage.local.remove(STORAGE_KEY_SESSION_EVENTS_PREFIX + sessionId)
    }
  }

  // ─── Restore ───────────────────────────────────────────────────────────────

  /**
   * Rehydrate session state from chrome.storage.local after a service worker
   * restart.
   *
   * Merge semantics: the persisted arrays are the authoritative source.  After
   * a restart, content scripts reconnect and will begin sending new
   * RAW_EVENT_CAPTURED messages; those events are appended normally via
   * addRawEvent / addCanonicalEvent.  There is no attempt to reconcile
   * in-flight content-script state with the persisted snapshot.
   *
   * Malformed or missing fields default to [] and a structured warning is
   * logged (not an exception) so a corrupt payload does not crash the SW.
   */
  async loadFromStorage(): Promise<boolean> {
    return new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEY_SESSION], result => {
        const saved = result[STORAGE_KEY_SESSION] as SessionMeta | undefined
        if (!saved) {
          resolve(false)
          return
        }

        this.meta = saved

        // Load event arrays using the session-scoped key.
        const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + saved.sessionId
        chrome.storage.local.get([eventsKey], eventsResult => {
          const raw = eventsResult[eventsKey] as Partial<PersistedSessionEvents> | undefined
          this.rehydrateEvents(raw, saved.sessionId)
          resolve(true)
        })
      })
    })
  }

  // ─── Suspend flush (called by background/index.ts on chrome.runtime.onSuspend) ──

  /**
   * Must be called from the chrome.runtime.onSuspend listener in the
   * background entry point.  Cancels the pending debounce and writes the
   * event arrays synchronously (best-effort — onSuspend gives the SW ~5 s).
   */
  flushOnSuspend(): void {
    this.flushEventsPersist()
  }

  // ─── Private: persistence ──────────────────────────────────────────────────

  /**
   * Schedule a trailing-edge debounce write for event arrays.
   *
   * Debounce mechanism: trailing-edge setTimeout (PERSIST_DEBOUNCE_MS = 500 ms).
   * Any call within the window resets the timer, so N rapid appends produce
   * exactly 1 write once the burst settles.  The debounce is bypassed
   * (flushed immediately) on:
   *   1. State transitions (pause / resume / stop) — via updateState()
   *   2. chrome.runtime.onSuspend — via flushOnSuspend()
   *   3. Timer elapse — normal trailing-edge path
   */
  private schedulePersistEvents(): void {
    if (this.persistDebounceTimer !== null) {
      clearTimeout(this.persistDebounceTimer)
    }
    this.persistDebounceTimer = setTimeout(() => {
      this.persistDebounceTimer = null
      this.persistEvents()
    }, PERSIST_DEBOUNCE_MS)
  }

  private flushEventsPersist(): void {
    this.cancelPersistDebounce()
    this.persistEvents()
  }

  private cancelPersistDebounce(): void {
    if (this.persistDebounceTimer !== null) {
      clearTimeout(this.persistDebounceTimer)
      this.persistDebounceTimer = null
    }
  }

  /**
   * Write meta to chrome.storage.local.
   * Called immediately on init and every state transition.
   */
  private persist(): void {
    if (!this.meta) return
    chrome.storage.local.set({ [STORAGE_KEY_SESSION]: this.meta })
  }

  /**
   * Write the four event arrays to chrome.storage.local under the
   * session-scoped key.
   *
   * Quota handling:
   *   chrome.storage.local has a default quota of ~5 MB per extension.
   *   On a QUOTA_BYTES write error, we set meta.persistenceTruncated = true,
   *   persist the updated meta, and stop all further event writes.  We do NOT
   *   delete earlier events to make room — truncation is append-stop only.
   */
  private persistEvents(): void {
    if (!this.meta) return
    // If this session has already hit the quota, stop writing.
    if (this.meta.persistenceTruncated) return

    const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + this.meta.sessionId
    const payload: PersistedSessionEvents = {
      persistSchemaVersion: PERSIST_SCHEMA_VERSION,
      rawEvents: this.rawEvents,
      canonicalEvents: this.canonicalEvents,
      policyLog: this.policyLog,
      liveSteps: this.liveSteps,
    }

    chrome.storage.local.set({ [eventsKey]: payload }, () => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message ?? ''
        // QUOTA_BYTES_PER_ITEM is the error Chrome raises on a per-key quota breach.
        // We treat any storage write error as quota-exceeded to be safe.
        console.warn(
          `[SessionStore] Event persistence failed — flagging truncation. ` +
          `sessionId=${this.meta?.sessionId ?? 'unknown'} error="${msg}"`,
        )
        if (this.meta) {
          this.meta = { ...this.meta, persistenceTruncated: true }
          // Persist updated meta so that the truncation flag survives restart.
          this.persist()
        }
      }
    })
  }

  // ─── Private: restore helpers ──────────────────────────────────────────────

  /**
   * Populate in-memory event arrays from a persisted payload.
   * Any missing or malformed field defaults to [] with a structured warning.
   */
  private rehydrateEvents(
    raw: Partial<PersistedSessionEvents> | undefined,
    sessionId: string,
  ): void {
    if (!raw) {
      console.warn(
        `[SessionStore] No persisted event arrays found for sessionId=${sessionId}. ` +
        'Defaulting all arrays to []. Events captured before restart are unavailable.',
      )
      this.rawEvents = []
      this.canonicalEvents = []
      this.policyLog = []
      this.liveSteps = []
      return
    }

    // Schema version guard — if the stored version does not match the current
    // PERSIST_SCHEMA_VERSION, we cannot safely deserialize; reset to defaults.
    if (raw.persistSchemaVersion !== PERSIST_SCHEMA_VERSION) {
      console.warn(
        `[SessionStore] Persisted event schema version mismatch. ` +
        `stored=${String(raw.persistSchemaVersion)} current=${PERSIST_SCHEMA_VERSION}. ` +
        `sessionId=${sessionId}. Resetting all arrays to [].`,
      )
      this.rawEvents = []
      this.canonicalEvents = []
      this.policyLog = []
      this.liveSteps = []
      return
    }

    this.rawEvents = Array.isArray(raw.rawEvents) ? raw.rawEvents : (
      this.warnDefaultArray('rawEvents', sessionId)
    )
    this.canonicalEvents = Array.isArray(raw.canonicalEvents) ? raw.canonicalEvents : (
      this.warnDefaultArray('canonicalEvents', sessionId)
    )
    this.policyLog = Array.isArray(raw.policyLog) ? raw.policyLog : (
      this.warnDefaultArray('policyLog', sessionId)
    )
    this.liveSteps = Array.isArray(raw.liveSteps) ? raw.liveSteps : (
      this.warnDefaultArray('liveSteps', sessionId)
    )
  }

  private warnDefaultArray(field: string, sessionId: string): [] {
    console.warn(
      `[SessionStore] Persisted field "${field}" is missing or malformed for ` +
      `sessionId=${sessionId}. Defaulting to [].`,
    )
    return []
  }
}
