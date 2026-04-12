'use client';

/**
 * AI-Augmented SOP — Intelligence-rich process surface.
 *
 * Sections:
 * 1. Smart Header (confidence, dynamic summary, ask input)
 * 2. Dynamic Summary Card (key signals at a glance)
 * 3. Smart Steps (with optimization/anomaly/skip markers)
 * 4. Real vs Expected (step analysis)
 * 5. Intelligence Layer (quality cards)
 * 6. Optimization Suggestions (recommendations)
 * 7. Workflow DNA (structural fingerprint)
 * 8. Ask This Process (scaffolded conversation panel)
 */

import { useState } from 'react';
import {
  Brain, Zap, Target, AlertTriangle, TrendingUp, Activity,
  Clock, Layers, Monitor, GitBranch, CheckCircle2, XCircle,
  Repeat, ArrowRight, Shield, BarChart3, MessageSquare,
  Sparkles, ChevronRight, Send, Info,
} from 'lucide-react';
import type { SOPViewModel, SOPViewStep, SOPRecommendation, SOPViewInsight } from './types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  viewModel: SOPViewModel;
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SOPIntelligenceMode({ viewModel, expandedSteps, onToggleStep }: Props) {
  return (
    <div className="space-y-5">
      {/* Main content + side panel layout */}
      <div className="flex gap-5">
        {/* Left: main intelligence content */}
        <div className="flex-1 min-w-0 space-y-5 p-5 max-w-3xl">
          {/* 1. Smart Header */}
          <SmartHeader viewModel={viewModel} />

          {/* 2. Dynamic Summary */}
          <DynamicSummaryCard viewModel={viewModel} />

          {/* 3. Smart Steps */}
          <section>
            <SectionLabel icon={Brain} label="Smart Steps" count={viewModel.steps.length} />
            <div className="space-y-2 mt-2">
              {viewModel.steps.map(step => (
                <SmartStepCard
                  key={step.id}
                  step={step}
                  isExpanded={expandedSteps.has(step.id)}
                  onToggle={() => onToggleStep(step.id)}
                />
              ))}
            </div>
          </section>

          {/* 4. Real vs Expected */}
          <RealVsExpectedSection viewModel={viewModel} />

          {/* 5. Intelligence Layer */}
          <IntelligenceLayerSection viewModel={viewModel} />

          {/* 6. Optimization Suggestions */}
          {viewModel.recommendations.length > 0 && (
            <OptimizationSection recommendations={viewModel.recommendations} />
          )}

          {/* 7. Workflow DNA */}
          <WorkflowDNASection viewModel={viewModel} />

          {/* Provenance */}
          <footer className="text-center pt-2 pb-2">
            <p className="text-[10px] text-gray-400">{viewModel.metadata.sourceNote}</p>
          </footer>
        </div>

        {/* Right: Ask panel (sticky, desktop only) */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <AskThisProcessPanel viewModel={viewModel} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. SMART HEADER
// ═════════════════════════════════════════════════════════════════════════════

function SmartHeader({ viewModel }: { viewModel: SOPViewModel }) {
  const m = viewModel.metadata;
  const s = viewModel.smartSummary;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl px-6 py-5 text-white overflow-hidden relative">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative">
        {/* Top row: badge + confidence */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">AI Intelligence</span>
          </div>
          {m.confidence !== null && (
            <div className="flex items-center gap-1.5" aria-label={`Confidence: ${Math.round(m.confidence * 100)}%`} role="status">
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-violet-300 transition-all" style={{ width: `${Math.round(m.confidence * 100)}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-violet-200">{Math.round(m.confidence * 100)}%</span>
            </div>
          )}
        </div>

        {/* Summary text */}
        <p className="text-[13px] font-medium text-white/90 leading-relaxed mb-1">{s.oneLiner}</p>
        <p className="text-[10px] text-white/60">{s.statsSentence}</p>

        {/* Primary insight chip */}
        <div className="mt-3 flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
          <Sparkles className="h-3.5 w-3.5 text-violet-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-[10px] text-white/80 leading-relaxed">{s.primaryInsight}</p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. DYNAMIC SUMMARY CARD
// ═════════════════════════════════════════════════════════════════════════════

function DynamicSummaryCard({ viewModel }: { viewModel: SOPViewModel }) {
  const m = viewModel.metadata;
  const steps = viewModel.steps;
  const frictionSteps = steps.filter(s => s.hasHighFriction);
  const decisionSteps = steps.filter(s => s.isDecisionPoint);
  const errorSteps = steps.filter(s => s.isErrorHandling);
  const autoSteps = steps.filter(s => s.automationHint);

  const signals = [
    { icon: Clock, label: 'Duration', value: m.estimatedTime || '—', color: '#64748b' },
    { icon: AlertTriangle, label: 'Failure Risk', value: frictionSteps.length > 0 ? `Step ${frictionSteps[0]!.ordinal}` : 'Low', color: frictionSteps.length > 0 ? '#dc2626' : '#059669' },
    { icon: GitBranch, label: 'Decisions', value: `${decisionSteps.length}`, color: '#d97706' },
    { icon: Zap, label: 'Automation', value: `${autoSteps.length} candidates`, color: '#7c3aed' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {signals.map(sig => {
        const Icon = sig.icon;
        return (
          <div key={sig.label} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 group hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3 w-3" style={{ color: sig.color }} />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{sig.label}</span>
            </div>
            <p className="text-ds-sm font-bold text-gray-900">{sig.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. SMART STEPS
// ═════════════════════════════════════════════════════════════════════════════

function SmartStepCard({
  step,
  isExpanded,
  onToggle,
}: {
  step: SOPViewStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Determine step "intelligence markers"
  const markers: Array<{ label: string; color: string; bg: string }> = [];
  if (step.hasHighFriction) markers.push({ label: 'Bottleneck', color: '#dc2626', bg: '#fef2f2' });
  if (step.isErrorHandling) markers.push({ label: 'Recovery', color: '#ea580c', bg: '#fff7ed' });
  if (step.isDecisionPoint) markers.push({ label: 'Decision', color: '#d97706', bg: '#fffbeb' });
  if (step.automationHint) markers.push({ label: 'Automatable', color: '#7c3aed', bg: '#f5f3ff' });
  if (step.isLowConfidence) markers.push({ label: 'Review', color: '#0284c7', bg: '#f0f9ff' });

  return (
    <div
      id={`sop-step-${step.id}`}
      className={`rounded-xl border transition-all ${
        step.hasHighFriction ? 'border-red-200 bg-red-50/10' :
        step.automationHint ? 'border-violet-200 bg-violet-50/10' :
        'border-gray-200 bg-white'
      } ${isExpanded ? 'shadow-sm' : ''}`}
    >
      {/* Header */}
      <button onClick={onToggle} aria-expanded={isExpanded} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50/30 transition-colors rounded-xl">
        <span
          className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0"
          style={{ color: step.accentColor, background: `${step.accentColor}15`, border: `1px solid ${step.accentColor}25` }}
        >
          {step.ordinal}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-ds-xs font-semibold text-gray-900 truncate">{step.title}</span>
            {markers.map(m => (
              <span key={m.label} className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0" style={{ color: m.color, background: m.bg }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {step.system && <span className="text-[9px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 hidden md:block">{step.system}</span>}
          {step.durationLabel && <span className="text-[10px] text-gray-400">{step.durationLabel}</span>}
          <ConfidenceBar value={step.confidence} />
          <ChevronRight className={`h-3.5 w-3.5 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-[52px] space-y-3 border-t border-gray-100 pt-3">
          {/* Instructions */}
          {step.detailText && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {step.detailText.split('\n').filter(Boolean).map((line, i, arr) => {
                const isVerify = line.startsWith('✓');
                const isNote = line.startsWith('→');
                return (
                  <div key={i} className={`flex gap-2.5 px-3 py-2 text-[11px] ${i < arr.length - 1 ? 'border-b border-gray-100' : ''} ${isVerify ? 'bg-emerald-50/50' : ''}`}>
                    <span className={`flex-shrink-0 min-w-[14px] font-bold ${isVerify ? 'text-emerald-600' : isNote ? 'text-gray-400' : 'text-gray-400 tabular-nums'}`}>
                      {line.match(/^\d+\./)?.[0] ?? (isVerify ? '✓' : isNote ? '→' : '')}
                    </span>
                    <span className={isVerify ? 'text-emerald-700 font-medium' : isNote ? 'text-gray-500 italic' : 'text-gray-700'}>
                      {line.replace(/^\d+\.\s*/, '').replace(/^[✓→]\s*/, '')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Intelligence annotations */}
          {step.automationHint && (
            <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <Zap className="h-3 w-3 text-violet-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-violet-600 uppercase tracking-wider">Automation Opportunity</span>
                <p className="text-[10px] text-violet-700 mt-0.5">{step.automationHint}</p>
              </div>
            </div>
          )}

          {step.frictionIndicators.length > 0 && step.frictionIndicators.map((f, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 border ${
              f.severity === 'high' ? 'bg-red-50 border-red-200' : f.severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <AlertTriangle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                f.severity === 'high' ? 'text-red-500' : f.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
              }`} />
              <p className={`text-[10px] ${f.severity === 'high' ? 'text-red-700' : f.severity === 'medium' ? 'text-amber-700' : 'text-blue-700'}`}>{f.label}</p>
            </div>
          ))}

          {step.expectedOutcome && (
            <div className="flex items-start gap-2 text-[10px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600"><strong className="text-emerald-700">Expected:</strong> {step.expectedOutcome}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. REAL VS EXPECTED
// ═════════════════════════════════════════════════════════════════════════════

function RealVsExpectedSection({ viewModel }: { viewModel: SOPViewModel }) {
  const steps = viewModel.steps;
  const totalSteps = steps.length;
  const errorSteps = steps.filter(s => s.isErrorHandling);
  const decisionSteps = steps.filter(s => s.isDecisionPoint);
  const lowConfSteps = steps.filter(s => s.isLowConfidence);

  const rows = [
    { label: 'Total Steps', expected: `${totalSteps}`, actual: `${totalSteps}`, status: 'match' as const },
    { label: 'Error Recovery', expected: '0', actual: `${errorSteps.length}`, status: errorSteps.length > 0 ? 'deviation' as const : 'match' as const },
    { label: 'Decision Points', expected: `${decisionSteps.length}`, actual: `${decisionSteps.length}`, status: 'match' as const },
    { label: 'Low Confidence', expected: '0', actual: `${lowConfSteps.length}`, status: lowConfSteps.length > 0 ? 'warning' as const : 'match' as const },
    { label: 'Friction Points', expected: '0', actual: `${viewModel.metadata.frictionCount}`, status: viewModel.metadata.frictionCount > 0 ? 'deviation' as const : 'match' as const },
  ];

  return (
    <section>
      <SectionLabel icon={BarChart3} label="Real vs Expected" />
      <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 gap-0 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
          <span>Metric</span>
          <span className="text-center">Expected</span>
          <span className="text-center">Actual</span>
          <span className="text-right">Status</span>
        </div>
        {rows.map(row => (
          <div key={row.label} className="grid grid-cols-4 gap-0 px-4 py-2 border-b border-gray-50 last:border-b-0 items-center">
            <span className="text-ds-xs text-gray-700">{row.label}</span>
            <span className="text-[10px] text-gray-500 text-center">{row.expected}</span>
            <span className="text-[10px] font-semibold text-gray-800 text-center">{row.actual}</span>
            <div className="flex justify-end">
              {row.status === 'match' && <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">OK</span>}
              {row.status === 'deviation' && <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">DEVIATION</span>}
              {row.status === 'warning' && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">REVIEW</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. INTELLIGENCE LAYER
// ═════════════════════════════════════════════════════════════════════════════

function IntelligenceLayerSection({ viewModel }: { viewModel: SOPViewModel }) {
  const m = viewModel.metadata;
  const steps = viewModel.steps;
  const frictionSteps = steps.filter(s => s.frictionIndicators.length > 0);
  const autoSteps = steps.filter(s => s.automationHint);

  // Compute scores
  const clarityScore = m.confidence !== null ? Math.round(m.confidence * 100) : null;
  const automationReadiness = steps.length > 0 ? Math.round((autoSteps.length / steps.length) * 100) : 0;
  const frictionRatio = steps.length > 0 ? Math.round((frictionSteps.length / steps.length) * 100) : 0;

  const cards = [
    {
      label: 'SOP Clarity',
      value: clarityScore !== null ? `${clarityScore}%` : '—',
      detail: clarityScore !== null ? (clarityScore >= 85 ? 'Well-defined steps' : clarityScore >= 70 ? 'Mostly clear' : 'Needs review') : 'Not scored',
      color: clarityScore !== null ? (clarityScore >= 85 ? '#059669' : clarityScore >= 70 ? '#2563eb' : '#d97706') : '#64748b',
      icon: Target,
    },
    {
      label: 'Automation Ready',
      value: `${automationReadiness}%`,
      detail: `${autoSteps.length} of ${steps.length} steps automatable`,
      color: automationReadiness >= 50 ? '#7c3aed' : automationReadiness >= 25 ? '#2563eb' : '#64748b',
      icon: Zap,
    },
    {
      label: 'Friction Level',
      value: `${frictionRatio}%`,
      detail: `${frictionSteps.length} steps with friction`,
      color: frictionRatio >= 30 ? '#dc2626' : frictionRatio >= 10 ? '#d97706' : '#059669',
      icon: AlertTriangle,
    },
    {
      label: 'Consistency',
      value: m.errorStepCount === 0 ? 'Clean' : `${m.errorStepCount} errors`,
      detail: m.errorStepCount === 0 ? 'No error handling needed' : 'Error recovery present',
      color: m.errorStepCount === 0 ? '#059669' : '#d97706',
      icon: Shield,
    },
  ];

  return (
    <section>
      <SectionLabel icon={Activity} label="Intelligence Layer" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${card.color}12` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                </div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-ds-lg font-bold text-gray-900">{card.value}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{card.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. OPTIMIZATION SUGGESTIONS
// ═════════════════════════════════════════════════════════════════════════════

function OptimizationSection({ recommendations }: { recommendations: SOPRecommendation[] }) {
  const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    automation: { icon: Zap, color: '#7c3aed', bg: '#f5f3ff' },
    integration: { icon: ArrowRight, color: '#0891b2', bg: '#ecfeff' },
    simplification: { icon: TrendingUp, color: '#2563eb', bg: '#eff6ff' },
    training: { icon: Brain, color: '#d97706', bg: '#fffbeb' },
    quality: { icon: Shield, color: '#dc2626', bg: '#fef2f2' },
  };

  return (
    <section>
      <SectionLabel icon={TrendingUp} label="Optimization Suggestions" count={recommendations.length} />
      <div className="space-y-2 mt-2">
        {recommendations.map(rec => {
          const config = TYPE_CONFIG[rec.type] ?? TYPE_CONFIG['quality']!;
          const Icon = config.icon;
          return (
            <div key={rec.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: config.bg }}>
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-ds-xs font-semibold text-gray-800">{rec.title}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                      rec.impact === 'high' ? 'text-red-600 bg-red-50' :
                      rec.impact === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50'
                    }`}>{rec.impact} impact</span>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-relaxed">{rec.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. WORKFLOW DNA
// ═════════════════════════════════════════════════════════════════════════════

function WorkflowDNASection({ viewModel }: { viewModel: SOPViewModel }) {
  const m = viewModel.metadata;
  const dna = viewModel.workflowDNA;
  const autoSteps = viewModel.steps.filter(s => s.automationHint);

  const traits = [
    { label: 'Steps', value: `${dna.totalSteps}`, detail: 'in procedure' },
    { label: 'Systems', value: `${dna.systemCount}`, detail: m.systems.slice(0, 2).join(', ') || '—' },
    { label: 'Handoffs', value: `${dna.phaseBreaks.length}`, detail: 'cross-system' },
    { label: 'Decisions', value: `${viewModel.decisions.length}`, detail: 'branch points' },
    { label: 'Friction', value: `${m.frictionCount}`, detail: 'points detected' },
    { label: 'Auto-Ready', value: `${autoSteps.length}`, detail: 'steps automatable' },
  ];

  return (
    <section>
      <SectionLabel icon={Activity} label="Workflow DNA" />
      <div className="mt-2 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl px-5 py-4">
        {/* DNA strand visualization */}
        <div className="flex items-center gap-0.5 mb-4 overflow-x-auto pb-1">
          {dna.stepDots.map((dot, i) => {
            const isBreak = dna.phaseBreaks.includes(dot.ordinal);
            return (
              <div key={dot.ordinal} className="flex items-center flex-shrink-0">
                {isBreak && i > 0 && <div className="w-1 h-3 bg-gray-300 mx-0.5 rounded-full" />}
                <div
                  className="w-2.5 h-2.5 rounded-full transition-transform hover:scale-150"
                  style={{ background: dot.color, border: dot.isDecision ? '1.5px solid #d97706' : dot.isError ? '1.5px solid #dc2626' : 'none' }}
                  title={`Step ${dot.ordinal}`}
                />
              </div>
            );
          })}
        </div>

        {/* Trait grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {traits.map(t => (
            <div key={t.label} className="text-center">
              <p className="text-ds-sm font-bold text-gray-900">{t.value}</p>
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">{t.label}</p>
              <p className="text-[8px] text-gray-400">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. ASK THIS PROCESS PANEL
// ═════════════════════════════════════════════════════════════════════════════

function AskThisProcessPanel({ viewModel }: { viewModel: SOPViewModel }) {
  const [query, setQuery] = useState('');

  const suggestedPrompts = [
    'Why is this step here?',
    'What can be automated?',
    'What is the fastest path?',
    'Where do users get stuck?',
    'How can this be simplified?',
    'What are the biggest risks?',
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
            <MessageSquare className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div>
            <span className="text-ds-xs font-semibold text-gray-900">Ask This Process</span>
            <span className="text-[8px] font-medium text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded ml-2">Beta</span>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask about this procedure..."
            className="flex-1 bg-transparent text-ds-xs text-gray-700 placeholder-gray-400 outline-none min-w-0"
            disabled
            aria-disabled="true"
            aria-label="AI conversation input — coming soon"
          />
          <button disabled aria-disabled="true" aria-label="Send question" className="p-1 rounded text-gray-300 cursor-not-allowed">
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-1.5" id="ask-panel-hint">AI conversation coming soon. Try these prompts:</p>
      </div>

      {/* Suggested prompts */}
      <div className="px-4 py-3 space-y-1" role="list" aria-label="Suggested questions">
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            disabled
            aria-disabled="true"
            role="listitem"
            className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 bg-gray-50/50 border border-gray-100 transition-colors cursor-not-allowed"
          >
            <Sparkles className="h-3 w-3 text-violet-300 flex-shrink-0" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Context summary */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[9px] text-gray-400">
          <strong className="text-gray-500">Context:</strong> {viewModel.metadata.stepCount} steps · {viewModel.metadata.systems.length} system{viewModel.metadata.systems.length !== 1 ? 's' : ''} · {viewModel.insights.length} insight{viewModel.insights.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? '#059669' : pct >= 70 ? '#2563eb' : '#d97706';
  return (
    <div className="flex items-center gap-1 flex-shrink-0" title={`${pct}% confidence`} aria-label={`Confidence: ${pct}%`}>
      <div className="w-8 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] font-semibold tabular-nums" style={{ color }}>{pct}</span>
    </div>
  );
}
