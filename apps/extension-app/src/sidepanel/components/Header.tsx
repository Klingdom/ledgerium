import React from 'react'
import type { RecorderState, SessionMeta } from '../../shared/types.js'
import { SessionTimer } from './SessionTimer.js'

interface HeaderProps {
  state: RecorderState
  meta: SessionMeta | null
}

const STATE_BADGE: Record<RecorderState, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-gray-700 text-gray-400' },
  arming: { label: 'Starting…', className: 'bg-yellow-900 text-yellow-400' },
  recording: { label: 'Recording', className: 'bg-red-900 text-red-400' },
  paused: { label: 'Paused', className: 'bg-yellow-900 text-yellow-400' },
  stopping: { label: 'Processing…', className: 'bg-blue-900 text-blue-400' },
  review_ready: { label: 'Ready', className: 'bg-teal-900 text-teal-400' },
  error: { label: 'Error', className: 'bg-red-900 text-red-400' },
}

export function Header({ state, meta }: HeaderProps) {
  const badge = STATE_BADGE[state]

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0d1117]">
      <div className="flex items-center gap-2">
        {/* Recording indicator dot */}
        {state === 'recording' && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
        <span className="text-sm font-semibold text-gray-100 tracking-wide">
          Ledgerium AI
        </span>
      </div>

      <div className="flex items-center gap-3">
        {(state === 'recording' || state === 'paused') && meta && (
          <SessionTimer startedAt={meta.startedAt} isPaused={state === 'paused'} />
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>
    </header>
  )
}
