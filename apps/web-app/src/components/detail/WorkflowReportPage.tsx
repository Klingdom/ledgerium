'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  GitBranch,
} from 'lucide-react';
import { useId } from 'react';
import { deriveDivergence } from '@/lib/reportDivergence';
import { formatDuration } from '@/lib/format';
import { track } from '@/lib/analytics';
import { SECTION_IDS, SECTION_LABELS } from './reportSections';
import { RoiSection, type RoiStep } from './RoiSection';
import { buildReportMeta, groupVisibleSections, type ReportMeta } from './reportMeta';
import { buildReportVerdict, cvBand, type ReportVerdictInput } from './reportVerdict';
import {
  buildScorecard,
  buildParetoRows,
  type ScorecardInput,
  type ConsistencyColor,
  type ConsistencyTile,
  type ScorecardTile,
} from './reportScorecard';
import {
  deriveDistribution,
  deriveConsistencyScore,
  rankBottleneckContributions,
  formatDriftSignals,
  deriveInsightCards,
  type CycleTimeDistribution,
  type ConsistencyScore,
  type ConsistencyBand,
  type BottleneckContributionRow,
  type FormattedDriftSignal,
  type DriftSeverity,
  type InsightCard,
  type InsightCardType,
} from './reportEvidence';
import { useCountUp } from '@/hooks/useCountUp';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { ProcessHealthScoreBar } from '@/components/shared/ProcessHealthScoreBar';
import { InsightActionCard, type InsightActionCardInsight } from '@/components/shared/InsightActionCard';
import { AutomationScoreChip } from '@/components/shared/AutomationScoreChip';

// Defensive: real artifact JSON (workflow_interpretation / intelligence / agent
// payloads) can carry `null` or a non-array where the typed interface says array,
// and can omit fields the type marks required. `asArray` coerces to [] so one
// malformed artifact never throws and blanks the whole Report with an unstyled
// "Application error" (the production outage 2026-06-09). The seeded sample never
// hits these shapes, which is why the smoke gate passed.
function asArray<T>(v: readonly T[] | null | undefined): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ── Report analytics context (Wave 0 RPT-P0-4/5) ──────────────────────────────
// Threads the opaque workflowId + an elapsed-time getter to nested sections
// (nav, step accordion, insight filter) so each can emit PII-free engagement
// events without prop-drilling. Value is memoized in the page component.
interface ReportAnalyticsCtx {
  workflowId: string;
  /** Milliseconds since report_viewed fired (the report-view zero-point). */
  getElapsedMs: () => number;
}
const ReportAnalyticsContext = createContext<ReportAnalyticsCtx | null>(null);
function useReportAnalytics(): ReportAnalyticsCtx | null {
  return useContext(ReportAnalyticsContext);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkflowSummary {
  id: string;
  title: string;
  durationMs: number;
  stepCount: number;
  phaseCount: number;
  confidence: number;
  toolsUsed: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  shareToken?: string;
}

interface InterpretationScores {
  complexity: number;
  friction: number;
  linearity: number;
  manualIntensity: number;
}

interface InterpretationPhase {
  ordinal: number;
  name: string;
  system: string;
  stepRange: [number, number];
  stepCount: number;
  dominantAction: string;
  durationMs?: number;
}

interface InterpretationFriction {
  type: string;
  description: string;
  severity: string;
  stepOrdinals: number[];
  evidence: string;
}

interface InterpretationDecision {
  stepOrdinal: number;
  stepTitle: string;
  decisionType: string;
  confidence: string;
  evidence: string;
}

interface InterpretationRework {
  type: string;
  description: string;
  stepOrdinals: number[];
  occurrences: number;
  severity: string;
  evidence: string;
}

interface InterpretationData {
  summary?: string;
  processType?: string;
  processTypeConfidence?: string;
  scores?: InterpretationScores;
  phases?: InterpretationPhase[];
  friction?: InterpretationFriction[];
  decisions?: InterpretationDecision[];
  rework?: InterpretationRework[];
  insights?: Array<{
    id?: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    evidence?: string;
    impact?: string;
    suggestion?: string;
    stepOrdinals?: number[];
    confidence?: number;
  }>;
}

interface InsightsData {
  hasInsights?: boolean;
  insights?: Array<{
    id?: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    confidence: number;
    evidence?: string;
    impact?: string;
    suggestion?: string;
    stepOrdinals?: number[];
  }>;
  summary?: {
    totalInsights: number;
    highSeverity: number;
    categories: string[];
  };
  // Migrated from InsightsPanel (Slice 2). Authoritative time-breakdown from the
  // insights pipeline; preferred by RunMetricsSection when present.
  timeBreakdown?: {
    totalDurationLabel: string;
    longestStepDurationLabel: string;
    longestStepOrdinal: number;
    longestStepPercentage: number;
  };
  noInsightsMessage?: string;
}

interface IntelligenceBottleneck {
  position: number;
  meanDurationMs: number;
  overallMeanStepDurationMs: number;
  durationRatio: number;
  category?: string;
  // Surfaced for the R-B honesty fixes (run-count context + which criterion
  // fired). Present on the real engine payload (BottleneckStep); the interface
  // was previously lossy.
  runCount?: number;
  isHighDuration?: boolean;
  isHighVariance?: boolean;
  // R-C: evidence run ids for insight-card anchors. Real engine field.
  evidenceRunIds?: string[];
}

interface IntelligenceMetrics {
  medianDurationMs?: number;
  meanDurationMs?: number;
  p90DurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  medianStepCount?: number;
  meanStepCount?: number;
  runCount?: number;
  completionRate?: number;
  // R-C: mean error/exception steps per run. Real engine field (ProcessMetrics).
  errorStepFrequency?: number;
}

interface TimestudyStep {
  position: number;
  category?: string;
  meanDurationMs?: number;
  medianDurationMs?: number;
  p90DurationMs?: number;
}

interface IntelligenceVariance {
  sequenceStability?: number;
  durationVariance?: { coefficientOfVariation?: number; stdDevMs?: number | null };
  // R-C: step-count spread across runs. Real engine field (VarianceReport).
  stepCountVariance?: { min?: number; max?: number; stdDev?: number | null };
  highVarianceSteps?: unknown[];
}

interface IntelligenceVariant {
  variantId: string;
  isStandardPath?: boolean;
  pathSignature?: { signature?: string; stepCount?: number };
  frequency?: number;
  runCount?: number;
  // R-C: evidence run ids for insight-card anchors. Real engine field.
  evidenceRunIds?: string[];
}

// R-C: drift signal shape from the engine's DriftReport.driftSignals[].
interface IntelligenceDriftSignal {
  driftType: string;
  severity: string;
  description: string;
  baselineValue: number | string;
  currentValue: number | string;
  evidenceRunIds?: string[];
}

interface IntelligenceData {
  metrics?: IntelligenceMetrics;
  timestudy?: { stepPositionTimestudies?: TimestudyStep[] };
  variance?: IntelligenceVariance;
  variants?: { variantCount?: number; variants?: IntelligenceVariant[] };
  bottlenecks?: {
    bottlenecks?: IntelligenceBottleneck[];
  };
  // R-C: standard-path summary (dominant path coverage) for insight cards.
  standardPath?: { frequency?: number; runCount?: number; evidenceRunIds?: string[] };
  // R-C: drift report — only present when a baseline window was provided.
  drift?: { driftSignals?: IntelligenceDriftSignal[] };
  // Per-variant real recorded step titles, populated by analyzeWorkflowVariants
  // (intelligence.ts). Used to label the Pareto without exposing the hash.
  variantStepTitles?: Record<string, string[]>;
}

interface AgentOpportunity {
  title?: string;
  category?: string;
  score?: number;
  estimatedTimeSavingsMs?: number;
  classification?: string;
  description?: string;
}

interface ComposedAgent {
  agentName?: string;
  role?: string;
  interactionMode?: string;
  capabilityScore?: number;
  systems?: string[];
  tasks?: unknown[];
  skills?: unknown[];
}

interface SkillItem {
  skillName?: string;
  skillType?: string;
  reusabilityScore?: number;
  autonomous?: boolean;
}

interface IntegrationItem {
  system?: string;
  readiness?: string;
  complexity?: number;
  estimatedSetupTimeMs?: number;
}

interface IntegrationRiskItem {
  title?: string;
  severity?: string;
  category?: string;
}

interface RoadmapPhase {
  phase?: number;
  title?: string;
  estimatedEffort?: string;
  description?: string;
  prerequisites?: string[];
}

interface AgentIntelligenceData {
  opportunities?: {
    opportunities?: AgentOpportunity[];
    totalSavingsMs?: number;
  };
  workflow?: {
    automationScore?: number;
  };
  agentComposition?: { agentCount?: number; agents?: ComposedAgent[] };
  skillLibrary?: { uniqueSkillCount?: number; reusableSkillCount?: number; skills?: SkillItem[] };
  integrationRisk?: { overallRiskLevel?: string; integrations?: IntegrationItem[]; risks?: IntegrationRiskItem[] };
  artifacts?: { roadmap?: RoadmapPhase[] };
}

interface StepDefinition {
  ordinal: number;
  title: string;
  category?: string;
  categoryLabel?: string;
  system?: string;
  confidence?: number;
  durationMs?: number;
  phaseOrdinal?: number;
  phaseName?: string;
  evidence?: string;
  instructions?: Array<{ text: string; type: string }>;
}

interface ProcessOutputData {
  processDefinition?: {
    stepDefinitions?: StepDefinition[];
  };
}

export interface WorkflowReportPageProps {
  workflow: WorkflowSummary;
  insights: InsightsData | null | undefined;
  interpretation: InterpretationData | null | undefined;
  intelligence: IntelligenceData | null | undefined;
  agentIntelligence: AgentIntelligenceData | null | undefined;
  processOutput: ProcessOutputData | null | undefined;
  onRunIntelligence?: (() => void) | undefined;
  onRunAgentIntelligence?: (() => void) | undefined;
}

// ── Section IDs (for scroll spy) ──────────────────────────────────────────────

// SECTION_IDS + SECTION_LABELS live in ./reportSections (pure data) so the
// grouped-nav logic in ./reportMeta and its coverage test reference one source
// of truth without importing this heavy component. SECTION_LABELS['rpt-metrics']
// is "Step Timing" (R-D PRT-P1-05).

// ── Phase accent colors ────────────────────────────────────────────────────────

const PHASE_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

const PHASE_TEXT_COLORS = [
  'text-blue-700',
  'text-violet-700',
  'text-emerald-700',
  'text-amber-700',
  'text-rose-700',
  'text-cyan-700',
];

const PHASE_BG_COLORS = [
  'bg-blue-50',
  'bg-violet-50',
  'bg-emerald-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-cyan-50',
];

// ── Section heading helper ────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)] mb-4">
      {children}
    </h2>
  );
}

// ── Skeleton placeholder ──────────────────────────────────────────────────────

interface SkeletonCardProps {
  message: string;
  onAction?: (() => void) | undefined;
  actionLabel?: string | undefined;
}

