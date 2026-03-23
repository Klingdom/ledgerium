import React from 'react'
import type { SessionMeta, LiveStep } from '../../shared/types.js'
import { LiveStepFeed } from '../components/LiveStepFeed.js'
import { ControlBar } from '../components/ControlBar.js'

interface RecordingScreenProps {
  meta: SessionMeta | null
  steps: LiveStep[]
  onPause: () => void
  onStop: () => void
  onDiscard: () => void
}

export function RecordingScreen({ meta, steps, onPause, onStop, onDiscard }: RecordingScreenProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Activity label */}
      {meta && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Recording</p>
          <p className="text-sm text-gray-200 font-medium mt-0.5 truncate">{meta.activityName}</p>
        </div>
      )}

      {/* Steps feed */}
      <div className="flex-1 overflow-y-auto">
        <LiveStepFeed steps={steps} />
      </div>

      {/* Controls */}
      <ControlBar
        onPrimary={onStop}
        primaryLabel="Stop & review"
        primaryVariant="danger"
        onSecondary={onPause}
        secondaryLabel="Pause"
        onDiscard={onDiscard}
      />
    </div>
  )
}
