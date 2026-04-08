import React from 'react'
import type { StepDefinition, SOPStep } from '@ledgerium/process-engine'

interface SidebarStepDrawerProps {
  stepDef: StepDefinition
  sopStep: SOPStep | undefined
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">{title}</p>
      {children}
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'bg-teal-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 tabular-nums">{pct}%</span>
    </div>
  )
}

export function SidebarStepDrawer({ stepDef, sopStep, onClose }: SidebarStepDrawerProps) {
  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-l border-gray-800">
      {/* Header */}
      <div className="flex items-start gap-2 px-3 py-3 border-b border-gray-800 flex-none">
        <div
          className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: stepDef.categoryBg.replace('0.07', '0.15'),
            border: `1px solid ${stepDef.categoryColor}40`,
          }}
        >
          <span className="text-[10px] font-bold" style={{ color: stepDef.categoryColor }}>
            {stepDef.ordinal}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-100 leading-snug">{stepDef.title}</p>
          <span
            className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
            style={{
              color: stepDef.categoryColor,
              background: `${stepDef.categoryColor}18`,
            }}
          >
            {stepDef.categoryLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-400 text-lg leading-none shrink-0 mt-0.5"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* Operational Definition */}
        <Section title="Operational Definition">
          <p className="text-[11px] text-gray-400 leading-relaxed bg-gray-900/50 rounded-lg p-2.5 border border-gray-800/60">
            {stepDef.operationalDefinition}
          </p>
        </Section>

        {/* SOP: Procedure */}
        {sopStep && sopStep.detail.trim().length > 0 && (
          <Section title="Procedure">
            <div className="bg-gray-900/50 rounded-lg border border-gray-800/60 overflow-hidden">
              {sopStep.detail.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex gap-2 px-2.5 py-2 border-b border-gray-800/40 last:border-0">
                  <span className="text-[9px] font-bold text-gray-700 tabular-nums mt-0.5 shrink-0 w-3">{i + 1}</span>
                  <span className="text-[11px] text-gray-300 leading-snug">{line}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Inputs */}
        {stepDef.inputs.length > 0 && (
          <Section title="Inputs">
            <ul className="space-y-1">
              {stepDef.inputs.map((inp, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-teal-600 mt-0.5 shrink-0 text-[10px]">▸</span>
                  <span className="text-[11px] text-gray-400">{inp}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Expected Outcome */}
        {sopStep && (
          <Section title="Expected Outcome">
            <p className="text-[11px] text-gray-400">{sopStep.expectedOutcome}</p>
          </Section>
        )}

        {/* Systems */}
        {stepDef.systems.length > 0 && (
          <Section title="Systems Used">
            <div className="flex flex-wrap gap-1.5">
              {stepDef.systems.map(sys => (
                <span
                  key={sys}
                  className="text-[10px] text-gray-400 bg-gray-800/80 border border-gray-700 rounded px-2 py-0.5"
                >
                  {sys}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Metadata */}
        <Section title="Details">
          <div className="space-y-1.5">
            {[
              ['Duration', stepDef.durationLabel],
              ['Events', `${stepDef.eventCount}`],
              ['Grouping', stepDef.categoryLabel],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-[10px] text-gray-600">{label}</span>
                <span className="text-[10px] text-gray-400 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Confidence */}
        <Section title="Confidence">
          <ConfidenceBar value={stepDef.confidence} />
        </Section>

        {/* Warnings */}
        {sopStep && sopStep.warnings.length > 0 && (
          <Section title="Privacy Notes">
            {sopStep.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-amber-400/80 bg-amber-950/20 border border-amber-900/30 rounded px-2 py-1.5 leading-snug">
                {w}
              </p>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}
