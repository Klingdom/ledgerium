import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionStore } from './session-store.js'
import type { RawEvent, CanonicalEvent, PolicyLogEntry, LiveStep } from '../shared/types.js'
import { SCHEMA_VERSION, RECORDER_VERSION } from '../shared/constants.js'

// ---------------------------------------------------------------------------
// Chrome storage mock
// ---------------------------------------------------------------------------

const mockStorage: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data)
      }),
      remove: vi.fn((key: string) => {
        delete mockStorage[key]
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
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRawEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    raw_event_id: 'raw-1',
    event_type: 'click',
    t_ms: 0,
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
    vi.mocked(chrome.storage.local.set).mockClear()
    vi.mocked(chrome.storage.local.remove).mockClear()
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
      expect(chrome.storage.local.set).toHaveBeenCalledOnce()
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

    it('calls chrome.storage.local.remove for session and events', () => {
      store.initSession('Test')
      vi.mocked(chrome.storage.local.remove).mockClear()
      store.clear()
      // clear() removes both the session meta key and the events key
      expect(chrome.storage.local.remove).toHaveBeenCalledTimes(2)
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
})
