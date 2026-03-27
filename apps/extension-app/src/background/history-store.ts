import type { HistoryEntry, SessionBundle } from '../shared/types.js'
import {
  STORAGE_KEY_HISTORY_INDEX,
  STORAGE_KEY_BUNDLE_PREFIX,
  MAX_HISTORY_ENTRIES,
} from '../shared/constants.js'

export class HistoryStore {
  /**
   * Save a completed bundle to the history index and persist the full bundle.
   * Prepends the new entry, deduplicates by sessionId, caps at MAX_HISTORY_ENTRIES,
   * and evicts the oldest bundles when the cap is exceeded.
   */
  async addEntry(bundle: SessionBundle): Promise<void> {
    const entry: HistoryEntry = {
      sessionId: bundle.manifest.sessionId,
      activityName: bundle.sessionJson.activityName,
      startedAt: bundle.sessionJson.startedAt,
      ...(bundle.sessionJson.endedAt !== undefined ? { endedAt: bundle.sessionJson.endedAt } : {}),
      stepCount: bundle.derivedSteps.length,
      eventCount: bundle.normalizedEvents.length,
      exportedAt: bundle.manifest.exportedAt,
    }

    // Persist the full bundle under its own storage key
    const bundleKey = STORAGE_KEY_BUNDLE_PREFIX + entry.sessionId
    await this.storageSet({ [bundleKey]: bundle })

    // Read current index, deduplicate, prepend new entry, cap at max
    const current = await this.getIndex()
    const deduped = current.filter(e => e.sessionId !== entry.sessionId)
    const toKeep = deduped.slice(0, MAX_HISTORY_ENTRIES - 1)
    const evicted = deduped.slice(MAX_HISTORY_ENTRIES - 1)

    // Remove bundles for evicted entries to avoid unbounded storage growth
    if (evicted.length > 0) {
      await this.storageRemove(evicted.map(e => STORAGE_KEY_BUNDLE_PREFIX + e.sessionId))
    }

    await this.storageSet({ [STORAGE_KEY_HISTORY_INDEX]: [entry, ...toKeep] })
  }

  async getIndex(): Promise<HistoryEntry[]> {
    const result = await this.storageGet([STORAGE_KEY_HISTORY_INDEX])
    return (result[STORAGE_KEY_HISTORY_INDEX] as HistoryEntry[] | undefined) ?? []
  }

  async getBundle(sessionId: string): Promise<SessionBundle | null> {
    const key = STORAGE_KEY_BUNDLE_PREFIX + sessionId
    const result = await this.storageGet([key])
    return (result[key] as SessionBundle | undefined) ?? null
  }

  async deleteEntry(sessionId: string): Promise<void> {
    const current = await this.getIndex()
    const updated = current.filter(e => e.sessionId !== sessionId)
    await Promise.all([
      this.storageRemove([STORAGE_KEY_BUNDLE_PREFIX + sessionId]),
      this.storageSet({ [STORAGE_KEY_HISTORY_INDEX]: updated }),
    ])
  }

  // ─── Storage helpers (wrapped for error safety) ───────────────────────────

  private storageGet(keys: string[]): Promise<Record<string, unknown>> {
    return new Promise(resolve => {
      chrome.storage.local.get(keys, result => {
        if (chrome.runtime.lastError) { resolve({}); return }
        resolve(result)
      })
    })
  }

  private storageSet(items: Record<string, unknown>): Promise<void> {
    return new Promise(resolve => {
      chrome.storage.local.set(items, () => { resolve() })
    })
  }

  private storageRemove(keys: string[]): Promise<void> {
    return new Promise(resolve => {
      chrome.storage.local.remove(keys, () => { resolve() })
    })
  }
}
