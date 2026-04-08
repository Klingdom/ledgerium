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

export function ControlBar({
  onPrimary,
  primaryLabel,
  primaryVariant = 'primary',
  onSecondary,
  secondaryLabel,
  onDiscard,
  disabled = false,
}: ControlBarProps) {
  const primaryClass =
    primaryVariant === 'danger'
      ? 'btn-primary bg-red-600 hover:bg-red-700 active:bg-red-800'
      : primaryVariant === 'success'
        ? 'btn-primary bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
        : 'btn-primary'

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white">
      {onDiscard && (
        <button
          onClick={onDiscard}
          className="btn-danger text-xs"
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
            className="btn-secondary"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={onPrimary}
          disabled={disabled}
          className={primaryClass}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}
