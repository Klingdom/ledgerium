import type { SessionBundle } from '../shared/types.js'
import { classifySyncFailure } from '../shared/sync-failure.js'
import type { SyncFailure } from '../shared/sync-failure.js'

export interface UploadResult {
  success: boolean
  error?: string
  /**
   * Structured classification of a non-OK response (row #186), additive
   * alongside `error` for back-compat. Populated on every non-OK HTTP
   * response; absent on success and on network/timeout failures (there is
   * no HTTP status to classify in those cases). Consumers that only care
   * about the quota refusal should check `failure?.kind === 'quota'`.
   */
  failure?: SyncFailure
}

export async function uploadBundle(
  bundle: SessionBundle,
  uploadUrl: string,
  onProgress: (percent: number) => void,
  apiKey?: string,
): Promise<UploadResult> {
  // Security: enforce HTTPS to prevent API key and workflow data from being sent in clear text
  if (!uploadUrl || !uploadUrl.startsWith('https://')) {
    return { success: false, error: 'Upload URL must use HTTPS' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    onProgress(10)
    const body = JSON.stringify(bundle)
    onProgress(40)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Include API key for Ledgerium web app sync authentication
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })

    onProgress(90)

    if (!response.ok) {
      let detail = response.statusText
      let parsedBody: unknown = null
      try {
        parsedBody = await response.json()
        if (parsedBody !== null && typeof parsedBody === 'object' && typeof (parsedBody as Record<string, unknown>).error === 'string') {
          detail = ((parsedBody as Record<string, unknown>).error as string).slice(0, 200)
        }
      } catch { /* ignore parse failure */ }
      // Classify once, from the same parsed body, so the sidepanel can tell a
      // monthly-quota refusal (403 + code UPGRADE_REQUIRED) apart from every
      // other failure instead of collapsing all of them into "Upload failed".
      const failure = classifySyncFailure(response.status, parsedBody)
      return { success: false, error: `HTTP ${response.status}: ${detail}`, failure }
    }

    onProgress(100)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown upload error'
    if (message.includes('aborted')) {
      return { success: false, error: 'Upload timed out after 30 seconds' }
    }
    return { success: false, error: message }
  } finally {
    clearTimeout(timeout)
  }
}
