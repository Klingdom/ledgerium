'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Layers,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Activity,
  TrendingUp,
  Zap,
  Eye,
  ChevronRight,
  Target,
  Shield,
  Users,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WorkflowRef {
  id: string;
  title: string;
  durationMs: number | null;
  stepCount: number | null;
  createdAt: string;
}

interface InsightRef {
  id: string;
  insightType: string;
  severity: string;
  title: string;
}

interface PathSignatureDetail {
  signature: string;
  stepCategories: string[];
  stepCount: number;
}

interface VariantDetail {
  variantId: string;
  pathSignature: PathSignatureDetail;
  runCount: number;
  frequency: number;
  isStandardPath: boolean;
  similarityToStandard: number;
  evidenceRunIds: string[];
}

interface IntelligenceMetrics {
  runCount: number;
  completionRate: number;
  errorStepFrequency: number;
  avgDuration: number;
  medianDuration: number;
  minDuration: number;
  maxDuration: number;
  avgStepCount: number;
  avgHumanEventCount: number;
  avgSystemEventCount: number;
  systemFrequency: Record<string, number>;
}

interface IntelligenceVariants {
  ruleVersion: string;
  runCount: number;
  variantCount: number;
  standardPath: VariantDetail | null;
  variants: VariantDetail[];
  variantSimilarityThreshold: number;
}

interface TimeStudyStep {
  stepTitle: string;
  category: string;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  medianDurationMs: number;
  coefficientOfVariation: number;
  sampleCount: number;
}

interface Bottleneck {
  stepTitle: string;
  avgDurationMs: number;
  percentOfTotal: number;
  reason: string;
}

interface VarianceAnalysis {
  durationCV: number;
  stepCountCV: number;
  sequenceStability: number;
}

interface Intelligence {
  metrics?: IntelligenceMetrics;
  variants?: IntelligenceVariants;
  timestudy?: { steps: TimeStudyStep[] };
  bottlenecks?: Bottleneck[];
  variance?: VarianceAnalysis;
}

interface ProcessDefinition {
  id: string;
  canonicalName: string;
  description: string | null;
  pathSignature: string;
  runCount: number;
  variantCount: number;
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  stabilityScore: number | null;
  confidenceScore: number | null;
  analyzedAt: string | null;
  workflows: WorkflowRef[];
  insights: InsightRef[];
  intelligence: Intelligence | null;
}

/* ------------------------------------------------------------------ */
/*  Category style maps                                                */
/* ------------------------------------------------------------------ */

const CATEGORY_BG: Record<string, string> = {
  click_then_navigate:  'bg-teal-100 text-teal-800',
  fill_and_submit:      'bg-blue-100 text-blue-800',
  repeated_click_dedup: 'bg-orange-100 text-orange-800',
  single_action:        'bg-gray-100 text-gray-700',
  data_entry:           'bg-violet-100 text-violet-800',
  send_action:          'bg-emerald-100 text-emerald-800',
  file_action:          'bg-amber-100 text-amber-800',
  error_handling:       'bg-red-100 text-red-800',
  annotation:           'bg-purple-100 text-purple-800',
};

const CATEGORY_LABEL: Record<string, string> = {
  click_then_navigate: 'Navigation',
  fill_and_submit: 'Form Submit',
  repeated_click_dedup: 'Repeated Action',
  single_action: 'Action',
  data_entry: 'Data Entry',
  send_action: 'Submit',
  file_action: 'File',
  error_handling: 'Error',
  annotation: 'Note',
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'ds-callout ds-callout-danger',
  warning: 'ds-callout ds-callout-warning',
  info: 'ds-callout ds-callout-info',
};

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
};

const INSIGHT_TYPE_ICONS: Record<string, React.ElementType> = {
  bottleneck: Clock,
  variance: GitBranch,
  drift: TrendingUp,
  anomaly: AlertTriangle,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function categoryChip(category: string): string {
  return CATEGORY_BG[category] ?? 'bg-gray-100 text-gray-600';
}

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category.replace(/_/g, ' ');
}

