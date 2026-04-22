/**
 * Integration test: record → SW restart → recover
 *
 * This file validates the full session-event persistence round-trip at the
 * SessionStore level, covering the 6-step scenario that the static Playwright
 * harness cannot exercise because the SessionStore runs in the background
 * service worker — not in the sidepanel page the harness serves.
 *
 * The Playwright companion smoke test (recording-lifecycle.spec.ts) validates
 * the observable sidepanel consequence: that the UI renders the rehydrated
 * rawEventCount when GET_STATE returns a rehydrated state.
 *
 * Scope (iter 010):
 *   - Step 1: Arrange — init session, simulate recording state
 *   - Step 2: Accumulate — add 3 raw events with deterministic IDs
 *   - Step 3: Debounce flush — advance fake timers past PERSIST_DEBOUNCE_MS;
 *             assert chrome.storage.local key shape
 *   - Step 4: Simulate SW restart — clear in-memory store; do NOT clear storage
 *   - Step 5: Rehydrate — call loadFromStorage() on a fresh store instance;
 *             assert all 3 events restored in order
 *   - Step 6: Regression guard — existing unit test assertions re-confirmed
 *             inline (covered by the broader suite; noted here for traceability)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SessionStore } from './session-store.js'
import type { RawEvent } from '../shared/types.js'
import {
  SCHEMA_VERSION,
  RECORDER_VERSION,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_SESSION_EVENTS_PREFIX,
  PERSIST_SCHEMA_VERSION,
  PERSIST_DEBOUNCE_MS,
} from '../shared/constants.js'

// ─── Chrome storage mock ──────────────────────────────────────────────────────
// Mirrors the mock in session-store.test.ts — a real in-memory store so that
// the integration test can assert on actual stored values.

const mockStorage: Record<string, unknown> = {}

const chromeMock = {
  storage: {
    local: {
      set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
        if (!chromeMock.runtime.lastError) {
          Object.assign(mockStorage, data)
        }
        if (cb) cb()
      }),
      remove: vi.fn((key: string | string[], cb?: () => void) => {
        if (Array.isArray(key)) {
          for (const k of key) delete mockStorage[k]
        } else {
          delete mockStorage[key]
        }
        if (cb) cb()
      }),
      get: vi.fn((keys: string[] | null, cb: (result: Record<string, unknown>) => void) => {
        // null means "return all keys" — mirrors chrome.storage.local.get(null, cb)
        if (keys === null) {
          cb({ ...mockStorage })
          return
        }
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRawEvent(id: string, tMs: number): RawEvent {
  return {
    raw_event_id: id,
    event_type: 'click',
    t_ms: tMs,
    t_wall: `2026-01-01T00:00:0${tMs}.000Z`,
    session_id: 'test-session-restart',
    schema_version: '1.0.0',
  } as RawEvent
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('record → SW restart → recover integration', () => {
  beforeEach(() => {
    // Reset mock storage and call trackers between tests
    for (const key of Object.keys(mockStorage)) delete mockStorage[key]
    chromeMock.runtime.lastError = null
    vi.mocked(chrome.storage.local.set).mockClear()
    vi.mocked(chrome.storage.local.get).mockClear()
    vi.mocked(chrome.storage.local.remove).mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1–5: full round-trip
  // ─────────────────────────────────────────────────────────────────────────

  it('record → SW restart → recover: session events rehydrate from chrome.storage.local', async () => {
    // ── Step 1: Arrange ─────────────────────────────────────────────────────
    // Create a SessionStore (represents the running service worker store) and
    // initialise a session, then transition to 'recording'.
    const liveStore = new SessionStore()
    const meta = liveStore.initSession('SW restart integration test')
    liveStore.updateState('recording')

    // Confirm in-memory meta is consistent.
    expect(liveStore.getMeta()?.state).toBe('recording')
    expect(liveStore.getMeta()?.sessionId).toBe(meta.sessionId)

    // ── Step 2: Accumulate events ────────────────────────────────────────────
    // Dispatch 3 raw events with unique, deterministic IDs and stable t_ms.
    const event1 = makeRawEvent('raw-restart-001', 100)
    const event2 = makeRawEvent('raw-restart-002', 200)
    const event3 = makeRawEvent('raw-restart-003', 300)

    liveStore.addRawEvent(event1)
    liveStore.addRawEvent(event2)
    liveStore.addRawEvent(event3)

    // Assert in-memory state holds all 3 events.
    expect(liveStore.getRawEvents()).toHaveLength(3)
    expect(liveStore.getRawEvents().map(e => e.raw_event_id)).toEqual([
      'raw-restart-001',
      'raw-restart-002',
      'raw-restart-003',
    ])

    // ── Step 3: Debounce flush ───────────────────────────────────────────────
    // Advance fake timers past the trailing-edge debounce window so the
    // persistEvents() write fires.
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS + 50)

    // Verify chrome.storage.local now has the expected key.
    const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + meta.sessionId
    expect(eventsKey).toMatch(/^ledgerium_active_session_events_/)

    const storedPayload = mockStorage[eventsKey] as {
      persistSchemaVersion: number
      rawEvents: RawEvent[]
      canonicalEvents: unknown[]
      policyLog: unknown[]
      liveSteps: unknown[]
    } | undefined

    // Key must exist.
    expect(storedPayload).toBeDefined()

    // Payload shape: must have 4 arrays and correct schema version.
    expect(storedPayload?.persistSchemaVersion).toBe(PERSIST_SCHEMA_VERSION)
    expect(storedPayload?.persistSchemaVersion).toBe(1) // explicit constant check
    expect(Array.isArray(storedPayload?.rawEvents)).toBe(true)
    expect(Array.isArray(storedPayload?.canonicalEvents)).toBe(true)
    expect(Array.isArray(storedPayload?.policyLog)).toBe(true)
    expect(Array.isArray(storedPayload?.liveSteps)).toBe(true)

    // rawEvents must be non-empty with all 3 events present.
    expect(storedPayload?.rawEvents).toHaveLength(3)
    expect(storedPayload?.rawEvents[0]?.raw_event_id).toBe('raw-restart-001')
    expect(storedPayload?.rawEvents[1]?.raw_event_id).toBe('raw-restart-002')
    expect(storedPayload?.rawEvents[2]?.raw_event_id).toBe('raw-restart-003')

    // Meta key must also be present (persisted on every state transition).
    const storedMeta = mockStorage[STORAGE_KEY_SESSION] as {
      sessionId: string
      activityName: string
      schemaVersion: string
      recorderVersion: string
    } | undefined
    expect(storedMeta).toBeDefined()
    expect(storedMeta?.sessionId).toBe(meta.sessionId)
    expect(storedMeta?.activityName).toBe('SW restart integration test')
    expect(storedMeta?.schemaVersion).toBe(SCHEMA_VERSION)
    expect(storedMeta?.recorderVersion).toBe(RECORDER_VERSION)

    // ── Step 4: Simulate SW restart ──────────────────────────────────────────
    // Clear the in-memory SessionStore (simulates V8 process eviction).
    // DO NOT clear chrome.storage.local — that data survives the restart.
    //
    // We simulate the in-memory eviction by abandoning `liveStore` and
    // creating a fresh instance.  The mockStorage (chrome.storage.local
    // equivalent) is intentionally left intact.

    // Verify storage is still intact after abandoning the in-memory store.
    expect(mockStorage[eventsKey]).toBeDefined()
    expect(mockStorage[STORAGE_KEY_SESSION]).toBeDefined()

    // ── Step 5: Rehydrate ────────────────────────────────────────────────────
    // Create a new SessionStore (represents the freshly woken SW) and call
    // loadFromStorage() which mirrors what restoreStateIfNeeded() calls in
    // background/index.ts.
    const restoredStore = new SessionStore()
    const loadResult = await restoredStore.loadFromStorage()

    // loadFromStorage must return true (data found).
    expect(loadResult).toBe(true)

    // Restored meta must match the original session.
    expect(restoredStore.getMeta()?.sessionId).toBe(meta.sessionId)
    expect(restoredStore.getMeta()?.activityName).toBe('SW restart integration test')

    // All 3 raw events must be present with the same raw_event_id values in
    // the same order as they were appended.
    const restoredEvents = restoredStore.getRawEvents()
    expect(restoredEvents).toHaveLength(3)
    expect(restoredEvents[0]?.raw_event_id).toBe('raw-restart-001')
    expect(restoredEvents[1]?.raw_event_id).toBe('raw-restart-002')
    expect(restoredEvents[2]?.raw_event_id).toBe('raw-restart-003')

    // t_ms values must be stable and match what was dispatched.
    expect(restoredEvents[0]?.t_ms).toBe(100)
    expect(restoredEvents[1]?.t_ms).toBe(200)
    expect(restoredEvents[2]?.t_ms).toBe(300)

    // Other arrays must restore to [] (nothing was added for them in this test).
    expect(restoredStore.getCanonicalEvents()).toHaveLength(0)
    expect(restoredStore.getPolicyLog()).toHaveLength(0)
    expect(restoredStore.getLiveSteps()).toHaveLength(0)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Additional invariants: flush-on-state-transition bypasses debounce
  // ─────────────────────────────────────────────────────────────────────────

  it('updateState(paused) flushes events synchronously — no timer needed', async () => {
    // Validates that a pause transition (as would happen before SW suspend)
    // guarantees the storage is current without relying on the debounce timer.
    const store = new SessionStore()
    store.initSession('Flush-on-pause test')

    store.addRawEvent(makeRawEvent('raw-flush-001', 10))
    store.addRawEvent(makeRawEvent('raw-flush-002', 20))

    // Transition to paused — this calls flushEventsPersist() synchronously.
    store.updateState('paused')

    // DO NOT advance timers — the flush must have already fired.
    const sessionId = store.getMeta()!.sessionId
    const eventsKey = STORAGE_KEY_SESSION_EVENTS_PREFIX + sessionId
    const stored = mockStorage[eventsKey] as { rawEvents: RawEvent[] } | undefined

    expect(stored).toBeDefined()
    expect(stored?.rawEvents).toHaveLength(2)
    expect(stored?.rawEvents[0]?.raw_event_id).toBe('raw-flush-001')
    expect(stored?.rawEvents[1]?.raw_event_id).toBe('raw-flush-002')

    // After pause flush, rehydrate and confirm events survive.
    const restoredStore = new SessionStore()
    const ok = await restoredStore.loadFromStorage()
    expect(ok).toBe(true)
    expect(restoredStore.getRawEvents()).toHaveLength(2)
  })
})
