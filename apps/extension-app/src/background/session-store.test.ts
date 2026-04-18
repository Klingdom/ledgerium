import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SessionStore } from './session-store.js'
import type { RawEvent, CanonicalEvent, PolicyLogEntry, LiveStep } from '../shared/types.js'
import {
  SCHEMA_VERSION,
  RECORDER_VERSION,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_SESSION_EVENTS_PREFIX,
  PERSIST_SCHEMA_VERSION,
  PERSIST_DEBOUNCE_MS,
} from '../shared/constants.js'

// ---------------------------------------------------------------------------
// Chrome storage mock
// ---------------------------------------------------------------------------

const mockStorage: Record<string, unknown> = {}

// lastError is a property, not a function — make it configurable so individual
// tests can set it to simulate a quota error.
const chromeMock = {
  storage: {
    local: {
      set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
        if (!chromeMock.runtime.lastError) {
          Object.assign(mockStorage, data)
        }
        if (cb) cb()
      }),
      remove: vi.fn((key: string | string[]) => {
        if (Array.isArray(key)) {
          for (const k of key) delete mockStorage[k]
        } else {
          delete mockStorage[key]
        }
      }),
      get: vi.fn((keys: string[], cb: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {}
        for (const k of keys) {
          if (k in mockStorage) result[k] = mockStorage[k]
        }
        cb(result)
      }),
    },
  },
  runtime: {
    lastError: null as { message?: string } | null,
  },
}

vi.stubGlobal('chrome', chromeMock)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRawEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    raw_event_id: 'raw-1',
    event_type: 'click',
    t_ms: 0,
    t_wall: '2026-01-01T00:00:00.000Z',
    session_id: 'test-session',
    schema_version: '1.0.0',
    ...overrides,
  } as RawEvent
}

