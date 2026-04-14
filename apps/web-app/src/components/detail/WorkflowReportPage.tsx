'use client';

import { useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
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
  noInsightsMessage?: string;
}

interface IntelligenceBottleneck {
  position: number;
  meanDurationMs: number;
  overallMeanStepDurationMs: number;
  durationRatio: number;
  category?: string;
}

interface IntelligenceData {
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

interface AgentIntelligenceData {
  opportunities?: {
    opportunities?: AgentOpportunity[];
    totalSavingsMs?: number;
  };
  workflow?: {
    automationScore?: number;
  };
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
  'rpt-scores',
  'rpt-phases',
  'rpt-insights',
  'rpt-automation',
  'rpt-bottlenecks',
  'rpt-steps',
  'rpt-structure',
  'rpt-rework',
] as const;

const SECTION_LABELS: Record<string, string> = {
  'rpt-hero': 'Overview',
  'rpt-scores': 'Process Health',
  'rpt-phases': 'Phase Timeline',
  'rpt-insights': 'Insights',
  'rpt-automation': 'Automation',
  'rpt-bottlenecks': 'Bottlenecks',
  'rpt-steps': 'Step Breakdown',
  'rpt-structure': 'Friction & Decisions',
  'rpt-rework': 'Rework Patterns',
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
  onRunAgentIntelligence,
}: {
  agentIntelligence: AgentIntelligenceData | null | undefined;
  onRunAgentIntelligence?: (() => void) | undefined;
}) {
  const opportunities = agentIntelligence?.opportunities?.opportunities ?? [];
  const totalSavingsMs = agentIntelligence?.opportunities?.totalSavingsMs;

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
    return true;
  });

  return (
    <div className="flex gap-8 items-start">
      {/* Main content */}
      <div ref={mainRef} className="flex-1 min-w-0 space-y-10">
        <HeroSection workflow={workflow} />
        <ProcessScoresSection interpretation={interpretation} />
        <PhaseTimelineSection interpretation={interpretation} />
        <InsightsFeedSection insights={insights} />
        <AutomationSection
          agentIntelligence={agentIntelligence}
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
