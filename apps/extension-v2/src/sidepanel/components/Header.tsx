import React from 'react'
import type { RecorderState, SessionMeta } from '../../shared/types.js'
import { SessionTimer } from './SessionTimer.js'

interface HeaderProps {
  state: RecorderState
  meta: SessionMeta | null
}

const STATE_BADGE: Record<RecorderState, { label: string; className: string }> = {
  idle: { label: 'Ready', className: 'badge-gray' },
  arming: { label: 'Starting...', className: 'badge-amber' },
  recording: { label: 'Recording', className: 'badge-blue' },
  paused: { label: 'Paused', className: 'badge-amber' },
  stopping: { label: 'Processing...', className: 'badge-blue' },
  review_ready: { label: 'Complete', className: 'badge-green' },
  error: { label: 'Error', className: 'badge-red' },
}

export function Header({ state, meta }: HeaderProps) {
  const badge = STATE_BADGE[state]

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2.5">
        {state === 'recording' && <span className="recording-dot" />}
        <span className="text-base font-bold tracking-tight text-gray-900">
          Ledgerium <span className="text-blue-600">AI</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {(state === 'recording' || state === 'paused') && meta && (
          <SessionTimer startedAt={meta.startedAt} isPaused={state === 'paused'} />
        )}
        <span className={`badge ${badge.className}`}>
          {badge.label}
        </span>
      </div>
    </header>
  )
}
