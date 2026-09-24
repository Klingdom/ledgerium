import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// chrome mock — promise-style storage.local (telemetry.ts never passes a
// callback), matching the real chrome.storage API when a callback is omitted.
// ---------------------------------------------------------------------------

const mockStorage: Record<string, unknown> = {}

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys: string[]) => {
        const result: Record<string, unknown> = {}
        for (const k of keys) if (k in mockStorage) result[k] = mockStorage[k]
        return result
      }),
      set: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(mockStorage, data)
      }),
    },
  },
  runtime: {
    getManifest: vi.fn(() => ({ version: '2.0.0' })),
  },
  alarms: {
    create: vi.fn(),
  },
}

vi.stubGlobal('chrome', chromeMock)
vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid-0000-0000-0000-000000000000' })

const fetchMock = vi.fn(async (_url?: string, _init?: RequestInit) => new Response(null, { status: 200 }))
vi.stubGlobal('fetch', fetchMock)

for (const key of Object.keys(mockStorage)) delete mockStorage[key]

import {
  getOrCreateInstallId,
  getBrowserFamily,
  recordInstall,
  recordSignInLinked,
  checkAndEmitDailyPing,
  initTelemetryAlarm,
  isTelemetryAlarm,
  resetTelemetryCacheForTests,
} from './telemetry.js'

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key]
  resetTelemetryCacheForTests()
  fetchMock.mockClear()
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
  chromeMock.alarms.create.mockClear()
})

describe('telemetry: installId lifecycle', () => {
  it('generates the id exactly once and reuses it on subsequent calls', async () => {
    const first = await getOrCreateInstallId()
    const second = await getOrCreateInstallId()
    expect(first).toBe(second)
    expect(mockStorage['ledgerium_install_id']).toBe(first)
  })

  it('reads a previously-persisted id from storage rather than generating a new one', async () => {
    mockStorage['ledgerium_install_id'] = 'already-persisted-id'
    const id = await getOrCreateInstallId()
    expect(id).toBe('already-persisted-id')
  })
})

describe('telemetry: browser family', () => {
  it('never returns the raw UA — only chrome/edge/other', () => {
    expect(['chrome', 'edge', 'other']).toContain(getBrowserFamily())
  })
})

describe('telemetry: extension_installed', () => {
  it('POSTs installType, extensionVersion, and browser (never raw UA)', async () => {
    recordInstall({ reason: 'install' })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.event).toBe('extension_installed')
    expect(body.installType).toBe('install')
    expect(body.extensionVersion).toBe('2.0.0')
    expect(['chrome', 'edge', 'other']).toContain(body.browser)
    expect(body.userAgent).toBeUndefined()
  })

  it('never throws even when the POST fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    expect(() => recordInstall({ reason: 'update' })).not.toThrow()
    // give the fire-and-forget async body a tick to run to completion
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})

describe('telemetry: extension_session_active daily ping', () => {
  it('fires once for a given UTC day and does not fire again the same day', async () => {
    const day1 = Date.parse('2026-01-01T10:00:00.000Z')
    await checkAndEmitDailyPing(day1)
    await checkAndEmitDailyPing(day1 + 60_000) // later same day
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fires again on a new UTC day', async () => {
    const day1 = Date.parse('2026-01-01T10:00:00.000Z')
    const day2 = Date.parse('2026-01-02T00:00:01.000Z')
    await checkAndEmitDailyPing(day1)
    await checkAndEmitDailyPing(day2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never throws even when storage and network both fail', async () => {
    chromeMock.storage.local.get.mockRejectedValueOnce(new Error('storage broken'))
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await expect(checkAndEmitDailyPing(Date.now())).resolves.toBeUndefined()
  })
})

describe('telemetry: extension_signin_linked', () => {
  it('sends installId + apiKey (not userId) and only once per install', async () => {
    recordSignInLinked('ldg_test_key_123')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.event).toBe('extension_signin_linked')
    expect(body.apiKey).toBe('ldg_test_key_123')
    expect(body.userId).toBeUndefined()

    recordSignInLinked('ldg_test_key_123')
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchMock).toHaveBeenCalledTimes(1) // still once — dedup flag held
  })

  it('is a no-op for an empty apiKey', () => {
    recordSignInLinked('')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('telemetry: alarm plumbing', () => {
  it('creates the dedicated telemetry alarm, distinct from the recording keepalive alarm', () => {
    initTelemetryAlarm()
    expect(chromeMock.alarms.create).toHaveBeenCalledWith('ledgerium-telemetry-daily', expect.objectContaining({ periodInMinutes: 1440 }))
  })

  it('isTelemetryAlarm distinguishes the telemetry alarm from the keepalive alarm', () => {
    expect(isTelemetryAlarm('ledgerium-telemetry-daily')).toBe(true)
    expect(isTelemetryAlarm('ledgerium-keepalive')).toBe(false)
  })
})
