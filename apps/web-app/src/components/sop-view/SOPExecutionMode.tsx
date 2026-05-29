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
import { WarningBlock } from '../shared/WarningBlock';
import { AutomationHintBlock } from '../shared/AutomationHintBlock';
import { SeverityPill } from '../shared/SeverityPill';
import { ImpactBadge } from '../shared/ImpactBadge';

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
              <div key={`m-${i}`} className="bg-surface-warning border border-border-warning rounded-xl px-4 py-3">
                <p className="text-ds-xs text-content-on-warning flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> {/* lint-color-tokens: ok — icon brand */}
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
          <div className="mt-2 bg-surface-info border border-border-info rounded-xl px-4 py-3 space-y-1.5">
            {viewModel.tips.map((tip, i) => (
              <p key={i} className="text-ds-xs text-content-on-info flex items-start gap-2">
                <Lightbulb className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> {/* lint-color-tokens: ok — icon brand */}
                {tip}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 8. Provenance */}
      <footer className="text-center pt-3 pb-2">
        <p className="text-[10px] text-[var(--content-tertiary)]">{viewModel.metadata.sourceNote}</p>
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
    <div className="bg-surface-success border border-border-success rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-success flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center"> {/* lint-color-tokens: ok — icon brand badge */}
            <CheckCircle2 className="h-3.5 w-3.5 text-white" /> {/* lint-color-tokens: ok — icon on brand badge */}
          </div>
          <span className="text-ds-xs font-semibold text-content-on-success">Quick Start</span>
        </div>
        {qs.estimatedTime && (
          <span className="flex items-center gap-1 text-[10px] text-content-on-success">
            <Clock className="h-3 w-3" />
            ~{qs.estimatedTime}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* What this does */}
        <div>
          <p className="text-[10px] font-semibold text-content-on-success uppercase tracking-wider mb-0.5">What This Does</p>
          <p className="text-ds-xs text-[var(--content-primary)] leading-relaxed">{viewModel.metadata.objective || viewModel.metadata.purpose}</p>
        </div>

        {/* When to use */}
        <div>
          <p className="text-[10px] font-semibold text-content-on-success uppercase tracking-wider mb-0.5">When To Use</p>
          <p className="text-ds-xs text-[var(--content-primary)]">{qs.whenToUseIt}</p>
        </div>

        {/* Prerequisites + Systems (side by side on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {qs.prerequisites.length > 0 && (
            <div className="bg-[var(--surface-elevated)]/60 rounded-lg px-3 py-2 border border-border-success">
              <p className="text-[9px] font-semibold text-content-on-success uppercase tracking-wider mb-1">Before You Begin</p>
              <ul className="space-y-0.5">
                {qs.prerequisites.map((p, i) => (
                  <li key={i} className="flex items-baseline gap-1.5 text-[10px] text-[var(--content-primary)]">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" /> {/* lint-color-tokens: ok — icon brand */}
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {qs.systemsNeeded.length > 0 && (
            <div className="bg-[var(--surface-elevated)]/60 rounded-lg px-3 py-2 border border-border-success">
              <p className="text-[9px] font-semibold text-content-on-success uppercase tracking-wider mb-1">Systems Needed</p>
              <div className="flex flex-wrap gap-1">
                {qs.systemsNeeded.map(sys => (
                  <span key={sys} className="flex items-center gap-1 text-[10px] font-medium text-content-on-accent-muted bg-surface-accent-muted rounded px-2 py-0.5">
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
          <div className="flex items-start gap-2 bg-surface-success rounded-lg px-3 py-2">
            <Target className="h-3.5 w-3.5 text-content-on-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[9px] font-semibold text-content-on-success uppercase tracking-wider">Expected Outcome</p>
              <p className="text-[10px] text-content-on-success mt-0.5">
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
          ? 'border-border-danger bg-surface-danger'
          : step.isDecisionPoint
            ? 'border-border-warning bg-surface-warning'
            : step.isErrorHandling
              ? 'border-border-danger bg-surface-danger'
              : 'border-[var(--border-default)] bg-[var(--surface-elevated)]'
      } ${isExpanded ? 'shadow-sm' : ''}`}
    >
      {/* ── Collapsed header ──────────────────────────────────────── */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors rounded-xl"
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
            <span className="text-ds-xs font-semibold text-[var(--content-primary)] truncate">{step.title}</span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ color: step.accentColor, background: `${step.accentColor}10` }}
            >
              {step.categoryLabel}
            </span>
            {step.isDecisionPoint && (
              <SeverityPill severity="medium" label="Decision" className="flex-shrink-0" />
            )}
            {step.isErrorHandling && (
              <SeverityPill severity="high" label="Error" className="flex-shrink-0" />
            )}
          </div>
          {/* Subtitle: action if different from title */}
          {step.action && step.action !== step.title && (
            <p className="text-[10px] text-[var(--content-secondary)] mt-0.5 truncate">{step.action}</p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {step.system && (
            <span className="text-[9px] font-medium text-[var(--content-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded px-1.5 py-0.5 hidden md:block">
              {step.system}
            </span>
          )}
          {step.durationLabel && (
            <span className="text-[10px] text-[var(--content-tertiary)] flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {step.durationLabel}
            </span>
          )}
          {/* Confidence dot */}
          <ConfidenceDot value={step.confidence} />
          {/* Friction indicator */}
          {step.hasHighFriction && <AlertTriangle className="h-3 w-3 text-red-400" />} {/* lint-color-tokens: ok — icon brand */}
          {/* Expand chevron */}
          <ChevronRight className={`h-3.5 w-3.5 text-[var(--content-tertiary)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────────────── */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-[52px] space-y-3 border-t border-[var(--border-subtle)] pt-3">
          {/* Instructions */}
          {step.detailText && (
            <div className="bg-[var(--surface-secondary)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
              {step.detailText.split('\n').filter(Boolean).map((line, i, arr) => {
                const isVerify = line.startsWith('✓');
                const isNote = line.startsWith('→');
                return (
                  <div
                    key={i}
                    className={`flex gap-2.5 px-3 py-2 text-[11px] ${i < arr.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''} ${
                      isVerify ? 'bg-surface-success' : isNote ? 'bg-[var(--surface-secondary)]' : ''
                    }`}
                  >
                    <span className={`flex-shrink-0 min-w-[14px] font-bold tabular-nums ${
                      isVerify ? 'text-content-on-success' : isNote ? 'text-[var(--content-tertiary)]' : 'text-[var(--content-tertiary)]'
                    }`}>
                      {line.match(/^\d+\./)?.[0] ?? (isVerify ? '✓' : isNote ? '→' : '')}
                    </span>
                    <span className={isVerify ? 'text-content-on-success font-medium' : isNote ? 'text-[var(--content-secondary)] italic' : 'text-[var(--content-primary)]'}>
                      {line.replace(/^\d+\.\s*/, '').replace(/^[✓→]\s*/, '')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline decision block */}
          {decision && (
            <div className="bg-surface-warning border border-border-warning rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch className="h-3.5 w-3.5 text-amber-500" /> {/* lint-color-tokens: ok — icon brand */}
                <span className="text-[10px] font-semibold text-content-on-warning">Decision</span>
              </div>
              <p className="text-ds-xs text-content-on-warning font-medium mb-2">{decision.question}</p>
              <div className="space-y-1">
                {decision.options.map((opt, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px]">
                    <span className="font-bold text-content-on-warning mt-px">If:</span>
                    <div>
                      <span className="text-content-on-warning">{opt.condition}</span>
                      <span className="text-content-on-warning mx-1.5">→</span>
                      <span className="text-content-on-warning font-medium">{opt.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected outcome */}
          {step.expectedOutcome && (
            <div className="flex items-start gap-2 text-[10px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> {/* lint-color-tokens: ok — icon brand */}
              <div>
                <span className="font-semibold text-content-on-success">Expected:</span>
                <span className="text-[var(--content-secondary)] ml-1">{step.expectedOutcome}</span>
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
                    f.severity === 'high' ? 'bg-surface-danger border-border-danger text-content-on-danger' :
                    f.severity === 'medium' ? 'bg-surface-warning border-border-warning text-content-on-warning' :
                    'bg-surface-info border-border-info text-content-on-info'
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
            <WarningBlock key={i} icon={<Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />}>
              {w}
            </WarningBlock>
          ))}

          {/* Automation hint */}
          {step.automationHint && (
            <AutomationHintBlock hint={step.automationHint} />
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
    <div className="bg-surface-warning border border-border-warning rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <GitBranch className="h-3.5 w-3.5 text-amber-500" /> {/* lint-color-tokens: ok — icon brand */}
        <span className="text-[10px] font-semibold text-content-on-warning">At Step {decision.stepOrdinal}</span>
      </div>
      <p className="text-ds-xs text-content-on-warning font-medium mb-2">{decision.question}</p>
      <div className="space-y-1">
        {decision.options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] text-content-on-warning">
            <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-400" /> {/* lint-color-tokens: ok — icon brand */}
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
    <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-surface-warning border border-border-warning flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {/* lint-color-tokens: ok — icon brand */}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ds-xs font-semibold text-[var(--content-primary)]">{issue.title}</p>
          <p className="text-[10px] text-[var(--content-secondary)] mt-0.5 leading-relaxed">{issue.description}</p>
          {issue.affectedStepOrdinals.length > 0 && (
            <p className="text-[9px] text-[var(--content-tertiary)] mt-1">
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
        allChecked ? 'bg-surface-success border-border-success' : 'bg-[var(--surface-elevated)] border-[var(--border-default)]'
      }`}>
        {allChecked && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border-success">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {/* lint-color-tokens: ok — icon brand */}
            <span className="text-ds-xs font-semibold text-content-on-success">All criteria met</span>
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
                    ? 'bg-emerald-500 border-emerald-500 text-white' // lint-color-tokens: ok — interactive brand checkbox
                    : 'border-[var(--border-default)] group-hover:border-[var(--border-default)]'
                }`}>
                  {checked.has(i) && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <span className={`text-ds-xs transition-colors ${
                  checked.has(i) ? 'text-[var(--content-secondary)] line-through' : 'text-[var(--content-primary)]'
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
    <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5">
      <p className="text-[9px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider">{label}</p>
      <p className="text-ds-lg font-bold text-[var(--content-primary)] mt-0.5">{value}</p>
      <p className="text-[9px] text-[var(--content-tertiary)] mt-0.5">{detail}</p>
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
          <div key={rec.id} className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                rec.type === 'automation' ? 'bg-surface-info border border-border-info' :
                rec.type === 'integration' ? 'bg-surface-info border border-border-info' :
                rec.type === 'simplification' ? 'bg-surface-info border border-border-info' :
                rec.type === 'quality' ? 'bg-surface-danger border border-border-danger' :
                'bg-surface-warning border border-border-warning'
              }`}>
                <Zap className={`h-3.5 w-3.5 ${
                  rec.type === 'automation' ? 'text-violet-500' : // lint-color-tokens: ok — icon brand
                  rec.type === 'integration' ? 'text-violet-500' : // lint-color-tokens: ok — icon brand
                  rec.type === 'simplification' ? 'text-violet-500' : // lint-color-tokens: ok — icon brand
                  rec.type === 'quality' ? 'text-red-500' : // lint-color-tokens: ok — icon brand
                  'text-amber-500' // lint-color-tokens: ok — icon brand
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-ds-xs font-semibold text-[var(--content-primary)]">{rec.title}</span>
                  <ImpactBadge
                    impact={rec.impact as 'high' | 'medium' | 'low'}
                    label={rec.impact}
                  />
                </div>
                <p className="text-[10px] text-[var(--content-secondary)] leading-relaxed">{rec.detail}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Insights */}
        {insights.slice(0, 4).map(insight => (
          <div
            key={insight.id}
            className={`rounded-xl px-4 py-3 border flex items-start gap-2 ${
              insight.severity === 'critical' ? 'bg-surface-danger border-border-danger' :
              insight.severity === 'warning' ? 'bg-surface-warning border-border-warning' :
              'bg-surface-info border-border-info'
            }`}
          >
            <Info className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
              insight.severity === 'critical' ? 'text-red-500' : // lint-color-tokens: ok — icon brand
              insight.severity === 'warning' ? 'text-amber-500' : // lint-color-tokens: ok — icon brand
              'text-blue-500' // lint-color-tokens: ok — icon brand
            }`} />
            <div>
              <p className={`text-ds-xs font-medium ${
                insight.severity === 'critical' ? 'text-content-on-danger' :
                insight.severity === 'warning' ? 'text-content-on-warning' :
                'text-content-on-info'
              }`}>{insight.label}</p>
              {insight.detail && insight.detail !== insight.label && (
                <p className="text-[10px] text-[var(--content-secondary)] mt-0.5">{insight.detail}</p>
              )}
            </div>
          </div>
        ))}

        {/* Placeholder when no AI insights */}
        {insights.length === 0 && recommendations.length === 0 && (
          <div className="text-center py-4">
            <Zap className="h-5 w-5 text-[var(--content-tertiary)] mx-auto mb-1.5" />
            <p className="text-[10px] text-[var(--content-tertiary)]">No intelligence signals detected for this procedure.</p>
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
      <Icon className="h-4 w-4 text-[var(--content-tertiary)]" />
      <span className="text-[10px] font-bold text-[var(--content-secondary)] uppercase tracking-wider">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] text-[var(--content-tertiary)]">{count}</span>
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
    <WarningBlock>
      {message}
    </WarningBlock>
  );
}
