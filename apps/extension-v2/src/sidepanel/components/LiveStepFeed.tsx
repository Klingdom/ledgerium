import React, { useEffect, useRef } from 'react'
import type { LiveStep } from '../../shared/types.js'

interface LiveStepFeedProps {
  steps: LiveStep[]
}

const GROUPING_COLORS: Record<string, string> = {
  click_then_navigate: 'border-l-teal-500',
  fill_and_submit: 'border-l-blue-500',
  repeated_click_dedup: 'border-l-amber-500',
  error_handling: 'border-l-red-500',
  data_entry: 'border-l-violet-500',
  send_action: 'border-l-emerald-500',
  annotation: 'border-l-purple-500',
}

const GROUPING_LABELS: Record<string, string> = {
  click_then_navigate: 'Navigation',
  fill_and_submit: 'Form',
  repeated_click_dedup: 'Repeated',
  single_action: 'Action',
  data_entry: 'Input',
  send_action: 'Submit',
  error_handling: 'Error',
  annotation: 'Note',
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5" title={`Confidence: ${pct}%`}>
      <div className="w-8 h-1 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StepCard({ step, index }: { step: LiveStep; index: number }) {
  const isProvisional = step.status === 'provisional'
  const borderColor = (step.grouping && GROUPING_COLORS[step.grouping]) ?? 'border-l-gray-300'
  const label = (step.grouping && GROUPING_LABELS[step.grouping]) ?? 'Action'

  return (
    <div
      className={`
        card border-l-[3px] ${borderColor} px-3 py-2.5 text-sm transition-all
        ${isProvisional ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-400 font-mono mt-0.5 w-4 text-right shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium leading-snug truncate ${isProvisional ? 'text-gray-500' : 'text-gray-900'}`}>
            {step.title}
            {isProvisional && (
              <span className="ml-1 text-xs text-gray-400 font-normal">...</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium text-gray-400 uppercase">{label}</span>
            {step.pageLabel && (
              <>
                <span className="text-gray-300">&middot;</span>
                <p className="text-[11px] text-gray-400 truncate">{step.pageLabel}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBar confidence={step.confidence} />
          {step.eventCount > 0 && (
            <span className="text-[10px] text-gray-400 tabular-nums">{step.eventCount}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function LiveStepFeed({ steps }: LiveStepFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps.length])

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <span className="recording-dot" />
        </div>
        <p className="text-sm text-gray-500">Waiting for activity...</p>
        <p className="text-xs text-gray-400">Interact with any tab to begin capturing</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {steps.map((step, i) => (
        <StepCard key={step.stepId} step={step} index={i} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
