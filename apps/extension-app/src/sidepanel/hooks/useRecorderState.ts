import { useState, useEffect, useCallback } from 'react'
import { MSG } from '../../shared/types.js'
import type { RecorderState, SessionMeta, LiveStep } from '../../shared/types.js'

interface RecorderData {
  state: RecorderState
  meta: SessionMeta | null
  steps: LiveStep[]
  rawEventCount: number
  uploadProgress: number | null
  uploadStatus: 'uploading' | 'complete' | 'failed' | null
  error: string | null
}

// Merge polled steps into existing steps without losing provisional steps not
// yet known to the background's GET_STATE snapshot.
function mergeSteps(prev: LiveStep[], next: LiveStep[]): LiveStep[] {
  const byId = new Map(next.map(s => [s.stepId, s]))
  const merged = prev.map(s => byId.get(s.stepId) ?? s)
  const existingIds = new Set(prev.map(s => s.stepId))
  for (const s of next) {
    if (!existingIds.has(s.stepId)) merged.push(s)
  }
  return merged
}

export function useRecorderState() {
  const [data, setData] = useState<RecorderData>({
    state: 'idle',
    meta: null,
    steps: [],
    rawEventCount: 0,
    uploadProgress: null,
    uploadStatus: null,
    error: null,
  })

  // Polling fallback — when recording, re-fetch steps every 750ms in case push
  // messages from the SW are dropped (e.g. sidepanel was closed and reopened).
  useEffect(() => {
    if (data.state !== 'recording') return
    const id = setInterval(() => {
      chrome.runtime.sendMessage({ type: MSG.GET_STATE }, response => {
        if (chrome.runtime.lastError) return
        if (!response) return
        setData(prev => ({
          ...prev,
          state: response.state as RecorderState,
          meta: response.meta as SessionMeta | null,
          steps: mergeSteps(prev.steps, (response.steps as LiveStep[]) ?? []),
          rawEventCount: (response.rawEventCount as number) ?? prev.rawEventCount,
        }))
      })
    }, 750)
    return () => clearInterval(id)
  }, [data.state])

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
          rawEventCount: (response.rawEventCount as number) ?? 0,
        }))
      }
    })

    // Listen for state updates from background
    const handler = (message: { type: string; payload: Record<string, unknown> }) => {
      switch (message.type) {
        case MSG.SESSION_STATE_UPDATED: {
          const newState = message.payload['state'] as RecorderState
          // A transition to idle or arming marks a session boundary. Wipe all
          // session-specific UI state so it never bleeds into the next session.
          const isSessionBoundary = newState === 'idle' || newState === 'arming'
          setData(prev => ({
            ...prev,
            state: newState,
            meta: message.payload['meta'] as SessionMeta | null,
            error: (message.payload['error'] as string) ?? null,
            ...(isSessionBoundary ? {
              steps: [],
              rawEventCount: 0,
              uploadProgress: null,
              uploadStatus: null,
            } : {}),
          }))
          // Immediately pull steps on any state change that involves active data
          // (recording, stopping, review_ready). This eliminates the 750ms gap
          // before the polling interval fires.
          if (newState === 'recording' || newState === 'stopping' || newState === 'review_ready') {
            chrome.runtime.sendMessage({ type: MSG.GET_STATE }, response => {
              if (chrome.runtime.lastError || !response) return
              setData(prev => ({
                ...prev,
                steps: mergeSteps(prev.steps, (response.steps as LiveStep[]) ?? []),
                rawEventCount: (response.rawEventCount as number) ?? prev.rawEventCount,
              }))
            })
          }
          break
        }

        case MSG.LIVE_STEP_UPDATED: {
          const step = message.payload['step'] as LiveStep
          setData(prev => {
            // Reject steps from a different session. Step IDs are prefixed with
            // sessionId (e.g. "{sessionId}-step-1"), so a mismatch means the
            // message arrived from a stale or concurrent session.
            if (prev.meta && !step.stepId.startsWith(prev.meta.sessionId)) return prev
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
