import React from 'react'
import type { SessionMeta, LiveStep } from '../../shared/types.js'
import { LiveStepFeed } from '../components/LiveStepFeed.js'
import { ControlBar } from '../components/ControlBar.js'

interface PausedScreenProps {
  meta: SessionMeta | null
  steps: LiveStep[]
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
}

export function PausedScreen({ meta, steps, onResume, onStop, onDiscard }: PausedScreenProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <p className="text-xs text-amber-700 uppercase tracking-wider font-medium">Paused</p>
        </div>
        {meta && (
          <p className="text-sm text-gray-900 font-medium mt-1 truncate">{meta.activityName}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Capture is suspended. Resume to continue recording.</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 opacity-60">
        <LiveStepFeed steps={steps} />
      </div>

      <ControlBar
        onPrimary={onResume}
        primaryLabel="Resume"
        primaryVariant="primary"
        onSecondary={onStop}
        secondaryLabel="Stop & Review"
        onDiscard={onDiscard}
      />
    </div>
  )
}
