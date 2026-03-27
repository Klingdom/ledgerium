import React, { useState, useMemo } from 'react'
import { processSession } from '@ledgerium/process-engine'
import type { StepDefinition, SOPStep } from '@ledgerium/process-engine'
import { CATEGORY_CONFIG } from '@ledgerium/process-engine'
import type { SessionBundle, CanonicalEvent } from '../shared/types.js'
import { ProcessMapFlow } from './ProcessMapFlow.js'
import { StepDetailPanel } from './StepDetailPanel.js'

interface ProcessMapViewerProps {
  bundle: SessionBundle
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return ''
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const min = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`
}

export function ProcessMapViewer({ bundle }: ProcessMapViewerProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  // Run the deterministic process engine — pure, synchronous
  const output = useMemo(
    () => processSession(bundle as unknown as Parameters<typeof processSession>[0]),
    [bundle],
  )

  const { processRun, processDefinition, processMap, sop } = output

  // Resolve selected step details
  const selectedStepDef: StepDefinition | undefined = selectedStepId
    ? processDefinition.stepDefinitions.find(d => d.stepId === selectedStepId)
    : undefined

  const selectedSOPStep: SOPStep | undefined = selectedStepId
    ? sop.steps.find(s => s.stepId === selectedStepId)
    : undefined

  // Resolve raw events for evidence panel
  const eventById = useMemo(
    () => new Map((bundle.normalizedEvents as CanonicalEvent[]).map(e => [e.event_id, e])),
    [bundle],
  )
  const selectedEvents: CanonicalEvent[] = useMemo(() => {
    if (!selectedStepDef) return []
    const step = (bundle.derivedSteps as Array<{ step_id: string; source_event_ids: string[] }>)
      .find(s => s.step_id === selectedStepId)
    return step?.source_event_ids
      .map(id => eventById.get(id))
      .filter((e): e is CanonicalEvent => e !== undefined) ?? []
  }, [selectedStepDef, selectedStepId, eventById, bundle])

  const meta = bundle.sessionJson
  const duration = formatDuration(meta.startedAt, meta.endedAt)

  // Category breakdown for legend
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const step of processDefinition.stepDefinitions) {
      counts[step.category] = (counts[step.category] ?? 0) + 1
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 4)
  }, [processDefinition])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0e14', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px',
        height: 52, borderBottom: '1px solid #111827', background: '#0d1117', flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#2dd4bf' }}>L</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>{meta.activityName}</span>
        </div>

        <div style={{ width: 1, height: 20, background: '#1f2937' }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#4b5563' }}>{formatDate(meta.startedAt)} at {formatTime(meta.startedAt)}</span>
          {duration && <span style={{ fontSize: 11, color: '#4b5563' }}>{duration}</span>}
          <span style={{ fontSize: 11, color: '#2dd4bf', background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 5, padding: '2px 8px' }}>
            {processRun.stepCount} step{processRun.stepCount !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 11, color: '#374151' }}>{processRun.eventCount} events</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Category legend */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {categoryBreakdown.map(([reason, count]) => {
            const cat = CATEGORY_CONFIG[reason as keyof typeof CATEGORY_CONFIG]
            if (!cat) return null
            return (
              <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                <span style={{ fontSize: 10, color: '#4b5563' }}>
                  {cat.label} <span style={{ color: '#283041' }}>({count})</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Process map */}
        <div style={{
          flex: 1, overflow: 'hidden', transition: 'margin-right 0.25s ease',
          marginRight: selectedStepDef ? 400 : 0,
        }}>
          <ProcessMapFlow
            processMap={processMap}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
          />
        </div>

        {/* Detail panel */}
        {selectedStepDef && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 400,
            borderLeft: '1px solid #111827', background: '#0d1117', overflowY: 'auto', zIndex: 5,
          }}>
            <StepDetailPanel
              stepDef={selectedStepDef}
              sopStep={selectedSOPStep}
              events={selectedEvents}
              onClose={() => setSelectedStepId(null)}
            />
          </div>
        )}

        {/* Empty state */}
        {processMap.nodes.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>No steps derived</p>
            <p style={{ fontSize: 12, color: '#1f2937', margin: 0 }}>
              The session has {processRun.eventCount} events but produced no process steps.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
