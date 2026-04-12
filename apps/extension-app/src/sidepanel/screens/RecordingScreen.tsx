import React from 'react'
import type { SessionMeta, LiveStep } from '../../shared/types.js'
import { LiveStepFeed } from '../components/LiveStepFeed.js'
import { ControlBar } from '../components/ControlBar.js'

interface RecordingScreenProps {
  meta: SessionMeta | null
  steps: LiveStep[]
  rawEventCount: number
  onPause: () => void
  onStop: () => void
  onDiscard: () => void
}

export function RecordingScreen({ meta, steps, rawEventCount, onPause, onStop, onDiscard }: RecordingScreenProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Activity label + event counter */}
      {meta && (
        <div className="px-4 pt-3 pb-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="recording-dot" />
              <p className="text-xs text-blue-700 uppercase tracking-wider font-medium">Recording Active</p>
            </div>
            {rawEventCount > 0 && (
              <p className="text-xs text-blue-600 tabular-nums font-medium">{rawEventCount} events</p>
            )}
          </div>
          <p className="text-sm text-gray-900 font-medium mt-1 truncate">{meta.activityName}</p>
        </div>
      )}

      {/* Steps feed */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <LiveStepFeed steps={steps} />
      </div>

      {/* Controls */}
      <ControlBar
        onPrimary={onStop}
        primaryLabel="Stop & Review"
        primaryVariant="primary"
        onSecondary={onPause}
        secondaryLabel="Pause"
        onDiscard={onDiscard}
      />
    </div>
  )
}
