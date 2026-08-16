/**
 * Tests for the upload pipeline (uploadBundle).
 *
 * Chrome Web Store submission BLOCKER-5 (docs/runbooks/CHROME_STORE_SUBMISSION.md):
 * HTTPS rejection / non-200 response / timeout-abort paths previously had zero
 * test coverage. This file exercises the success path plus every documented
 * failure path so upload failures are verified to surface a
 * `{ success: false, error }` result to the caller — background/index.ts
 * broadcasts `result.error` to the sidepanel via UPLOAD_PROGRESS
 * (see background/index.ts:320-327), so a correct UploadResult here is what
 * makes failures visible in the UI rather than silently dropped.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadBundle } from './uploader.js'
import type {
  SessionBundle,
  SessionMeta,
  CanonicalEvent,
  DerivedStep,
  PolicyLogEntry,
  BundleManifest,
} from '../shared/types.js'

// ─── Factories ────────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session'
const NOW = '2026-01-01T00:00:00Z'

function makeBundle(): SessionBundle {
  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Test Activity',
      startedAt: NOW,
      endedAt: NOW,
      state: 'review_ready',
      pauseIntervals: [],
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.0',
    } as SessionMeta,
    normalizedEvents: [] as CanonicalEvent[],
    derivedSteps: [] as DerivedStep[],
    policyLog: [] as PolicyLogEntry[],
    manifest: {
      sessionId: SESSION_ID,
      exportedAt: NOW,
      schemaVersion: '1.0.0',
      recorderVersion: '0.1.0',
      segmentationRuleVersion: '1.1.0',
      rendererVersion: '0.1.0',
      fileHashes: {},
    } as BundleManifest,
  }
}

/** Builds a minimal Response-shaped object for the fetch mock. */
function makeJsonResponse(status: number, ok: boolean, body: unknown): Response {
  return {
    ok,
    status,
    statusText: `Status ${status}`,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('uploadBundle', () => {
  let onProgress: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onProgress = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // HTTPS enforcement (Security: CHROME-002-adjacent — API key + workflow data
  // must never leave the browser in clear text)
  // ---------------------------------------------------------------------------

  describe('HTTPS enforcement', () => {
    it('rejects an http:// URL without calling fetch', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'http://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'Upload URL must use HTTPS' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(onProgress).not.toHaveBeenCalled()
    })

    it('rejects an empty upload URL', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), '', onProgress)

      expect(result).toEqual({ success: false, error: 'Upload URL must use HTTPS' })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects a non-https scheme (e.g. ftp://)', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'ftp://example.com/upload', onProgress)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload URL must use HTTPS')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('accepts an https:// URL and proceeds to call fetch', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(200, true, {}))
      vi.stubGlobal('fetch', fetchMock)

      await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(fetchMock).toHaveBeenCalledOnce()
    })
  })

  // ---------------------------------------------------------------------------
  // Success path — establishes the progress/return-shape contrast for the
  // failure-path assertions below.
  // ---------------------------------------------------------------------------

  describe('success path', () => {
    it('returns success:true and reports progress 10 -> 40 -> 90 -> 100', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(200, true, {}))
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: true })
      expect(onProgress.mock.calls.map((call) => call[0])).toEqual([10, 40, 90, 100])
    })

    it('POSTs the JSON-serialized bundle with a Content-Type header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(200, true, {}))
      vi.stubGlobal('fetch', fetchMock)
      const bundle = makeBundle()

      await uploadBundle(bundle, 'https://example.com/upload', onProgress)

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://example.com/upload')
      expect(init.method).toBe('POST')
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
      expect(init.body).toBe(JSON.stringify(bundle))
    })

    it('includes an Authorization bearer header when apiKey is provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(200, true, {}))
      vi.stubGlobal('fetch', fetchMock)

      await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress, 'secret-key')

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key')
    })

    it('omits the Authorization header when no apiKey is provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(200, true, {}))
      vi.stubGlobal('fetch', fetchMock)

      await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Non-200 response handling
  // ---------------------------------------------------------------------------

  describe('non-200 response handling', () => {
    it('returns a formatted error for a 4xx response with a JSON error body', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(401, false, { error: 'Invalid API key' }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'HTTP 401: Invalid API key' })
    })

    it('returns a formatted error for a 5xx response with a JSON error body', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(500, false, { error: 'Internal server error' }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'HTTP 500: Internal server error' })
    })

    it('does NOT distinguish between 4xx and 5xx — both use identical generic formatting', async () => {
      // Documents current behavior: uploadBundle has no branch on response.status
      // beyond the single `!response.ok` check, so client errors and server
      // errors surface identically to the caller (same `HTTP <status>: <detail>`
      // shape regardless of whether the failure is retryable).
      const fetchMock4xx = vi.fn().mockResolvedValue(makeJsonResponse(403, false, { error: 'Forbidden' }))
      vi.stubGlobal('fetch', fetchMock4xx)
      const result4xx = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      const fetchMock5xx = vi.fn().mockResolvedValue(makeJsonResponse(503, false, { error: 'Forbidden' }))
      vi.stubGlobal('fetch', fetchMock5xx)
      const result5xx = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result4xx.error).toBe('HTTP 403: Forbidden')
      expect(result5xx.error).toBe('HTTP 503: Forbidden')
    })

    it('falls back to statusText when the error body is not valid JSON', async () => {
      const response = {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON')),
      } as unknown as Response
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'HTTP 502: Bad Gateway' })
    })

    it('falls back to statusText when the JSON body has no string `error` field', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(400, false, { message: 'not the expected shape' }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'HTTP 400: Status 400' })
    })

    it('truncates an overly long JSON error message to 200 characters', async () => {
      const longMessage = 'x'.repeat(500)
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(400, false, { error: longMessage }))
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result.error).toBe(`HTTP 400: ${'x'.repeat(200)}`)
    })

    it('reports progress up to 90 but never reaches 100 on a failed response', async () => {
      // Documents current behavior: onProgress(100) is only called on the
      // success return path, so a failed upload leaves the UI's last-reported
      // progress at 90% rather than an explicit "done, but failed" signal.
      const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(500, false, { error: 'boom' }))
      vi.stubGlobal('fetch', fetchMock)

      await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(onProgress.mock.calls.map((call) => call[0])).toEqual([10, 40, 90])
    })
  })

  // ---------------------------------------------------------------------------
  // Timeout / abort and network failures
  // ---------------------------------------------------------------------------

  describe('timeout, abort, and network failures', () => {
    it('returns a timeout error and aborts the request after 30 seconds', async () => {
      // The rejection is modeled as a plain Error carrying the exact message
      // Chromium's fetch() throws on AbortController-driven abort (verified
      // against a real headless Chromium: `err instanceof Error === true`,
      // `err.message === 'signal is aborted without reason'`). jsdom's
      // built-in DOMException does NOT extend Error (a known jsdom fidelity
      // gap vs. real Chromium), so constructing `new DOMException(...)` here
      // would fail `err instanceof Error` inside uploadBundle's catch block
      // and produce a false negative unrelated to the code under test.
      vi.useFakeTimers()
      let capturedSignal: AbortSignal | undefined
      const fetchMock = vi.fn((_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal
        return new Promise((_resolve, reject) => {
          capturedSignal!.addEventListener('abort', () => {
            reject(new Error('signal is aborted without reason'))
          })
        })
      })
      vi.stubGlobal('fetch', fetchMock)

      const promise = uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)
      await vi.advanceTimersByTimeAsync(30_000)
      const result = await promise

      expect(result).toEqual({ success: false, error: 'Upload timed out after 30 seconds' })
      expect(capturedSignal?.aborted).toBe(true)
    })

    it('does not abort or leak the timeout when the response arrives before 30 seconds', async () => {
      vi.useFakeTimers()
      let capturedSignal: AbortSignal | undefined
      const fetchMock = vi.fn((_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal
        return Promise.resolve(makeJsonResponse(200, true, {}))
      })
      vi.stubGlobal('fetch', fetchMock)

      const promise = uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)
      const result = await promise

      expect(result).toEqual({ success: true })
      // clearTimeout() in the `finally` block should have already fired before
      // the 30s mark; advancing past it must not retroactively abort a
      // request whose promise has already settled.
      await vi.advanceTimersByTimeAsync(30_000)
      expect(capturedSignal?.aborted).toBe(false)
    })

    it('returns the underlying error message for a generic network failure', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'Failed to fetch' })
    })

    it('returns a generic fallback message when a non-Error value is thrown', async () => {
      // Documents current behavior: `err instanceof Error` gates the message
      // extraction, so a thrown non-Error value (e.g. a plain string, which
      // some non-fetch code paths can produce) collapses to a generic
      // "Unknown upload error" string rather than surfacing the original value.
      const fetchMock = vi.fn().mockRejectedValue('a plain string rejection')
      vi.stubGlobal('fetch', fetchMock)

      const result = await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(result).toEqual({ success: false, error: 'Unknown upload error' })
    })

    it('stops progress reporting at 40 on network failure — 90 and 100 are never reached', async () => {
      // Documents current behavior: onProgress(90) only fires after `fetch`
      // resolves. A thrown/rejected fetch call leaves the UI's last-reported
      // progress frozen at 40%, which the caller (background/index.ts) papers
      // over by broadcasting a final UPLOAD_PROGRESS at percent:100 with
      // status:'failed' regardless — but uploadBundle itself never signals
      // past 40% on this path.
      const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      vi.stubGlobal('fetch', fetchMock)

      await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(onProgress.mock.calls.map((call) => call[0])).toEqual([10, 40])
    })

    it('always clears the pending timeout, even on a thrown non-abort error', async () => {
      vi.useFakeTimers()
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
      const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      vi.stubGlobal('fetch', fetchMock)

      await uploadBundle(makeBundle(), 'https://example.com/upload', onProgress)

      expect(clearTimeoutSpy).toHaveBeenCalledOnce()
      clearTimeoutSpy.mockRestore()
    })
  })
})
