import React, { useState } from 'react'

interface IdleScreenProps {
  onStart: (activityName: string) => void
}

export function IdleScreen({ onStart }: IdleScreenProps) {
  const [activityName, setActivityName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = activityName.trim()
    if (!name) return
    onStart(name)
  }

  return (
    <div className="flex flex-col h-full px-4 py-6">
      {/* Logo / Hero */}
      <div className="flex flex-col items-center mb-8 mt-2">
        <div className="w-12 h-12 rounded-xl bg-teal-900/60 border border-teal-800 flex items-center justify-center mb-3">
          <span className="text-teal-400 text-xl">⬡</span>
        </div>
        <h1 className="text-base font-semibold text-gray-100">Ledgerium AI</h1>
        <p className="text-xs text-gray-500 mt-0.5">Process recorder</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <p className="text-xs text-gray-600">
            Name the task you're about to perform
          </p>
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

      {/* Privacy notice */}
      <div className="mt-auto pt-6">
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 px-3 py-2.5 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-1">Privacy</p>
          <p>Input values and passwords are never captured. All data stays local until you upload.</p>
        </div>
      </div>
    </div>
  )
}