function stabilityColor(value: number): string {
  if (value >= 0.8) return 'text-green-600';
  if (value >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

function stabilityBg(value: number): string {
  if (value >= 0.8) return 'bg-green-100 text-green-700';
  if (value >= 0.6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="flex items-center gap-ds-2 mb-ds-1">
        <Icon className="h-4 w-4 text-brand-600" />
        <p className="ds-metric-label">{label}</p>
      </div>
      <p className="ds-metric-value">{value}</p>
      {sub && <p className="text-ds-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="ds-section-label">{children}</h2>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProcessGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [definition, setDefinition] = useState<ProcessDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/process-definitions');
        if (!res.ok) {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }
        const defs: ProcessDefinition[] = await res.json();
        const match = defs.find((d) => d.id === id);
        if (!match) {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }
        setDefinition(match);
      } catch {
        setIsNotFound(true);
      }
      setIsLoading(false);
    }
    load();
    track({ event: 'page_viewed', path: `/analytics/process/${id}` });
  }, [id]);

  useEffect(() => {
    if (isNotFound) {
      router.push('/dashboard');
    }
  }, [isNotFound, router]);

  const intel = definition?.intelligence ?? null;
  const metrics = intel?.metrics ?? null;
  const variants = intel?.variants ?? null;
  const timestudy = intel?.timestudy ?? null;
  const bottlenecks = intel?.bottlenecks ?? null;
  const variance = intel?.variance ?? null;

  // Sort timestudy steps by avg duration descending
  const sortedTimeStudySteps = useMemo(() => {
    if (!timestudy?.steps) return [];
    return [...timestudy.steps].sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  }, [timestudy]);

  const maxStepDuration = useMemo(() => {
    if (sortedTimeStudySteps.length === 0) return 1;
    return sortedTimeStudySteps[0]?.avgDurationMs ?? 1;
  }, [sortedTimeStudySteps]);

  // Bottleneck step names for highlighting
  const bottleneckStepNames = useMemo(() => {
    if (!bottlenecks) return new Set<string>();
    return new Set(bottlenecks.map((b) => b.stepTitle));
  }, [bottlenecks]);

  // Workflows sorted newest first
  const sortedWorkflows = useMemo(() => {
    if (!definition?.workflows) return [];
    return [...definition.workflows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [definition]);

  // Parse path signature into categories
  const signatureCategories = useMemo(() => {
    if (!definition?.pathSignature) return [];
    return definition.pathSignature.split(':');
  }, [definition]);

  if (isLoading) {
    return (
      <div className="text-center text-ds-sm text-gray-400 py-20">
        Loading process group...
      </div>
    );
  }

  if (!definition) {
    return null;
  }

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="mb-ds-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-ds-sm text-gray-500 hover:text-gray-700 mb-ds-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">
          {definition.canonicalName}
        </h1>

        {definition.description && (
          <p className="text-ds-sm text-gray-600 mt-ds-1">{definition.description}</p>
        )}

        <div className="mt-ds-3 flex flex-wrap items-center gap-ds-3 text-ds-xs">
          <span className="ds-tag ds-tag-brand flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {definition.runCount} run{definition.runCount !== 1 ? 's' : ''}
          </span>
          <span className="ds-tag ds-tag-neutral flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            {definition.variantCount} variant{definition.variantCount !== 1 ? 's' : ''}
          </span>
          {definition.stabilityScore !== null && (
            <span className={`ds-tag flex items-center gap-1 ${stabilityBg(definition.stabilityScore)}`}>
              <Shield className="h-3.5 w-3.5" />
              {pct(definition.stabilityScore)} stable
            </span>
          )}
          {definition.confidenceScore !== null && (
            <span className="ds-tag ds-tag-neutral flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {formatConfidence(definition.confidenceScore)} confidence
            </span>
          )}
          {definition.avgDurationMs !== null && (
            <span className="ds-tag ds-tag-neutral flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(definition.avgDurationMs)} avg
            </span>
          )}
          {definition.analyzedAt && (
            <span className="text-gray-400">
              Analyzed {formatDateRelative(definition.analyzedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-ds-8">
        {/* ---- Section 1: Overview Metrics ---- */}
        {metrics && (
          <section className="ds-section">
            <SectionHeader>Overview Metrics</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-ds-4">
              <MetricCard icon={Layers} label="Total Runs" value={metrics.runCount} />
              <MetricCard
                icon={Target}
                label="Completion Rate"
                value={pct(metrics.completionRate)}
              />
              <MetricCard
                icon={Clock}
                label="Avg Duration"
                value={formatDuration(metrics.avgDuration)}
                sub={`Median: ${formatDuration(metrics.medianDuration)}`}
              />
              <MetricCard
                icon={Clock}
                label="Duration Range"
                value={`${formatDuration(metrics.minDuration)} – ${formatDuration(metrics.maxDuration)}`}
              />
              <MetricCard
                icon={BarChart3}
                label="Avg Step Count"
                value={Math.round(metrics.avgStepCount)}
              />
              <MetricCard
                icon={AlertTriangle}
                label="Error Step Freq"
                value={pct(metrics.errorStepFrequency)}
              />
              <MetricCard
                icon={Users}
                label="Avg Human Events"
                value={Math.round(metrics.avgHumanEventCount)}
              />
              <MetricCard
                icon={Activity}
                label="Avg System Events"
                value={Math.round(metrics.avgSystemEventCount)}
              />
            </div>

            {/* Systems Used */}
            {Object.keys(metrics.systemFrequency).length > 0 && (
              <div className="mt-ds-4">
                <p className="text-ds-xs text-gray-500 font-medium mb-ds-2">Systems Used</p>
                <div className="flex flex-wrap gap-ds-1">
                  {Object.entries(metrics.systemFrequency)
                    .sort(([, a], [, b]) => b - a)
                    .map(([system, freq]) => (
                      <span key={system} className="ds-tag ds-tag-brand">
                        {system}
                        <span className="ml-1 text-brand-400">{freq}x</span>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ---- Section 2: Variant Breakdown ---- */}
        <section className="ds-section">
          <SectionHeader>Variant Breakdown</SectionHeader>
          {variants && variants.variantCount > 0 ? (
            <>
              {/* Summary bar */}
              <div className="ds-callout ds-callout-info mb-ds-4">
                <div className="flex items-center gap-ds-2">
                  <GitBranch className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-ds-sm text-gray-700">
                    <strong>{variants.variantCount} variant{variants.variantCount !== 1 ? 's' : ''}</strong> detected.
                    {variants.standardPath && (
                      <> Standard path covers <strong>{pct(variants.standardPath.frequency)}</strong> of runs.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-ds-3">
                {variants.variants.map((variant, idx) => (
                  <VariantCard
                    key={variant.variantId}
                    variant={variant}
                    index={idx}
                    workflows={definition.workflows}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="card px-ds-6 py-ds-6 text-center">
              <GitBranch className="h-6 w-6 text-gray-300 mx-auto mb-ds-2" />
              <p className="text-ds-sm text-gray-500">
                Not enough runs to detect variants. Record more executions of this process.
              </p>
            </div>
          )}
        </section>

        {/* ---- Section 3: Time Study ---- */}
        {timestudy && sortedTimeStudySteps.length > 0 && (
          <section className="ds-section">
            <SectionHeader>Time Study</SectionHeader>
            <div className="space-y-ds-2">
              {sortedTimeStudySteps.map((step) => {
                const isBottleneck = bottleneckStepNames.has(step.stepTitle);
                const barWidth = maxStepDuration > 0
                  ? Math.max(4, (step.avgDurationMs / maxStepDuration) * 100)
                  : 4;
                const highCV = step.coefficientOfVariation > 0.5;

                return (
                  <div
                    key={step.stepTitle}
                    className={`card px-ds-5 py-ds-4 ${isBottleneck ? 'border-red-200 bg-red-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-ds-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-ds-2 mb-ds-1">
                          <span className="text-ds-sm font-medium text-gray-900 truncate">
                            {step.stepTitle}
                          </span>
                          <span className={`ds-tag text-[10px] ${categoryChip(step.category)}`}>
                            {categoryLabel(step.category)}
                          </span>
                          {isBottleneck && (
                            <span className="ds-tag text-[10px] bg-red-100 text-red-700">
                              Bottleneck
                            </span>
                          )}
                        </div>

                        {/* Duration bar */}
                        <div className="mt-ds-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isBottleneck ? 'bg-red-400' : 'bg-brand-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-ds-sm font-semibold text-gray-900">
                          {formatDuration(step.avgDurationMs)}
                        </p>
                        <p className="text-ds-xs text-gray-400">
                          {formatDuration(step.minDurationMs)} – {formatDuration(step.maxDurationMs)}
                        </p>
                        <p className={`text-ds-xs mt-0.5 ${highCV ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          CV: {step.coefficientOfVariation.toFixed(2)}
                          {highCV && ' (inconsistent)'}
                        </p>
                        <p className="text-ds-xs text-gray-300">
                          {step.sampleCount} sample{step.sampleCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---- Section 4: Bottlenecks ---- */}
        {bottlenecks && bottlenecks.length > 0 && (
          <section className="ds-section">
            <SectionHeader>Bottlenecks</SectionHeader>
            <div className="space-y-ds-2">
              {bottlenecks.map((bn) => (
                <div key={bn.stepTitle} className="ds-callout ds-callout-warning">
                  <div className="flex items-start gap-ds-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-ds-2">
                        <span className="text-ds-sm font-medium text-gray-900">{bn.stepTitle}</span>
                        <span className="ds-tag text-[10px] bg-amber-100 text-amber-700">
                          {pct(bn.percentOfTotal)} of total time
                        </span>
                      </div>
                      <p className="text-ds-xs text-gray-600 mt-ds-1">
                        Avg duration: <strong>{formatDuration(bn.avgDurationMs)}</strong>
                      </p>
                      <p className="text-ds-xs text-gray-500 mt-0.5">{bn.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Section 5: Variance Analysis ---- */}
        {variance && (
          <section className="ds-section">
            <SectionHeader>Variance Analysis</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-ds-4">
              <VarianceIndicator
                label="Duration Consistency"
                description="Timing consistency across runs"
                value={1 - variance.durationCV}
                raw={variance.durationCV}
                rawLabel="CV"
              />
              <VarianceIndicator
                label="Structural Consistency"
                description="Step count consistency across runs"
                value={1 - variance.stepCountCV}
                raw={variance.stepCountCV}
                rawLabel="CV"
              />
              <VarianceIndicator
                label="Sequence Stability"
                description="Execution order consistency"
                value={variance.sequenceStability}
                raw={variance.sequenceStability}
                rawLabel="Score"
              />
            </div>
          </section>
        )}

        {/* ---- Section 6: Active Insights ---- */}
        {definition.insights.length > 0 && (
          <section className="ds-section">
            <SectionHeader>Active Insights</SectionHeader>
            <div className="space-y-ds-2">
              {definition.insights.map((insight) => {
                const cls = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
                const textCls = SEVERITY_TEXT[insight.severity] ?? SEVERITY_TEXT.info;
                const Icon = INSIGHT_TYPE_ICONS[insight.insightType] ?? Eye;
                return (
                  <div key={insight.id} className={cls}>
                    <div className="flex items-center gap-ds-3">
                      <Icon className={`h-4 w-4 ${textCls} flex-shrink-0`} />
                      <div className="flex items-center gap-ds-2 flex-1 min-w-0">
                        <span className={`text-ds-xs font-semibold uppercase ${textCls}`}>
                          {insight.severity}
                        </span>
                        <span className="ds-tag ds-tag-neutral text-[10px]">
                          {insight.insightType}
                        </span>
                        <span className="text-ds-sm text-gray-900">{insight.title}</span>
                      </div>
                      <Link
                        href="/analytics"
                        className="flex items-center gap-0.5 text-ds-xs text-brand-600 hover:text-brand-700 flex-shrink-0"
                      >
                        Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---- Section 7: Member Workflows (Run History) ---- */}
        <section className="ds-section">
          <SectionHeader>Member Workflows</SectionHeader>
          {sortedWorkflows.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full text-ds-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-ds-xs text-gray-500">
                    <th className="text-left font-medium px-ds-5 py-ds-3">Title</th>
                    <th className="text-right font-medium px-ds-5 py-ds-3">Duration</th>
                    <th className="text-right font-medium px-ds-5 py-ds-3">Steps</th>
                    <th className="text-right font-medium px-ds-5 py-ds-3">Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWorkflows.map((wf) => (
                    <tr
                      key={wf.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-ds-5 py-ds-3">
                        <Link
                          href={`/workflows/${wf.id}`}
                          className="text-brand-600 hover:text-brand-700 font-medium"
                        >
                          {wf.title}
                        </Link>
                      </td>
                      <td className="text-right px-ds-5 py-ds-3 text-gray-600">
                        {formatDuration(wf.durationMs)}
                      </td>
                      <td className="text-right px-ds-5 py-ds-3 text-gray-600">
                        {wf.stepCount ?? '—'}
                      </td>
                      <td className="text-right px-ds-5 py-ds-3 text-gray-400">
                        {formatDateRelative(wf.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card px-ds-6 py-ds-6 text-center">
              <p className="text-ds-sm text-gray-500">No workflows in this process group yet.</p>
            </div>
          )}
        </section>

        {/* ---- Section 8: Process Signature ---- */}
        {signatureCategories.length > 0 && (
          <section className="ds-section">
            <SectionHeader>Process Signature</SectionHeader>
            <div className="card px-ds-5 py-ds-4">
              <div className="flex flex-wrap items-center gap-ds-1">
                {signatureCategories.map((cat, idx) => (
                  <div key={`${cat}-${idx}`} className="flex items-center">
                    <span className={`ds-tag text-ds-xs ${categoryChip(cat)}`}>
                      {categoryLabel(cat)}
                    </span>
                    {idx < signatureCategories.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 mx-0.5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-ds-xs text-gray-400 mt-ds-2 font-mono">
                {definition.pathSignature}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Variant Card                                                       */
/* ------------------------------------------------------------------ */

function VariantCard({
  variant,
  index,
  workflows,
}: {
  variant: VariantDetail;
  index: number;
  workflows: WorkflowRef[];
}) {
  const evidenceWorkflows = useMemo(() => {
    const idSet = new Set(variant.evidenceRunIds);
    return workflows.filter((w) => idSet.has(w.id));
  }, [variant.evidenceRunIds, workflows]);

  return (
    <div className={`card px-ds-5 py-ds-4 ${variant.isStandardPath ? 'border-brand-200 bg-brand-50/20' : ''}`}>
      <div className="flex items-start justify-between gap-ds-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-ds-2 mb-ds-1">
            {variant.isStandardPath ? (
              <span className="ds-tag ds-tag-brand text-[10px] font-semibold">Standard</span>
            ) : (
              <span className="ds-tag ds-tag-neutral text-[10px]">Variant {index + 1}</span>
            )}
            <span className="text-ds-xs text-gray-500">
              {variant.runCount} run{variant.runCount !== 1 ? 's' : ''} &middot; {pct(variant.frequency)}
            </span>
            {!variant.isStandardPath && (
              <span className="text-ds-xs text-gray-400">
                {pct(variant.similarityToStandard)} similar
              </span>
            )}
          </div>

          {/* Step categories */}
          <div className="flex flex-wrap gap-ds-1 mt-ds-2">
            {variant.pathSignature.stepCategories.map((cat, i) => (
              <span key={`${cat}-${i}`} className={`ds-tag text-[10px] ${categoryChip(cat)}`}>
                {categoryLabel(cat)}
              </span>
            ))}
            <span className="text-ds-xs text-gray-400 self-center ml-ds-1">
              {variant.pathSignature.stepCount} step{variant.pathSignature.stepCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Evidence workflows */}
          {evidenceWorkflows.length > 0 && (
            <div className="mt-ds-2">
              <p className="text-ds-xs text-gray-400 mb-0.5">Matching workflows:</p>
              <div className="flex flex-wrap gap-ds-1">
                {evidenceWorkflows.slice(0, 5).map((wf) => (
                  <Link
                    key={wf.id}
                    href={`/workflows/${wf.id}`}
                    className="text-ds-xs text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline"
                  >
                    {wf.title}
                  </Link>
                ))}
                {evidenceWorkflows.length > 5 && (
                  <span className="text-ds-xs text-gray-400">
                    +{evidenceWorkflows.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Variance Indicator                                                 */
/* ------------------------------------------------------------------ */

function VarianceIndicator({
  label,
  description,
  value,
  raw,
  rawLabel,
}: {
  label: string;
  description: string;
  value: number;
  raw: number;
  rawLabel: string;
}) {
  // Clamp value for display
  const clamped = Math.max(0, Math.min(1, value));
  const colorClass = stabilityColor(clamped);
  const bgClass = stabilityBg(clamped);

  return (
    <div className="card px-ds-5 py-ds-4">
      <p className="text-ds-xs text-gray-500 font-medium">{label}</p>
      <p className="text-ds-sm text-gray-400 mb-ds-2">{description}</p>
      <div className="flex items-center gap-ds-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              clamped >= 0.8 ? 'bg-green-500' : clamped >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${clamped * 100}%` }}
          />
        </div>
        <span className={`ds-tag text-[10px] ${bgClass}`}>
          {pct(clamped)}
        </span>
      </div>
      <p className="text-ds-xs text-gray-300 mt-ds-1">
        {rawLabel}: {raw.toFixed(2)}
      </p>
    </div>
  );
}
