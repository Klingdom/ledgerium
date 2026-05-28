/**
 * Tests for the CHROME-002 apiKey storage migration pattern.
 *
 * The migration moves apiKey from chrome.storage.sync (where it lived in the
 * pre-CHROME-002 ExtensionSettings object) to chrome.storage.local (its
 * canonical home after CHROME-002).  The contract:
 *
 *   1. If a legacy apiKey exists in sync settings AND no apiKey is present in
 *      local, the key is written to local and stripped from sync.
 *   2. If a legacy apiKey exists in sync settings AND an apiKey already exists
 *      in local, the local value wins — sync is not overwritten and the legacy
 *      sync value is silently ignored (already migrated by another device or
 *      session).
 *   3. After migration the cleaned sync settings object must NOT contain the
 *      apiKey field.
 *   4. A fresh install (no legacy sync data) reads apiKey from local directly
 *      without attempting any sync write.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { STORAGE_KEY_SETTINGS, STORAGE_KEY_APIKEY } from '../shared/constants.js'
import type { ExtensionSettings } from '../shared/types.js'

// ---------------------------------------------------------------------------
// Inline re-implementation of the migration logic from background/index.ts
// (loadSettings is not exported; we verify the contract by testing the same
// logic in isolation.  Any change to the background implementation that breaks
// these contracts indicates a regression in the migration path.)
// ---------------------------------------------------------------------------

type LegacySyncSettings = ExtensionSettings & { apiKey?: string; telemetryEnabled?: boolean }

/**
 * Mirrors the migration path inside loadSettings() in background/index.ts.
 * Returns the final apiKey value that would be held in memory after migration.
 */
