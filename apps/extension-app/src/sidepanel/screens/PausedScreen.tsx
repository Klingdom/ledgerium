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
      {/* Activity label + paused notice */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-yellow-500 uppercase tracking-wider font-medium">Paused</p>
        </div>
        {meta && (
          <p className="text-sm text-gray-200 font-medium mt-0.5 truncate">{meta.activityName}</p>
        )}
        <p className="text-xs text-gray-600 mt-1">Capture is suspended. Resume to continue recording.</p>
      </div>

      {/* Steps feed (frozen) */}
      <div className="flex-1 overflow-y-auto opacity-60">
        <LiveStepFeed steps={steps} />
      </div>

      {/* Controls */}
      <ControlBar
        onPrimary={onResume}
        primaryLabel="Resume"
        primaryVariant="primary"
        onSecondary={onStop}
        secondaryLabel="Stop & review"
        onDiscard={onDiscard}
      />
    </div>
  )
}
