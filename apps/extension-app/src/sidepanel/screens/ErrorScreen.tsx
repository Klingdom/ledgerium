import React from 'react'

interface ErrorScreenProps {
  error: string | null
  onDismiss: () => void
}

export function ErrorScreen({ error, onDismiss }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 gap-5 bg-white">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
        <span className="text-red-500 text-xl font-bold">!</span>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">Something went wrong</p>
        {error && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-xs">{error}</p>
        )}
      </div>

      <button onClick={onDismiss} className="btn-secondary">
        Dismiss
      </button>
    </div>
  )
}
