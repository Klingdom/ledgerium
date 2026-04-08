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
// yet known to the background's GET_STATE snapshot.  Both arrays must belong
// to the same session — if `prev` contains steps from a different session
// (stale closure after a session boundary), discard them entirely and return
// only `next`.
function mergeSteps(prev: LiveStep[], next: LiveStep[], sessionId?: string): LiveStep[] {
  // If we know the current session, drop any prev steps that don't belong to it.
  // Step IDs are formatted as `${sessionId}-step-${ordinal}`, so a prefix check
  // is sufficient.
  const safePrev = sessionId
    ? prev.filter(s => s.stepId.startsWith(sessionId))
    : prev

  const byId = new Map(next.map(s => [s.stepId, s]))
  const merged = safePrev.map(s => byId.get(s.stepId) ?? s)
  const existingIds = new Set(safePrev.map(s => s.stepId))
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
  // We capture the current sessionId so the poll callback can filter out stale
  // steps from a previous session (guards against React closure staleness).
  useEffect(() => {
    if (data.state !== 'recording') return
    const currentSessionId = data.meta?.sessionId
    const id = setInterval(() => {
      chrome.runtime.sendMessage({ type: MSG.GET_STATE }, response => {
        if (chrome.runtime.lastError) return
        if (!response) return
        setData(prev => {
          // If a SESSION_STATE_UPDATED has already moved us out of recording
          // (e.g. user pressed Discard while this poll was in flight), discard
          // the stale response entirely. Applying it would re-inject cleared
          // steps and flip state back to 'recording'.
          if (prev.state !== 'recording') return prev
          // Only refresh step/event data — state transitions are driven
          // exclusively by SESSION_STATE_UPDATED messages.
          return {
            ...prev,
            steps: mergeSteps(prev.steps, (response.steps as LiveStep[]) ?? [], currentSessionId),
            rawEventCount: (response.rawEventCount as number) ?? prev.rawEventCount,
          }
        })
      })
    }, 750)
    return () => clearInterval(id)
  }, [data.state, data.meta?.sessionId])

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
          const newMeta = message.payload['meta'] as SessionMeta | null
          setData(prev => {
            // A transition to idle or arming marks a session boundary. Wipe all
            // session-specific UI state so it never bleeds into the next session.
            const isSessionBoundary = newState === 'idle' || newState === 'arming'
            // Also clear when recording resumes with a different sessionId — this
            // handles the case where the sidepanel missed the arming message.
            const isNewSession =
              newState === 'recording' &&
              newMeta !== null &&
              newMeta.sessionId !== prev.meta?.sessionId
            return {
              ...prev,
              state: newState,
              meta: newMeta,
              error: (message.payload['error'] as string) ?? null,
              ...(isSessionBoundary || isNewSession ? {
                steps: [],
                rawEventCount: 0,
                uploadProgress: null,
                uploadStatus: null,
              } : {}),
            }
          })
          // Immediately pull steps on any state change that involves active data
          // (recording, stopping, review_ready). This eliminates the 750ms gap
          // before the polling interval fires.
          //
          // IMPORTANT: capture newMeta.sessionId here so the callback can filter
          // out stale steps from a previous session. Without this, the merge can
          // re-inject old steps into a freshly-cleared UI because the React state
          // update (steps: []) from the session boundary above hasn't committed
          // yet when this callback fires.
          if (newState === 'recording' || newState === 'stopping' || newState === 'review_ready') {
            const sid = newMeta?.sessionId
            chrome.runtime.sendMessage({ type: MSG.GET_STATE }, response => {
              if (chrome.runtime.lastError || !response) return
              setData(prev => {
                // Guard: if state moved away (e.g. user discarded during poll),
                // don't re-inject steps.
                if (prev.state === 'idle' || prev.state === 'arming') return prev
                return {
                  ...prev,
                  steps: mergeSteps(prev.steps, (response.steps as LiveStep[]) ?? [], sid ?? undefined),
                  rawEventCount: (response.rawEventCount as number) ?? prev.rawEventCount,
                }
              })
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
    // Eagerly clear previous session data so no stale steps are visible during
    // the arming → recording transition.  The background will also clear its
    // store via initSession(), but this prevents any UI flicker.
    setData(prev => ({
      ...prev,
      steps: [],
      rawEventCount: 0,
      uploadProgress: null,
      uploadStatus: null,
      error: null,
    }))
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
    // Optimistically clear UI state immediately so the user sees the reset
    // without waiting for the background's SESSION_STATE_UPDATED broadcast.
    // The background will also clear its data and send a confirmation, but
    // this eliminates any visible flash of stale steps.
    setData(prev => ({
      ...prev,
      state: 'idle',
      meta: null,
      steps: [],
      rawEventCount: 0,
      uploadProgress: null,
      uploadStatus: null,
      error: null,
    }))
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
