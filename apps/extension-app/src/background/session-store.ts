import type {
  SessionMeta, RawEvent, CanonicalEvent, PolicyLogEntry, LiveStep, RecorderState,
} from '../shared/types.js'
import { generateId, nowIso } from '../shared/utils.js'
import { SCHEMA_VERSION, RECORDER_VERSION, STORAGE_KEY_SESSION } from '../shared/constants.js'

export class SessionStore {
  private meta: SessionMeta | null = null
  private rawEvents: RawEvent[] = []
  private canonicalEvents: CanonicalEvent[] = []
  private policyLog: PolicyLogEntry[] = []
  private liveSteps: LiveStep[] = []

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
    this.persist()
  }

  addRawEvent(event: RawEvent): void {
    this.rawEvents.push(event)
  }

  addCanonicalEvent(event: CanonicalEvent): void {
    this.canonicalEvents.push(event)
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
    chrome.storage.local.remove(STORAGE_KEY_SESSION)
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

  private persist(): void {
    if (!this.meta) return
    chrome.storage.local.set({ [STORAGE_KEY_SESSION]: this.meta })
  }
}
