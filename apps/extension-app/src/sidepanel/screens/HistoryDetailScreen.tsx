import React, { useEffect, useState, useCallback } from 'react'
import { MSG } from '../../shared/types.js'
import type { SessionBundle } from '../../shared/types.js'

interface HistoryDetailScreenProps {
  sessionId: string
  activityName: string
  onBack: () => void
  onDeleted: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return ''
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`
}

export function HistoryDetailScreen({ sessionId, activityName, onBack, onDeleted }: HistoryDetailScreenProps) {
  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    chrome.runtime.sendMessage({ type: MSG.GET_BUNDLE, payload: { sessionId } }, response => {
      if (chrome.runtime.lastError) {
        setError('Failed to load recording.')
        setLoading(false)
        return
      }
      if (!response) {
        setError('Recording not found.')
        setLoading(false)
        return
      }
      setBundle(response as SessionBundle)
      setLoading(false)
    })
  }, [sessionId])

  const handleDownload = useCallback(() => {
    if (!bundle) return
    const filename = `ledgerium-${sessionId}.json`
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [bundle, sessionId])

  const handleDelete = useCallback(() => {
    if (!window.confirm(`Delete "${activityName}"? This cannot be undone.`)) return
    chrome.runtime.sendMessage(
      { type: MSG.DELETE_HISTORY_ENTRY, payload: { sessionId } },
      () => {
        if (!chrome.runtime.lastError) onDeleted()
      },
    )
  }, [sessionId, activityName, onDeleted])

  const meta = bundle?.sessionJson

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-[#0d1117] flex-none">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 -ml-1 rounded"
          title="Back to history"
        >
          ←
        </button>
        <p className="text-sm font-medium text-gray-100 truncate flex-1">{activityName}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center flex-1 text-sm text-gray-600">
          Loading…
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300">
            ← Back
          </button>
        </div>
      )}

      {!loading && !error && bundle && meta && (
        <>
          {/* Metadata */}
          <div className="px-4 py-3 border-b border-gray-800 flex-none">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>{formatDate(meta.startedAt)} · {formatTime(meta.startedAt)}</span>
              {meta.endedAt && <span>{formatDuration(meta.startedAt, meta.endedAt)}</span>}
              <span>{bundle.derivedSteps.length} step{bundle.derivedSteps.length !== 1 ? 's' : ''}</span>
              <span>{bundle.normalizedEvents.length} events</span>
            </div>
          </div>

          {/* Steps summary */}
          {bundle.derivedSteps.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-800 flex-none">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1.5">Steps</p>
              <div className="flex flex-col gap-1">
                {bundle.derivedSteps.map((step, i) => (
                  <div key={step.step_id} className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-700 tabular-nums w-4 shrink-0">{i + 1}</span>
                    <span className="text-xs text-gray-300 leading-snug">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 px-4 py-2.5 border-b border-gray-800 flex-none">
            <button
              onClick={handleDownload}
              className="flex-1 text-xs text-teal-400 border border-teal-800 rounded-md py-1.5 hover:bg-teal-950 transition-colors"
            >
              Download JSON
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-red-500 border border-red-900 rounded-md px-3 py-1.5 hover:bg-red-950 transition-colors"
            >
              Delete
            </button>
          </div>

          {/* JSON viewer */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-2">
              Session JSON
            </p>
            <pre className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap break-all bg-gray-900/60 border border-gray-800 rounded-lg p-3">
              {JSON.stringify(bundle, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
