import React, { useEffect, useRef } from 'react'
import type { LiveStep } from '../../shared/types.js'

interface LiveStepFeedProps {
  steps: LiveStep[]
}

function StepIcon({ grouping }: { grouping: LiveStep['grouping'] }) {
  switch (grouping) {
    case 'fill_and_submit':
      return <span title="Form submission">📋</span>
    case 'click_then_navigate':
      return <span title="Navigation">→</span>
    case 'repeated_click_dedup':
      return <span title="Repeated action">↺</span>
    default:
      return <span title="Action">·</span>
  }
}

function ConfidencePip({ confidence }: { confidence: number }) {
  const pips = Math.round(confidence * 3) // 0–3 pips
  return (
    <div className="flex gap-0.5 items-center" title={`Confidence: ${Math.round(confidence * 100)}%`}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-1 h-1 rounded-full ${i < pips ? 'bg-teal-500' : 'bg-gray-700'}`}
        />
      ))}
    </div>
  )
}

function StepCard({ step }: { step: LiveStep }) {
  const isProvisional = step.status === 'provisional'

  return (
    <div
      className={`
        rounded-lg border px-3 py-2.5 text-sm transition-all
        ${isProvisional
          ? 'border-gray-700 bg-gray-900/50 opacity-70'
          : 'border-gray-700 bg-gray-900'
        }
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-gray-500 mt-0.5 text-xs">
          <StepIcon grouping={step.grouping} />
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium leading-snug truncate ${isProvisional ? 'text-gray-400' : 'text-gray-100'}`}>
            {step.title}
            {isProvisional && (
              <span className="ml-1.5 text-xs text-gray-600 font-normal">…</span>
            )}
          </p>
          {step.pageLabel && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{step.pageLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidencePip confidence={step.confidence} />
          {step.eventCount > 0 && (
            <span className="text-xs text-gray-600">{step.eventCount}</span>
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
      <div className="flex flex-col items-center justify-center py-8 text-gray-600 text-sm">
        <p>Waiting for activity…</p>
        <p className="text-xs mt-1">Interact with any tab to begin</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {steps.map(step => (
        <StepCard key={step.stepId} step={step} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
