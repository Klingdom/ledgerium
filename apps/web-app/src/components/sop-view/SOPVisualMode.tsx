'use client';

/**
 * Visual Process SOP — Structural, analytical view for managers and analysts.
 *
 * Sections:
 * 1. Overview Header (purpose, owner, systems, frequency)
 * 2. Process Flow Map (linear dot-sequence with phase breaks, decisions, bottlenecks)
 * 3. Phases / Stages (grouped step cards)
 * 4. Detailed Step Cards (within phases)
 * 5. Variants (if available)
 * 6. Bottlenecks (high-friction steps)
 * 7. Automation Opportunities (recommendations)
 */

import {
  Monitor, Clock, Users, Layers, AlertTriangle, Zap, ChevronRight,
  GitBranch, Target, CheckCircle2, ArrowRight, Activity, TrendingUp,
  Play, Square, Shield,
} from 'lucide-react';
import type { SOPViewModel, SOPViewStep, SOPViewPhase, SOPWorkflowDNA, SOPRecommendation } from './types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  viewModel: SOPViewModel;
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SOPVisualMode({ viewModel, expandedSteps, onToggleStep }: Props) {
  const bottleneckSteps = viewModel.steps.filter(s => s.hasHighFriction || s.frictionIndicators.length > 0);
  const automationRecs = viewModel.recommendations.filter(r => r.type === 'automation' || r.type === 'integration' || r.type === 'simplification');

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">
      {/* 1. Overview Header */}
      <OverviewHeader viewModel={viewModel} />

      {/* 2. Process Flow Map */}
      <ProcessFlowMap dna={viewModel.workflowDNA} phases={viewModel.phases} steps={viewModel.steps} />

      {/* 3+4. Phases with Detailed Steps */}
      <section>
        <SectionLabel icon={Layers} label="Process Phases" count={viewModel.phases.length} />
        <div className="space-y-3 mt-3">
          {viewModel.phases.map(phase => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              steps={viewModel.steps.filter(s => s.phaseId === phase.id)}
              expandedSteps={expandedSteps}
              onToggleStep={onToggleStep}
            />
          ))}
        </div>
      </section>

      {/* 5. Variants */}
      {viewModel.metadata.confidence !== null && (
        <VariantsSection viewModel={viewModel} />
      )}

      {/* 6. Bottlenecks */}
      {bottleneckSteps.length > 0 && (
        <BottlenecksSection steps={bottleneckSteps} />
      )}

      {/* 7. Automation Opportunities */}
      {automationRecs.length > 0 && (
        <AutomationSection recommendations={automationRecs} />
      )}

      {/* Roles */}
      {viewModel.enterprise.rolesAndResponsibilities.length > 0 && (
        <RolesSection roles={viewModel.enterprise.rolesAndResponsibilities} />
      )}

      {/* Provenance */}
      <footer className="text-center pt-2 pb-2">
        <p className="text-[10px] text-gray-400">{viewModel.metadata.sourceNote}</p>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. OVERVIEW HEADER
// ═════════════════════════════════════════════════════════════════════════════

