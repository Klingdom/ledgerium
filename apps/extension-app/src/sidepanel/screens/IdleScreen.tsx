import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from '../hooks/useHistory.js'
import { STORAGE_KEY_SETTINGS } from '../../shared/constants.js'
import { MSG } from '../../shared/types.js'
import type { HistoryEntry, ExtensionSettings } from '../../shared/types.js'

interface IdleScreenProps {
  onStart: (activityName: string) => void
  onOpenHistory: (entry: HistoryEntry) => void
}

function formatRelativeDate(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function HistoryRow({
  entry,
  onOpen,
  onDelete,
}: {
  entry: HistoryEntry
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-800/60 cursor-pointer transition-colors border border-transparent hover:border-gray-700/50"
      onClick={onOpen}
    >
      {/* Recording indicator dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate leading-snug">
          {entry.activityName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-600">{formatRelativeDate(entry.startedAt)}</span>
          {entry.stepCount > 0 && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-600">
                {entry.stepCount} step{entry.stepCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
          {entry.eventCount > 0 && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-600">{entry.eventCount} events</span>
            </>
          )}
        </div>
      </div>

      {/* Delete — visible on hover */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
        title="Delete recording"
      >
        ✕
      </button>
    </div>
  )
}

function SyncSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [syncUrl, setSyncUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get([STORAGE_KEY_SETTINGS], result => {
      const s = result[STORAGE_KEY_SETTINGS] as ExtensionSettings | undefined
      if (s) {
        setSyncUrl(s.uploadUrl ?? '')
        setApiKey(s.apiKey ?? '')
      }
    })
  }, [])

  const handleSave = useCallback(() => {
    chrome.runtime.sendMessage({
      type: MSG.SETTINGS_UPDATED,
      payload: { uploadUrl: syncUrl.trim(), apiKey: apiKey.trim() },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [syncUrl, apiKey])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-center py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        ⚙ Sync Settings
      </button>
    )
  }

  return (
    <div className="px-4 py-3 border-t border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Sync Settings
        </p>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-gray-600 hover:text-gray-400"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
            Sync URL
          </label>
          <input
            type="url"
            value={syncUrl}
            onChange={e => setSyncUrl(e.target.value)}
            placeholder="https://your-app.com/api/sync"
            className="
              w-full rounded-md bg-gray-900 border border-gray-700
              text-xs text-gray-200 placeholder-gray-700
              px-2.5 py-2
              focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/40
            "
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="ldg_..."
            className="
              w-full rounded-md bg-gray-900 border border-gray-700
              text-xs text-gray-200 placeholder-gray-700 font-mono
              px-2.5 py-2
              focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/40
            "
          />
        </div>

        <button
          onClick={handleSave}
          className="
            w-full py-2 rounded-md text-xs font-medium
            bg-gray-800 hover:bg-gray-700 text-gray-300
            transition-colors
          "
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <p className="text-[10px] text-gray-700 leading-relaxed">
        Get your Sync URL and API Key from your Ledgerium web app account page.
        When configured, recordings sync automatically when you stop recording.
      </p>
    </div>
  )
}

export function IdleScreen({ onStart, onOpenHistory }: IdleScreenProps) {
  const [activityName, setActivityName] = useState('')
  const { entries, loading, deleteEntry } = useHistory()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = activityName.trim()
    if (!name) return
    onStart(name)
  }

  function handleDelete(entry: HistoryEntry) {
    if (!window.confirm(`Delete "${entry.activityName}"? This cannot be undone.`)) return
    deleteEntry(entry.sessionId)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── Form ──────────────────────────────────────────────────────── */}
      <div className="flex-none px-4 pt-5 pb-4">
        {/* Logo / Hero */}
        <div className="flex flex-col items-center mb-5 mt-1">
          <div className="w-10 h-10 rounded-xl bg-teal-900/60 border border-teal-800 flex items-center justify-center mb-2.5">
            <span className="text-teal-400 text-lg">⬡</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-100">Ledgerium AI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Process recorder</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="activity-name" className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Activity name
            </label>
            <input
              id="activity-name"
              type="text"
              value={activityName}
              onChange={e => setActivityName(e.target.value)}
              placeholder="e.g. Submit expense report"
              autoFocus
              className="
                w-full rounded-lg bg-gray-900 border border-gray-700
                text-sm text-gray-100 placeholder-gray-600
                px-3 py-2.5
                focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/40
                transition-colors
              "
            />
          </div>

          <button
            type="submit"
            disabled={!activityName.trim()}
            className="
              w-full py-2.5 rounded-lg font-medium text-sm
              bg-teal-700 hover:bg-teal-600
              text-white transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Start recording
          </button>
        </form>
      </div>

      {/* ─── Sync Settings ──────────────────────────────────────────────── */}
      <SyncSettings />

      {/* ─── Activity History ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col border-t border-gray-800">
        <div className="flex items-center justify-between px-4 py-2.5 flex-none">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Activity History
          </p>
          {entries.length > 0 && (
            <span className="text-xs text-gray-700 tabular-nums">{entries.length}</span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
          {loading && (
            <div className="flex items-center justify-center py-6 text-xs text-gray-700">
              Loading…
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-1">
              <p className="text-xs text-gray-600">No recordings yet</p>
              <p className="text-xs text-gray-700">Completed sessions will appear here</p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {entries.map(entry => (
                <HistoryRow
                  key={entry.sessionId}
                  entry={entry}
                  onOpen={() => onOpenHistory(entry)}
                  onDelete={() => handleDelete(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
