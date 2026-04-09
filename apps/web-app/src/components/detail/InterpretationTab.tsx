'use client';

import { Brain, ChevronRight, AlertTriangle, RotateCcw, Gauge, Lightbulb } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Decision {
  stepOrdinal: number;
  stepTitle: string;
  decisionType: string;
  confidence: string;
  evidence: string;
}

interface Rework {
  type: string;
  description: string;
  stepOrdinals: number[];
  occurrences: number;
  severity: string;
  evidence: string;
}

interface Friction {
  type: string;
  description: string;
  severity: string;
  stepOrdinals: number[];
  evidence: string;
}

interface Phase {
  ordinal: number;
  name: string;
  system: string;
  stepRange: [number, number];
  stepCount: number;
  dominantAction: string;
}

interface Insight {
  category: string;
  severity: string;
  title: string;
  description: string;
  evidence: string;
  stepOrdinals?: number[];
}

interface Scores {
  complexity: number;
  friction: number;
  linearity: number;
  manualIntensity: number;
}

interface WorkflowInterpretation {
  summary: string;
  processType: string;
  processTypeConfidence: string;
  decisions: Decision[];
  rework: Rework[];
  friction: Friction[];
  phases: Phase[];
  insights: Insight[];
  scores: Scores;
  stepCount: number;
  systemCount: number;
  systems: string[];
  durationMs: number | null;
  computedAt: string;
}

