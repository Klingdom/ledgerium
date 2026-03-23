import type { SessionBundle } from '../shared/types.js'

export interface UploadResult {
  success: boolean
  error?: string
}

export async function uploadBundle(
  bundle: SessionBundle,
  uploadUrl: string,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  if (!uploadUrl || !uploadUrl.startsWith('http')) {
    return { success: false, error: 'No valid upload URL configured' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    onProgress(10)
    const body = JSON.stringify(bundle)
    onProgress(40)

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })

    onProgress(90)

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
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
