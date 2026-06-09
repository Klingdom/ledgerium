'use client';

import { useRef, useState } from 'react';
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
} from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { ProcessHealthScoreBar } from '@/components/shared/ProcessHealthScoreBar';
import { InsightActionCard, type InsightActionCardInsight } from '@/components/shared/InsightActionCard';
import { AutomationScoreChip } from '@/components/shared/AutomationScoreChip';
import { BottleneckRow } from '@/components/shared/BottleneckRow';

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
}

interface IntelligenceMetrics {
  medianDurationMs?: number;
  meanDurationMs?: number;
  medianStepCount?: number;
  meanStepCount?: number;
  runCount?: number;
  completionRate?: number;
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
  durationVariance?: { coefficientOfVariation?: number };
  highVarianceSteps?: unknown[];
}

interface IntelligenceVariant {
  variantId: string;
  isStandardPath?: boolean;
  pathSignature?: { signature?: string };
  frequency?: number;
  runCount?: number;
}

interface IntelligenceData {
  metrics?: IntelligenceMetrics;
  timestudy?: { stepPositionTimestudies?: TimestudyStep[] };
  variance?: IntelligenceVariance;
  variants?: { variantCount?: number; variants?: IntelligenceVariant[] };
  bottlenecks?: {
    bottlenecks?: IntelligenceBottleneck[];
  };
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
  report: Record<string, unknown> | null | undefined;
  insights: InsightsData | null | undefined;
  interpretation: InterpretationData | null | undefined;
  intelligence: IntelligenceData | null | undefined;
  agentIntelligence: AgentIntelligenceData | null | undefined;
  processOutput: ProcessOutputData | null | undefined;
  sop: Record<string, unknown> | null | undefined;
  onRunIntelligence?: (() => void) | undefined;
  onRunAgentIntelligence?: (() => void) | undefined;
}

// ── Section IDs (for scroll spy) ──────────────────────────────────────────────

const SECTION_IDS = [
  'rpt-hero',
  'rpt-lead',
  'rpt-scores',
  'rpt-phases',
  'rpt-metrics',
  'rpt-variance',
  'rpt-timestudy',
  'rpt-insights',
  'rpt-automation',
  'rpt-bottlenecks',
  'rpt-steps',
  'rpt-structure',
  'rpt-rework',
  'rpt-agents',
  'rpt-skills',
  'rpt-integrations',
  'rpt-roadmap',
] as const;

const SECTION_LABELS: Record<string, string> = {
  'rpt-hero': 'Overview',
  'rpt-lead': 'Start Here',
  'rpt-scores': 'Process Health',
  'rpt-phases': 'Phase Timeline',
  'rpt-metrics': 'Run Metrics',
  'rpt-variance': 'Variance & Variants',
  'rpt-timestudy': 'Step Duration',
  'rpt-insights': 'Insights',
  'rpt-automation': 'Automation',
  'rpt-bottlenecks': 'Bottlenecks',
  'rpt-steps': 'Step Breakdown',
  'rpt-structure': 'Friction & Decisions',
  'rpt-rework': 'Rework Patterns',
  'rpt-agents': 'Composed Agents',
  'rpt-skills': 'Skill Library',
  'rpt-integrations': 'Integrations & Risks',
  'rpt-roadmap': 'Implementation Roadmap',
};

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

  // Animated counters — refs attached to parent container
  const [durationSec] = useCountUp(Math.round(workflow.durationMs / 1000), 800);
  const [steps] = useCountUp(workflow.stepCount, 700);
  const [phases] = useCountUp(workflow.phaseCount, 700, { delay: 100 });
  const [confValue] = useCountUp(confidencePct, 900, { delay: 150 });

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
      className="bg-gradient-to-br from-brand-50/80 to-white border border-blue-100 rounded-ds-lg px-6 py-5"
    >
      {/* Title row */}
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-ds-2xl font-bold tracking-tight text-[var(--content-primary)]">{workflow.title}</h1>
      </div>

      {/* Interpretive lead sentence */}
      <p className="mt-1 max-w-3xl text-ds-sm text-[var(--content-secondary)]">{leadSentence}</p>

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
        <SectionHeading>Process Intelligence</SectionHeading>
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
      <SectionHeading>Process Intelligence</SectionHeading>
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