interface Props {
  interpretation: WorkflowInterpretation | null | undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PROCESS_TYPE_LABELS: Record<string, string> = {
  transaction: 'Transaction',
  approval: 'Approval',
  coordination: 'Coordination',
  review: 'Review',
  exception_handling: 'Exception Handling',
  data_collection: 'Data Collection',
  research: 'Research',
  general: 'General',
};

function scoreColor(score: number, invert = false): string {
  if (invert) {
    if (score > 60) return 'text-emerald-600';
    if (score >= 30) return 'text-amber-600';
    return 'text-red-600';
  }
  if (score < 40) return 'text-emerald-600';
  if (score <= 70) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBarColor(score: number, invert = false): string {
  if (invert) {
    if (score > 60) return 'bg-emerald-500';
    if (score >= 30) return 'bg-amber-500';
    return 'bg-red-500';
  }
  if (score < 40) return 'bg-emerald-500';
  if (score <= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case 'high':
    case 'critical':
      return 'bg-red-50 text-red-700';
    case 'medium':
      return 'bg-amber-50 text-amber-700';
    case 'low':
      return 'bg-blue-50 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function confidenceBadgeClass(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'bg-emerald-50 text-emerald-700';
    case 'medium':
      return 'bg-amber-50 text-amber-700';
    case 'low':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function InterpretationTab({ interpretation }: Props) {
  if (!interpretation) {
    return (
      <div className="text-center py-ds-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Brain className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="mt-ds-4 text-ds-base font-medium text-gray-900">
          No interpretation available
        </h3>
        <p className="mt-ds-1 text-ds-sm text-gray-500">
          Upload a new workflow to generate process intelligence.
        </p>
      </div>
    );
  }

  const { summary, processType, processTypeConfidence, decisions, rework, friction, phases, insights, scores } = interpretation;

  return (
    <div className="ds-document space-y-ds-6">
      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div className="ds-callout ds-callout-info">
        <div className="flex items-start gap-ds-3">
          <Brain className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-ds-2 mb-ds-2">
              <span className="ds-tag ds-tag-brand">
                {PROCESS_TYPE_LABELS[processType] ?? processType}
              </span>
              <span className={`ds-tag ${confidenceBadgeClass(processTypeConfidence)}`}>
                {processTypeConfidence} confidence
              </span>
            </div>
            <p className="text-ds-sm text-gray-700 leading-relaxed">{summary}</p>
          </div>
        </div>
      </div>

      {/* ── Scores ───────────────────────────────────────────────────────── */}
      <section>
        <h3 className="ds-section-label">Process Scores</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4">
          <ScoreCard label="Complexity" score={scores.complexity} />
          <ScoreCard label="Friction" score={scores.friction} />
          <ScoreCard label="Linearity" score={scores.linearity} invert />
          <ScoreCard label="Manual Intensity" score={scores.manualIntensity} neutral />
        </div>
      </section>

      {/* ── Phases ───────────────────────────────────────────────────────── */}
      {phases.length > 0 && (
        <section>
          <h3 className="ds-section-label">Process Phases</h3>
          <div className="flex items-stretch gap-ds-1 overflow-x-auto pb-ds-2">
            {phases.map((phase, idx) => (
              <div key={phase.ordinal} className="flex items-stretch flex-shrink-0">
                <div className="card px-ds-4 py-ds-3 min-w-[160px]">
                  <p className="text-ds-xs text-gray-400 mb-0.5">Phase {phase.ordinal}</p>
                  <p className="text-ds-sm font-medium text-gray-900">{phase.name}</p>
                  <p className="text-ds-xs text-gray-500 mt-ds-1">{phase.system}</p>
                  <div className="flex items-center gap-ds-2 mt-ds-2 text-ds-xs text-gray-400">
                    <span>{phase.stepCount} step{phase.stepCount !== 1 ? 's' : ''}</span>
                    <span className="ds-tag ds-tag-neutral text-[10px]">{phase.dominantAction}</span>
                  </div>
                </div>
                {idx < phases.length - 1 && (
                  <div className="flex items-center px-1">
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Decisions ────────────────────────────────────────────────────── */}
      {decisions.length > 0 && (
        <section>
          <h3 className="ds-section-label flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Decision Points ({decisions.length})
          </h3>
          <div className="space-y-ds-2">
            {decisions.map((d, idx) => (
              <div key={idx} className="ds-callout">
                <div className="flex items-start justify-between gap-ds-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-ds-2 flex-wrap">
                      <span className="ds-tag ds-tag-neutral font-mono text-[10px]">
                        Step {d.stepOrdinal}
                      </span>
                      <span className="text-ds-sm font-medium text-gray-900">{d.stepTitle}</span>
                    </div>
                    <p className="text-ds-xs text-gray-500 mt-ds-1">{d.evidence}</p>
                  </div>
                  <div className="flex items-center gap-ds-1 flex-shrink-0">
                    <span className="ds-tag ds-tag-brand text-[10px]">{d.decisionType}</span>
                    <span className={`ds-tag text-[10px] ${confidenceBadgeClass(d.confidence)}`}>
                      {d.confidence}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Rework Patterns ──────────────────────────────────────────────── */}
      {rework.length > 0 && (
        <section>
          <h3 className="ds-section-label flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
            Rework Patterns ({rework.length})
          </h3>
          <div className="space-y-ds-2">
            {rework.map((r, idx) => (
              <div key={idx} className="ds-callout ds-callout-warning">
                <div className="flex items-start justify-between gap-ds-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-ds-2 flex-wrap mb-ds-1">
                      <span className="ds-tag ds-tag-neutral text-[10px]">{r.type.replace(/_/g, ' ')}</span>
                      <span className={`ds-tag text-[10px] ${severityBadgeClass(r.severity)}`}>
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-ds-sm text-gray-700">{r.description}</p>
                    <p className="text-ds-xs text-gray-500 mt-ds-1">{r.evidence}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-ds-sm font-semibold text-amber-700">{r.occurrences}x</p>
                    <p className="text-ds-xs text-gray-400">
                      Steps {r.stepOrdinals.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Friction Points ──────────────────────────────────────────────── */}
      {friction.length > 0 && (
        <section>
          <h3 className="ds-section-label flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            Friction Points ({friction.length})
          </h3>
          <div className="space-y-ds-2">
            {friction.map((f, idx) => (
              <div key={idx} className="ds-callout">
                <div className="flex items-start justify-between gap-ds-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-ds-2 flex-wrap mb-ds-1">
                      <span className="ds-tag ds-tag-neutral text-[10px]">{f.type.replace(/_/g, ' ')}</span>
                      <span className={`ds-tag text-[10px] ${severityBadgeClass(f.severity)}`}>
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-ds-sm text-gray-700">{f.description}</p>
                    <p className="text-ds-xs text-gray-500 mt-ds-1">{f.evidence}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <p className="text-ds-xs text-gray-400">
                      Steps {f.stepOrdinals.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <section>
          <h3 className="ds-section-label flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Insights ({insights.length})
          </h3>
          <div className="space-y-ds-2">
            {insights
              .sort((a, b) => {
                const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
              })
              .map((ins, idx) => (
                <div key={idx} className="ds-callout">
                  <div className="flex items-start gap-ds-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-ds-2 flex-wrap mb-ds-1">
                        <span className={`ds-tag text-[10px] ${severityBadgeClass(ins.severity)}`}>
                          {ins.severity}
                        </span>
                        <span className="ds-tag ds-tag-neutral text-[10px]">{ins.category}</span>
                      </div>
                      <p className="text-ds-sm font-medium text-gray-900">{ins.title}</p>
                      <p className="text-ds-sm text-gray-600 mt-0.5">{ins.description}</p>
                      <p className="text-ds-xs text-gray-400 mt-ds-1">{ins.evidence}</p>
                      {ins.stepOrdinals && ins.stepOrdinals.length > 0 && (
                        <p className="text-ds-xs text-gray-400 mt-0.5">
                          Steps: {ins.stepOrdinals.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Score Card Sub-component ─────────────────────────────────────────────────

function ScoreCard({
  label,
  score,
  invert = false,
  neutral = false,
}: {
  label: string;
  score: number;
  invert?: boolean;
  neutral?: boolean;
}) {
  const colorClass = neutral ? 'text-gray-700' : scoreColor(score, invert);
  const barClass = neutral ? 'bg-gray-400' : scoreBarColor(score, invert);

  return (
    <div className="card px-ds-4 py-ds-3">
      <p className="ds-metric-label">{label}</p>
      <p className={`ds-metric-value ${colorClass}`}>{score}</p>
      <div className="mt-ds-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
