'use client';

/**
 * Execution-First SOP — The default SOP mode for operators.
 *
 * Sections rendered in order:
 * 1. Quick Start (trigger, prerequisites, systems, expected outcome)
 * 2. Step-by-Step Execution (expandable step cards with progressive disclosure)
 * 3. Decision Points (inline + summary)
 * 4. Common Issues (issue/cause/fix cards)
 * 5. Completion Criteria (checklist)
 * 6. Variants Summary (if available)
 * 7. AI Insights (friction, bottlenecks, automation hints)
 * 8. Provenance footer
 */

import { useState } from 'react';
import {
  Clock, Layers, Monitor, Target, AlertTriangle, CheckCircle2,
  ChevronRight, Zap, GitBranch, Lightbulb, Shield, Info,
  ArrowRight, BarChart3,
} from 'lucide-react';
import type { SOPViewModel, SOPViewStep, SOPViewDecision, SOPViewInsight, SOPRecommendation } from './types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  viewModel: SOPViewModel;
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SOPExecutionMode({ viewModel, expandedSteps, onToggleStep }: Props) {
  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      {/* 1. Quick Start */}
      <QuickStartSection viewModel={viewModel} />

      {/* Quality advisory */}
      {viewModel.qualityAdvisory && (
        <AdvisoryBanner message={viewModel.qualityAdvisory} />
      )}

      {/* 2. Step-by-Step Execution */}
      <section>
        <SectionLabel icon={Layers} label="Procedure" count={viewModel.steps.length} />
        <div className="space-y-2 mt-2">
          {viewModel.steps.map(step => (
            <ExecutionStepCard
              key={step.id}
              step={step}
              isExpanded={expandedSteps.has(step.id)}
              onToggle={() => onToggleStep(step.id)}
              decision={viewModel.decisions.find(d => d.stepId === step.id)}
            />
          ))}
        </div>
      </section>

      {/* 3. Decision Points (summary — for quick reference) */}
      {viewModel.decisions.length > 0 && (
        <section>
          <SectionLabel icon={GitBranch} label="Decision Points" count={viewModel.decisions.length} />
          <div className="space-y-2 mt-2">
            {viewModel.decisions.map(d => (
              <DecisionSummaryCard key={d.stepId} decision={d} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Common Issues */}
      {(viewModel.issues.length > 0 || viewModel.commonMistakes.length > 0) && (
        <section>
          <SectionLabel icon={AlertTriangle} label="Common Issues" />
          <div className="space-y-2 mt-2">
            {viewModel.issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
            {viewModel.commonMistakes.map((mistake, i) => (
              <div key={`m-${i}`} className="bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-ds-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  {mistake}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Completion Criteria */}
      {viewModel.completionCriteria.length > 0 && (
        <CompletionSection criteria={viewModel.completionCriteria} />
      )}

      {/* 6. Variants Summary (if available) */}
      {viewModel.metadata.confidence !== null && (
        <VariantsSummarySection viewModel={viewModel} />
      )}

      {/* 7. AI Insights */}
      {(viewModel.insights.length > 0 || viewModel.recommendations.length > 0) && (
        <InsightsSection insights={viewModel.insights} recommendations={viewModel.recommendations} />
      )}

      {/* Tips */}
      {viewModel.tips.length > 0 && (
        <section>
          <SectionLabel icon={Lightbulb} label="Tips" />
          <div className="mt-2 bg-blue-50/50 border border-blue-200 rounded-xl px-4 py-3 space-y-1.5">
            {viewModel.tips.map((tip, i) => (
              <p key={i} className="text-ds-xs text-blue-800 flex items-start gap-2">
                <Lightbulb className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                {tip}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 8. Provenance */}
      <footer className="text-center pt-3 pb-2">
        <p className="text-[10px] text-gray-400">{viewModel.metadata.sourceNote}</p>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. QUICK START
// ═════════════════════════════════════════════════════════════════════════════

function QuickStartSection({ viewModel }: { viewModel: SOPViewModel }) {
  const qs = viewModel.quickStart;

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-ds-xs font-semibold text-emerald-900">Quick Start</span>
        </div>
        {qs.estimatedTime && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600">
            <Clock className="h-3 w-3" />
            ~{qs.estimatedTime}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* What this does */}
        <div>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">What This Does</p>
          <p className="text-ds-xs text-gray-800 leading-relaxed">{viewModel.metadata.objective || viewModel.metadata.purpose}</p>
        </div>

        {/* When to use */}
        <div>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">When To Use</p>
          <p className="text-ds-xs text-gray-700">{qs.whenToUseIt}</p>
        </div>

        {/* Prerequisites + Systems (side by side on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {qs.prerequisites.length > 0 && (
            <div className="bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
              <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Before You Begin</p>
              <ul className="space-y-0.5">
                {qs.prerequisites.map((p, i) => (
                  <li key={i} className="flex items-baseline gap-1.5 text-[10px] text-gray-700">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {qs.systemsNeeded.length > 0 && (
            <div className="bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
              <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Systems Needed</p>
              <div className="flex flex-wrap gap-1">
                {qs.systemsNeeded.map(sys => (
                  <span key={sys} className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100/80 rounded px-2 py-0.5">
                    <Monitor className="h-2.5 w-2.5" />
                    {sys}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expected outcome */}
        {viewModel.steps.length > 0 && viewModel.steps[viewModel.steps.length - 1]!.expectedOutcome && (
          <div className="flex items-start gap-2 bg-emerald-100/40 rounded-lg px-3 py-2">
            <Target className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">Expected Outcome</p>
              <p className="text-[10px] text-emerald-800 mt-0.5">
                {viewModel.steps[viewModel.steps.length - 1]!.expectedOutcome}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. EXECUTION STEP CARD
// ═════════════════════════════════════════════════════════════════════════════

function ExecutionStepCard({
  step,
  isExpanded,
  onToggle,
  decision,
}: {
  step: SOPViewStep;
  isExpanded: boolean;
  onToggle: () => void;
  decision?: SOPViewDecision | undefined;
}) {
  return (
    <div
      id={`sop-step-${step.id}`}
      className={`rounded-xl border transition-all ${
        step.hasHighFriction
          ? 'border-red-200 bg-red-50/20'
          : step.isDecisionPoint
            ? 'border-amber-200 bg-amber-50/10'
            : step.isErrorHandling
              ? 'border-red-200/50 bg-red-50/10'
              : 'border-gray-200 bg-white'
      } ${isExpanded ? 'shadow-sm' : ''}`}
    >
      {/* ── Collapsed header ──────────────────────────────────────── */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-50/30 transition-colors rounded-xl"
      >
        {/* Ordinal badge */}
        <span
          className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0"
          style={{ color: step.accentColor, background: `${step.accentColor}15`, border: `1px solid ${step.accentColor}25` }}
        >
          {step.ordinal}
        </span>

        {/* Title + tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-ds-xs font-semibold text-gray-900 truncate">{step.title}</span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ color: step.accentColor, background: `${step.accentColor}10` }}
            >
              {step.categoryLabel}
            </span>
            {step.isDecisionPoint && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-amber-700 bg-amber-50 border border-amber-200 flex-shrink-0">
                Decision
              </span>
            )}
            {step.isErrorHandling && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-red-700 bg-red-50 border border-red-200 flex-shrink-0">
                Error
              </span>
            )}
          </div>
          {/* Subtitle: action if different from title */}
          {step.action && step.action !== step.title && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{step.action}</p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {step.system && (
            <span className="text-[9px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 hidden md:block">
              {step.system}
            </span>
          )}
          {step.durationLabel && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {step.durationLabel}
            </span>
          )}
          {/* Confidence dot */}
          <ConfidenceDot value={step.confidence} />
          {/* Friction indicator */}
          {step.hasHighFriction && <AlertTriangle className="h-3 w-3 text-red-400" />}
          {/* Expand chevron */}
          <ChevronRight className={`h-3.5 w-3.5 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────────────── */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-[52px] space-y-3 border-t border-gray-100 pt-3">
          {/* Instructions */}
          {step.detailText && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {step.detailText.split('\n').filter(Boolean).map((line, i, arr) => {
                const isVerify = line.startsWith('✓');
                const isNote = line.startsWith('→');
                return (
                  <div
                    key={i}
                    className={`flex gap-2.5 px-3 py-2 text-[11px] ${i < arr.length - 1 ? 'border-b border-gray-100' : ''} ${
                      isVerify ? 'bg-emerald-50/50' : isNote ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    <span className={`flex-shrink-0 min-w-[14px] font-bold tabular-nums ${
                      isVerify ? 'text-emerald-600' : isNote ? 'text-gray-400' : 'text-gray-400'
                    }`}>
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

          {/* Inline decision block */}
          {decision && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] font-semibold text-amber-800">Decision</span>
              </div>
              <p className="text-ds-xs text-amber-900 font-medium mb-2">{decision.question}</p>
              <div className="space-y-1">
                {decision.options.map((opt, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px]">
                    <span className="font-bold text-amber-600 mt-px">If:</span>
                    <div>
                      <span className="text-amber-800">{opt.condition}</span>
                      <span className="text-amber-600 mx-1.5">→</span>
                      <span className="text-amber-700 font-medium">{opt.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected outcome */}
          {step.expectedOutcome && (
            <div className="flex items-start gap-2 text-[10px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-emerald-700">Expected:</span>
                <span className="text-gray-600 ml-1">{step.expectedOutcome}</span>
              </div>
            </div>
          )}

          {/* Friction indicators */}
          {step.frictionIndicators.length > 0 && (
            <div className="space-y-1">
              {step.frictionIndicators.map((f, i) => (
                <div
                  key={i}
                  className={`text-[10px] px-3 py-1.5 rounded-lg border flex items-start gap-2 ${
                    f.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                    f.severity === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {f.label}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {step.warnings.length > 0 && step.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Shield className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-amber-800">{w}</span>
            </div>
          ))}

          {/* Automation hint */}
          {step.automationHint && (
            <div className="flex items-start gap-2 text-[10px] bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <Zap className="h-3 w-3 text-violet-500 mt-0.5 flex-shrink-0" />
              <span className="text-violet-700">{step.automationHint}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. DECISION SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

function DecisionSummaryCard({ decision }: { decision: SOPViewDecision }) {
  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <GitBranch className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-[10px] font-semibold text-amber-800">At Step {decision.stepOrdinal}</span>
      </div>
      <p className="text-ds-xs text-amber-900 font-medium mb-2">{decision.question}</p>
      <div className="space-y-1">
        {decision.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] text-amber-700">
            <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-400" />
            <span><strong>{opt.condition}</strong> → {opt.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. COMMON ISSUES
// ═════════════════════════════════════════════════════════════════════════════

function IssueCard({ issue }: { issue: { title: string; description: string; affectedStepOrdinals: number[] } }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ds-xs font-semibold text-gray-800">{issue.title}</p>
          <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{issue.description}</p>
          {issue.affectedStepOrdinals.length > 0 && (
            <p className="text-[9px] text-gray-400 mt-1">
              Affects step{issue.affectedStepOrdinals.length !== 1 ? 's' : ''} {issue.affectedStepOrdinals.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. COMPLETION CRITERIA
// ═════════════════════════════════════════════════════════════════════════════

function CompletionSection({ criteria }: { criteria: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const allChecked = checked.size >= criteria.length;

  return (
    <section>
      <SectionLabel icon={CheckCircle2} label="Completion Checklist" />
      <div className={`mt-2 rounded-xl border px-5 py-4 transition-colors ${
        allChecked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'
      }`}>
        {allChecked && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-ds-xs font-semibold text-emerald-700">All criteria met</span>
          </div>
        )}
        <ul className="space-y-2">
          {criteria.map((c, i) => (
            <li key={i}>
              <button
                onClick={() => toggle(i)}
                role="checkbox"
                aria-checked={checked.has(i)}
                aria-label={c}
                type="button"
                className="flex items-start gap-2.5 text-left w-full group"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                  checked.has(i)
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-300 group-hover:border-gray-400'
                }`}>
                  {checked.has(i) && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <span className={`text-ds-xs transition-colors ${
                  checked.has(i) ? 'text-gray-500 line-through' : 'text-gray-800'
                }`}>
                  {c}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. VARIANTS SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

function VariantsSummarySection({ viewModel }: { viewModel: SOPViewModel }) {
  // Build a simple variants summary from available data
  const steps = viewModel.steps;
  const totalSteps = steps.length;
  const confAvg = viewModel.metadata.confidence;

  return (
    <section>
      <SectionLabel icon={BarChart3} label="Process Overview" />
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        <OverviewStat label="Steps" value={`${totalSteps}`} detail="in this procedure" />
        <OverviewStat label="Systems" value={`${viewModel.metadata.systems.length}`} detail={viewModel.metadata.systems.slice(0, 2).join(', ') || '—'} />
        <OverviewStat label="Confidence" value={confAvg !== null ? `${Math.round(confAvg * 100)}%` : '—'} detail={viewModel.metadata.confidenceLabel} />
        <OverviewStat label="Friction" value={`${viewModel.metadata.frictionCount}`} detail={viewModel.metadata.frictionCount === 0 ? 'None detected' : 'points detected'} />
      </div>
    </section>
  );
}

function OverviewStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-ds-lg font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-[9px] text-gray-400 mt-0.5">{detail}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. AI INSIGHTS
// ═════════════════════════════════════════════════════════════════════════════

function InsightsSection({
  insights,
  recommendations,
}: {
  insights: SOPViewInsight[];
  recommendations: SOPRecommendation[];
}) {
  if (insights.length === 0 && recommendations.length === 0) return null;

  return (
    <section>
      <SectionLabel icon={Zap} label="Intelligence" />
      <div className="mt-2 space-y-2">
        {/* Recommendations first (more actionable) */}
        {recommendations.map(rec => (
          <div key={rec.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                rec.type === 'automation' ? 'bg-violet-50 border border-violet-200' :
                rec.type === 'integration' ? 'bg-cyan-50 border border-cyan-200' :
                rec.type === 'simplification' ? 'bg-blue-50 border border-blue-200' :
                rec.type === 'quality' ? 'bg-red-50 border border-red-200' :
                'bg-amber-50 border border-amber-200'
              }`}>
                <Zap className={`h-3.5 w-3.5 ${
                  rec.type === 'automation' ? 'text-violet-500' :
                  rec.type === 'integration' ? 'text-cyan-500' :
                  rec.type === 'simplification' ? 'text-blue-500' :
                  rec.type === 'quality' ? 'text-red-500' :
                  'text-amber-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-ds-xs font-semibold text-gray-800">{rec.title}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                    rec.impact === 'high' ? 'text-red-600 bg-red-50' :
                    rec.impact === 'medium' ? 'text-amber-600 bg-amber-50' :
                    'text-gray-500 bg-gray-50'
                  }`}>{rec.impact}</span>
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">{rec.detail}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Insights */}
        {insights.slice(0, 4).map(insight => (
          <div
            key={insight.id}
            className={`rounded-xl px-4 py-3 border flex items-start gap-2 ${
              insight.severity === 'critical' ? 'bg-red-50/50 border-red-200' :
              insight.severity === 'warning' ? 'bg-amber-50/50 border-amber-200' :
              'bg-blue-50/50 border-blue-200'
            }`}
          >
            <Info className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
              insight.severity === 'critical' ? 'text-red-500' :
              insight.severity === 'warning' ? 'text-amber-500' :
              'text-blue-500'
            }`} />
            <div>
              <p className={`text-ds-xs font-medium ${
                insight.severity === 'critical' ? 'text-red-800' :
                insight.severity === 'warning' ? 'text-amber-800' :
                'text-blue-800'
              }`}>{insight.label}</p>
              {insight.detail && insight.detail !== insight.label && (
                <p className="text-[10px] text-gray-500 mt-0.5">{insight.detail}</p>
              )}
            </div>
          </div>
        ))}

        {/* Placeholder when no AI insights */}
        {insights.length === 0 && recommendations.length === 0 && (
          <div className="text-center py-4">
            <Zap className="h-5 w-5 text-gray-300 mx-auto mb-1.5" />
            <p className="text-[10px] text-gray-400">No intelligence signals detected for this procedure.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function SectionLabel({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] text-gray-400">{count}</span>
      )}
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

function AdvisoryBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="text-ds-xs text-amber-800">{message}</p>
    </div>
  );
}