function InsightsFeedSection({ insights }: { insights: InsightsData | null | undefined }) {
  const [activeCategory, setActiveCategory] = useState('all');

  if (!insights || !insights.hasInsights) {
    return (
      <div id="rpt-insights" className="scroll-mt-20">
        <SectionHeading>Insights</SectionHeading>
        <div className="bg-emerald-50 border border-emerald-200 rounded-ds-lg px-6 py-8 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-3" />
          <h3 className="text-ds-base font-medium text-[var(--content-primary)]">No inefficiencies detected</h3>
          <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
            {insights?.noInsightsMessage ?? 'This workflow appears well-structured.'}
          </p>
        </div>
      </div>
    );
  }

  const allInsights = insights.insights ?? [];
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

  const normalizedInsights: InsightActionCardInsight[] = filtered.map((ins, idx) => ({
    id: String(idx),
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
        <div className="flex items-center gap-2 mb-4">
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
            onClick={() => setActiveCategory(cat.key)}
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
            <AutomationOpportunityCard key={idx} opportunity={opp} />
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

// ── Section 6: Bottlenecks ─────────────────────────────────────────────────────

function BottlenecksSection({
  intelligence,
  processOutput,
  onRunIntelligence,
}: {
  intelligence: IntelligenceData | null | undefined;
  processOutput: ProcessOutputData | null | undefined;
  onRunIntelligence?: (() => void) | undefined;
}) {
  const bottlenecks = intelligence?.bottlenecks?.bottlenecks ?? [];

  // Build a title lookup from step definitions
  const stepMap = new Map<number, StepDefinition>();
  (processOutput?.processDefinition?.stepDefinitions ?? []).forEach((s) => {
    stepMap.set(s.ordinal, s);
  });

  return (
    <div id="rpt-bottlenecks" className="scroll-mt-20">
      <SectionHeading>Bottlenecks</SectionHeading>
      {bottlenecks.length === 0 ? (
        <SkeletonCard
          message="No bottleneck data available. Run intelligence analysis to identify slow steps."
          {...(onRunIntelligence != null ? { onAction: onRunIntelligence, actionLabel: 'Run Analysis' } : {})}
        />
      ) : (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-lg overflow-hidden divide-y divide-[var(--border-subtle)]">
          {bottlenecks.map((b) => {
            const step = stepMap.get(b.position);
            return (
              <BottleneckRow
                key={b.position}
                position={b.position}
                title={step?.title ?? `Step ${b.position}`}
                system={step?.system}
                durationMs={b.meanDurationMs}
                averageDurationMs={b.overallMeanStepDurationMs}
                category={b.category ?? step?.category}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section 7: Step Breakdown ──────────────────────────────────────────────────

function StepBreakdownSection({
  processOutput,
  intelligence,
}: {
  processOutput: ProcessOutputData | null | undefined;
  intelligence: IntelligenceData | null | undefined;
}) {
  const steps = processOutput?.processDefinition?.stepDefinitions ?? [];
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Build a bottleneck set for marking steps
  const bottleneckPositions = new Set(
    (intelligence?.bottlenecks?.bottlenecks ?? []).map((b) => b.position),
  );

  if (steps.length === 0) {
    return (
      <div id="rpt-steps" className="scroll-mt-20">
        <SectionHeading>Step Breakdown</SectionHeading>
        <SkeletonCard message="No step definition data available." />
      </div>
    );
  }

  let lastPhaseOrdinal: number | null = null;

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
          const showPhaseDivider =
            step.phaseOrdinal != null && step.phaseOrdinal !== lastPhaseOrdinal;
          if (step.phaseOrdinal != null) lastPhaseOrdinal = step.phaseOrdinal;
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
                onClick={() => setExpandedStep(isExpanded ? null : step.ordinal)}
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
                  className={`flex-shrink-0 h-4 w-4 text-[var(--content-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-[var(--surface-secondary)] border-t border-[var(--border-subtle)]">
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
              )}
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
  const friction = interpretation?.friction ?? [];
  const decisions = interpretation?.decisions ?? [];

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
                    {f.stepOrdinals.length > 0 && (
                      <p className="text-[10px] text-[var(--content-tertiary)] mt-1">
                        Steps: {f.stepOrdinals.join(', ')}
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
  const rework = interpretation?.rework ?? [];
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
                {r.stepOrdinals.length > 0 && (
                  <p className="text-[10px] text-[var(--content-tertiary)] mt-1">
                    Steps: {r.stepOrdinals.join(', ')}
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
  const steps = processOutput?.processDefinition?.stepDefinitions ?? [];
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
}

/**
 * Run Metrics — step-timing summary (count, avg, active time, longest step).
 * Uses the shared time-leverage helper. Single-run safe and hydration-safe.
 */
function RunMetricsSection({ insights, processOutput }: RunMetricsSectionProps) {
  const steps = processOutput?.processDefinition?.stepDefinitions ?? [];
  const stepDurations = steps.map((s) => s.durationMs ?? 0).filter((d) => d > 0);
  const totalStepMs = stepDurations.reduce((sum, d) => sum + d, 0);
  const avgStepMs = stepDurations.length > 0 ? Math.round(totalStepMs / stepDurations.length) : 0;

  const leverage = deriveTimeLeverage(insights, processOutput);

  // No step timing and no time-breakdown → nothing meaningful to show.
  // (Mirrored in `visibleSections` so the TOC entry is hidden too.)
  if (stepDurations.length === 0 && insights?.timeBreakdown == null) {
    return null;
  }

  return (
    <div id="rpt-metrics" className="scroll-mt-20">
      <SectionHeading>Run Metrics</SectionHeading>
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
          </div>
        )}
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
  const variantList = variants?.variants ?? [];
  const runCount = intelligence?.metrics?.runCount ?? 1;

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
          <p className="ds-metric-value">{cv != null ? cv.toFixed(2) : '—'}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">High-variance steps</p>
          <p className="ds-metric-value">{highVar}</p>
        </div>
      </div>

      {variantList.length > 0 && (
        <div className="mt-ds-4 space-y-ds-2">
          {variantList.map((v) => (
            <div
              key={v.variantId}
              className={`card px-ds-5 py-ds-3 ${v.isStandardPath ? 'border-brand-200 bg-brand-50/30' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ds-sm font-medium text-[var(--content-primary)] flex items-center gap-ds-2">
                    {v.variantId}
                    {v.isStandardPath && (
                      <span className="ds-tag ds-tag-brand text-[10px] flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" />
                        Standard
                      </span>
                    )}
                  </p>
                  {v.pathSignature?.signature && (
                    <p className="text-ds-xs text-[var(--content-tertiary)] mt-0.5 font-mono truncate">
                      {v.pathSignature.signature}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-ds-sm font-semibold text-[var(--content-primary)]">
                    {v.frequency != null ? `${Math.round(v.frequency * 100)}%` : '—'}
                  </p>
                  <p className="text-ds-xs text-[var(--content-tertiary)]">
                    {v.runCount ?? 0} run{(v.runCount ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
          const systems = agent.systems ?? [];
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
  const integrations = ir?.integrations ?? [];
  const risks = ir?.risks ?? [];
  const overall = ir?.overallRiskLevel ?? '';
  if (integrations.length === 0 && risks.length === 0 && !overall) return null;

  return (
    <div id="rpt-integrations" className="scroll-mt-20">
      <SectionHeading>Integrations &amp; Risks</SectionHeading>
      <div className="space-y-ds-5">
        {overall && (
          <div
            className={`flex items-center gap-ds-2 rounded-lg px-ds-4 py-ds-3 text-ds-sm font-medium border ${
              AGENT_SEVERITY_COLORS[overall] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'
            } border-current/20`}
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

function RightRailNavigator({ sectionIds }: { sectionIds: readonly string[] }) {
  const activeId = useScrollSpy([...sectionIds]);

  return (
    <nav className="hidden xl:block sticky top-20 w-48 flex-shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
        On this page
      </p>
      <ul className="space-y-0.5">
        {sectionIds.map((id) => {
          const isActive = activeId === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`block border-l-2 pl-3 py-1 text-ds-xs transition-colors ${
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
  const mainRef = useRef<HTMLDivElement>(null);

  // Only include sections that have at least a chance of rendering
  const visibleSections = SECTION_IDS.filter((id) => {
    if (id === 'rpt-rework') {
      return (interpretation?.rework?.length ?? 0) > 0;
    }
    if (id === 'rpt-lead') {
      const lev = deriveTimeLeverage(insights, processOutput);
      return lev != null && lev.longestPct >= 25;
    }
    if (id === 'rpt-metrics') {
      const hasStepTiming = (processOutput?.processDefinition?.stepDefinitions ?? []).some(
        (s) => (s.durationMs ?? 0) > 0,
      );
      return hasStepTiming || insights?.timeBreakdown != null;
    }
    if (id === 'rpt-variance') {
      return intelligence?.variance != null || (intelligence?.variants?.variants?.length ?? 0) > 0;
    }
    if (id === 'rpt-timestudy') {
      const studies = intelligence?.timestudy?.stepPositionTimestudies?.length ?? 0;
      return studies > 0 && (intelligence?.metrics?.runCount ?? 1) >= 2;
    }
    if (id === 'rpt-agents') {
      return (agentIntelligence?.agentComposition?.agents?.length ?? 0) > 0;
    }
    if (id === 'rpt-skills') {
      return (agentIntelligence?.skillLibrary?.skills?.length ?? 0) > 0;
    }
    if (id === 'rpt-integrations') {
      const ir = agentIntelligence?.integrationRisk;
      return (ir?.integrations?.length ?? 0) > 0 || (ir?.risks?.length ?? 0) > 0 || !!ir?.overallRiskLevel;
    }
    if (id === 'rpt-roadmap') {
      return (agentIntelligence?.artifacts?.roadmap?.length ?? 0) > 0;
    }
    return true;
  });

  return (
    <div className="flex gap-8 items-start">
      {/* Main content */}
      <div ref={mainRef} className="flex-1 min-w-0 space-y-10">
        <HeroSection workflow={workflow} />
        <LeadInsightSection insights={insights} processOutput={processOutput} />
        <ProcessScoresSection interpretation={interpretation} />
        <PhaseTimelineSection interpretation={interpretation} />
        <RunMetricsSection insights={insights} processOutput={processOutput} />
        <VarianceVariantsSection intelligence={intelligence} />
        <TimestudySection intelligence={intelligence} />
        <InsightsFeedSection insights={insights} />
        <AutomationSection
          agentIntelligence={agentIntelligence}
          intelligence={intelligence}
          onRunAgentIntelligence={onRunAgentIntelligence}
        />
        <BottlenecksSection
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

        {/* Footer */}
        <footer className="text-[10px] text-[var(--content-tertiary)] pb-4 border-t border-[var(--border-subtle)] pt-4">
          Generated from observed workflow behavior · Evidence-backed · Ledgerium AI
        </footer>
      </div>

      {/* Right rail */}
      <RightRailNavigator sectionIds={visibleSections} />
    </div>
  );
}
