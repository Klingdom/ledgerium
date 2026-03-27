import React from 'react'
import type { StepDefinition, SOPStep } from '@ledgerium/process-engine'
import { eventTypeLabel } from '@ledgerium/process-engine'
import type { CanonicalEvent } from '../shared/types.js'

interface StepDetailPanelProps {
  stepDef: StepDefinition
  sopStep: SOPStep | undefined
  events: CanonicalEvent[]
  onClose: () => void
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? '#2dd4bf' : pct >= 70 ? '#60a5fa' : '#fb923c'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#4b5563', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function formatWallTime(wallTime: string): string {
  try {
    return new Date(wallTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  } catch {
    return wallTime
  }
}

function EventRow({ event }: { event: CanonicalEvent }) {
  const isSensitive = event.target_summary?.isSensitive === true
  const label = event.target_summary?.label
  const role = event.target_summary?.role
  const page = event.page_context?.routeTemplate ?? event.page_context?.url
  const targetDesc = label ?? role ?? page ?? null

  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #111827' }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0,
        background: event.actor_type === 'human' ? '#2dd4bf' : event.actor_type === 'system' ? '#fb923c' : '#c084fc',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#e5e7eb' }}>
            {eventTypeLabel(event.event_type)}
            {isSensitive && (
              <span style={{ marginLeft: 6, fontSize: 9, color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>
                REDACTED
              </span>
            )}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: '#374151' }}>{formatWallTime(event.t_wall)}</span>
        </div>
        {targetDesc && (
          <p style={{ margin: 0, fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {targetDesc}
          </p>
        )}
      </div>
    </div>
  )
}

export function StepDetailPanel({ stepDef, sopStep, events, onClose }: StepDetailPanelProps) {
  return (
    <div style={{ padding: '16px 20px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: stepDef.categoryBg.replace('0.07', '0.15'),
          border: `1px solid ${stepDef.categoryColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: stepDef.categoryColor }}>{stepDef.ordinal}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f3f4f6', lineHeight: 1.3 }}>{stepDef.title}</p>
          <span style={{
            display: 'inline-block', marginTop: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            color: stepDef.categoryColor, background: `${stepDef.categoryColor}18`,
            borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em',
          }}>
            {stepDef.categoryLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 18, lineHeight: 1, padding: 2, flexShrink: 0 }}
          title="Close"
        >×</button>
      </div>

      {/* Operational Definition */}
      <Section title="Operational Definition">
        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.6, padding: '10px 12px', background: '#111827', borderRadius: 8, border: '1px solid #1f2937' }}>
          {stepDef.operationalDefinition}
        </p>
      </Section>

      {/* Procedure */}
      {sopStep && sopStep.detail.trim().length > 0 && (
        <Section title="Procedure">
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden' }}>
            {sopStep.detail.split('\n').filter(Boolean).map((line, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: i < arr.length - 1 ? '1px solid #1a2030' : 'none' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', minWidth: 16, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <span style={{ fontSize: 11, color: '#d1d5db' }}>{line}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Expected Outcome */}
      {sopStep && (
        <Section title="Expected Outcome">
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{sopStep.expectedOutcome}</p>
        </Section>
      )}

      {/* Details */}
      <Section title="Details">
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px' }}>
          <MetaRow label="Duration" value={stepDef.durationLabel} />
          <MetaRow label="Events" value={`${stepDef.eventCount} (${events.filter(e => e.actor_type === 'human').length} user)`} />
          <MetaRow label="Grouping" value={stepDef.categoryLabel} />
          {stepDef.systems.length > 0 && <MetaRow label="Systems" value={stepDef.systems.join(', ')} />}
          {stepDef.domains.length > 0 && <MetaRow label="Domain" value={stepDef.domains.join(', ')} />}
        </div>
      </Section>

      {/* Confidence */}
      <Section title="Confidence Score">
        <ConfidenceBar value={stepDef.confidence} />
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#4b5563', lineHeight: 1.5 }}>
          Pattern: <span style={{ color: '#6b7280' }}>{stepDef.categoryLabel.toLowerCase()}</span>
        </p>
      </Section>

      {/* Warnings */}
      {sopStep && sopStep.warnings.length > 0 && (
        <Section title="Privacy Notes">
          {sopStep.warnings.map((w, i) => (
            <p key={i} style={{ margin: '0 0 6px', fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>{w}</p>
          ))}
        </Section>
      )}

      {/* Evidence */}
      {events.length > 0 && (
        <Section title="Evidence Events">
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: '0 10px', maxHeight: 240, overflowY: 'auto' }}>
            {events.map(event => <EventRow key={event.event_id} event={event} />)}
          </div>
        </Section>
      )}
    </div>
  )
}
