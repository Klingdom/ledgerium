import React from 'react'

interface ControlBarProps {
  onPrimary: () => void
  primaryLabel: string
  primaryVariant?: 'danger' | 'primary' | 'success'
  onSecondary?: () => void
  secondaryLabel?: string
  onDiscard?: () => void
  disabled?: boolean
}

const VARIANT_CLASSES = {
  danger: 'bg-red-700 hover:bg-red-600 text-white',
  primary: 'bg-teal-700 hover:bg-teal-600 text-white',
  success: 'bg-green-700 hover:bg-green-600 text-white',
}

export function ControlBar({
  onPrimary,
  primaryLabel,
  primaryVariant = 'primary',
  onSecondary,
  secondaryLabel,
  onDiscard,
  disabled = false,
}: ControlBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-[#0d1117]">
      {onDiscard && (
        <button
          onClick={onDiscard}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded"
          title="Discard session"
        >
          Discard
        </button>
      )}
      <div className="flex-1 flex gap-2 justify-end">
        {onSecondary && secondaryLabel && (
          <button
            onClick={onSecondary}
            disabled={disabled}
            className="text-sm px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-100 transition-colors disabled:opacity-40"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={onPrimary}
          disabled={disabled}
          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 ${VARIANT_CLASSES[primaryVariant]}`}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}