function SkeletonCard({ message, onAction, actionLabel }: SkeletonCardProps) {
  return (
    <div className="card px-5 py-8 text-center">
      <p className="text-ds-sm text-[var(--content-tertiary)] mb-3">{message}</p>
      {onAction != null && actionLabel != null && (
        <button
          type="button"
          onClick={onAction}
          className="btn-secondary gap-1.5 text-xs"
        >
          <Zap className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Section 1: Hero ────────────────────────────────────────────────────────────

function HeroSection({ workflow }: { workflow: WorkflowSummary }) {
  const confidencePct = Math.round((workflow.confidence ?? 0) * 100);

  // Deterministic interpretive identity sentence (single-run safe; composed from
  // the always-present workflow summary — no Date/random/env, hydration-safe).
  const systems = workflow.toolsUsed;
  const systemsPhrase =
    systems.length === 0
      ? ''
      : systems.length === 1
      ? ` in ${systems.join('')}`
      : ` across ${systems.length} systems`;
  const phasesPhrase =
    workflow.phaseCount > 0 ? ` in ${workflow.phaseCount} phase${workflow.phaseCount !== 1 ? 's' : ''}` : '';
  const leadSentence = `A ${workflow.stepCount}-step process${systemsPhrase}${phasesPhrase}, completing in ${formatDuration(
    workflow.durationMs,
  )} at ${confidencePct}% extraction confidence.`;

  // Animated counters — refs attached to parent container.
  // PRT-P0-06: respect prefers-reduced-motion. When reduce is set, pass duration 0
  // so useCountUp resolves immediately to the final value — this eliminates the
  // "STEPS 0" artifact (a 0-frame flash) for motion-sensitive users (WCAG 2.1
  // SC 2.3.3). Detected in an effect (not in render) so SSR === CSR (hydration-safe).
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  const [durationSec] = useCountUp(Math.round(workflow.durationMs / 1000), reduceMotion ? 0 : 800);
  const [steps] = useCountUp(workflow.stepCount, reduceMotion ? 0 : 700);
  const [phases] = useCountUp(workflow.phaseCount, reduceMotion ? 0 : 700, { delay: 100 });
  const [confValue] = useCountUp(confidencePct, reduceMotion ? 0 : 900, { delay: 150 });

  const confColor =
    confidencePct >= 80
      ? 'text-emerald-600'
      : confidencePct >= 60
      ? 'text-amber-600'
      : 'text-red-600';

  const confBarColor =
    confidencePct >= 80
      ? 'bg-emerald-500'
      : confidencePct >= 60
      ? 'bg-amber-500'
      : 'bg-red-500';

  // Format the animated duration back into a readable string
  const displayDuration = formatDuration(durationSec * 1000);

  const statusLabel =
    workflow.status === 'complete'
      ? 'Complete'
      : workflow.status === 'active'
      ? 'Active'
      : workflow.status ?? 'Unknown';

  const statusClass =
    workflow.status === 'complete'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : workflow.status === 'active'
      ? 'bg-brand-50 text-brand-700 border border-brand-200'
      : 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]';

  return (
    <div
      id="rpt-hero"
      className="report-no-print bg-gradient-to-br from-brand-50/80 to-white border border-blue-100 rounded-ds-lg px-6 py-5"
    >
      {/* Title row */}
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        {/* h2 — the page-level header in page.tsx owns the single <h1> for this route */}
        <h2 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">{workflow.title}</h2>
      </div>

      {/* Interpretive lead sentence — PRT-P1-04: upgraded to primary content color
          (the most informative single sentence on the report). */}
      <p className="mt-1 max-w-3xl text-ds-sm text-[var(--content-primary)]">{leadSentence}</p>

      {/* Metrics band */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 divide-x divide-[var(--border-subtle)] rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-hidden">
        {/* Duration */}
        <MetricCell label="Duration" value={displayDuration} />

        {/* Steps */}
        <MetricCell label="Steps" value={String(steps)} />

        {/* Phases */}
        <MetricCell label="Phases" value={String(phases)} />

        {/* Confidence */}
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--content-tertiary)] mb-1">Confidence</p>
          <p className={`text-[28px] font-bold tabular-nums leading-none ${confColor}`}>
            {confValue}%
          </p>
          <div className="mt-2 h-1 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${confBarColor}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {/* Systems */}
        <div className="px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-wide text-[var(--content-tertiary)] mb-1">Systems</p>
          <p className="text-[28px] font-bold tabular-nums leading-none text-[var(--content-primary)]">
            {workflow.toolsUsed.length}
          </p>
          {workflow.toolsUsed.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {workflow.toolsUsed.slice(0, 3).map((tool) => (
                <span key={tool} className="ds-tag ds-tag-brand text-[10px]">{tool}</span>
              ))}
              {workflow.toolsUsed.length > 3 && (
                <span className="ds-tag ds-tag-neutral text-[10px]">+{workflow.toolsUsed.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--content-tertiary)] mb-2">Status</p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--content-tertiary)] mb-1">{label}</p>
      <p className="text-[28px] font-bold tabular-nums leading-none text-[var(--content-primary)]">{value}</p>
    </div>
  );
}

// ── Decision-grade lead (R-B): verdict + 5-tile scorecard ─────────────────────

/**
 * Derive the observed-only figures that feed BOTH the executive verdict and the
 * scorecard from a single place, so the two cards never disagree. Pure — every
 * number traces to an engine field; nothing is fabricated or defaulted to a
 * guess. The "% of cycle time" for the top bottleneck is its mean-duration share
 * of the summed per-step mean durations (timestudy), which is honest and
 * observed; falls back to durationRatio-implied share when timestudy is absent.
 */
interface LeadFigures {
  runCount: number;
  sequenceStability: number | null;
  coefficientOfVariation: number | null;
  variantCount: number | null;
  dominantPathRunCount: number | null;
  dominantPathPercent: number | null;
  /** Dominant-path share of runs, 0–1 (standardPath.frequency). */
  dominantPathFrequency: number | null;
  medianDurationMs: number | null;
  topBottleneck: { title: string; percentOfCycleTime: number } | null;
  automationScore: number | null;
  // R-C additions — all from real engine fields, no fabrication.
  /** Cycle-time 5-number summary (ms). */
  distribution: {
    minDurationMs: number | null;
    medianDurationMs: number | null;
    meanDurationMs: number | null;
    p90DurationMs: number | null;
    maxDurationMs: number | null;
  };
  highVarianceStepCount: number | null;
  topAutomationTitle: string | null;
  opportunityTag: string | null;
  /** Evidence run ids for insight-card anchors (dominant variant + bottlenecks). */
  evidenceRunIds: string[];
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function deriveLeadFigures(
  intelligence: IntelligenceData | null | undefined,
  agentIntelligence: AgentIntelligenceData | null | undefined,
  processOutput: ProcessOutputData | null | undefined,
): LeadFigures {
  const runCount = num(intelligence?.metrics?.runCount) ?? 1;
  const variance = intelligence?.variance;
  const variantList = asArray(intelligence?.variants?.variants);
  const standard = variantList.find((v) => v.isStandardPath);
  const variantCount = num(intelligence?.variants?.variantCount) ?? (variantList.length || null);

  // Top bottleneck % of cycle time — mean-duration share of summed per-step means.
  const studies = asArray(intelligence?.timestudy?.stepPositionTimestudies);
  const cycleMeanSum = studies.reduce((sum, s) => sum + (num(s.meanDurationMs) ?? 0), 0);
  const bottlenecks = asArray(intelligence?.bottlenecks?.bottlenecks);
  const stepMap = new Map<number, StepDefinition>();
  asArray(processOutput?.processDefinition?.stepDefinitions).forEach((s) => stepMap.set(s.ordinal, s));

  let topBottleneck: { title: string; percentOfCycleTime: number } | null = null;
  if (bottlenecks.length > 0) {
    // Engine already sorts by durationRatio desc; take the first as the headline.
    const top = bottlenecks[0]!;
    const title = stepMap.get(top.position)?.title ?? `Step ${top.position}`;
    const pct =
      cycleMeanSum > 0
        ? Math.round((top.meanDurationMs / cycleMeanSum) * 100)
        : null;
    if (pct != null && pct > 0) {
      topBottleneck = { title, percentOfCycleTime: pct };
    }
  }

  // Automation score — deterministic workflow score, else best opportunity score.
  const wfScore = num(agentIntelligence?.workflow?.automationScore);
  const opps = asArray(agentIntelligence?.opportunities?.opportunities);
  const oppScores = opps.map((o) => num(o.score)).filter((s): s is number => s != null);
  const automationScore = wfScore ?? (oppScores.length > 0 ? Math.max(...oppScores) : null);

  // Highest-scoring automation opportunity title (for the Automate insight card).
  // Deterministic: score desc, stable by title. Observed — never fabricated.
  const topAutomation = [...opps]
    .filter((o) => (o.title ?? '').trim().length > 0)
    .sort(
      (a, b) =>
        (num(b.score) ?? 0) - (num(a.score) ?? 0) ||
        ((a.title ?? '') < (b.title ?? '') ? -1 : (a.title ?? '') > (b.title ?? '') ? 1 : 0),
    )[0];
  const topAutomationTitle = topAutomation?.title?.trim() ? topAutomation.title.trim() : null;

  const dominantPathRunCount = num(standard?.runCount);
  const dominantPathFrequency = num(standard?.frequency);
  const dominantPathPercent =
    dominantPathFrequency != null ? Math.round(dominantPathFrequency * 100) : null;

  // High-variance step count (engine detail; surfaced for the Investigate card).
  const highVarianceStepCount = Array.isArray(variance?.highVarianceSteps)
    ? variance!.highVarianceSteps.length
    : null;

  // Evidence anchor run ids — prefer the dominant variant's evidence, fall back to
  // the standardPath, then the top bottleneck's. All are real engine fields.
  const evidenceRunIds =
    (Array.isArray(standard?.evidenceRunIds) && standard!.evidenceRunIds.length > 0
      ? standard!.evidenceRunIds
      : Array.isArray(intelligence?.standardPath?.evidenceRunIds) && intelligence!.standardPath!.evidenceRunIds!.length > 0
      ? intelligence!.standardPath!.evidenceRunIds!
      : Array.isArray(bottlenecks[0]?.evidenceRunIds)
      ? (bottlenecks[0]!.evidenceRunIds as string[])
      : []) ?? [];

  return {
    runCount,
    sequenceStability: num(variance?.sequenceStability),
    coefficientOfVariation: num(variance?.durationVariance?.coefficientOfVariation),
    variantCount,
    dominantPathRunCount,
    dominantPathPercent,
    dominantPathFrequency,
    medianDurationMs: num(intelligence?.metrics?.medianDurationMs),
    topBottleneck,
    automationScore,
    distribution: {
      minDurationMs: num(intelligence?.metrics?.minDurationMs),
      medianDurationMs: num(intelligence?.metrics?.medianDurationMs),
      meanDurationMs: num(intelligence?.metrics?.meanDurationMs),
      p90DurationMs: num(intelligence?.metrics?.p90DurationMs),
      maxDurationMs: num(intelligence?.metrics?.maxDurationMs),
    },
    highVarianceStepCount,
    topAutomationTitle,
    // opportunityTag is a deterministic workflow-metrics field not present on this
    // payload today; left null until plumbed (honest — never guessed).
    opportunityTag: null,
    evidenceRunIds,
  };
}

/**
 * Executive Verdict — the decision-grade lead card at the very top of the report.
 * Deterministic + observed-only via buildReportVerdict. Single-run shows one
 * honest sentence; multi-run shows 2–4 plain-English sentences.
 */
function ExecutiveVerdictSection({
  figures,
}: {
  figures: LeadFigures;
}) {
  const verdictInput: ReportVerdictInput = {
    runCount: figures.runCount,
    sequenceStability: figures.sequenceStability,
    coefficientOfVariation: figures.coefficientOfVariation,
    variantCount: figures.variantCount,
    dominantPathRunCount: figures.dominantPathRunCount,
    topBottleneck: figures.topBottleneck,
    standardizationOpportunity:
      figures.variantCount != null &&
      figures.variantCount >= 2 &&
      figures.dominantPathPercent != null
        ? { variantCount: figures.variantCount, dominantPathPercent: figures.dominantPathPercent }
        : null,
  };
  const sentences = buildReportVerdict(verdictInput);

  return (
    <div id="rpt-verdict" className="scroll-mt-20">
      <div className="rounded-ds-lg border border-brand-200 bg-gradient-to-br from-brand-50/70 to-white px-6 py-5">
        {/* Label row — "Observed verdict" (GROWTH §5a) + evidence-linked badge (R-D §3). */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-700">
            Observed verdict
          </p>
          <EvidenceLinkedBadge />
        </div>
        <div className="space-y-1.5">
          {sentences.map((s, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? 'report-verdict-primary text-ds-xl font-semibold leading-snug text-[var(--content-primary)]'
                  : 'text-ds-sm leading-snug text-[var(--content-secondary)]'
              }
            >
              {s}
            </p>
          ))}
        </div>
        {/* Wave 1: the evidence-linked moat made legible — visible above the fold
            (screen only; print uses the badge's inline print disclosure). */}
        <p className="mt-3 text-ds-sm text-[var(--content-secondary)] print:hidden">
          Every figure traces to recorded events. No benchmarks, no estimates — only what was observed in your runs.
        </p>
      </div>
    </div>
  );
}

/**
 * Evidence-linked header badge (R-D §3 / GROWTH §1). Purely declarative markup —
 * no state, no API. The `title`/`aria-label` carry the full disclosure on hover;
 * a sibling print-only span spells the disclosure inline since tooltips do not
 * survive print. Exact GROWTH strings.
 */
function EvidenceLinkedBadge() {
  const disclosure =
    'Every figure traces to recorded events. No benchmarks, no estimates — only what was observed in your runs.';
  return (
    <>
      <span
        className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 cursor-default print:hidden"
        title={disclosure}
        aria-label={`Evidence-linked: ${disclosure}`}
      >
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" aria-hidden />
        Evidence-linked
      </span>
      {/* Print: tooltips don't render — spell the disclosure inline. */}
      <span className="hidden text-[8pt] text-gray-500 print:inline">
        ● Evidence-linked · {disclosure}
      </span>
    </>
  );
}

const CONSISTENCY_TILE_CLASSES: Record<ConsistencyColor, { value: string; dot: string }> = {
  green: { value: 'text-emerald-600', dot: 'bg-emerald-500' },
  amber: { value: 'text-amber-600', dot: 'bg-amber-500' },
  red: { value: 'text-red-600', dot: 'bg-red-500' },
};

/** One scorecard tile. The consistency tile is color-coded by CV band. */
function ScorecardTileCard({ tile }: { tile: ScorecardTile | ConsistencyTile }) {
  const isConsistency = tile.id === 'consistency';
  const color = isConsistency ? (tile as ConsistencyTile).color : null;
  const valueClass =
    color != null ? CONSISTENCY_TILE_CLASSES[color].value : 'text-[var(--content-primary)]';
  // The bottleneck-step tile's value is a step sentence, not a short KPI number —
  // render it smaller and allow it to wrap to 2 lines instead of the 22px
  // single-line truncate used for numeric tiles.
  const isTextValue = tile.id === 'bottleneck_step';

  return (
    <div className="flex flex-col items-start gap-ds-1 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-4 py-ds-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
        {tile.label}
      </span>
      <span
        className={`flex items-center gap-1.5 ${
          isTextValue
            ? 'text-[13px] font-medium leading-snug'
            : 'text-[22px] font-semibold leading-none tabular-nums'
        } ${valueClass}`}
      >
        {color != null && (
          <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${CONSISTENCY_TILE_CLASSES[color].dot}`} aria-hidden />
        )}
        <span className={isTextValue ? 'line-clamp-2' : 'truncate'} title={tile.value}>{tile.value}</span>
      </span>
      <span className="min-h-[16px] text-[12px] text-[var(--content-secondary)]">
        {tile.interpretation}
      </span>
    </div>
  );
}

/**
 * 5-tile KPI scorecard below the verdict. Multi-run-only figures are gated and
 * show "—" / "1 run" for single-run. CONSISTENCY is color-coded by CV with the
 * band word + threshold disclosure. Deterministic via buildScorecard.
 */
function ReportScorecardSection({ figures }: { figures: LeadFigures }) {
  const scInput: ScorecardInput = {
    runCount: figures.runCount,
    medianDurationMs: figures.medianDurationMs,
    medianDurationLabel:
      figures.medianDurationMs != null ? formatDuration(figures.medianDurationMs) : null,
    coefficientOfVariation: figures.coefficientOfVariation,
    variantCount: figures.variantCount,
    topBottleneck: figures.topBottleneck,
    automationScore: figures.automationScore,
  };
  const sc = buildScorecard(scInput);

  return (
    <div id="rpt-scorecard" className="scroll-mt-20">
      <div
        className="grid grid-cols-2 gap-ds-3 sm:grid-cols-3 lg:grid-cols-5"
        role="group"
        aria-label="Report scorecard"
      >
        <ScorecardTileCard tile={sc.cycleTime} />
        <ScorecardTileCard tile={sc.consistency} />
        <ScorecardTileCard tile={sc.variantCount} />
        <ScorecardTileCard tile={sc.bottleneckStep} />
        <ScorecardTileCard tile={sc.automationScore} />
      </div>
    </div>
  );
}

// ── Section 2: Process Scores ──────────────────────────────────────────────────

function interpretComplexity(s: number): string {
  return s < 40 ? 'Low complexity' : s <= 70 ? 'Moderate complexity' : 'High complexity';
}
function interpretFriction(s: number): string {
  return s < 40 ? 'Smooth process' : s <= 70 ? 'Some friction' : 'High friction';
}
function interpretLinearity(s: number): string {
  return s > 60 ? 'Highly linear' : s >= 30 ? 'Moderate linearity' : 'Non-linear';
}
function interpretManualIntensity(s: number): string {
  return s < 40 ? 'Low manual effort' : s <= 70 ? 'Moderate manual effort' : 'High manual effort';
}

function ProcessScoresSection({ interpretation }: { interpretation: InterpretationData | null | undefined }) {
  if (!interpretation?.scores) {
    return (
      <div id="rpt-scores" className="scroll-mt-20">
        <SectionHeading>Process Health</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {['Complexity', 'Friction', 'Linearity', 'Manual Intensity'].map((label) => (
            <div key={label} className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-lg px-5 py-4 animate-pulse">
              <div className="h-2.5 w-20 bg-[var(--surface-secondary)] rounded mb-3" />
              <div className="h-8 w-12 bg-[var(--surface-secondary)] rounded mb-3" />
              <div className="h-1.5 w-full bg-[var(--surface-secondary)] rounded" />
              <div className="h-3 w-28 bg-[var(--surface-secondary)] rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { complexity, friction, linearity, manualIntensity } = interpretation.scores;

  return (
    <div id="rpt-scores" className="scroll-mt-20">
      <SectionHeading>Process Health</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ProcessHealthScoreBar
          label="Complexity"
          score={complexity}
          interpretation={interpretComplexity(complexity)}
          colorScheme="standard"
          animate
        />
        <ProcessHealthScoreBar
          label="Friction"
          score={friction}
          interpretation={interpretFriction(friction)}
          colorScheme="standard"
          animate
        />
        <ProcessHealthScoreBar
          label="Linearity"
          score={linearity}
          interpretation={interpretLinearity(linearity)}
          colorScheme="inverted"
          animate
        />
        <ProcessHealthScoreBar
          label="Manual Intensity"
          score={manualIntensity}
          interpretation={interpretManualIntensity(manualIntensity)}
          colorScheme="neutral"
          animate
        />
      </div>
    </div>
  );
}

// ── Section 3: Phase Timeline ──────────────────────────────────────────────────

function PhaseTimelineSection({ interpretation }: { interpretation: InterpretationData | null | undefined }) {
  const phases = interpretation?.phases ?? [];

  return (
    <div id="rpt-phases" className="scroll-mt-20">
      <SectionHeading>Phase Timeline</SectionHeading>
      {phases.length === 0 ? (
        <SkeletonCard message="No phase data available for this workflow." />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex items-stretch gap-0 min-w-max rounded-ds-md border border-[var(--border-subtle)] overflow-hidden">
            {phases.map((phase, idx) => {
              const colorBar = PHASE_COLORS[idx % PHASE_COLORS.length] ?? 'bg-blue-500';
              const colorText = PHASE_TEXT_COLORS[idx % PHASE_TEXT_COLORS.length] ?? 'text-blue-700';
              const colorBg = PHASE_BG_COLORS[idx % PHASE_BG_COLORS.length] ?? 'bg-blue-50';

              return (
                <div
                  key={phase.ordinal}
                  className={`relative flex-shrink-0 min-w-[80px] px-4 py-3 ${colorBg} border-r border-white/60`}
                  style={{ minWidth: 80 }}
                >
                  {/* Top accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${colorBar}`} />
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mt-1 ${colorText}`}>
                    Phase {phase.ordinal}
                  </p>
                  <p className="text-ds-sm font-medium text-[var(--content-primary)] mt-0.5 leading-snug">
                    {phase.name}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--content-secondary)]">
                    <span>{phase.stepCount} step{phase.stepCount !== 1 ? 's' : ''}</span>
                    {phase.durationMs && (
                      <span>{formatDuration(phase.durationMs)}</span>
                    )}
                  </div>
                  {phase.system && (
                    <p className="mt-1 text-[10px] text-[var(--content-tertiary)] truncate">{phase.system}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section 4: Insights Feed ───────────────────────────────────────────────────

const INSIGHT_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'time_analysis', label: 'Time Analysis' },
  { key: 'rework', label: 'Rework' },
  { key: 'system_efficiency', label: 'System Efficiency' },
  { key: 'automation', label: 'Automation' },
  { key: 'process_health', label: 'Process Health' },
];

function InsightsFeedSection({
  insights,
  intelligence,
}: {
  insights: InsightsData | null | undefined;
  intelligence: IntelligenceData | null | undefined;
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const analytics = useReportAnalytics();
  const runCount = intelligence?.metrics?.runCount ?? 1;

  if (!insights || !insights.hasInsights) {
    // ANALYTICS P0-5: "No inefficiencies detected" is only a defensible claim
    // across ≥2 runs — you cannot assert a single recording is efficient
    // relative to a baseline that does not exist yet. Single-run shows an honest
    // "record again to compare" state instead of a false green all-clear.
    const isMultiRun = runCount >= 2;
    return (
      <div id="rpt-insights" className="scroll-mt-20">
        <SectionHeading>Insights</SectionHeading>
        {isMultiRun ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-ds-lg px-6 py-8 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-3" />
            <h3 className="text-ds-base font-medium text-[var(--content-primary)]">No inefficiencies detected</h3>
            <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
              {insights?.noInsightsMessage ?? 'This workflow appears well-structured across the recorded runs.'}
            </p>
          </div>
        ) : (
          <div className="card px-6 py-8 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-[var(--content-tertiary)] mb-3" />
            <h3 className="text-ds-base font-medium text-[var(--content-primary)]">Single-run baseline captured</h3>
            <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
              Record this workflow again to compare runs and detect patterns.
            </p>
          </div>
        )}
      </div>
    );
  }

  const allInsights = asArray(insights.insights);
  const sorted = [...allInsights].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
  });

  const filtered =
    activeCategory === 'all'
      ? sorted
      : sorted.filter((i) => i.category === activeCategory);

  const criticalCount = sorted.filter((i) => i.severity === 'critical').length;
  const highCount = sorted.filter((i) => i.severity === 'high').length;
  const mediumCount = sorted.filter((i) => i.severity === 'medium').length;

  const normalizedInsights: InsightActionCardInsight[] = filtered.map((ins) => ({
    // Stable key derived from content so cards keep their expanded state when the
    // category filter changes (re-indexing on filter caused remounts).
    id: ins.id ?? `${ins.severity}:${ins.category}:${ins.title}`,
    title: ins.title,
    description: ins.description,
    category: ins.category,
    severity: ins.severity as InsightActionCardInsight['severity'],
    confidence: ins.confidence ?? 0,
    evidence: ins.evidence,
    impact: ins.impact,
    suggestion: ins.suggestion,
    stepOrdinals: ins.stepOrdinals,
  }));

  return (
    <div id="rpt-insights" className="scroll-mt-20">
      {/* Heading + severity badges */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SectionHeading>Insights</SectionHeading>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-500 text-white text-[10px] font-bold px-2 py-0.5">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5">
              {highCount} high
            </span>
          )}
          {mediumCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] text-[var(--content-secondary)] text-[10px] font-semibold px-2 py-0.5">
              {mediumCount} medium
            </span>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {INSIGHT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => {
              if (analytics && cat.key !== activeCategory) {
                track({
                  event: 'report_insight_filter_changed',
                  workflowId: analytics.workflowId,
                  fromCategory: activeCategory as 'all' | 'time_analysis' | 'rework' | 'system_efficiency' | 'automation' | 'process_health',
                  toCategory: cat.key as 'all' | 'time_analysis' | 'rework' | 'system_efficiency' | 'automation' | 'process_health',
                  insightCountInNewCategory:
                    cat.key === 'all' ? sorted.length : sorted.filter((i) => i.category === cat.key).length,
                  elapsedMsSinceReportView: analytics.getElapsedMs(),
                });
              }
              setActiveCategory(cat.key);
            }}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-brand-600 text-white'
                : 'bg-[var(--surface-secondary)] text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Insight cards */}
      {normalizedInsights.length === 0 ? (
        <p className="text-ds-sm text-[var(--content-tertiary)] py-4">No insights in this category.</p>
      ) : (
        <div className="space-y-2">
          {normalizedInsights.map((ins) => (
            <InsightActionCard key={ins.id} insight={ins} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section 5: Automation Opportunities ───────────────────────────────────────

function AutomationSection({
  agentIntelligence,
  intelligence,
  onRunAgentIntelligence,
}: {
  agentIntelligence: AgentIntelligenceData | null | undefined;
  intelligence: IntelligenceData | null | undefined;
  onRunAgentIntelligence?: (() => void) | undefined;
}) {
  const opportunities = agentIntelligence?.opportunities?.opportunities ?? [];
  const totalSavingsMs = agentIntelligence?.opportunities?.totalSavingsMs;

  // Confidence banding — automation estimates are only as reliable as the number
  // of recorded runs they derive from. Surfacing the evidence basis turns a raw
  // score into an honest budget conversation.
  const runCount = intelligence?.metrics?.runCount ?? 1;
  const confidence =
    runCount >= 10
      ? { label: 'high confidence', cls: 'text-emerald-600' }
      : runCount >= 2
      ? { label: 'medium confidence', cls: 'text-amber-600' }
      : { label: 'low confidence', cls: 'text-[var(--content-tertiary)]' };

  return (
    <div id="rpt-automation" className="scroll-mt-20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <SectionHeading>Automation Opportunities</SectionHeading>
        {totalSavingsMs != null && totalSavingsMs > 0 && (
          <span className="text-ds-sm font-semibold text-emerald-600 mb-4">
            ~{formatDuration(totalSavingsMs)} estimated savings
          </span>
        )}
      </div>

      {opportunities.length > 0 && (
        <p className="mb-4 text-ds-xs text-[var(--content-secondary)]">
          Estimates based on{' '}
          <span className="font-medium text-[var(--content-primary)]">
            {runCount} recorded run{runCount !== 1 ? 's' : ''}
          </span>{' '}
          · <span className={`font-medium ${confidence.cls}`}>{confidence.label}</span>
          {runCount < 2 && ' — record this workflow again to sharpen the estimate.'}
        </p>
      )}

      {opportunities.length === 0 ? (
        <SkeletonCard
          message="No automation analysis available. Run AI analysis to identify automation opportunities."
          {...(onRunAgentIntelligence != null ? { onAction: onRunAgentIntelligence, actionLabel: 'Run AI Analysis' } : {})}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {opportunities.map((opp, idx) => (
            <AutomationOpportunityCard key={opp.title ?? opp.category ?? idx} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationOpportunityCard({ opportunity }: { opportunity: AgentOpportunity }) {
  const score = opportunity.score ?? 0;
  const savings = opportunity.estimatedTimeSavingsMs;

  return (
    <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-lg px-4 py-4 flex items-start gap-4">
      <AutomationScoreChip score={score} size="md" />
      <div className="flex-1 min-w-0">
        {opportunity.category && (
          <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold px-2 py-0.5 mb-1.5">
            {opportunity.category.replace(/_/g, ' ')}
          </span>
        )}
        <p className="text-ds-sm font-medium text-[var(--content-primary)] leading-snug">
          {opportunity.title ?? 'Automation opportunity'}
        </p>
        {opportunity.description && (
          <p className="text-ds-xs text-[var(--content-secondary)] mt-0.5 line-clamp-2">{opportunity.description}</p>
        )}
        {savings != null && savings > 0 && (
          <p className="mt-1.5 text-ds-xs font-semibold text-emerald-600">
            ~{formatDuration(savings)} saved
          </p>
        )}
      </div>
    </div>
  );
}

// ── Section 6: Bottlenecks — see BottleneckContributionSection (R-C) below. ────
// The legacy flat BottlenecksSection was replaced by the ranked contribution view
// (BottleneckContributionSection) which subsumes its behavior and adds % share +
// the Primary-bottleneck badge while preserving the R-B run-count context.

// ── Section 7: Step Breakdown ──────────────────────────────────────────────────

function StepBreakdownSection({
  processOutput,
  intelligence,
}: {
  processOutput: ProcessOutputData | null | undefined;
  intelligence: IntelligenceData | null | undefined;
}) {
  const steps = asArray(processOutput?.processDefinition?.stepDefinitions);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const analytics = useReportAnalytics();

  // Build a bottleneck set for marking steps
  const bottleneckPositions = new Set(
    asArray(intelligence?.bottlenecks?.bottlenecks).map((b) => b.position),
  );

  if (steps.length === 0) {
    return (
      <div id="rpt-steps" className="scroll-mt-20">
        <SectionHeading>Step Breakdown</SectionHeading>
        <SkeletonCard message="No step definition data available." />
      </div>
    );
  }

  // Pre-compute phase-divider flags in a single pass BEFORE render, so the
  // render .map() stays a pure function (no outer-`let` mutation inside map —
  // Strict/Concurrent-mode safe). Replicates "last non-null phaseOrdinal".
  const showDividerByOrdinal = new Map<number, boolean>();
  let lastPhaseOrdinal: number | null = null;
  for (const step of steps) {
    showDividerByOrdinal.set(step.ordinal, step.phaseOrdinal != null && step.phaseOrdinal !== lastPhaseOrdinal);
    if (step.phaseOrdinal != null) lastPhaseOrdinal = step.phaseOrdinal;
  }

  return (
    <div id="rpt-steps" className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <SectionHeading>Step Breakdown</SectionHeading>
        <span className="mb-4 inline-flex items-center rounded-full bg-[var(--surface-secondary)] text-[var(--content-secondary)] text-[10px] font-semibold px-2 py-0.5">
          {steps.length} steps
        </span>
      </div>
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-lg overflow-hidden divide-y divide-[var(--border-subtle)]">
        {steps.map((step) => {
          const isBottleneck = bottleneckPositions.has(step.ordinal);
          const showPhaseDivider = showDividerByOrdinal.get(step.ordinal) ?? false;
          const isExpanded = expandedStep === step.ordinal;
          const phaseColorIdx = (step.phaseOrdinal ?? 1) - 1;
          const phaseAccent = PHASE_COLORS[phaseColorIdx % PHASE_COLORS.length] ?? 'bg-blue-500';
          const phaseText = PHASE_TEXT_COLORS[phaseColorIdx % PHASE_TEXT_COLORS.length] ?? 'text-blue-700';

          return (
            <div key={step.ordinal}>
              {/* Phase divider */}
              {showPhaseDivider && step.phaseName && (
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${phaseAccent}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${phaseText}`}>
                    {step.phaseName}
                  </span>
                </div>
              )}

              {/* Step row */}
              <button
                type="button"
                onClick={() => {
                  const willExpand = !isExpanded;
                  setExpandedStep(willExpand ? step.ordinal : null);
                  if (willExpand && analytics) {
                    track({
                      event: 'report_step_expanded',
                      workflowId: analytics.workflowId,
                      stepOrdinal: step.ordinal,
                      totalStepCount: steps.length,
                      elapsedMsSinceReportView: analytics.getElapsedMs(),
                    });
                  }
                }}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors"
              >
                {/* Ordinal badge */}
                <div
                  className={`flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold tabular-nums ${
                    isBottleneck
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]'
                  }`}
                >
                  {step.ordinal}
                </div>

                {/* Title */}
                <span className="flex-1 min-w-0 text-ds-sm text-[var(--content-primary)] truncate">
                  {step.title}
                </span>

                {/* Category chip */}
                {(step.categoryLabel ?? step.category) && (
                  <span className="flex-shrink-0 ds-tag ds-tag-neutral text-[10px]">
                    {step.categoryLabel ?? step.category?.replace(/_/g, ' ')}
                  </span>
                )}

                {/* System chip */}
                {step.system && (
                  <span className="flex-shrink-0 ds-tag ds-tag-brand text-[10px] hidden sm:inline-flex">
                    {step.system}
                  </span>
                )}

                {/* Confidence dot */}
                {step.confidence != null && (
                  <div
                    className={`flex-shrink-0 h-2 w-2 rounded-full ${
                      step.confidence >= 0.8
                        ? 'bg-emerald-400'
                        : step.confidence >= 0.6
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                    title={`${Math.round(step.confidence * 100)}% confidence`}
                  />
                )}

                {/* Duration */}
                {step.durationMs != null && (
                  <span className="flex-shrink-0 text-ds-xs text-[var(--content-tertiary)] tabular-nums w-14 text-right">
                    {formatDuration(step.durationMs)}
                  </span>
                )}

                <ChevronDown
                  className={`step-expand-chevron flex-shrink-0 h-4 w-4 text-[var(--content-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded detail (step-detail-panel). Wave 0 RPT-P0-2: the panel
                  renders ALWAYS but is hidden on screen when collapsed via
                  `hidden print:block`, so collapsed step evidence is never dropped
                  from the printed/PDF report. (It previously used conditional
                  render, which unmounted the node and broke print fidelity — CSS
                  cannot restore an unmounted subtree in print.) */}
              <div
                className={`step-detail-panel px-4 pb-4 pt-1 bg-[var(--surface-secondary)] border-t border-[var(--border-subtle)] ${
                  isExpanded ? '' : 'hidden print:block'
                }`}
              >
                  {step.evidence && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wide mb-1">Evidence</p>
                      <p className="text-ds-xs text-[var(--content-secondary)]">{step.evidence}</p>
                    </div>
                  )}
                  {step.instructions && step.instructions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wide mb-1">Instructions</p>
                      <div className="space-y-1">
                        {step.instructions.slice(0, 3).map((ins, i) => (
                          <p key={i} className="text-ds-xs text-[var(--content-secondary)]">{ins.text}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {!step.evidence && !(step.instructions?.length) && (
                    <p className="text-ds-xs text-[var(--content-tertiary)]">No additional detail available.</p>
                  )}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 8: Process Structure ───────────────────────────────────────────────

const FRICTION_TYPE_COLORS: Record<string, string> = {
  context_switching: 'bg-blue-50 text-blue-700',
  manual_data_entry: 'bg-amber-50 text-amber-700',
  wait_time: 'bg-red-50 text-red-700',
  rework: 'bg-orange-50 text-orange-700',
  unclear_ownership: 'bg-violet-50 text-violet-700',
};

const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-blue-50 text-blue-700',
};

function ProcessStructureSection({ interpretation }: { interpretation: InterpretationData | null | undefined }) {
  const friction = asArray(interpretation?.friction);
  const decisions = asArray(interpretation?.decisions);

  if (friction.length === 0 && decisions.length === 0) {
    return (
      <div id="rpt-structure" className="scroll-mt-20">
        <SectionHeading>Friction & Decisions</SectionHeading>
        <SkeletonCard message="No friction or decision data available." />
      </div>
    );
  }

  return (
    <div id="rpt-structure" className="scroll-mt-20">
      <SectionHeading>Friction & Decisions</SectionHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Friction Points */}
        <div>
          <h3 className="text-ds-sm font-semibold text-[var(--content-primary)] mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Friction Points
            {friction.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--content-secondary)]">
                {friction.length}
              </span>
            )}
          </h3>
          {friction.length === 0 ? (
            <p className="text-ds-sm text-[var(--content-tertiary)]">No friction points detected.</p>
          ) : (
            <div className="space-y-3">
              {friction.map((f, idx) => {
                const typeColor = FRICTION_TYPE_COLORS[f.type] ?? 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]';
                const sevClass = SEVERITY_BADGE_CLASSES[f.severity] ?? 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]';
                return (
                  <div key={idx} className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-md px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColor}`}>
                        {f.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${sevClass}`}>
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-ds-sm text-[var(--content-primary)]">{f.description}</p>
                    {f.evidence && (
                      <p className="text-ds-xs text-[var(--content-tertiary)] mt-1">{f.evidence}</p>
                    )}
                    {asArray(f.stepOrdinals).length > 0 && (
                      <p className="text-[10px] text-[var(--content-tertiary)] mt-1">
                        Steps: {asArray(f.stepOrdinals).join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Decision Points */}
        <div>
          <h3 className="text-ds-sm font-semibold text-[var(--content-primary)] mb-3 flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 text-brand-500" />
            Decision Points
            {decisions.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--content-secondary)]">
                {decisions.length}
              </span>
            )}
          </h3>
          {decisions.length === 0 ? (
            <p className="text-ds-sm text-[var(--content-tertiary)]">No decision points detected.</p>
          ) : (
            <div className="space-y-3">
              {decisions.map((d, idx) => (
                <div key={idx} className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-md px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[var(--surface-secondary)] text-[11px] font-bold text-[var(--content-secondary)]">
                      {d.stepOrdinal}
                    </div>
                    <span className="ds-tag ds-tag-brand text-[10px]">{d.decisionType}</span>
                  </div>
                  <p className="text-ds-sm font-medium text-[var(--content-primary)]">{d.stepTitle}</p>
                  {d.evidence && (
                    <p className="text-ds-xs text-[var(--content-tertiary)] mt-1">{d.evidence}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section 9: Rework Patterns ─────────────────────────────────────────────────

function ReworkPatternsSection({ interpretation }: { interpretation: InterpretationData | null | undefined }) {
  const rework = asArray(interpretation?.rework);
  if (rework.length === 0) return null;

  const totalOccurrences = rework.reduce((sum, r) => sum + r.occurrences, 0);

  return (
    <div id="rpt-rework" className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SectionHeading>Rework Patterns</SectionHeading>
        <span className="mb-4 inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5">
          {totalOccurrences} occurrences
        </span>
      </div>
      <div className="space-y-3">
        {rework.map((r, idx) => (
          <div key={idx} className="bg-[var(--surface-elevated)] border border-amber-200 rounded-ds-md px-4 py-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="ds-tag ds-tag-neutral text-[10px]">
                    {r.type.replace(/_/g, ' ')}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_BADGE_CLASSES[r.severity] ?? 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]'}`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-ds-sm text-[var(--content-primary)]">{r.description}</p>
                {r.evidence && (
                  <p className="text-ds-xs text-[var(--content-tertiary)] mt-1">{r.evidence}</p>
                )}
                {asArray(r.stepOrdinals).length > 0 && (
                  <p className="text-[10px] text-[var(--content-tertiary)] mt-1">
                    Steps: {asArray(r.stepOrdinals).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-2xl font-bold text-amber-600 tabular-nums">{r.occurrences}</p>
                <p className="text-[10px] text-[var(--content-tertiary)]">occurrences</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Time-leverage helper (shared by Lead Insight + Run Metrics) ───────────────

interface TimeLeverage {
  totalLabel: string;
  longestLabel: string;
  longestOrdinal: number;
  longestPct: number;
}

/**
 * The single highest-leverage timing signal: which step owns the most process
 * time, and what share. Prefers the authoritative `insights.timeBreakdown` from
 * the insights pipeline; otherwise computes deterministically from processOutput
 * step durations (single-run safe). Pure — no Date/random/env. Returns null when
 * there is no step timing to summarize.
 */
function deriveTimeLeverage(
  insights: InsightsData | null | undefined,
  processOutput: ProcessOutputData | null | undefined,
): TimeLeverage | null {
  const tb = insights?.timeBreakdown;
  if (tb) {
    return {
      totalLabel: tb.totalDurationLabel,
      longestLabel: tb.longestStepDurationLabel,
      longestOrdinal: tb.longestStepOrdinal,
      longestPct: tb.longestStepPercentage,
    };
  }
  const steps = asArray(processOutput?.processDefinition?.stepDefinitions);
  const totalStepMs = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  if (totalStepMs <= 0) return null;
  let longest: StepDefinition | null = null;
  for (const s of steps) {
    if ((s.durationMs ?? 0) > (longest?.durationMs ?? 0)) longest = s;
  }
  if (!longest) return null;
  return {
    totalLabel: formatDuration(totalStepMs),
    longestLabel: formatDuration(longest.durationMs ?? 0),
    longestOrdinal: longest.ordinal,
    longestPct: Math.round(((longest.durationMs ?? 0) / totalStepMs) * 100),
  };
}

// ── Section: Lead Insight ("Start here") ──────────────────────────────────────

interface LeadInsightSectionProps {
  insights: InsightsData | null | undefined;
  processOutput: ProcessOutputData | null | undefined;
}

/**
 * The one signal you can't miss — a prominent callout naming the step that owns
 * the most process time. Renders only when there is a clear leader (≥25% of
 * active step time). Pure render → hydration-safe.
 */
function LeadInsightSection({ insights, processOutput }: LeadInsightSectionProps) {
  const lev = deriveTimeLeverage(insights, processOutput);
  if (!lev || lev.longestPct < 25) return null;

  return (
    <div id="rpt-lead" className="scroll-mt-20">
      <div className="flex items-start gap-3 rounded-ds-lg border border-amber-200 bg-amber-50/60 px-5 py-4">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Zap className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">Start here</p>
          <p className="mt-1 text-ds-sm text-[var(--content-primary)]">
            <span className="font-semibold">Step {lev.longestOrdinal}</span> owns{' '}
            <span className="font-semibold">{lev.longestPct}%</span> of active process time
            {' '}({lev.longestLabel} of {lev.totalLabel}) — the highest-leverage place to optimize or automate first.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Section: Run Metrics ──────────────────────────────────────────────────────

interface RunMetricsSectionProps {
  insights: InsightsData | null | undefined;
  processOutput: ProcessOutputData | null | undefined;
  workflow: WorkflowSummary;
}

/**
 * Run Metrics — step-timing summary (count, avg, active step time, total elapsed,
 * longest step). Uses the shared time-leverage helper. Single-run + hydration-safe.
 *
 * Honesty (ANALYTICS P0-4): the summed step durations ("Active step time") and
 * the wall-clock run duration ("Total elapsed", workflow.durationMs) are
 * DIFFERENT numbers — idle/navigation gaps live between steps. They are now
 * labelled distinctly so two unlabelled figures are never shown side by side.
 */
function RunMetricsSection({ insights, processOutput, workflow }: RunMetricsSectionProps) {
  const steps = asArray(processOutput?.processDefinition?.stepDefinitions);
  const stepDurations = steps.map((s) => s.durationMs ?? 0).filter((d) => d > 0);
  const totalStepMs = stepDurations.reduce((sum, d) => sum + d, 0);
  const avgStepMs = stepDurations.length > 0 ? Math.round(totalStepMs / stepDurations.length) : 0;

  const leverage = deriveTimeLeverage(insights, processOutput);

  // No step timing and no time-breakdown → nothing meaningful to show.
  // (Mirrored in `visibleSections` so the TOC entry is hidden too.)
  if (stepDurations.length === 0 && insights?.timeBreakdown == null) {
    return null;
  }

  // The gap between wall-clock duration and summed step time, surfaced honestly
  // when both are known and the gap is material (≥ 1s) so the two numbers no
  // longer appear to silently contradict each other.
  const totalElapsedMs = workflow.durationMs;
  const gapMs =
    totalStepMs > 0 && totalElapsedMs > totalStepMs ? totalElapsedMs - totalStepMs : 0;

  return (
    <div id="rpt-metrics" className="report-no-print scroll-mt-20">
      <SectionHeading>Step Timing</SectionHeading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4">
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Steps analyzed</p>
          <p className="ds-metric-value">{steps.length}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Avg step</p>
          <p className="ds-metric-value">{avgStepMs > 0 ? formatDuration(avgStepMs) : '—'}</p>
        </div>
        {leverage != null && (
          <div className="card px-ds-4 py-ds-3">
            <p className="ds-metric-label">Active step time</p>
            <p className="ds-metric-value">{leverage.totalLabel}</p>
            <p className="text-ds-xs text-[var(--content-tertiary)]">Σ measured step durations</p>
          </div>
        )}
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Total elapsed</p>
          <p className="ds-metric-value">{formatDuration(totalElapsedMs)}</p>
          <p className="text-ds-xs text-[var(--content-tertiary)]">
            {gapMs > 1000
              ? `Wall-clock · ${formatDuration(gapMs)} between steps`
              : 'Wall-clock run duration'}
          </p>
        </div>
        {leverage != null && (
          <div className="card px-ds-4 py-ds-3">
            <p className="ds-metric-label">Longest step</p>
            <p className="ds-metric-value">{leverage.longestLabel}</p>
            <p className="text-ds-xs text-[var(--content-tertiary)]">
              Step {leverage.longestOrdinal} · {leverage.longestPct}% of step time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section: Variance & Variants ──────────────────────────────────────────────

/**
 * Variance & Variants — the multi-run story (how consistently the process runs
 * and how many distinct paths exist). Variance/variant figures are only
 * meaningful across ≥2 runs, so a single-run workflow gets an honest activation
 * nudge instead of trivial 100%/1-variant noise. Pure render → hydration-safe.
 */
function VarianceVariantsSection({ intelligence }: { intelligence: IntelligenceData | null | undefined }) {
  const variance = intelligence?.variance;
  const variants = intelligence?.variants;
  const variantList = asArray(variants?.variants);
  const runCount = intelligence?.metrics?.runCount ?? 1;
  const variantStepTitles = intelligence?.variantStepTitles;

  const hasIntel = variance != null || variantList.length > 0;
  if (!hasIntel) return null;

  if (runCount < 2) {
    return (
      <div id="rpt-variance" className="scroll-mt-20">
        <SectionHeading>Variance &amp; Variants</SectionHeading>
        <div className="card px-5 py-6 text-center">
          <p className="text-ds-sm text-[var(--content-secondary)]">
            Recorded once. Run this workflow again to unlock variance, variant paths, and trend analysis.
          </p>
        </div>
      </div>
    );
  }

  const stability = variance?.sequenceStability;
  const cv = variance?.durationVariance?.coefficientOfVariation;
  const highVar = variance?.highVarianceSteps?.length ?? 0;
  const standard = variantList.find((v) => v.isStandardPath);
  const variantCount = variants?.variantCount ?? variantList.length;
  const metrics = intelligence?.metrics;

  // Deterministic Pareto order: most-frequent first, stable tie-break by id.
  const sortedVariants = [...variantList].sort(
    (a, b) =>
      (b.frequency ?? 0) - (a.frequency ?? 0) ||
      (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0),
  );

  // Diverge → reconverge story (Phase 2): where runs leave and rejoin the standard path.
  const divergence = deriveDivergence(sortedVariants, runCount);

  // Variant frequency Pareto (R-B): human-readable labels (no raw hash), long
  // tail grouped into "Unique executions". Denominator = cohort run count.
  const paretoRows = buildParetoRows(
    variantList.map((v) => ({
      variantId: v.variantId,
      isStandardPath: v.isStandardPath,
      frequency: v.frequency,
      runCount: v.runCount,
      signature: v.pathSignature?.signature,
      stepCount: v.pathSignature?.stepCount,
      stepTitles: variantStepTitles?.[v.variantId],
    })),
    runCount,
  );

  return (
    <div id="rpt-variance" className="scroll-mt-20">
      <SectionHeading>Variance &amp; Variants</SectionHeading>
      <p className="mb-4 text-ds-sm text-[var(--content-secondary)]">
        {standard?.frequency != null ? (
          <>
            <span className="font-semibold text-[var(--content-primary)]">{Math.round(standard.frequency * 100)}%</span>{' '}
            of {runCount} runs follow the standard path across {variantCount} variant{variantCount !== 1 ? 's' : ''}.
          </>
        ) : (
          <>{variantCount} variant path{variantCount !== 1 ? 's' : ''} across {runCount} runs.</>
        )}
      </p>

      {/* Cross-run metrics (preserved from the retired IntelligenceTab) */}
      <div className="mb-ds-4 grid grid-cols-3 gap-ds-4">
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Runs analyzed</p>
          <p className="ds-metric-value">{metrics?.runCount ?? runCount}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Completion</p>
          <p className="ds-metric-value">
            {metrics?.completionRate != null ? `${Math.round(metrics.completionRate * 100)}%` : '—'}
          </p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Median duration</p>
          <p className="ds-metric-value">{metrics?.medianDurationMs ? formatDuration(metrics.medianDurationMs) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-ds-4">
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Sequence stability</p>
          <p className="ds-metric-value">{stability != null ? `${Math.round(stability * 100)}%` : '—'}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Duration CV</p>
          <p
            className={`ds-metric-value ${
              cv != null
                ? cv < 0.25
                  ? 'text-emerald-600'
                  : cv <= 0.5
                  ? 'text-amber-600'
                  : 'text-red-600'
                : ''
            }`}
          >
            {cv != null ? cv.toFixed(2) : '—'}
          </p>
          {cv != null && (
            <p className="text-ds-xs text-[var(--content-tertiary)]">
              {cvBand(cv)} · CV ≥ 0.50 = high variance
            </p>
          )}
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">High-variance steps</p>
          <p className="ds-metric-value">{highVar}</p>
        </div>
      </div>

      {paretoRows.length > 0 && (
        <div className="mt-ds-4">
          <h4 className="mb-ds-3 text-ds-sm font-semibold text-[var(--content-primary)]">
            How runs split across paths
          </h4>
          <div className="space-y-ds-2">
            {paretoRows.map((row) => (
              <div
                key={row.key}
                className={`rounded-ds-md border px-ds-4 py-ds-3 ${
                  row.isStandardPath
                    ? 'border-brand-200 bg-brand-50/30'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-primary)]'
                }`}
                {...(row.signatureTooltip ? { title: row.signatureTooltip } : {})}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-ds-sm font-medium text-[var(--content-primary)] flex items-center gap-ds-2">
                    <span className="truncate">{row.label}</span>
                    {row.isStandardPath && (
                      <span className="ds-tag ds-tag-brand text-[10px] flex flex-shrink-0 items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" />
                        Reference path
                      </span>
                    )}
                  </p>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-ds-sm font-semibold text-[var(--content-primary)] tabular-nums">
                      {row.percent}%
                    </p>
                    <p className="text-ds-xs text-[var(--content-tertiary)] tabular-nums">
                      {row.runCount} run{row.runCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {/* Plain-CSS Pareto bar — width = share of runs; reference path in brand. */}
                <div className="mt-ds-2 h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      row.isStandardPath
                        ? 'bg-brand-500'
                        : row.isGrouped
                        ? 'bg-[var(--content-tertiary)] opacity-50'
                        : 'bg-[var(--content-tertiary)] opacity-70'
                    }`}
                    style={{ width: `${Math.min(row.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diverge → reconverge: where runs leave the standard path and rejoin it. */}
      {divergence && (
        <div className="mt-ds-5">
          <h4 className="mb-ds-2 flex items-center gap-ds-2 text-ds-sm font-semibold text-[var(--content-primary)]">
            <GitBranch className="h-4 w-4 text-[var(--content-tertiary)]" />
            Where runs diverge
          </h4>
          <p className="mb-ds-3 text-ds-xs text-[var(--content-secondary)]">
            {Math.round(divergence.conformingPct * 100)}% of runs follow the standard path end-to-end. The rest branch off and rejoin:
          </p>

          {/* Standard-path spine */}
          <div className="mb-ds-3 flex flex-wrap items-center gap-1">
            {divergence.backbone.map((cat, i) => (
              <span key={`${cat}-${i}`} className="inline-flex items-center gap-1">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">{cat}</span>
                {i < divergence.backbone.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-[var(--content-tertiary)]" />
                )}
              </span>
            ))}
          </div>

          <div className="space-y-ds-2">
            {divergence.branches.map((b) => (
              <div key={b.key} className="card px-ds-4 py-ds-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-ds-sm text-[var(--content-primary)]">
                    After <span className="font-medium">{b.afterLabel}</span>
                    {b.altSteps.length > 0 ? (
                      <> → <span className="font-medium text-amber-600">{b.altSteps.join(' → ')}</span></>
                    ) : (
                      <> → <span className="font-medium text-amber-600">skip {b.skippedBackbone.join(', ')}</span></>
                    )}
                    {' '}→ rejoins at <span className="font-medium">{b.rejoinLabel}</span>
                  </p>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{Math.round(b.runShare * 100)}%</p>
                    <p className="text-ds-xs text-[var(--content-tertiary)]">
                      {b.runCount} run{b.runCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {b.dfgConfirmed && (
                  <p className="mt-1 text-[10px] text-[var(--content-tertiary)]">
                    Confirmed branch point (directly-follows graph)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Step Duration Analysis (timestudy) ───────────────────────────────

/**
 * Per-step mean/median/p90 across runs. Multi-run only — these statistics are
 * not meaningful for a single run (no spread, no real p90), so the section is
 * hidden below 2 runs. Pure render → hydration-safe.
 */
function TimestudySection({ intelligence }: { intelligence: IntelligenceData | null | undefined }) {
  const studies = intelligence?.timestudy?.stepPositionTimestudies ?? [];
  const runCount = intelligence?.metrics?.runCount ?? 1;
  if (studies.length === 0 || runCount < 2) return null;

  return (
    <div id="rpt-timestudy" className="scroll-mt-20">
      <SectionHeading>Step Duration Analysis</SectionHeading>
      <p className="mb-3 text-ds-xs text-[var(--content-tertiary)]">Per-step timing across {runCount} runs.</p>
      <div className="card overflow-hidden">
        <table className="w-full text-ds-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Step</th>
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Category</th>
              <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Mean</th>
              <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Median</th>
              <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">P90</th>
            </tr>
          </thead>
          <tbody>
            {studies.map((s) => (
              <tr key={s.position} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]">
                <td className="py-ds-2 px-ds-4 font-medium text-[var(--content-primary)] tabular-nums">{s.position}</td>
                <td className="py-ds-2 px-ds-4 text-[var(--content-secondary)]">{s.category ?? '—'}</td>
                <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums">{s.meanDurationMs ? formatDuration(s.meanDurationMs) : '—'}</td>
                <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums">{s.medianDurationMs ? formatDuration(s.medianDurationMs) : '—'}</td>
                <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums">{s.p90DurationMs ? formatDuration(s.p90DurationMs) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── R-C Section: Cycle-Time Distribution (deterministic SVG box/range plot) ───

const DISTRIBUTION_MARKER_COLORS: Record<string, string> = {
  min: 'var(--content-tertiary, #6b7280)',
  median: 'var(--accent, #16a34a)',
  mean: 'var(--content-secondary, #4b5563)',
  p90: 'var(--severity-warning, #d97706)',
  max: 'var(--content-tertiary, #6b7280)',
};

/**
 * Cycle-Time Distribution — an honest box/range plot of the engine's 5-number
 * summary (min / median / mean / p90 / max). This is NOT a fabricated histogram:
 * the engine does not expose per-run durations on this payload, so we plot the
 * summary spread deterministically in pure SVG/CSS. Median is the reference line.
 * Multi-run only (gated at runCount >= 2 by deriveDistribution). Hydration-safe.
 */
function CycleTimeDistributionSection({ figures }: { figures: LeadFigures }) {
  const dist: CycleTimeDistribution | null = deriveDistribution({
    runCount: figures.runCount,
    minDurationMs: figures.distribution.minDurationMs,
    medianDurationMs: figures.distribution.medianDurationMs,
    meanDurationMs: figures.distribution.meanDurationMs,
    p90DurationMs: figures.distribution.p90DurationMs,
    maxDurationMs: figures.distribution.maxDurationMs,
  });

  return (
    <div id="rpt-distribution" className="scroll-mt-20">
      <SectionHeading>Cycle-Time Spread</SectionHeading>
      {dist == null ? (
        <SkeletonCard message="Record this workflow again to see how run durations spread across runs." />
      ) : (
        <div className="card px-ds-5 py-ds-5">
          <p className="mb-ds-4 text-ds-xs text-[var(--content-tertiary)]">
            Run-duration envelope across {figures.runCount} runs · summary statistics, not per-run samples.
          </p>

          {/* Range track: min → max, with the median reference line. */}
          <div className="relative h-12">
            {/* Base track */}
            <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--surface-secondary)]" />
            {/* Filled span from min to max (the observed envelope) */}
            <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full">
              <div className="report-gradient-track h-full w-full bg-gradient-to-r from-[var(--surface-secondary)] via-brand-200 to-[var(--severity-warning,#d97706)]/40" />
            </div>
            {/* Markers */}
            {dist.markers.map((m) => (
              <div
                key={m.key}
                className="absolute top-0 flex h-full flex-col items-center"
                style={{ left: `${m.position}%`, transform: 'translateX(-50%)' }}
              >
                <span className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--content-tertiary)]">
                  {m.label}
                </span>
                <span
                  className={`block ${m.isReference ? 'h-5 w-[3px]' : 'h-3.5 w-[2px]'} rounded-full`}
                  style={{ background: DISTRIBUTION_MARKER_COLORS[m.key] ?? 'var(--content-tertiary)' }}
                  aria-hidden
                />
                <span className="mt-0.5 text-[10px] font-medium tabular-nums text-[var(--content-secondary)]">
                  {formatDuration(m.valueMs)}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-ds-4 text-ds-xs text-[var(--content-tertiary)]">
            The reference line marks the median ({formatDuration(figures.distribution.medianDurationMs ?? dist.minMs)}).
            Spread: {formatDuration(dist.minMs)} → {formatDuration(dist.maxMs)}.
          </p>
        </div>
      )}
    </div>
  );
}

// ── R-C Section: Consistency Gauge (reuses the HealthGauge SVG arc pattern) ────

const CONSISTENCY_BAND_COLOR: Record<ConsistencyBand, string> = {
  'Highly consistent': 'var(--accent, #16a34a)',
  'Mostly consistent': 'var(--accent, #16a34a)',
  'Moderate variance': 'var(--severity-warning, #d97706)',
  'High variance': 'var(--severity-danger, #dc2626)',
};

/**
 * Consistency gauge — a deterministic 0–100 score rendered with the same SVG arc
 * geometry pattern as the dashboard HealthGauge (no chart lib, no animation, no
 * Date/random). The score derives from sequenceStability and/or CV; the band word
 * matches the engine threshold. Multi-run only. Hydration-safe via useId-pinned id.
 */
function ConsistencyGaugeSection({ figures }: { figures: LeadFigures }) {
  const instanceId = useId().replace(/:/g, '');
  const consistency: ConsistencyScore | null = deriveConsistencyScore({
    runCount: figures.runCount,
    sequenceStability: figures.sequenceStability,
    coefficientOfVariation: figures.coefficientOfVariation,
  });

  if (consistency == null) {
    return (
      <div id="rpt-consistency" className="scroll-mt-20">
        <SectionHeading>Consistency</SectionHeading>
        <SkeletonCard message="Record this workflow again to compute a consistency score across runs." />
      </div>
    );
  }

  // Semicircular arc geometry (matches HealthGauge.arcGeometry).
  const size = 132;
  const strokeWidth = Math.max(6, Math.round(size * 0.1));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const arcLength = Math.PI * r;
  const filledLength = (consistency.score / 100) * arcLength;
  const height = size / 2 + strokeWidth;
  const color = CONSISTENCY_BAND_COLOR[consistency.band];

  const basisParts: string[] = [];
  if (consistency.basis.usedSequenceStability) basisParts.push('sequence stability');
  if (consistency.basis.usedCv) basisParts.push('duration variation');

  return (
    <div id="rpt-consistency" className="scroll-mt-20">
      <SectionHeading>Consistency</SectionHeading>
      <div className="card flex flex-col items-center gap-ds-2 px-ds-5 py-ds-5 sm:flex-row sm:items-center sm:gap-ds-6">
        {/* Arc gauge */}
        <div
          className="flex flex-col items-center"
          role="img"
          aria-label={`Consistency score: ${consistency.score} out of 100, ${consistency.band}`}
        >
          <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`} aria-hidden="true">
            <path
              d={path}
              fill="none"
              stroke="var(--border-subtle, #e5e7eb)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              id={`consistency-fill-${instanceId}`}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${filledLength} ${arcLength}`}
            />
          </svg>
          <div className="-mt-3 flex flex-col items-center">
            <span className="text-[28px] font-semibold leading-none tabular-nums text-[var(--content-primary)]">
              {consistency.score}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
              / 100
            </span>
          </div>
        </div>

        {/* Band + disclosure */}
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-ds-lg font-semibold text-[var(--content-primary)]" style={{ color }}>
            {consistency.band}
          </p>
          {consistency.cvBand != null && (
            <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
              Timing is {consistency.cvBand} (CV ≥ 0.50 = high variance).
            </p>
          )}
          <p className="mt-1 text-ds-xs text-[var(--content-tertiary)]">
            {basisParts.length > 0 ? `Derived from ${basisParts.join(' and ')} across ${figures.runCount} runs. ` : ''}
            Based on observed behavior, not a defined target.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── R-C Section: Insight Cards (Standardize / Automate / Investigate) ─────────

const INSIGHT_CARD_STYLES: Record<
  InsightCardType,
  { badge: string; border: string; label: string }
> = {
  standardize: {
    badge: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200',
    label: 'Standardize',
  },
  automate: {
    badge: 'bg-blue-50 text-blue-700',
    border: 'border-blue-200',
    label: 'Automate',
  },
  investigate: {
    badge: 'bg-violet-50 text-violet-700',
    border: 'border-violet-200',
    label: 'Investigate',
  },
};

/**
 * Insight cards — 0–3 honest, observed-only action cards built from real signals
 * (variant divergence, automation score/tag, high-variance steps, top bottleneck).
 * Each card: one-line finding + one-line recommendation + an evidence anchor (the
 * N runs / run-ids the finding is based on). Deterministic, hydration-safe.
 */
function InsightCardsSection({ figures }: { figures: LeadFigures }) {
  const cards: InsightCard[] = deriveInsightCards({
    runCount: figures.runCount,
    variantCount: figures.variantCount,
    dominantPathFrequency: figures.dominantPathFrequency,
    dominantPathRunCount: figures.dominantPathRunCount,
    automationScore: figures.automationScore,
    opportunityTag: figures.opportunityTag,
    topAutomationTitle: figures.topAutomationTitle,
    highVarianceStepCount: figures.highVarianceStepCount,
    topBottleneck: figures.topBottleneck,
    evidenceRunIds: figures.evidenceRunIds,
  });

  if (cards.length === 0) return null;

  return (
    <div id="rpt-insight-cards" className="scroll-mt-20">
      <SectionHeading>Key Actions</SectionHeading>
      <div className="grid grid-cols-1 gap-ds-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const style = INSIGHT_CARD_STYLES[card.type];
          return (
            <div
              key={card.key}
              className={`flex flex-col gap-ds-2 rounded-ds-lg border ${style.border} bg-[var(--surface-elevated)] px-ds-4 py-ds-4`}
            >
              <span
                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
              >
                {style.label}
              </span>
              <p className="text-ds-sm font-semibold text-[var(--content-primary)] leading-snug">
                {card.title}
              </p>
              <p className="text-ds-sm text-[var(--content-secondary)] leading-snug">{card.finding}</p>
              <p className="text-ds-xs text-[var(--content-secondary)] leading-snug">
                <span className="font-medium text-[var(--content-primary)]">Recommendation: </span>
                {card.recommendation}
              </p>
              {/* Evidence anchor — the runs the finding is based on. */}
              <div className="mt-auto border-t border-[var(--border-subtle)] pt-ds-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
                  Evidence
                </p>
                <p className="text-[11px] text-[var(--content-secondary)]">{card.evidence.label}</p>
                {card.evidence.runIds.length > 0 && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--content-tertiary)]" title={card.evidence.runIds.join(', ')}>
                    {card.evidence.runIds.join(' · ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── R-C Section: Bottleneck Contribution Ranking (CSS bars) ───────────────────

const BOTTLENECK_FLAG_CLASSES: Record<string, string> = {
  Both: 'bg-red-50 text-red-700',
  Slow: 'bg-amber-50 text-amber-700',
  Variable: 'bg-blue-50 text-blue-700',
};

/**
 * Bottleneck contribution ranking — a ranked CSS-bar view of the bottleneck
 * steps by share of total bottleneck cycle time. Extends the R-B BottleneckRow
 * run-count context into a ranked contribution view (top row = "Primary
 * bottleneck"). Deterministic, observed-only, hydration-safe.
 */
function BottleneckContributionSection({
  intelligence,
  processOutput,
  onRunIntelligence,
}: {
  intelligence: IntelligenceData | null | undefined;
  processOutput: ProcessOutputData | null | undefined;
  onRunIntelligence?: (() => void) | undefined;
}) {
  const bottlenecks = asArray(intelligence?.bottlenecks?.bottlenecks);
  const cohortRunCount = num(intelligence?.metrics?.runCount);

  const stepMap = new Map<number, StepDefinition>();
  asArray(processOutput?.processDefinition?.stepDefinitions).forEach((s) => stepMap.set(s.ordinal, s));

  const rows: BottleneckContributionRow[] = rankBottleneckContributions(
    bottlenecks.map((b) => ({
      position: b.position,
      title: stepMap.get(b.position)?.title ?? `Step ${b.position}`,
      system: stepMap.get(b.position)?.system,
      category: b.category ?? stepMap.get(b.position)?.category,
      meanDurationMs: b.meanDurationMs,
      runCount: b.runCount,
      isHighDuration: b.isHighDuration,
      isHighVariance: b.isHighVariance,
    })),
  );

  return (
    <div id="rpt-bottlenecks" className="scroll-mt-20">
      <SectionHeading>Bottlenecks</SectionHeading>
      {rows.length === 0 ? (
        <SkeletonCard
          message="No bottleneck data available. Run intelligence analysis to identify slow steps."
          {...(onRunIntelligence != null ? { onAction: onRunIntelligence, actionLabel: 'Run Analysis' } : {})}
        />
      ) : (
        <>
          <p className="mb-ds-3 text-ds-xs text-[var(--content-tertiary)]">
            Ranked by share of total bottleneck cycle time
            {cohortRunCount != null ? ` across ${cohortRunCount} runs` : ''}.
          </p>
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-lg overflow-hidden divide-y divide-[var(--border-subtle)]">
            {rows.map((row) => (
              <div key={row.position} className="px-ds-4 py-ds-3">
                <div className="flex items-center gap-ds-3">
                  {/* Rank badge */}
                  <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 border border-red-200 text-[11px] font-bold tabular-nums text-red-700">
                    {row.position}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-ds-2 flex-wrap">
                      <p className="min-w-0 truncate text-ds-sm font-medium text-[var(--content-primary)]">
                        {row.title}
                      </p>
                      {row.isPrimary && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          Primary bottleneck
                        </span>
                      )}
                      {row.flag && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            BOTTLENECK_FLAG_CLASSES[row.flag] ?? 'bg-[var(--surface-secondary)] text-[var(--content-secondary)]'
                          }`}
                        >
                          {row.flag}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-ds-2 flex-wrap text-[10px] text-[var(--content-tertiary)]">
                      {row.system && <span>{row.system}</span>}
                      {row.category && (
                        <span className="ds-tag ds-tag-neutral text-[10px]">{row.category.replace(/_/g, ' ')}</span>
                      )}
                      {row.runCount != null && (
                        <span>
                          {cohortRunCount != null
                            ? `appears in ${row.runCount} of ${cohortRunCount} runs`
                            : `${row.runCount} run${row.runCount !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-ds-sm font-semibold text-[var(--content-primary)] tabular-nums">
                      {row.percentOfTotal}%
                    </p>
                    <p className="text-[10px] text-[var(--content-tertiary)] tabular-nums">
                      {formatDuration(row.meanDurationMs)}
                    </p>
                  </div>
                </div>
                {/* Contribution bar */}
                <div className="mt-ds-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]" aria-hidden>
                  <div
                    className={`bottleneck-bar h-full rounded-full ${row.isPrimary ? 'bg-red-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(row.barWidth, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── R-C Section: Drift ────────────────────────────────────────────────────────

const DRIFT_SEVERITY_CLASSES: Record<DriftSeverity, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-blue-50 text-blue-700',
};

/**
 * Drift section — surfaces the engine's drift.driftSignals[] (timing / structural
 * / exception-rate / step-count), which the report never showed. Each signal:
 * type, severity, description, baseline → current. Honest empty state when there
 * are no signals (or no baseline window). Deterministic, hydration-safe.
 */
function DriftSection({ intelligence }: { intelligence: IntelligenceData | null | undefined }) {
  const runCount = num(intelligence?.metrics?.runCount) ?? 1;
  const signals: FormattedDriftSignal[] = formatDriftSignals(intelligence?.drift?.driftSignals);

  // Below 2 runs there is no observed window to compare; hide entirely so the nav
  // doesn't dangle (mirrored in visibleSections).
  if (runCount < 2) return null;

  return (
    <div id="rpt-drift" className="scroll-mt-20">
      <SectionHeading>Drift</SectionHeading>
      {signals.length === 0 ? (
        <div className="card px-ds-5 py-ds-5 text-center">
          <p className="text-ds-sm text-[var(--content-secondary)]">
            No significant drift detected across the observed run window.
          </p>
        </div>
      ) : (
        <div className="space-y-ds-2">
          {signals.map((sig) => (
            <div key={sig.key} className="card px-ds-4 py-ds-3">
              <div className="flex items-center gap-ds-2 flex-wrap mb-1">
                <span className="text-ds-sm font-semibold text-[var(--content-primary)]">{sig.typeLabel}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${DRIFT_SEVERITY_CLASSES[sig.severity]}`}
                >
                  {sig.severity}
                </span>
              </div>
              <p className="text-ds-sm text-[var(--content-secondary)]">{sig.description}</p>
              <p className="mt-1 text-ds-xs text-[var(--content-tertiary)] tabular-nums">
                Baseline <span className="font-medium text-[var(--content-secondary)]">{sig.baselineLabel}</span>
                {' → '}
                Current <span className="font-medium text-[var(--content-secondary)]">{sig.currentLabel}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agent intelligence helpers (migrated from AgentIntelligenceTab) ───────────

const AGENT_ROLE_COLORS: Record<string, string> = {
  executor: 'bg-green-100 text-green-800',
  assistant: 'bg-blue-100 text-blue-800',
  orchestrator: 'bg-purple-100 text-purple-800',
  monitor: 'bg-[var(--surface-secondary)] text-[var(--content-primary)]',
  specialist: 'bg-amber-100 text-amber-800',
};

const AGENT_SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const AGENT_READINESS_COLORS: Record<string, string> = {
  api_available: 'bg-green-100 text-green-800',
  sdk_available: 'bg-blue-100 text-blue-800',
  webhook_only: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-yellow-100 text-yellow-800',
  manual_only: 'bg-red-100 text-red-800',
};

function agentPill(label: string, colorClass: string) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        colorClass || 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'
      }`}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

// ── Section: Composed Agents ──────────────────────────────────────────────────

function ComposedAgentsSection({ agentIntelligence }: { agentIntelligence: AgentIntelligenceData | null | undefined }) {
  const agents = agentIntelligence?.agentComposition?.agents ?? [];
  if (agents.length === 0) return null;

  return (
    <div id="rpt-agents" className="scroll-mt-20">
      <SectionHeading>Composed Agents</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
        {agents.map((agent, i) => {
          const systems = asArray(agent.systems);
          const taskCount = agent.tasks?.length ?? 0;
          const skillCount = agent.skills?.length ?? 0;
          const capability = Math.min(agent.capabilityScore ?? 0, 100);
          return (
            <div key={i} className="card px-ds-4 py-ds-4 space-y-ds-2">
              <div className="flex items-start justify-between gap-ds-2">
                <div className="min-w-0">
                  <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{agent.agentName ?? `Agent ${i + 1}`}</p>
                  {agent.interactionMode && <p className="text-ds-xs text-[var(--content-secondary)]">{agent.interactionMode}</p>}
                </div>
                {agent.role && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium flex-shrink-0 ${
                      AGENT_ROLE_COLORS[agent.role] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'
                    }`}
                  >
                    {agent.role}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[var(--content-secondary)]">Capability</span>
                  <span className="text-[11px] font-medium text-[var(--content-primary)]">{agent.capabilityScore ?? 0}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)]">
                  <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${capability}%` }} />
                </div>
              </div>
              {systems.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {systems.map((sys) => (
                    <span key={sys} className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
                      {sys}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-ds-4 text-[11px] text-[var(--content-secondary)]">
                {taskCount > 0 && <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>}
                {skillCount > 0 && <span>{skillCount} skill{skillCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: Skill Library ────────────────────────────────────────────────────

function SkillLibrarySection({ agentIntelligence }: { agentIntelligence: AgentIntelligenceData | null | undefined }) {
  const lib = agentIntelligence?.skillLibrary;
  const skills = lib?.skills ?? [];
  if (skills.length === 0) return null;
  const uniqueCount = lib?.uniqueSkillCount ?? skills.length;
  const reusableCount = lib?.reusableSkillCount ?? 0;

  return (
    <div id="rpt-skills" className="scroll-mt-20">
      <SectionHeading>Skill Library</SectionHeading>
      <div className="flex items-center gap-ds-4 mb-ds-3 text-ds-xs text-[var(--content-secondary)]">
        <span><strong className="text-[var(--content-primary)]">{uniqueCount}</strong> unique skills</span>
        <span><strong className="text-[var(--content-primary)]">{reusableCount}</strong> reusable</span>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-ds-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Skill</th>
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden sm:table-cell">Type</th>
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium w-32">Reusability</th>
              <th className="text-center py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium w-16 hidden md:table-cell">Autonomous</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]">
                <td className="py-ds-2 px-ds-4 font-medium text-[var(--content-primary)]">{skill.skillName ?? '—'}</td>
                <td className="py-ds-2 px-ds-4 hidden sm:table-cell">{skill.skillType ? agentPill(skill.skillType, 'bg-indigo-100 text-indigo-800') : '—'}</td>
                <td className="py-ds-2 px-ds-4">
                  <div className="flex items-center gap-ds-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--surface-secondary)]">
                      <div className="h-1.5 rounded-full bg-brand-400" style={{ width: `${Math.min(skill.reusabilityScore ?? 0, 100)}%` }} />
                    </div>
                    <span className="tabular-nums text-[var(--content-secondary)] w-8 text-right">{skill.reusabilityScore ?? 0}</span>
                  </div>
                </td>
                <td className="py-ds-2 px-ds-4 text-center hidden md:table-cell">
                  {skill.autonomous ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-[var(--content-tertiary)] mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section: Integrations & Risks ─────────────────────────────────────────────

function IntegrationsSection({ agentIntelligence }: { agentIntelligence: AgentIntelligenceData | null | undefined }) {
  const ir = agentIntelligence?.integrationRisk;
  const integrations = asArray(ir?.integrations);
  const risks = asArray(ir?.risks);
  const overall = ir?.overallRiskLevel ?? '';
  if (integrations.length === 0 && risks.length === 0 && !overall) return null;

  return (
    <div id="rpt-integrations" className="scroll-mt-20">
      <SectionHeading>Integrations &amp; Risks</SectionHeading>
      <div className="space-y-ds-5">
        {overall && (
          <div
            className={`flex items-center gap-ds-2 rounded-lg px-ds-4 py-ds-3 text-ds-sm font-medium ${
              AGENT_SEVERITY_COLORS[overall] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'
            }`}
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Overall risk: <span className="capitalize">{overall}</span>
          </div>
        )}

        {integrations.length > 0 && (
          <div>
            <p className="text-ds-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wide mb-ds-2">Integrations</p>
            <div className="card overflow-hidden">
              <table className="w-full text-ds-xs">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
                    <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">System</th>
                    <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Readiness</th>
                    <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden sm:table-cell">Complexity</th>
                    <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden md:table-cell">Setup Time</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((integ, i) => {
                    const complexity = integ.complexity ?? 0;
                    return (
                      <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]">
                        <td className="py-ds-2 px-ds-4 font-medium text-[var(--content-primary)]">{integ.system ?? '—'}</td>
                        <td className="py-ds-2 px-ds-4">{integ.readiness ? agentPill(integ.readiness, AGENT_READINESS_COLORS[integ.readiness] ?? '') : '—'}</td>
                        <td className="py-ds-2 px-ds-4 hidden sm:table-cell">
                          {integ.complexity != null ? (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, dotIdx) => (
                                <div
                                  key={dotIdx}
                                  className={`h-2 w-2 rounded-full ${dotIdx < complexity ? 'bg-[var(--content-primary)]' : 'bg-[var(--surface-secondary)]'}`}
                                />
                              ))}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums hidden md:table-cell">
                          {integ.estimatedSetupTimeMs != null ? formatDuration(integ.estimatedSetupTimeMs) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {risks.length > 0 && (
          <div>
            <p className="text-ds-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wide mb-ds-2">Risks</p>
            <div className="space-y-ds-2">
              {risks.map((risk, i) => (
                <div key={i} className="card px-ds-4 py-ds-3">
                  <div className="flex items-start gap-ds-3">
                    <AlertTriangle
                      className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        risk.severity === 'critical' || risk.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-ds-2 flex-wrap">
                        <p className="text-ds-sm font-medium text-[var(--content-primary)]">{risk.title ?? '—'}</p>
                        {risk.severity && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              AGENT_SEVERITY_COLORS[risk.severity] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'
                            }`}
                          >
                            {risk.severity}
                          </span>
                        )}
                        {risk.category && (
                          <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
                            {risk.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section: Implementation Roadmap ───────────────────────────────────────────

function RoadmapSection({ agentIntelligence }: { agentIntelligence: AgentIntelligenceData | null | undefined }) {
  const roadmap = agentIntelligence?.artifacts?.roadmap ?? [];
  if (roadmap.length === 0) return null;

  return (
    <div id="rpt-roadmap" className="scroll-mt-20">
      <SectionHeading>Implementation Roadmap</SectionHeading>
      <div className="relative">
        <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-[var(--surface-secondary)]" aria-hidden />
        <div className="space-y-ds-4">
          {roadmap.map((phase, i) => {
            const prereqs = phase.prerequisites ?? [];
            return (
              <div key={i} className="relative flex items-start gap-ds-4">
                <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand-300 bg-[var(--surface-elevated)] text-ds-sm font-bold text-brand-700">
                  {phase.phase ?? i + 1}
                </div>
                <div className="card flex-1 px-ds-4 py-ds-3 mb-0">
                  <div className="flex items-start justify-between gap-ds-2 flex-wrap">
                    <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{phase.title ?? `Phase ${phase.phase ?? i + 1}`}</p>
                    {phase.estimatedEffort && <span className="text-[11px] text-[var(--content-secondary)] flex-shrink-0">{phase.estimatedEffort}</span>}
                  </div>
                  {phase.description && <p className="mt-ds-1 text-ds-xs text-[var(--content-secondary)]">{phase.description}</p>}
                  {prereqs.length > 0 && (
                    <div className="mt-ds-2 flex flex-wrap gap-1">
                      {prereqs.map((prereq, pi) => (
                        <span key={pi} className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
                          {prereq}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Section 10: Right Rail Navigator ──────────────────────────────────────────

/**
 * RightRailNavigator — grouped section nav (UX §4). Sections are grouped into
 * Summary / Health & Spread / Evidence / Actions via SECTION_GROUPS; a group
 * label renders only when ≥1 of its IDs is visible. Reads `visibleSections` (the
 * report's source of truth) — it never re-derives visibility.
 */
function RightRailNavigator({
  visibleSections,
  activeId,
}: {
  visibleSections: readonly string[];
  activeId: string | null;
}) {
  const analytics = useReportAnalytics();
  const groups = useMemo(() => groupVisibleSections(visibleSections), [visibleSections]);

  return (
    <nav className="report-no-print hidden xl:block sticky top-20 w-52 flex-shrink-0">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
        Report sections
      </p>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mt-4 mb-1 px-3 text-[8px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)]">
            {group.label}
          </p>
          <ul>
            {group.ids.map((id) => {
              const isActive = activeId === id;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (analytics) {
                        track({
                          event: 'report_nav_used',
                          workflowId: analytics.workflowId,
                          targetSectionId: id,
                          navSurface: 'right_rail',
                          elapsedMsSinceReportView: analytics.getElapsedMs(),
                        });
                      }
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`block border-l-2 pl-5 py-0.5 text-[11px] transition-colors ${
                      isActive
                        ? 'border-brand-500 text-brand-600 font-semibold'
                        : 'border-transparent text-[var(--content-tertiary)] hover:text-[var(--content-secondary)]'
                    }`}
                  >
                    {SECTION_LABELS[id] ?? id}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * MobileSectionTOC — a sticky grouped pill strip for < 1280px (xl:hidden), where
 * the right rail is not shown. Tapping a pill opens a dropdown of that group's
 * section entries; selecting one smooth-scrolls and closes. Hidden in print.
 *
 * Render-stable: no Date/random; the open-group is plain UI state.
 */
function MobileSectionTOC({ visibleSections }: { visibleSections: readonly string[] }) {
  const groups = useMemo(() => groupVisibleSections(visibleSections), [visibleSections]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const analytics = useReportAnalytics();

  if (groups.length === 0) return null;

  return (
    <nav className="report-no-print xl:hidden sticky top-0 z-30 -mx-4 mb-2 border-b border-[var(--border-subtle)] bg-white/95 px-4 py-2 backdrop-blur-sm">
      <p className="sr-only">Report sections</p>
      <div className="flex flex-wrap gap-1.5">
        {groups.map((group) => {
          const isOpen = openGroup === group.label;
          return (
            <div key={group.label} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenGroup(isOpen ? null : group.label)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  isOpen
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-[var(--border-subtle)] text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
                }`}
              >
                {group.label}
              </button>
              {isOpen && (
                <ul className="absolute left-0 top-full z-40 mt-1 min-w-[180px] rounded-ds-md border border-[var(--border-subtle)] bg-white py-1 shadow-lg">
                  {group.ids.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (analytics) {
                            track({
                              event: 'report_nav_used',
                              workflowId: analytics.workflowId,
                              targetSectionId: id,
                              navSurface: 'mobile_toc',
                              elapsedMsSinceReportView: analytics.getElapsedMs(),
                            });
                          }
                          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                          setOpenGroup(null);
                        }}
                        className="block w-full px-4 py-2 text-left text-[12px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)]"
                      >
                        {SECTION_LABELS[id] ?? id}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

/**
 * WorkflowReportPage — consolidated single-scroll process intelligence report.
 *
 * Replaces ReportTab in the workflow detail view when all artifacts are available.
 * Each section handles its own empty/missing data state independently.
 */
export function WorkflowReportPage({
  workflow,
  insights,
  interpretation,
  intelligence,
  agentIntelligence,
  processOutput,
  onRunIntelligence,
  onRunAgentIntelligence,
}: WorkflowReportPageProps) {
  // Only list a section in the right-rail nav when it will actually render
  // meaningful content (avoids dead/placeholder nav links). Memoized so the
  // array identity is stable across the async intelligence/agent fetches —
  // otherwise the scroll-spy IntersectionObserver is torn down and rebuilt on
  // every data update, losing scroll position.
  // Single observed-only derivation feeding BOTH the verdict and the scorecard,
  // so the two decision-grade lead cards never disagree. Memoized for identity
  // stability across the async intelligence/agent fetches.
  const leadFigures = useMemo(
    () => deriveLeadFigures(intelligence, agentIntelligence, processOutput),
    [intelligence, agentIntelligence, processOutput],
  );

  // Single deterministic time-leverage derivation (Wave 0 RPT-P1-9): previously
  // computed twice (the rpt-lead gate + the print lead). One memo, two consumers.
  const timeLeverage = useMemo(
    () => deriveTimeLeverage(insights, processOutput),
    [insights, processOutput],
  );

  // Report-view zero-point for elapsed-time analytics (set in the mount effect).
  const reportViewTimestampRef = useRef<number>(0);

  // Deterministic, hydration-safe report metadata (print/PDF header + footer +
  // screen sub-header + screen footer). Single recorded date, never a fabricated
  // range. Exact GROWTH copy. Memoized for identity stability.
  const reportMeta: ReportMeta = useMemo(
    () => buildReportMeta({ runCount: leadFigures.runCount, createdAt: workflow.createdAt }),
    [leadFigures.runCount, workflow.createdAt],
  );

  const roiSteps: RoiStep[] = useMemo(
    () =>
      asArray(processOutput?.processDefinition?.stepDefinitions)
        .filter((s) => (s.durationMs ?? 0) > 0)
        .map((s) => ({ ordinal: s.ordinal, title: s.title, durationMs: s.durationMs ?? 0 })),
    [processOutput],
  );
  const roiObservedRuns = num(intelligence?.metrics?.runCount) ?? null;

  const visibleSections = useMemo(
    () =>
      SECTION_IDS.filter((id) => {
        // Verdict + scorecard always render (single-run shows honest "—" states).
        if (id === 'rpt-verdict' || id === 'rpt-scorecard') return true;
        if (id === 'rpt-scores') return interpretation?.scores != null;
        if (id === 'rpt-phases') return (interpretation?.phases?.length ?? 0) > 0;
        if (id === 'rpt-structure') {
          return (interpretation?.friction?.length ?? 0) > 0 || (interpretation?.decisions?.length ?? 0) > 0;
        }
        if (id === 'rpt-rework') return (interpretation?.rework?.length ?? 0) > 0;
        if (id === 'rpt-lead') {
          return timeLeverage != null && timeLeverage.longestPct >= 25;
        }
        if (id === 'rpt-metrics') {
          const hasStepTiming = asArray(processOutput?.processDefinition?.stepDefinitions).some(
            (s) => (s.durationMs ?? 0) > 0,
          );
          return hasStepTiming || insights?.timeBreakdown != null;
        }
        if (id === 'rpt-roi') {
          // ROI needs per-step durations to compute effort + what-if.
          return asArray(processOutput?.processDefinition?.stepDefinitions).some((s) => (s.durationMs ?? 0) > 0);
        }
        if (id === 'rpt-variance') {
          return intelligence?.variance != null || (intelligence?.variants?.variants?.length ?? 0) > 0;
        }
        if (id === 'rpt-distribution') {
          // Mirrors deriveDistribution gating: ≥2 runs AND a real min/max envelope.
          return (
            deriveDistribution({
              runCount: leadFigures.runCount,
              minDurationMs: leadFigures.distribution.minDurationMs,
              medianDurationMs: leadFigures.distribution.medianDurationMs,
              meanDurationMs: leadFigures.distribution.meanDurationMs,
              p90DurationMs: leadFigures.distribution.p90DurationMs,
              maxDurationMs: leadFigures.distribution.maxDurationMs,
            }) != null
          );
        }
        if (id === 'rpt-consistency') {
          // Mirrors deriveConsistencyScore gating.
          return (
            deriveConsistencyScore({
              runCount: leadFigures.runCount,
              sequenceStability: leadFigures.sequenceStability,
              coefficientOfVariation: leadFigures.coefficientOfVariation,
            }) != null
          );
        }
        if (id === 'rpt-insight-cards') {
          // Mirrors deriveInsightCards — list only when ≥1 honest card renders.
          return (
            deriveInsightCards({
              runCount: leadFigures.runCount,
              variantCount: leadFigures.variantCount,
              dominantPathFrequency: leadFigures.dominantPathFrequency,
              dominantPathRunCount: leadFigures.dominantPathRunCount,
              automationScore: leadFigures.automationScore,
              opportunityTag: leadFigures.opportunityTag,
              topAutomationTitle: leadFigures.topAutomationTitle,
              highVarianceStepCount: leadFigures.highVarianceStepCount,
              topBottleneck: leadFigures.topBottleneck,
              evidenceRunIds: leadFigures.evidenceRunIds,
            }).length > 0
          );
        }
        if (id === 'rpt-drift') {
          // Mirrors DriftSection: ≥2 runs (always render the honest empty state
          // above the threshold so users see "no drift detected").
          return (intelligence?.metrics?.runCount ?? 1) >= 2;
        }
        if (id === 'rpt-timestudy') {
          const studies = intelligence?.timestudy?.stepPositionTimestudies?.length ?? 0;
          return studies > 0 && (intelligence?.metrics?.runCount ?? 1) >= 2;
        }
        if (id === 'rpt-agents') return (agentIntelligence?.agentComposition?.agents?.length ?? 0) > 0;
        if (id === 'rpt-skills') return (agentIntelligence?.skillLibrary?.skills?.length ?? 0) > 0;
        if (id === 'rpt-integrations') {
          const ir = agentIntelligence?.integrationRisk;
          return (ir?.integrations?.length ?? 0) > 0 || (ir?.risks?.length ?? 0) > 0 || !!ir?.overallRiskLevel;
        }
        if (id === 'rpt-roadmap') return (agentIntelligence?.artifacts?.roadmap?.length ?? 0) > 0;
        return true;
      }),
    [insights, interpretation, intelligence, agentIntelligence, processOutput, leadFigures, timeLeverage],
  );

  // Whether the AI intelligence layer produced any renderable content (used by
  // the report_viewed event; PII-free boolean).
  const hasAgentIntelligence =
    (agentIntelligence?.agentComposition?.agents?.length ?? 0) > 0 ||
    (agentIntelligence?.skillLibrary?.skills?.length ?? 0) > 0 ||
    (agentIntelligence?.opportunities?.opportunities?.length ?? 0) > 0 ||
    (agentIntelligence?.artifacts?.roadmap?.length ?? 0) > 0;

  // Print-header "Start here" lead callout (UX §1.6) — same computation as the
  // on-screen LeadInsightSection, rendered inline in print only.
  const printLead = timeLeverage;
  const hasPrintLead = printLead != null && printLead.longestPct >= 25;

  // ── report_viewed — fire exactly once per mount (ANALYTICS_RD §1.1). ──────────
  // Guarded by a ref + an empty-ish dep keyed on workflow.id so tab re-renders
  // and async intelligence fetches do not re-fire. PII-free: opaque id + numeric
  // aggregates + a boolean only.
  const reportViewedFiredRef = useRef(false);
  useEffect(() => {
    if (reportViewedFiredRef.current) return;
    if (!workflow.id) return;
    reportViewedFiredRef.current = true;
    reportViewTimestampRef.current = Date.now();
    track({
      event: 'report_viewed',
      workflowId: workflow.id,
      runCount: leadFigures.runCount,
      sectionCount: visibleSections.length,
      hasAgentIntelligence,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id]);

  // ── Scroll-spy hoisted to the page (Wave 0 RPT-P0-1) ──────────────────────────
  // One IntersectionObserver over the memoized visibleSections (stable ref),
  // shared with the right rail and used to emit report_section_viewed on all
  // viewports (the right rail is xl-only, so the spy could not live only there).
  const activeSectionId = useScrollSpy(visibleSections);

  const reportAnalyticsValue = useMemo<ReportAnalyticsCtx>(
    () => ({
      workflowId: workflow.id,
      getElapsedMs: () => Date.now() - (reportViewTimestampRef.current || Date.now()),
    }),
    [workflow.id],
  );

  // report_section_viewed — fire once per section entry, with a dwell guard so
  // fast scroll-through does not over-count. PII-free (id + label + run count).
  const lastSectionFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!workflow.id || !activeSectionId) return;
    if (lastSectionFiredRef.current === activeSectionId) return;
    const sectionId = activeSectionId;
    const timer = setTimeout(() => {
      lastSectionFiredRef.current = sectionId;
      track({
        event: 'report_section_viewed',
        workflowId: workflow.id,
        sectionId,
        sectionLabel: SECTION_LABELS[sectionId] ?? sectionId,
        runCount: leadFigures.runCount,
        elapsedMsSinceReportView: Date.now() - (reportViewTimestampRef.current || Date.now()),
      });
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId, workflow.id]);

  // report_scroll_depth — 25/50/75/100 milestones, each fired once per mount.
  const scrollDepthFiredRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!workflow.id) return;
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (doc.scrollTop / max) * 100;
      for (const milestone of [25, 50, 75, 100] as const) {
        if (pct + 0.5 >= milestone && !scrollDepthFiredRef.current.has(milestone)) {
          scrollDepthFiredRef.current.add(milestone);
          track({
            event: 'report_scroll_depth',
            workflowId: workflow.id,
            depthPct: milestone,
            elapsedMsSinceReportView: Date.now() - (reportViewTimestampRef.current || Date.now()),
            visibleSectionCount: visibleSections.length,
          });
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id, visibleSections.length]);

  return (
    <ReportAnalyticsContext.Provider value={reportAnalyticsValue}>
    <div className="report-print-root flex gap-8 items-start">
      {/* ── Print-only page header (UX §1.4) — hidden on screen. ─────────────── */}
      <div className="report-print-header hidden print:block" aria-hidden>
        <p className="text-[11pt] font-semibold uppercase tracking-wide text-gray-600">
          Ledgerium AI — Process Intelligence Report
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[16pt] font-bold text-gray-900">{workflow.title}</p>
          <p className="text-[9pt] text-gray-500">{reportMeta.recordedDate}</p>
        </div>
        {hasPrintLead && (
          <p className="report-print-lead mt-1 text-[9pt] text-gray-700">
            Start here: Step {printLead!.longestOrdinal} owns {printLead!.longestPct}% of active
            process time ({printLead!.longestLabel} of {printLead!.totalLabel}).
          </p>
        )}
      </div>

      {/* Mobile TOC (xl:hidden) — grouped, sticky; hidden in print. */}
      <MobileSectionTOC visibleSections={visibleSections} />

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-10">
        {/* Title framing (GROWTH §4) — document-type label + workflow sub-label +
            run-count/evidence/date sub-header. The page-level <h1> in page.tsx owns
            the workflow title for the route; this frames the Report as a document
            category without introducing a second <h1>. Hidden in print (the print
            header carries the document identity). */}
        <div className="report-no-print">
          <h2 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">
            Process Intelligence Report
          </h2>
          <p className="mt-0.5 text-ds-sm text-[var(--content-secondary)]">{workflow.title}</p>
          <p className="mt-1 text-ds-xs text-[var(--content-tertiary)]">{reportMeta.subHeader}</p>
        </div>
        <ExecutiveVerdictSection figures={leadFigures} />
        {/* Wave 1 lead-first: the "Start Here" action callout sits directly under
            the verdict, before the metric grid (scorecard + hero band). */}
        <LeadInsightSection insights={insights} processOutput={processOutput} />
        <ReportScorecardSection figures={leadFigures} />
        <HeroSection workflow={workflow} />
        <InsightCardsSection figures={leadFigures} />
        <ProcessScoresSection interpretation={interpretation} />
        <PhaseTimelineSection interpretation={interpretation} />
        <RunMetricsSection insights={insights} processOutput={processOutput} workflow={workflow} />
        <CycleTimeDistributionSection figures={leadFigures} />
        <ConsistencyGaugeSection figures={leadFigures} />
        <VarianceVariantsSection intelligence={intelligence} />
        <DriftSection intelligence={intelligence} />
        <TimestudySection intelligence={intelligence} />
        <InsightsFeedSection insights={insights} intelligence={intelligence} />
        <AutomationSection
          agentIntelligence={agentIntelligence}
          intelligence={intelligence}
          onRunAgentIntelligence={onRunAgentIntelligence}
        />
        <RoiSection steps={roiSteps} observedRuns={roiObservedRuns} />
        <BottleneckContributionSection
          intelligence={intelligence}
          processOutput={processOutput}
          onRunIntelligence={onRunIntelligence}
        />
        <StepBreakdownSection processOutput={processOutput} intelligence={intelligence} />
        <ProcessStructureSection interpretation={interpretation} />
        <ReworkPatternsSection interpretation={interpretation} />
        <ComposedAgentsSection agentIntelligence={agentIntelligence} />
        <SkillLibrarySection agentIntelligence={agentIntelligence} />
        <IntegrationsSection agentIntelligence={agentIntelligence} />
        <RoadmapSection agentIntelligence={agentIntelligence} />

        {/* Screen footer — GROWTH §5e (run count + observed-behavior claim). */}
        <footer className="report-no-print text-[10px] text-[var(--content-tertiary)] pb-4 border-t border-[var(--border-subtle)] pt-4">
          {reportMeta.screenFooter}
        </footer>
      </div>

      {/* Right rail — grouped section nav (hidden xl:block; hidden in print). */}
      <RightRailNavigator visibleSections={visibleSections} activeId={activeSectionId} />

      {/* ── Print-only honesty footer (UX §1.7 / GROWTH §3) — fixed on every page. */}
      <div className="report-print-footer hidden print:flex" aria-hidden>
        <span className="report-print-footer-meta">{reportMeta.footerLine1}</span>
        <span className="report-print-footer-disclosure">{reportMeta.footerLine2}</span>
      </div>
    </div>
    </ReportAnalyticsContext.Provider>
  );
}