function OverviewHeader({ viewModel }: { viewModel: SOPViewModel }) {
  const m = viewModel.metadata;
  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-gray-200 rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Process Overview</p>
          <p className="text-ds-sm text-gray-700 leading-relaxed">{m.objective || m.purpose}</p>
        </div>
        {m.confidence !== null && (
          <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 flex-shrink-0">
            {Math.round(m.confidence * 100)}% confidence
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3 text-gray-400" />
          <strong className="text-gray-700">{m.stepCount}</strong> steps
        </span>
        {m.estimatedTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            ~{m.estimatedTime}
          </span>
        )}
        {m.systems.length > 0 && (
          <span className="flex items-center gap-1">
            <Monitor className="h-3 w-3 text-gray-400" />
            {m.systems.join(', ')}
          </span>
        )}
        {m.roles.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-gray-400" />
            {m.roles.join(', ')}
          </span>
        )}
        {m.frictionCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {m.frictionCount} friction point{m.frictionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. PROCESS FLOW MAP — lightweight linear flow visualization
// ═════════════════════════════════════════════════════════════════════════════

function ProcessFlowMap({
  dna,
  phases,
  steps,
}: {
  dna: SOPWorkflowDNA;
  phases: SOPViewPhase[];
  steps: SOPViewStep[];
}) {
  if (dna.totalSteps === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Process Flow</span>
        </div>
        <span className="text-[10px] text-gray-400">
          {dna.totalSteps} steps · {dna.systemCount} system{dna.systemCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="px-5 py-4">
        {/* Flow strip: Start → [step dots grouped by phase] → End */}
        {/* Gradient fade hints for horizontal scroll on narrow screens */}
        <div className="relative">
        <div
          className="flex items-center gap-0 overflow-x-auto pb-2 scroll-smooth"
          role="img"
          aria-label={`Process flow: ${dna.totalSteps} steps across ${dna.systemCount} systems`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
        >
          {/* Start marker */}
          <div className="flex items-center gap-1 flex-shrink-0 mr-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Play className="h-3 w-3 text-white" fill="white" />
            </div>
          </div>

          {/* Step dots with phase break markers */}
          {dna.stepDots.map((dot, i) => {
            const isPhaseBreak = dna.phaseBreaks.includes(dot.ordinal);
            const step = steps.find(s => s.ordinal === dot.ordinal);
            const hasFriction = step?.hasHighFriction || (step?.frictionIndicators.length ?? 0) > 0;

            return (
              <div key={dot.ordinal} className="flex items-center flex-shrink-0">
                {/* Phase break divider */}
                {isPhaseBreak && i > 0 && (
                  <div className="flex flex-col items-center mx-1.5">
                    <div className="w-px h-2 bg-gray-300" />
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <div className="w-px h-2 bg-gray-300" />
                  </div>
                )}

                {/* Connector line */}
                {!isPhaseBreak && i > 0 && (
                  <div className="w-3 h-px bg-gray-200 flex-shrink-0" />
                )}

                {/* Step dot */}
                <div
                  className="relative group cursor-default"
                  title={step ? `Step ${dot.ordinal}: ${step.shortTitle}` : `Step ${dot.ordinal}`}
                >
                  {dot.isDecision ? (
                    // Diamond for decisions
                    <div
                      className="w-4 h-4 rotate-45 rounded-sm border-2"
                      style={{ borderColor: '#d97706', background: '#fffbeb' }}
                    />
                  ) : dot.isError ? (
                    // Red circle for errors
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: '#dc2626', background: '#fef2f2' }}
                    />
                  ) : (
                    // Standard dot
                    <div
                      className="w-4 h-4 rounded-full transition-transform group-hover:scale-125"
                      style={{ background: dot.color }}
                    />
                  )}

                  {/* Friction ring indicator */}
                  {hasFriction && (
                    <div className="absolute -inset-1 rounded-full border border-red-300 animate-pulse" />
                  )}

                  {/* Step number tooltip on hover */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {dot.ordinal}
                  </div>
                </div>
              </div>
            );
          })}

          {/* End marker */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <div className="w-3 h-px bg-gray-200" />
            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
              <Square className="h-2.5 w-2.5 text-white" fill="white" />
            </div>
          </div>
        </div>
        {/* Scroll hint for many steps */}
        {dna.totalSteps > 12 && (
          <p className="text-[8px] text-gray-400 text-right mt-0.5">Scroll to see all steps →</p>
        )}
        </div>

        {/* Phase labels below the flow */}
        {phases.length > 1 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            {phases.map(phase => (
              <div key={phase.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                <span className="text-[9px] font-medium text-gray-600">{phase.label}</span>
                <span className="text-[9px] text-gray-400">({phase.stepCount})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3+4. PHASE SECTION with detailed step cards
// ═════════════════════════════════════════════════════════════════════════════

function PhaseSection({
  phase,
  steps,
  expandedSteps,
  onToggleStep,
}: {
  phase: SOPViewPhase;
  steps: SOPViewStep[];
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* Phase header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-100"
        style={{ background: `${phase.color}08` }}
      >
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: phase.color }} />
        <div className="flex-1">
          <span className="text-ds-xs font-semibold text-gray-900">{phase.label}</span>
          <span className="text-[10px] text-gray-400 ml-2">{phase.stepCount} step{phase.stepCount !== 1 ? 's' : ''}</span>
        </div>
        {phase.hasFriction && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            Friction
          </span>
        )}
      </div>

      {/* Steps in this phase */}
      <div className="divide-y divide-gray-50">
        {steps.map(step => (
          <VisualStepCard
            key={step.id}
            step={step}
            isExpanded={expandedSteps.has(step.id)}
            onToggle={() => onToggleStep(step.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VisualStepCard({
  step,
  isExpanded,
  onToggle,
}: {
  step: SOPViewStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div id={`sop-step-${step.id}`}>
      {/* Header row */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors"
      >
        <span
          className="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0"
          style={{ color: step.accentColor, background: `${step.accentColor}12`, border: `1px solid ${step.accentColor}25` }}
        >
          {step.ordinal}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-ds-xs font-medium text-gray-800 truncate">{step.title}</span>
            {step.isDecisionPoint && (
              <GitBranch className="h-3 w-3 text-amber-500 flex-shrink-0" />
            )}
            {step.hasHighFriction && (
              <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {step.system && (
            <span className="text-[9px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 hidden sm:block">
              {step.system}
            </span>
          )}
          {step.durationLabel && (
            <span className="text-[10px] text-gray-400">{step.durationLabel}</span>
          )}
          <ConfidenceDot value={step.confidence} />
          <ChevronRight className={`h-3.5 w-3.5 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-3 pl-[52px] space-y-2">
          {/* Action description */}
          {step.action && step.action !== step.title && (
            <p className="text-[11px] text-gray-600">{step.action}</p>
          )}

          {/* Instruction detail */}
          {step.detailText && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {step.detailText.split('\n').filter(Boolean).slice(0, 6).map((line, i, arr) => (
                <div
                  key={i}
                  className={`flex gap-2 px-3 py-1.5 text-[10px] ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <span className={`flex-shrink-0 min-w-[12px] font-bold ${
                    line.startsWith('✓') ? 'text-emerald-600' : line.startsWith('→') ? 'text-gray-400' : 'text-gray-400 tabular-nums'
                  }`}>
                    {line.match(/^\d+\./)?.[0] ?? (line.startsWith('✓') ? '✓' : line.startsWith('→') ? '→' : '')}
                  </span>
                  <span className={line.startsWith('✓') ? 'text-emerald-700' : line.startsWith('→') ? 'text-gray-500 italic' : 'text-gray-700'}>
                    {line.replace(/^\d+\.\s*/, '').replace(/^[✓→]\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Expected outcome */}
          {step.expectedOutcome && (
            <div className="flex items-start gap-2 text-[10px]">
              <Target className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{step.expectedOutcome}</span>
            </div>
          )}

          {/* Decision */}
          {step.isDecisionPoint && step.decisionLabel && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-800">
              <strong>Decision:</strong> {step.decisionLabel}
            </div>
          )}

          {/* Friction */}
          {step.frictionIndicators.length > 0 && (
            <div className="space-y-1">
              {step.frictionIndicators.map((f, i) => (
                <div key={i} className={`text-[10px] px-3 py-1.5 rounded-lg border flex items-start gap-1.5 ${
                  f.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                  f.severity === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {f.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. VARIANTS
// ═════════════════════════════════════════════════════════════════════════════

function VariantsSection({ viewModel }: { viewModel: SOPViewModel }) {
  return (
    <section>
      <SectionLabel icon={GitBranch} label="Process Metrics" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
        <MetricCard label="Steps" value={`${viewModel.metadata.stepCount}`} detail={viewModel.metadata.isComplete ? 'Complete path' : 'Partial path'} />
        <MetricCard label="Systems" value={`${viewModel.metadata.systems.length}`} detail={viewModel.metadata.systems.slice(0, 2).join(', ') || 'Single system'} />
        <MetricCard
          label="Confidence"
          value={viewModel.metadata.confidence !== null ? `${Math.round(viewModel.metadata.confidence * 100)}%` : '—'}
          detail={viewModel.metadata.confidenceLabel}
        />
        <MetricCard
          label="Friction"
          value={`${viewModel.metadata.frictionCount}`}
          detail={viewModel.metadata.frictionCount === 0 ? 'No issues' : `${viewModel.metadata.frictionCount} detected`}
        />
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-ds-lg font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-[9px] text-gray-400 mt-0.5">{detail}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. BOTTLENECKS
// ═════════════════════════════════════════════════════════════════════════════

function BottlenecksSection({ steps }: { steps: SOPViewStep[] }) {
  return (
    <section>
      <SectionLabel icon={AlertTriangle} label="Bottlenecks & Friction" count={steps.length} />
      <div className="space-y-2 mt-2">
        {steps.map(step => (
          <div key={step.id} className="bg-white border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-red-600">{step.ordinal}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ds-xs font-semibold text-gray-800">{step.title}</p>
              {step.system && (
                <span className="text-[9px] text-gray-500">{step.system}</span>
              )}
              <div className="mt-1.5 space-y-1">
                {step.frictionIndicators.map((f, i) => (
                  <p key={i} className={`text-[10px] ${
                    f.severity === 'high' ? 'text-red-700' : f.severity === 'medium' ? 'text-amber-700' : 'text-blue-700'
                  }`}>
                    {f.label}
                  </p>
                ))}
              </div>
            </div>
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
              step.hasHighFriction ? 'text-red-600 bg-red-50 border border-red-200' : 'text-amber-600 bg-amber-50 border border-amber-200'
            }`}>
              {step.hasHighFriction ? 'High' : 'Medium'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. AUTOMATION OPPORTUNITIES
// ═════════════════════════════════════════════════════════════════════════════

function AutomationSection({ recommendations }: { recommendations: SOPRecommendation[] }) {
  const TYPE_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    automation: { icon: Zap, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
    integration: { icon: ArrowRight, color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
    simplification: { icon: TrendingUp, color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  };

  return (
    <section>
      <SectionLabel icon={Zap} label="Automation Opportunities" count={recommendations.length} />
      <div className="space-y-2 mt-2">
        {recommendations.map(rec => {
          const style = TYPE_STYLES[rec.type] ?? TYPE_STYLES['automation']!;
          const Icon = style.icon;
          return (
            <div key={rec.id} className="bg-white border rounded-xl px-4 py-3 flex items-start gap-3" style={{ borderColor: style.border }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: style.bg }}
              >
                <Icon className="h-4 w-4" style={{ color: style.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-ds-xs font-semibold text-gray-800">{rec.title}</p>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                    rec.impact === 'high' ? 'text-red-600 bg-red-50' :
                    rec.impact === 'medium' ? 'text-amber-600 bg-amber-50' :
                    'text-gray-500 bg-gray-50'
                  }`}>{rec.impact}</span>
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">{rec.detail}</p>
                {rec.affectedStepOrdinals.length > 0 && (
                  <p className="text-[9px] text-gray-400 mt-1">
                    Affects step{rec.affectedStepOrdinals.length !== 1 ? 's' : ''} {rec.affectedStepOrdinals.join(', ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROLES SECTION
// ═════════════════════════════════════════════════════════════════════════════

function RolesSection({ roles }: { roles: Array<{ role: string; responsibility: string }> }) {
  return (
    <section>
      <SectionLabel icon={Users} label="Roles & Responsibilities" />
      <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {roles.map((r, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
            <span className="text-ds-xs font-semibold text-gray-800 min-w-[140px] flex-shrink-0">{r.role}</span>
            <span className="text-[10px] text-gray-600">{r.responsibility}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function SectionLabel({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      {count !== undefined && <span className="text-[10px] text-gray-400">{count}</span>}
    </div>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const color = value >= 0.85 ? '#059669' : value >= 0.7 ? '#2563eb' : '#d97706';
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
      title={`${Math.round(value * 100)}% confidence`}
      aria-label={`Confidence: ${Math.round(value * 100)}%`}
    />
  );
}