function makeCanonicalEvent(overrides: Partial<CanonicalEvent> = {}): CanonicalEvent {
  return {
    event_id: 'evt-1',
    event_type: 'interaction.click',
    t_ms: 0,
    t_wall: '2026-01-01T00:00:00.000Z',
    session_id: 'test-session',
    actor_type: 'human',
    schema_version: '1.0.0',
    normalization_meta: {
      sourceEventId: 'raw-1',
      sourceEventType: 'click',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
    ...overrides,
  } as CanonicalEvent
}

function makePolicyEntry(overrides: Partial<PolicyLogEntry> = {}): PolicyLogEntry {
  return {
    sessionId: 'test-session',
    eventId: 'raw-1',
    t_ms: 0,
    outcome: 'allow',
    reason: 'default_allow',
    ...overrides,
  } as PolicyLogEntry
}

function makeLiveStep(overrides: Partial<LiveStep> = {}): LiveStep {
  return {
    stepId: 'step-1',
    title: 'Click button',
    status: 'provisional',
    confidence: 0.75,
    eventCount: 1,
    startedAt: 0,
    grouping: 'single_action',
    ...overrides,
  } as LiveStep
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionStore', () => {
  let store: SessionStore

  beforeEach(() => {
    store = new SessionStore()
    // Reset mock storage and call trackers between tests
    for (const key of Object.keys(mockStorage)) delete mockStorage[key]
    chromeMock.runtime.lastError = null
    vi.mocked(chrome.storage.local.set).mockClear()
    vi.mocked(chrome.storage.local.remove).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // initSession
  // ---------------------------------------------------------------------------

  describe('initSession', () => {
    it('returns SessionMeta with correct fields', () => {
      const meta = store.initSession('Submit expense report')
      expect(meta.activityName).toBe('Submit expense report')
      expect(meta.state).toBe('idle')
      expect(meta.pauseIntervals).toEqual([])
      expect(meta.schemaVersion).toBe(SCHEMA_VERSION)
      expect(meta.recorderVersion).toBe(RECORDER_VERSION)
      expect(meta.sessionId).toBeTruthy()
      expect(meta.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('includes uploadUrl when provided', () => {
      const meta = store.initSession('Activity', 'https://api.example.com/upload')
      expect(meta.uploadUrl).toBe('https://api.example.com/upload')
    })

    it('omits uploadUrl when not provided', () => {
      const meta = store.initSession('Activity')
      expect('uploadUrl' in meta).toBe(false)
    })

    it('calls chrome.storage.local.set on init', () => {
      store.initSession('Activity')
      expect(chrome.storage.local.set).toHaveBeenCalledOnce()
    })

    it('resets events on second init', () => {
      store.initSession('First')
      store.addRawEvent(makeRawEvent())
      store.initSession('Second')
      expect(store.getRawEvents()).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getMeta
  // ---------------------------------------------------------------------------

  describe('getMeta', () => {
    it('returns null before init', () => {
      expect(store.getMeta()).toBeNull()
    })

    it('returns meta after init', () => {
      store.initSession('Test')
      expect(store.getMeta()).not.toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // updateState
  // ---------------------------------------------------------------------------

  describe('updateState', () => {
    it('does nothing when called before init', () => {
      expect(() => store.updateState('recording')).not.toThrow()
    })

    it('updates meta state', () => {
      store.initSession('Test')
      store.updateState('recording')
      expect(store.getMeta()?.state).toBe('recording')
    })

    it('adds pause interval when transitioning to paused', () => {
      store.initSession('Test')
      store.updateState('paused')
      const meta = store.getMeta()
      expect(meta?.pauseIntervals).toHaveLength(1)
      expect(meta?.pauseIntervals[0]?.pausedAt).toBeTruthy()
      expect(meta?.pauseIntervals[0]?.resumedAt).toBeUndefined()
    })

    it('sets resumedAt when transitioning back to recording', () => {
      store.initSession('Test')
      store.updateState('paused')
      store.updateState('recording')
      const last = store.getMeta()?.pauseIntervals[0]
      expect(last?.resumedAt).toBeTruthy()
    })

    it('sets endedAt when transitioning to stopping', () => {
      store.initSession('Test')
      store.updateState('stopping')
      expect(store.getMeta()?.endedAt).toBeTruthy()
    })

    it('calls persist on every state mutation', () => {
      store.initSession('Test')
      vi.mocked(chrome.storage.local.set).mockClear()
      store.updateState('recording')
      // updateState calls flushEventsPersist (events write) + persist (meta write) = 2
      expect(chrome.storage.local.set).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Events / log
  // ---------------------------------------------------------------------------

  describe('addRawEvent / getRawEvents', () => {
    it('stores and retrieves raw events', () => {
      store.initSession('Test')
      const evt = makeRawEvent({ raw_event_id: 'raw-test-1' })
      store.addRawEvent(evt)
      expect(store.getRawEvents()).toHaveLength(1)
    })

    it('returns a copy (mutation does not affect store)', () => {
      store.initSession('Test')
      store.addRawEvent(makeRawEvent())
      const events = store.getRawEvents()
      events.push(makeRawEvent({ raw_event_id: 'injected' }))
      expect(store.getRawEvents()).toHaveLength(1)
    })
  })

  describe('addCanonicalEvent / getCanonicalEvents', () => {
    it('stores and retrieves canonical events', () => {
      store.initSession('Test')
      store.addCanonicalEvent(makeCanonicalEvent())
      expect(store.getCanonicalEvents()).toHaveLength(1)
    })

    it('returns a copy', () => {
      store.initSession('Test')
      store.addCanonicalEvent(makeCanonicalEvent())
      const events = store.getCanonicalEvents()
      events.push(makeCanonicalEvent({ event_id: 'injected' }))
      expect(store.getCanonicalEvents()).toHaveLength(1)
    })
  })

  describe('addPolicyEntry / getPolicyLog', () => {
    it('stores and retrieves policy entries', () => {
      store.initSession('Test')
      store.addPolicyEntry(makePolicyEntry())
      expect(store.getPolicyLog()).toHaveLength(1)
    })
  })

  // ---------------------------------------------------------------------------
  // updateLiveStep
  // ---------------------------------------------------------------------------

  describe('updateLiveStep', () => {
    it('adds a new step when stepId is unknown', () => {
      store.initSession('Test')
      store.updateLiveStep(makeLiveStep({ stepId: 'step-new' }))
      expect(store.getLiveSteps()).toHaveLength(1)
    })

    it('updates an existing step when stepId matches', () => {
      store.initSession('Test')
      store.updateLiveStep(makeLiveStep({ stepId: 'step-1', title: 'Original' }))
      store.updateLiveStep(makeLiveStep({ stepId: 'step-1', title: 'Updated' }))
      const steps = store.getLiveSteps()
      expect(steps).toHaveLength(1)
      expect(steps[0]?.title).toBe('Updated')
    })

    it('tracks multiple distinct steps', () => {
      store.initSession('Test')
      store.updateLiveStep(makeLiveStep({ stepId: 'step-1' }))
      store.updateLiveStep(makeLiveStep({ stepId: 'step-2' }))
      expect(store.getLiveSteps()).toHaveLength(2)
    })
  })

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('resets all state', () => {
      store.initSession('Test')
      store.addRawEvent(makeRawEvent())
      store.addCanonicalEvent(makeCanonicalEvent())
      store.clear()

      expect(store.getMeta()).toBeNull()
      expect(store.getRawEvents()).toHaveLength(0)
      expect(store.getCanonicalEvents()).toHaveLength(0)
      expect(store.getPolicyLog()).toHaveLength(0)
      expect(store.getLiveSteps()).toHaveLength(0)
    })

    it('calls chrome.storage.local.remove for meta key', () => {
      store.initSession('Test')
      store.clear()
      const removeCalls = vi.mocked(chrome.storage.local.remove).mock.calls
      const removedKeys = removeCalls.flat()
      expect(removedKeys).toContain(STORAGE_KEY_SESSION)
    })

    it('calls chrome.storage.local.remove for events key', () => {
      const meta = store.initSession('Test')
      store.clear()
      const removeCalls = vi.mocked(chrome.storage.local.remove).mock.calls
      const removedKeys = removeCalls.flat()
      expect(removedKeys).toContain(STORAGE_KEY_SESSION_EVENTS_PREFIX + meta.sessionId)
    })
  })

  // ---------------------------------------------------------------------------
  // loadFromStorage
  // ---------------------------------------------------------------------------

  describe('loadFromStorage', () => {
    it('returns false when no stored data', async () => {
      const result = await store.loadFromStorage()
      expect(result).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Persist / load round-trip (iter 010)
  // ---------------------------------------------------------------------------

  describe('persist + loadFromStorage round-trip', () => {
    it('round-trip preserves all four arrays and meta byte-equal', async () => {
      vi.useFakeTimers()

      const meta = store.initSession('Round-trip test')
      const raw = makeRawEvent({ raw_event_id: 'raw-rt-1', session_id: meta.sessionId })
      const canonical = makeCanonicalEvent({ event_id: 'evt-rt-1', session_id: meta.sessionId })
      const policy = makePolicyEntry({ sessionId: meta.sessionId, eventId: 'raw-rt-1' })
      const step = makeLiveStep({ stepId: 'step-rt-1', title: 'RT step' })

      store.addRawEvent(raw)
      store.addCanonicalEvent(canonical)
      store.addPolicyEntry(policy)
      store.updateLiveStep(step)

      // Advance past the debounce window to trigger the write
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS + 10)

      // Restore into a fresh store instance (simulates SW restart)
      const restored = new SessionStore()
      const ok = await restored.loadFromStorage()

      expect(ok).toBe(true)
      expect(restored.getMeta()?.sessionId).toBe(meta.sessionId)
      expect(restored.getMeta()?.activityName).toBe('Round-trip test')
      expect(restored.getRawEvents()).toHaveLength(1)
      expect(restored.getRawEvents()[0]?.raw_event_id).toBe('raw-rt-1')
      expect(restored.getCanonicalEvents()).toHaveLength(1)
      expect(restored.getCanonicalEvents()[0]?.event_id).toBe('evt-rt-1')
      expect(restored.getPolicyLog()).toHaveLength(1)
      expect(restored.getPolicyLog()[0]?.eventId).toBe('raw-rt-1')
      expect(restored.getLiveSteps()).toHaveLength(1)
      expect(restored.getLiveSteps()[0]?.title).toBe('RT step')
    })

    it('malformed rawEvents on load produces [] and does not throw', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      const meta = store.initSession('Malformed test')
      // Manually corrupt the events storage entry after init
      const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + meta.sessionId
      mockStorage[eventsKey] = {
        persistSchemaVersion: PERSIST_SCHEMA_VERSION,
        rawEvents: 'not-an-array',  // intentionally malformed
        canonicalEvents: [],
        policyLog: [],
        liveSteps: [],
      }

      const restored = new SessionStore()
      await expect(restored.loadFromStorage()).resolves.toBe(true)
      expect(restored.getRawEvents()).toEqual([])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('rawEvents'))

      warnSpy.mockRestore()
    })

    it('missing event payload on load produces [] for all arrays with a warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      // Store meta but no events key
      const fakeMeta = {
        sessionId: 'no-events-session',
        activityName: 'No events',
        startedAt: '2026-01-01T00:00:00.000Z',
        state: 'recording',
        pauseIntervals: [],
        schemaVersion: SCHEMA_VERSION,
        recorderVersion: RECORDER_VERSION,
      }
      mockStorage[STORAGE_KEY_SESSION] = fakeMeta
      // Deliberately NOT adding events key

      const restored = new SessionStore()
      await expect(restored.loadFromStorage()).resolves.toBe(true)
      expect(restored.getRawEvents()).toEqual([])
      expect(restored.getCanonicalEvents()).toEqual([])
      expect(restored.getPolicyLog()).toEqual([])
      expect(restored.getLiveSteps()).toEqual([])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No persisted event arrays'))

      warnSpy.mockRestore()
    })

    it('schema version mismatch on load resets all arrays with a warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      const meta = store.initSession('Schema mismatch test')
      const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + meta.sessionId
      // Store with an incompatible schema version
      mockStorage[eventsKey] = {
        persistSchemaVersion: PERSIST_SCHEMA_VERSION + 99,
        rawEvents: [makeRawEvent()],
        canonicalEvents: [],
        policyLog: [],
        liveSteps: [],
      }

      const restored = new SessionStore()
      await restored.loadFromStorage()
      expect(restored.getRawEvents()).toEqual([])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('schema version mismatch'))

      warnSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------------------------
  // Debounce coalescing (iter 010)
  // ---------------------------------------------------------------------------

  describe('debounce: N rapid appends produce 1 write', () => {
    it('coalesces multiple addRawEvent calls within debounce window into 1 write', () => {
      vi.useFakeTimers()
      store.initSession('Debounce test')
      vi.mocked(chrome.storage.local.set).mockClear()

      // Append 5 events rapidly (all within the debounce window)
      for (let i = 0; i < 5; i++) {
        store.addRawEvent(makeRawEvent({ raw_event_id: `raw-${i}` }))
      }

      // No events write should have fired yet (timer hasn't elapsed)
      // Meta-only set from initSession was already cleared; any set here is premature
      const callsBeforeElapse = vi.mocked(chrome.storage.local.set).mock.calls.length
      expect(callsBeforeElapse).toBe(0)

      // Advance past the debounce window — exactly one events write should fire
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS + 10)

      const callsAfterElapse = vi.mocked(chrome.storage.local.set).mock.calls.length
      expect(callsAfterElapse).toBe(1)
    })

    it('resets the debounce timer when another event arrives mid-window', () => {
      vi.useFakeTimers()
      store.initSession('Timer reset test')
      vi.mocked(chrome.storage.local.set).mockClear()

      store.addRawEvent(makeRawEvent({ raw_event_id: 'raw-a' }))
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 100) // advance but not past window

      store.addRawEvent(makeRawEvent({ raw_event_id: 'raw-b' })) // resets timer
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 100) // still not past new window

      // Timer still hasn't fired
      expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(0)

      vi.advanceTimersByTime(200) // now past the reset window
      expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(1)
    })

    it('flushEventsPersist (via updateState) bypasses the debounce immediately', () => {
      vi.useFakeTimers()
      store.initSession('Flush test')
      vi.mocked(chrome.storage.local.set).mockClear()

      store.addRawEvent(makeRawEvent())
      // Timer has not elapsed — but updateState triggers an immediate flush
      store.updateState('paused')

      // Two calls expected: persistEvents (events key) + persist (meta key)
      expect(vi.mocked(chrome.storage.local.set).mock.calls.length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Quota exceeded (iter 010)
  // ---------------------------------------------------------------------------

  describe('quota exceeded handling', () => {
    it('sets meta.persistenceTruncated = true on QUOTA_BYTES error and does NOT throw', () => {
      vi.useFakeTimers()
      store.initSession('Quota test')

      // Simulate Chrome raising a quota error on the next set() call.
      // The set mock calls the cb synchronously, so we override it to also set lastError.
      vi.mocked(chrome.storage.local.set).mockImplementationOnce(
        (_data: Record<string, unknown>, cb?: () => void) => {
          // Skip the first call (meta from initSession, already cleared)
          // This is the events write — simulate quota error
          chromeMock.runtime.lastError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' }
          if (cb) cb()
          chromeMock.runtime.lastError = null
        }
      )

      store.addRawEvent(makeRawEvent())
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS + 10)

      expect(store.getMeta()?.persistenceTruncated).toBe(true)
    })

    it('stops further event writes after truncation flag is set', () => {
      vi.useFakeTimers()
      store.initSession('Truncation stop test')

      // Force truncation
      vi.mocked(chrome.storage.local.set).mockImplementationOnce(
        (_data: Record<string, unknown>, cb?: () => void) => {
          chromeMock.runtime.lastError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' }
          if (cb) cb()
          chromeMock.runtime.lastError = null
        }
      )

      store.addRawEvent(makeRawEvent({ raw_event_id: 'raw-before-trunc' }))
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS + 10)

      // Confirm truncation is set
      expect(store.getMeta()?.persistenceTruncated).toBe(true)

      // Clear call tracker and add more events — these should NOT produce a write
      vi.mocked(chrome.storage.local.set).mockClear()
      store.addRawEvent(makeRawEvent({ raw_event_id: 'raw-after-trunc' }))
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS + 10)

      // No calls should have been made for events after truncation
      const eventsKeyCalls = vi.mocked(chrome.storage.local.set).mock.calls.filter(
        ([data]) => Object.keys(data as Record<string, unknown>).some(
          k => k.startsWith(STORAGE_KEY_SESSION_EVENTS_PREFIX)
        )
      )
      expect(eventsKeyCalls).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // flushOnSuspend (iter 010)
  // ---------------------------------------------------------------------------

  describe('flushOnSuspend', () => {
    it('writes event arrays immediately without waiting for debounce', () => {
      vi.useFakeTimers()
      store.initSession('Suspend test')
      vi.mocked(chrome.storage.local.set).mockClear()

      store.addRawEvent(makeRawEvent())
      // Timer has NOT elapsed — but flushOnSuspend must write immediately
      store.flushOnSuspend()

      const eventsKeyCalls = vi.mocked(chrome.storage.local.set).mock.calls.filter(
        ([data]) => Object.keys(data as Record<string, unknown>).some(
          k => k.startsWith(STORAGE_KEY_SESSION_EVENTS_PREFIX)
        )
      )
      expect(eventsKeyCalls).toHaveLength(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Schema version constant (iter 010)
  // ---------------------------------------------------------------------------

  describe('PERSIST_SCHEMA_VERSION', () => {
    it('is the expected initial value (1)', () => {
      expect(PERSIST_SCHEMA_VERSION).toBe(1)
    })
  })
})
