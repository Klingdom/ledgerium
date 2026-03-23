import React from 'react'

interface ErrorScreenProps {
  error: string | null
  onDismiss: () => void
}

export function ErrorScreen({ error, onDismiss }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 gap-5">
      <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-800 flex items-center justify-center">
        <span className="text-red-400 text-xl">!</span>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-100">Something went wrong</p>
        {error && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-xs">{error}</p>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors border border-gray-700"
      >
        Dismiss
      </button>
    </div>
  )
}
