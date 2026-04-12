import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HistoryStore } from './history-store.js'
import type { SessionBundle } from '../shared/types.js'
import {
  STORAGE_KEY_HISTORY_INDEX,
  STORAGE_KEY_BUNDLE_PREFIX,
  MAX_HISTORY_ENTRIES,
} from '../shared/constants.js'

// ─── Chrome storage mock ──────────────────────────────────────────────────────

const mockStorage: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
        Object.assign(mockStorage, data)
        cb?.()
      }),
      remove: vi.fn((keys: string[], cb?: () => void) => {
        for (const k of keys) delete mockStorage[k]
        cb?.()
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
    lastError: undefined,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBundle(sessionId: string, activityName = 'Test Activity'): SessionBundle {
  return {
    sessionJson: {
      sessionId,
      activityName,
      startedAt: '2026-01-01T10:00:00Z',
      endedAt: '2026-01-01T10:30:00Z',
      state: 'review_ready',
      pauseIntervals: [],
      schemaVersion: '1.0.0',
      recorderVersion: '2.0.0',
    },
    normalizedEvents: [],
    derivedSteps: [],
    policyLog: [],
    manifest: {
      sessionId,
      exportedAt: '2026-01-01T10:30:05Z',
      schemaVersion: '1.0.0',
      recorderVersion: '2.0.0',
      segmentationRuleVersion: '1.1.0',
      rendererVersion: '0.1.0',
      fileHashes: {},
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HistoryStore', () => {
  let store: HistoryStore

  beforeEach(() => {
    // Clear mock storage between tests
    for (const key of Object.keys(mockStorage)) delete mockStorage[key]
    store = new HistoryStore()
  })

  describe('getIndex', () => {
    it('returns an empty array when storage is empty', async () => {
      const index = await store.getIndex()
      expect(index).toEqual([])
    })
  })

  describe('addEntry', () => {
    it('adds a bundle to the index and persists it', async () => {
      const bundle = makeBundle('session-1', 'Invoice Processing')
      await store.addEntry(bundle)

      const index = await store.getIndex()
      expect(index).toHaveLength(1)
      expect(index[0]!.sessionId).toBe('session-1')
      expect(index[0]!.activityName).toBe('Invoice Processing')
    })

    it('stores eventCount and stepCount from the bundle', async () => {
      const bundle = makeBundle('session-2')
      bundle.normalizedEvents = [
        { event_id: 'e1', schema_version: '1.0.0', session_id: 'session-2', t_ms: 0, t_wall: '', event_type: 'click', actor_type: 'human', normalization_meta: { sourceEventId: 'e1', sourceEventType: 'click', normalizationRuleVersion: '1.0.0', redactionApplied: false } },
        { event_id: 'e2', schema_version: '1.0.0', session_id: 'session-2', t_ms: 100, t_wall: '', event_type: 'click', actor_type: 'human', normalization_meta: { sourceEventId: 'e2', sourceEventType: 'click', normalizationRuleVersion: '1.0.0', redactionApplied: false } },
      ]
      bundle.derivedSteps = [
        { step_id: 's1', session_id: 'session-2', ordinal: 1, title: 'Step 1', status: 'finalized', grouping_reason: 'single_action', confidence: 0.9, source_event_ids: ['e1'], start_t_ms: 0 },
      ]

      await store.addEntry(bundle)
      const index = await store.getIndex()

      expect(index[0]!.eventCount).toBe(2)
      expect(index[0]!.stepCount).toBe(1)
    })

    it('persists the full bundle under the bundle prefix key', async () => {
      const bundle = makeBundle('session-3')
      await store.addEntry(bundle)

      const retrieved = await store.getBundle('session-3')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.manifest.sessionId).toBe('session-3')
    })

    it('prepends new entries (most recent first)', async () => {
      await store.addEntry(makeBundle('session-a'))
      await store.addEntry(makeBundle('session-b'))
      await store.addEntry(makeBundle('session-c'))

      const index = await store.getIndex()
      expect(index[0]!.sessionId).toBe('session-c')
      expect(index[1]!.sessionId).toBe('session-b')
      expect(index[2]!.sessionId).toBe('session-a')
    })

    it('deduplicates by sessionId — re-adding keeps only the newest entry', async () => {
      await store.addEntry(makeBundle('session-dup'))
      await store.addEntry(makeBundle('session-other'))
      await store.addEntry(makeBundle('session-dup')) // re-add

      const index = await store.getIndex()
      const dupEntries = index.filter(e => e.sessionId === 'session-dup')
      expect(dupEntries).toHaveLength(1)
      // The re-added duplicate should be at position 0 (most recent)
      expect(index[0]!.sessionId).toBe('session-dup')
    })

    it('caps index at MAX_HISTORY_ENTRIES', async () => {
      for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
        await store.addEntry(makeBundle(`session-${i}`))
      }

      const index = await store.getIndex()
      expect(index).toHaveLength(MAX_HISTORY_ENTRIES)
    })

    it('evicts oldest bundle storage keys when cap is exceeded', async () => {
      for (let i = 0; i < MAX_HISTORY_ENTRIES + 1; i++) {
        await store.addEntry(makeBundle(`session-${i}`))
      }

      // session-0 was the first added and should have been evicted
      const evictedBundle = await store.getBundle('session-0')
      expect(evictedBundle).toBeNull()
    })

    it('preserves endedAt when present in sessionJson', async () => {
      const bundle = makeBundle('session-ended')
      bundle.sessionJson.endedAt = '2026-01-01T11:00:00Z'

      await store.addEntry(bundle)
      const index = await store.getIndex()
      expect(index[0]!.endedAt).toBe('2026-01-01T11:00:00Z')
    })

    it('omits endedAt when undefined in sessionJson', async () => {
      const bundle = makeBundle('session-no-end')
      delete (bundle.sessionJson as unknown as Record<string, unknown>).endedAt

      await store.addEntry(bundle)
      const index = await store.getIndex()
      expect(Object.prototype.hasOwnProperty.call(index[0], 'endedAt')).toBe(false)
    })
  })

  describe('getBundle', () => {
    it('returns null when the bundle does not exist', async () => {
      const result = await store.getBundle('nonexistent')
      expect(result).toBeNull()
    })

    it('retrieves an added bundle by sessionId', async () => {
      const bundle = makeBundle('session-get')
      await store.addEntry(bundle)

      const retrieved = await store.getBundle('session-get')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.sessionJson.activityName).toBe('Test Activity')
    })
  })

  describe('deleteEntry', () => {
    it('removes the entry from the index', async () => {
      await store.addEntry(makeBundle('session-del-1'))
      await store.addEntry(makeBundle('session-del-2'))

      await store.deleteEntry('session-del-1')

      const index = await store.getIndex()
      expect(index.map(e => e.sessionId)).not.toContain('session-del-1')
      expect(index.map(e => e.sessionId)).toContain('session-del-2')
    })

    it('removes the bundle from storage', async () => {
      await store.addEntry(makeBundle('session-del-bundle'))
      await store.deleteEntry('session-del-bundle')

      const bundle = await store.getBundle('session-del-bundle')
      expect(bundle).toBeNull()
    })

    it('is a no-op when sessionId does not exist', async () => {
      await store.addEntry(makeBundle('session-existing'))
      await store.deleteEntry('nonexistent-session')

      const index = await store.getIndex()
      expect(index).toHaveLength(1)
    })
  })
})
