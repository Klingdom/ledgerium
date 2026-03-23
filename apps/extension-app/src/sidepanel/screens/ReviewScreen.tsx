import React from 'react'
import type { SessionMeta, LiveStep } from '../../shared/types.js'
import { ControlBar } from '../components/ControlBar.js'

interface ReviewScreenProps {
  meta: SessionMeta | null
  steps: LiveStep[]
  uploadProgress: number | null
  uploadStatus: 'uploading' | 'complete' | 'failed' | null
  onDiscard: () => void
}

function UploadBar({ progress, status }: { progress: number | null; status: ReviewScreenProps['uploadStatus'] }) {
  if (!status) return null

  const pct = progress ?? 0

  const barColor =
    status === 'complete' ? 'bg-green-500' :
    status === 'failed' ? 'bg-red-500' :
    'bg-teal-500'

  const label =
    status === 'complete' ? 'Upload complete' :
    status === 'failed' ? 'Upload failed' :
    `Uploading… ${pct}%`

  return (
    <div className="px-4 py-3 border-b border-gray-800">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>{label}</span>
        {status === 'uploading' && <span>{pct}%</span>}
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${status === 'complete' ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}

function StepSummaryRow({ step, index }: { step: LiveStep; index: number }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-600 tabular-nums w-5 shrink-0 mt-0.5">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-snug">{step.title}</p>
        {step.pageLabel && (
          <p className="text-xs text-gray-500 mt-0.5">{step.pageLabel}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {step.eventCount > 0 && (
          <span className="text-xs text-gray-600">{step.eventCount} events</span>
        )}
      </div>
    </div>
  )
}

export function ReviewScreen({ meta, steps, uploadProgress, uploadStatus, onDiscard }: ReviewScreenProps) {
  const finalizedSteps = steps.filter(s => s.status === 'finalized')

  return (
    <div className="flex flex-col h-full">
      {/* Session summary header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <p className="text-xs text-teal-400 uppercase tracking-wider font-medium">Session complete</p>
        </div>
        {meta && (
          <p className="text-sm text-gray-100 font-medium">{meta.activityName}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {finalizedSteps.length} step{finalizedSteps.length !== 1 ? 's' : ''} captured
        </p>
      </div>

      {/* Upload progress */}
      <UploadBar progress={uploadProgress} status={uploadStatus} />

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-4">
        {finalizedSteps.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-600">
            No steps captured
          </div>
        ) : (
          finalizedSteps.map((step, i) => (
            <StepSummaryRow key={step.stepId} step={step} index={i} />
          ))
        )}
      </div>

      {/* Bottom controls */}
      <ControlBar
        onPrimary={onDiscard}
        primaryLabel="Done"
        primaryVariant="primary"
        onDiscard={uploadStatus !== 'uploading' ? onDiscard : undefined}
      />
    </div>
  )
}
