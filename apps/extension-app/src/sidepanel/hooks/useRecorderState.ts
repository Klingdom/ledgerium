import { useState, useEffect, useCallback } from 'react'
import { MSG } from '../../shared/types.js'
import type { RecorderState, SessionMeta, LiveStep } from '../../shared/types.js'

interface RecorderData {
  state: RecorderState
  meta: SessionMeta | null
  steps: LiveStep[]
  uploadProgress: number | null
  uploadStatus: 'uploading' | 'complete' | 'failed' | null
  error: string | null
}

export function useRecorderState() {
  const [data, setData] = useState<RecorderData>({
    state: 'idle',
    meta: null,
    steps: [],
    uploadProgress: null,
    uploadStatus: null,
    error: null,
  })

  useEffect(() => {
    // Fetch initial state from background
    chrome.runtime.sendMessage({ type: MSG.GET_STATE }, response => {
      if (chrome.runtime.lastError) return
      if (response) {
        setData(prev => ({
          ...prev,
          state: response.state as RecorderState,
          meta: response.meta as SessionMeta | null,
          steps: (response.steps as LiveStep[]) ?? [],
        }))
      }
    })

    // Listen for state updates from background
    const handler = (message: { type: string; payload: Record<string, unknown> }) => {
      switch (message.type) {
        case MSG.SESSION_STATE_UPDATED:
          setData(prev => ({
            ...prev,
            state: message.payload['state'] as RecorderState,
            meta: message.payload['meta'] as SessionMeta | null,
            error: (message.payload['error'] as string) ?? null,
          }))
          break

        case MSG.LIVE_STEP_UPDATED: {
          const step = message.payload['step'] as LiveStep
          setData(prev => {
            const idx = prev.steps.findIndex(s => s.stepId === step.stepId)
            const steps = idx >= 0
              ? prev.steps.map(s => s.stepId === step.stepId ? step : s)
              : [...prev.steps.filter(s => s.status === 'finalized'), step]
            return { ...prev, steps }
          })
          break
        }

        case MSG.UPLOAD_PROGRESS:
          setData(prev => ({
            ...prev,
            uploadProgress: message.payload['percent'] as number,
            uploadStatus: message.payload['status'] as 'uploading' | 'complete' | 'failed',
          }))
          break
      }
    }

    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  const startSession = useCallback((activityName: string, uploadUrl?: string) => {
    chrome.runtime.sendMessage({
      type: MSG.START_SESSION,
      payload: { activityName, uploadUrl },
    })
  }, [])

  const pauseSession = useCallback(() => {
    chrome.runtime.sendMessage({ type: MSG.PAUSE_SESSION, payload: {} })
  }, [])

  const resumeSession = useCallback(() => {
    chrome.runtime.sendMessage({ type: MSG.RESUME_SESSION, payload: {} })
  }, [])

  const stopSession = useCallback(() => {
    chrome.runtime.sendMessage({ type: MSG.STOP_SESSION, payload: {} })
  }, [])

  const discardSession = useCallback(() => {
    chrome.runtime.sendMessage({ type: MSG.DISCARD_SESSION, payload: {} })
  }, [])

  return {
    ...data,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    discardSession,
  }
}