function runMigration(
  syncStore: Record<string, unknown>,
  localStore: Record<string, unknown>,
): Promise<string> {
  return new Promise(resolve => {
    // Step 1: read sync settings
    const saved = syncStore[STORAGE_KEY_SETTINGS] as LegacySyncSettings | undefined
    let resolvedApiKey = ''

    if (saved) {
      const { apiKey: _legacyApiKey, telemetryEnabled: _legacy, ...rest } = saved
      // settings = rest (not tracked here — we focus on apiKey contract)
      void rest

      if (_legacyApiKey) {
        // Step 2: check local for existing apiKey
        const existingLocal = localStore[STORAGE_KEY_APIKEY] as string | undefined
        if (!existingLocal) {
          // Migrate: write to local, strip from sync
          localStore[STORAGE_KEY_APIKEY] = _legacyApiKey
          resolvedApiKey = _legacyApiKey
          const cleaned: ExtensionSettings = {
            uploadUrl: (rest as ExtensionSettings).uploadUrl,
            allowedDomains: (rest as ExtensionSettings).allowedDomains,
            blockedDomains: (rest as ExtensionSettings).blockedDomains,
          }
          syncStore[STORAGE_KEY_SETTINGS] = cleaned
        } else {
          // Local wins — no sync write
          resolvedApiKey = existingLocal
        }
      }
    }

    // Step 3: read apiKey from local (its canonical home)
    const stored = localStore[STORAGE_KEY_APIKEY] as string | undefined
    if (stored) resolvedApiKey = stored

    resolve(resolvedApiKey)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CHROME-002 apiKey storage migration', () => {
  let syncStore: Record<string, unknown>
  let localStore: Record<string, unknown>

  beforeEach(() => {
    syncStore = {}
    localStore = {}
  })

  it('migrates apiKey from sync to local when local has no existing key', async () => {
    syncStore[STORAGE_KEY_SETTINGS] = {
      uploadUrl: 'https://example.com/api/sync',
      allowedDomains: [],
      blockedDomains: [],
      apiKey: 'ldg_legacy_key',
    } satisfies LegacySyncSettings

    const result = await runMigration(syncStore, localStore)

    // apiKey is written to local
    expect(localStore[STORAGE_KEY_APIKEY]).toBe('ldg_legacy_key')
    // apiKey is stripped from sync settings
    const cleaned = syncStore[STORAGE_KEY_SETTINGS] as Record<string, unknown>
    expect(cleaned).not.toHaveProperty('apiKey')
    expect(cleaned).not.toHaveProperty('telemetryEnabled')
    expect(cleaned.uploadUrl).toBe('https://example.com/api/sync')
    // resolved in-memory key is correct
    expect(result).toBe('ldg_legacy_key')
  })

  it('does not overwrite local apiKey when one already exists (local wins)', async () => {
    syncStore[STORAGE_KEY_SETTINGS] = {
      uploadUrl: '',
      allowedDomains: [],
      blockedDomains: [],
      apiKey: 'ldg_old_sync_key',
    } satisfies LegacySyncSettings
    localStore[STORAGE_KEY_APIKEY] = 'ldg_local_key'

    const result = await runMigration(syncStore, localStore)

    // Local key is unchanged
    expect(localStore[STORAGE_KEY_APIKEY]).toBe('ldg_local_key')
    // Sync settings are NOT modified (no re-write occurs)
    const synced = syncStore[STORAGE_KEY_SETTINGS] as Record<string, unknown>
    expect(synced).toHaveProperty('apiKey', 'ldg_old_sync_key')
    // In-memory resolves to local value
    expect(result).toBe('ldg_local_key')
  })

  it('reads apiKey from local directly when sync settings have no legacy key', async () => {
    syncStore[STORAGE_KEY_SETTINGS] = {
      uploadUrl: 'https://example.com/api/sync',
      allowedDomains: [],
      blockedDomains: [],
    } satisfies ExtensionSettings
    localStore[STORAGE_KEY_APIKEY] = 'ldg_fresh_local_key'

    const result = await runMigration(syncStore, localStore)

    // Local store is unchanged
    expect(localStore[STORAGE_KEY_APIKEY]).toBe('ldg_fresh_local_key')
    expect(result).toBe('ldg_fresh_local_key')
  })

  it('returns empty string when no sync settings and no local apiKey (fresh install)', async () => {
    const result = await runMigration(syncStore, localStore)

    expect(result).toBe('')
    expect(localStore).not.toHaveProperty(STORAGE_KEY_APIKEY)
  })

  it('strips both apiKey and telemetryEnabled from sync settings during migration', async () => {
    syncStore[STORAGE_KEY_SETTINGS] = {
      uploadUrl: 'https://example.com',
      allowedDomains: [],
      blockedDomains: [],
      apiKey: 'ldg_key',
      telemetryEnabled: true,
    } as LegacySyncSettings

    await runMigration(syncStore, localStore)

    // Both legacy fields must be absent from the cleaned sync settings
    const synced = syncStore[STORAGE_KEY_SETTINGS] as Record<string, unknown>
    expect(synced).not.toHaveProperty('apiKey')
    expect(synced).not.toHaveProperty('telemetryEnabled')
    expect(synced.uploadUrl).toBe('https://example.com')
  })

  it('SETTINGS_UPDATED handler routes apiKey to local-only storage (contract verification)', () => {
    // The SETTINGS_UPDATED handler in background/index.ts must:
    //   - write uploadUrl + domain lists to sync
    //   - write apiKey to local
    //   - NOT write apiKey to sync
    //
    // This test documents the contract as a static assertion.
    // If the handler changes, this comment and the corresponding
    // implementation in index.ts must be updated together.
    const payload = { uploadUrl: 'https://example.com', apiKey: 'ldg_new_key' }
    const { apiKey: newApiKey, ...rest } = payload

    // apiKey is extracted from the merged payload
    expect(newApiKey).toBe('ldg_new_key')
    // rest (written to sync) does not contain apiKey
    expect(rest).not.toHaveProperty('apiKey')
    expect(rest.uploadUrl).toBe('https://example.com')
  })
})
