'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Upload,
  Clock,
  Layers,
  BarChart3,
  Trash2,
  Pencil,
  Check,
  X,
  ArrowUpDown,
  ChevronRight,
  Sparkles,
  Star,
  Eye,
  Zap,
  Lock,
  Tag,
  Plus,
  Flame,
  Trophy,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Activity,
  Target,
  FileCheck,
  Monitor,
  ChevronDown,
  Filter,
  ArrowRight,
  GitBranch,
  Boxes,
  RefreshCw,
  Brain,
  Shield,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';

// ─── Type definitions ──────────────────────────────────────────────────────────

interface TagSummary {
  id: string;
  name: string;
  color: string;
}

interface ProcessDefinitionSummary {
  id: string;
  canonicalName: string;
  variantCount: number;
  runCount: number;
  stabilityScore: number | null;
  confidenceScore: number | null;
}

type ViewMode = 'workflows' | 'process_groups';

interface ProcessDefinitionWorkflow {
  id: string;
  title: string;
  durationMs: number;
  stepCount: number;
  createdAt: string;
}

interface ProcessDefinitionInsight {
  id: string;
  insightType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
}

interface ProcessDefinition {
  id: string;
  canonicalName: string;
  description: string | null;
  pathSignature: string;
  runCount: number;
  variantCount: number;
  avgDurationMs: number;
  medianDurationMs: number;
  stabilityScore: number | null;
  confidenceScore: number | null;
  analyzedAt: string;
  workflows: ProcessDefinitionWorkflow[];
  insights: ProcessDefinitionInsight[];
  intelligence: Record<string, unknown> | null;
}

type HealthStatus = 'healthy' | 'needs_review' | 'high_variation' | 'stale' | 'new';
type SopReadiness = 'ready' | 'partial' | 'not_ready';
type OptimizationPotential = 'high' | 'medium' | 'low';
type BottleneckRisk = 'high' | 'medium' | 'low' | 'none';

interface WorkflowSummary {
  id: string;
  title: string;
  description: string | null;
  toolsUsed: string[];
  durationMs: number | null;
  stepCount: number | null;
  phaseCount: number | null;
  confidence: number | null;
  status: string;
  isFavorite: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagSummary[];
  variationScore: number;
  sopReadiness: SopReadiness;
  optimizationPotential: OptimizationPotential;
  documentationCompleteness: number;
  isStale: boolean;
  bottleneckRisk: BottleneckRisk;
  healthStatus: HealthStatus;
  processDefinition: ProcessDefinitionSummary | null;
  processType: string;
  complexityScore: number;
  aiOpportunityScore: number;
  cognitiveBurdenScore: number;
  processMaturityScore: number;
}

interface TagWithCount extends TagSummary {
  workflowCount: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  monthlyCount: number;
  totalCount: number;
  lastRecordedDate: string | null;
  milestones: { label: string; threshold: number; isReached: boolean }[];
}

interface TopInsight {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  insightType: string;
}

interface DashboardStats {
  totalWorkflows: number;
  recordedThisWeek: number;
  needsReview: number;
  sopReady: number;
  avgConfidence: number;
  avgDuration: number;
  avgStepCount: number;
  optimizationOpportunities: number;
  insightCount: number;
  favoriteCount: number;
  staleCount: number;
  aiOpportunityCount: number;
  avgCognitiveBurden: number;
  avgMaturity: number;
  highCognitiveBurdenCount: number;
  systemCoverage: { system: string; workflowCount: number }[];
  topInsights: TopInsight[];
  recentlyViewedIds: string[];
}

type SortOption =
  | 'created_at'
  | 'title'
  | 'confidence'
  | 'confidence_asc'
  | 'duration'
  | 'step_count'
  | 'views'
  | 'optimization';

// ─── Constants ──────────────────────────────────────────────────────────────────

const HEALTH_STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  healthy: {
    label: 'Healthy',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  needs_review: {
    label: 'Needs Review',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  high_variation: {
    label: 'High Variation',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  stale: {
    label: 'Stale',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
    dotClass: 'bg-gray-400',
  },
  new: {
    label: 'New',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
};

const SOP_READINESS_CONFIG: Record<
  SopReadiness,
  { label: string; bgClass: string; textClass: string }
> = {
  ready: { label: 'Ready', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
  partial: { label: 'Partial', bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
  not_ready: { label: 'Not Ready', bgClass: 'bg-gray-100', textClass: 'text-gray-500' },
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_at', label: 'Newest' },
  { value: 'title', label: 'Name' },
  { value: 'confidence', label: 'Highest Confidence' },
  { value: 'confidence_asc', label: 'Lowest Confidence' },
  { value: 'duration', label: 'Longest Duration' },
  { value: 'step_count', label: 'Most Steps' },
  { value: 'views', label: 'Most Viewed' },
  { value: 'optimization', label: 'Optimization Potential' },
];

// ─── Helper functions ───────────────────────────────────────────────────────────

function confidenceColorClass(value: number | null): string {
  if (value === null) return 'text-gray-400';
  const pct = value * 100;
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function confidenceBarColorClass(value: number | null): string {
  if (value === null) return 'bg-gray-200';
  const pct = value * 100;
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getPrimarySystem(toolsUsed: string[]): string | null {
  return toolsUsed.length > 0 ? toolsUsed[0]! : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Dashboard Page ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────

  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);

  // Filter & sort state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | ''>('');
  const [sopFilter, setSopFilter] = useState<SopReadiness | ''>('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Tag management state
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagMenuWorkflowId, setTagMenuWorkflowId] = useState<string | null>(null);

  // Sample workflow loading
  const [loadingSample, setLoadingSample] = useState(false);

  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>('workflows');
  const [processDefinitions, setProcessDefinitions] = useState<ProcessDefinition[]>([]);
  const [isLoadingProcessGroups, setIsLoadingProcessGroups] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchWorkflows = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    // Map sort options to API params
    if (sortBy === 'confidence_asc') {
      params.set('sort', 'confidence');
      params.set('dir', 'asc');
    } else if (sortBy === 'created_at') {
      params.set('sort', 'created_at');
      params.set('dir', 'desc');
    } else {
      params.set('sort', sortBy);
      params.set('dir', 'desc');
    }

    if (activeTagId) params.set('tag', activeTagId);
    if (healthFilter) params.set('health', healthFilter);
    if (sopFilter) params.set('sopReadiness', sopFilter);

    const res = await fetch(`/api/workflows?${params}`);
    if (res.ok) {
      const data = await res.json();
      setWorkflows(data.workflows);
      if (data.stats) setStats(data.stats);
    }
    setIsLoading(false);
  }, [search, sortBy, activeTagId, healthFilter, sopFilter]);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags);
    }
  }, []);

  const fetchStreak = useCallback(async () => {
    const res = await fetch('/api/streaks');
    if (res.ok) {
      const data = await res.json();
      setStreak(data.data);
    }
  }, []);

  const fetchProcessDefinitions = useCallback(async () => {
    setIsLoadingProcessGroups(true);
    try {
      const res = await fetch('/api/process-definitions');
      if (res.ok) {
        const data = await res.json();
        setProcessDefinitions(data.definitions ?? []);
      }
    } catch {
      // Endpoint may not exist yet — fail silently
    }
    setIsLoadingProcessGroups(false);
  }, []);

  async function handleRunAnalysis() {
    setIsRunningAnalysis(true);
    track({ event: 'process_analysis_triggered' });
    try {
      const res = await fetch('/api/analytics', { method: 'POST' });
      if (res.ok) {
        await fetchProcessDefinitions();
      }
    } catch {
      // Silently fail
    }
    setIsRunningAnalysis(false);
  }

  useEffect(() => {
    fetchWorkflows();
    fetchTags();
    fetchStreak();
    track({ event: 'page_viewed', path: '/dashboard' });
  }, [fetchWorkflows, fetchTags, fetchStreak]);

  useEffect(() => {
    if (viewMode === 'process_groups') {
      fetchProcessDefinitions();
    }
  }, [viewMode, fetchProcessDefinitions]);

  // ── Tag management handlers ────────────────────────────────────────────────

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewTagName('');
      setShowNewTag(false);
      fetchTags();
      track({ event: 'tag_created', tagName: name });
    }
  }

  async function handleToggleTag(workflowId: string, tagId: string, hasTag: boolean) {
    const body = hasTag ? { removeTagId: tagId } : { addTagId: tagId };
    await fetch(`/api/workflows/${workflowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    fetchWorkflows();
    fetchTags();
    track(hasTag
      ? { event: 'tag_removed', workflowId, tagId }
      : { event: 'tag_assigned', workflowId, tagId },
    );
  }

  async function handleDeleteTag(tagId: string) {
    await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    if (activeTagId === tagId) setActiveTagId(null);
    fetchTags();
    fetchWorkflows();
    track({ event: 'tag_deleted', tagId });
  }

  // ── Workflow action handlers ───────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this workflow?')) return;
    await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    track({ event: 'workflow_deleted', workflowId: id });
  }

  async function handleRename(id: string) {
    if (!editTitle.trim()) return;
    await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() }),
    });
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, title: editTitle.trim() } : w)),
    );
    setEditingId(null);
  }

  async function handleToggleFavorite(id: string, currentValue: boolean) {
    const newVal = !currentValue;
    setWorkflows((prev) =>
      prev.map((wf) => (wf.id === id ? { ...wf, isFavorite: newVal } : wf)),
    );
    await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: newVal }),
    });
    track(newVal
      ? { event: 'workflow_favorited', workflowId: id }
      : { event: 'workflow_unfavorited', workflowId: id },
    );
  }

  async function handleLoadSample() {
    setLoadingSample(true);
    track({ event: 'sample_workflow_loaded' });
    try {
      const res = await fetch('/api/sample-workflow', { method: 'POST' });
      if (res.ok) {
        await fetchWorkflows();
      }
    } catch {
      // Silently fail — sample endpoint may not exist yet
    }
    setLoadingSample(false);
  }

  // ── Derived data for intelligence panel ────────────────────────────────────

  const needsAttentionWorkflows = useMemo(() => {
    return workflows
      .filter((w) => w.healthStatus === 'needs_review' || w.healthStatus === 'high_variation')
      .sort((a, b) => {
        // Worst first: high_variation before needs_review, then by lowest confidence
        if (a.healthStatus === 'high_variation' && b.healthStatus !== 'high_variation') return -1;
        if (b.healthStatus === 'high_variation' && a.healthStatus !== 'high_variation') return 1;
        return (a.confidence ?? 0) - (b.confidence ?? 0);
      })
      .slice(0, 5);
  }, [workflows]);

  const optimizationWorkflows = useMemo(() => {
    return workflows
      .filter((w) => w.optimizationPotential === 'high')
      .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
      .slice(0, 5);
  }, [workflows]);

  const staleWorkflows = useMemo(() => {
    return workflows
      .filter((w) => w.isStale)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5);
  }, [workflows]);

  const mostComplexWorkflows = useMemo(() => {
    return workflows
      .filter((w) => w.complexityScore > 0)
      .sort((a, b) => b.complexityScore - a.complexityScore)
      .slice(0, 3);
  }, [workflows]);

  const highCognitiveBurdenWorkflows = useMemo(() => {
    return workflows
      .filter((w) => w.cognitiveBurdenScore >= 60)
      .sort((a, b) => b.cognitiveBurdenScore - a.cognitiveBurdenScore)
      .slice(0, 5);
  }, [workflows]);

  const hasActiveFilters = healthFilter !== '' || sopFilter !== '' || activeTagId !== null || search !== '';

  function clearAllFilters() {
    setSearch('');
    setHealthFilter('');
    setSopFilter('');
    setActiveTagId(null);
    setSortBy('created_at');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-ds-sm text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  // If no workflows at all, show the empty state
  if (workflows.length === 0 && !hasActiveFilters && stats?.totalWorkflows === 0) {
    return <EmptyDashboard onLoadSample={handleLoadSample} isLoading={loadingSample} />;
  }

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <h1 className="text-ds-2xl font-semibold text-gray-900">
            Process Intelligence
          </h1>
          <p className="text-ds-sm text-gray-500 mt-0.5">
            Monitor, optimize, and standardize your workflows
          </p>
        </div>
        <Link href="/upload" className="btn-primary gap-1.5">
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 1 — Executive Overview
          ═══════════════════════════════════════════════════════════════════ */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-ds-3 mb-ds-6">
          {/* Total Workflows */}
          <MetricCard
            icon={<Layers className="h-4 w-4 text-brand-600" />}
            label="Total Workflows"
            value={String(stats.totalWorkflows)}
            subtitle={`${stats.recordedThisWeek} this week`}
          />

          {/* Avg Confidence */}
          <MetricCard
            icon={<Target className="h-4 w-4 text-brand-600" />}
            label="Avg Confidence"
            value={stats.avgConfidence > 0 ? formatConfidence(stats.avgConfidence) : '--'}
            subtitle={stats.avgConfidence > 0 ? (
              stats.avgConfidence >= 0.8 ? 'Strong' : stats.avgConfidence >= 0.6 ? 'Moderate' : 'Low'
            ) : 'No data'}
            valueClassName={confidenceColorClass(stats.avgConfidence > 0 ? stats.avgConfidence : null)}
          />

          {/* SOP Ready */}
          <MetricCard
            icon={<FileCheck className="h-4 w-4 text-emerald-600" />}
            label="SOP Ready"
            value={String(stats.sopReady)}
            subtitle={`of ${stats.totalWorkflows} total`}
          />

          {/* Needs Review */}
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            label="Needs Review"
            value={String(stats.needsReview)}
            subtitle={stats.needsReview > 0 ? 'Action needed' : 'All clear'}
            valueClassName={stats.needsReview > 0 ? 'text-amber-600' : undefined}
          />

          {/* Optimization Opportunities */}
          <MetricCard
            icon={<TrendingUp className="h-4 w-4 text-violet-600" />}
            label="Optimization"
            value={String(stats.optimizationOpportunities)}
            subtitle="High potential"
          />

          {/* Avg Duration */}
          <MetricCard
            icon={<Clock className="h-4 w-4 text-gray-500" />}
            label="Avg Duration"
            value={stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : '--'}
            subtitle={stats.avgStepCount > 0 ? `~${Math.round(stats.avgStepCount)} steps` : 'No data'}
          />

          {/* Insights Available */}
          <MetricCard
            icon={<Sparkles className="h-4 w-4 text-amber-500" />}
            label="Insights"
            value={String(stats.insightCount)}
            subtitle={stats.insightCount > 0 ? 'View analytics' : 'None yet'}
            href={stats.insightCount > 0 ? '/analytics' : undefined}
          />

          {/* System Coverage */}
          <MetricCard
            icon={<Monitor className="h-4 w-4 text-blue-600" />}
            label="Systems"
            value={String(stats.systemCoverage.length)}
            subtitle={stats.systemCoverage.length > 0
              ? stats.systemCoverage.slice(0, 2).map((s) => s.system).join(', ')
              : 'None tracked'}
          />

          {/* Cognitive Burden */}
          <MetricCard
            icon={<Brain className="h-4 w-4 text-rose-600" />}
            label="Cognitive Burden"
            value={stats.avgCognitiveBurden > 0 ? String(stats.avgCognitiveBurden) : '--'}
            subtitle={stats.avgCognitiveBurden >= 60 ? 'High burden' : stats.avgCognitiveBurden >= 30 ? 'Moderate' : 'Low burden'}
            valueClassName={
              stats.avgCognitiveBurden >= 60 ? 'text-red-600' :
              stats.avgCognitiveBurden >= 30 ? 'text-amber-600' : 'text-emerald-600'
            }
          />

          {/* Process Maturity */}
          <MetricCard
            icon={<Shield className="h-4 w-4 text-indigo-600" />}
            label="Process Maturity"
            value={stats.avgMaturity > 0 ? String(stats.avgMaturity) : '--'}
            subtitle={stats.avgMaturity > 70 ? 'Mature' : stats.avgMaturity > 40 ? 'Developing' : 'Immature'}
            valueClassName={
              stats.avgMaturity > 70 ? 'text-emerald-600' :
              stats.avgMaturity > 40 ? 'text-amber-600' : 'text-red-600'
            }
          />
        </div>
      )}

      {/* ── Insights Alert Bar ─────────────────────────────────────────── */}
      {stats?.topInsights && stats.topInsights.length > 0 && (
        <div className="space-y-2 mb-ds-4">
          {stats.topInsights.map((insight) => (
            <Link
              key={insight.id}
              href="/analytics"
              className="card flex items-center gap-3 px-4 py-3 hover:border-gray-300 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  insight.severity === 'critical'
                    ? 'bg-red-500'
                    : insight.severity === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                }`}
              />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                {insight.insightType.replace(/_/g, ' ')}
              </span>
              <span className="text-ds-sm text-gray-700 flex-1 truncate">
                {insight.title}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 2 — Process Intelligence Panel
          ═══════════════════════════════════════════════════════════════════ */}
      {(needsAttentionWorkflows.length > 0 ||
        optimizationWorkflows.length > 0 ||
        staleWorkflows.length > 0 ||
        mostComplexWorkflows.length > 0 ||
        highCognitiveBurdenWorkflows.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-ds-4 mb-ds-6">
          {/* Needs Attention */}
          {needsAttentionWorkflows.length > 0 && (
            <IntelligenceList
              title="Needs Attention"
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              borderClass="border-amber-200"
              items={needsAttentionWorkflows}
              renderMetric={(w) => (
                <span className={`text-ds-xs font-medium ${confidenceColorClass(w.confidence)}`}>
                  {w.confidence !== null ? formatConfidence(w.confidence) : '--'}
                </span>
              )}
              onViewAll={() => {
                setHealthFilter('needs_review');
                setSopFilter('');
              }}
            />
          )}

          {/* Optimization Opportunities */}
          {optimizationWorkflows.length > 0 && (
            <IntelligenceList
              title="Optimization Potential"
              icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
              borderClass="border-violet-200"
              items={optimizationWorkflows}
              renderMetric={(w) => (
                <span className="text-ds-xs text-gray-500">
                  {formatDuration(w.durationMs)}
                </span>
              )}
              onViewAll={() => {
                setSortBy('optimization');
                setHealthFilter('');
                setSopFilter('');
              }}
            />
          )}

          {/* Stale Workflows */}
          {staleWorkflows.length > 0 && (
            <IntelligenceList
              title="Stale Workflows"
              icon={<Clock className="h-4 w-4 text-gray-400" />}
              borderClass="border-gray-200"
              items={staleWorkflows}
              renderMetric={(w) => (
                <span className="text-ds-xs text-gray-400">
                  {formatDateRelative(w.createdAt)}
                </span>
              )}
              onViewAll={() => {
                setHealthFilter('stale');
                setSopFilter('');
              }}
            />
          )}

          {/* Most Complex Workflows */}
          {mostComplexWorkflows.length > 0 && (
            <IntelligenceList
              title="Most Complex"
              icon={<Boxes className="h-4 w-4 text-red-500" />}
              borderClass="border-red-200"
              items={mostComplexWorkflows}
              renderMetric={(w) => (
                <span className={`text-ds-xs font-medium tabular-nums ${
                  w.complexityScore > 70 ? 'text-red-600' :
                  w.complexityScore > 40 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {w.complexityScore}
                </span>
              )}
              onViewAll={() => {
                setSortBy('step_count');
                setHealthFilter('');
                setSopFilter('');
              }}
            />
          )}

          {/* High Cognitive Burden */}
          {highCognitiveBurdenWorkflows.length > 0 && (
            <IntelligenceList
              title="High Cognitive Burden"
              icon={<Brain className="h-4 w-4 text-rose-500" />}
              borderClass="border-rose-200"
              items={highCognitiveBurdenWorkflows}
              renderMetric={(w) => (
                <span className={`text-ds-xs font-medium tabular-nums ${
                  w.cognitiveBurdenScore >= 80 ? 'text-red-600' :
                  w.cognitiveBurdenScore >= 60 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {w.cognitiveBurdenScore}
                </span>
              )}
              onViewAll={() => {
                setHealthFilter('');
                setSopFilter('');
              }}
            />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 3 — Momentum Section (compact)
          ═══════════════════════════════════════════════════════════════════ */}
      {streak && streak.totalCount > 0 && (
        <div className="card flex items-center gap-ds-4 px-ds-5 py-ds-3 mb-ds-6 bg-gradient-to-r from-orange-50/40 to-white border-orange-100">
          <Flame className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div className="flex items-center gap-ds-4 flex-wrap text-ds-sm">
            {streak.currentStreak > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-orange-600">{streak.currentStreak}</span>
                <span className="text-ds-xs text-gray-500">day streak</span>
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-gray-700">{streak.monthlyCount}</span>
              <span className="text-ds-xs text-gray-500">this month</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-gray-700">{streak.totalCount}</span>
              <span className="text-ds-xs text-gray-500">total</span>
            </div>
            {streak.longestStreak > 1 && (
              <div className="flex items-baseline gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold text-gray-700">{streak.longestStreak}</span>
                <span className="text-ds-xs text-gray-500">best streak</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW MODE TOGGLE
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-1 mb-ds-4 p-1 bg-gray-100 rounded-ds-md w-fit">
        <button
          onClick={() => {
            setViewMode('workflows');
            track({ event: 'view_mode_changed', mode: 'workflows' });
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-ds-sm text-ds-sm font-medium transition-colors ${
            viewMode === 'workflows'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          Workflows
        </button>
        <button
          onClick={() => {
            setViewMode('process_groups');
            track({ event: 'view_mode_changed', mode: 'process_groups' });
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-ds-sm text-ds-sm font-medium transition-colors ${
            viewMode === 'process_groups'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Process Groups
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 4 — Rich Workflow Library
          ═══════════════════════════════════════════════════════════════════ */}

      {viewMode === 'workflows' && (
      <>
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div className="ds-section mb-ds-4">
        <h2 className="ds-section-label text-ds-lg font-semibold text-gray-900">
          Workflow Library
        </h2>
        <p className="text-ds-xs text-gray-500">
          {stats ? `${stats.totalWorkflows} workflow${stats.totalWorkflows !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-ds-3 mb-ds-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        {/* Health Filter */}
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as HealthStatus | '')}
          className="input-field text-ds-sm py-2 pr-8 w-auto min-w-[140px]"
        >
          <option value="">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="needs_review">Needs Review</option>
          <option value="high_variation">High Variation</option>
          <option value="stale">Stale</option>
          <option value="new">New</option>
        </select>

        {/* SOP Readiness Filter */}
        <select
          value={sopFilter}
          onChange={(e) => setSopFilter(e.target.value as SopReadiness | '')}
          className="input-field text-ds-sm py-2 pr-8 w-auto min-w-[140px]"
        >
          <option value="">All SOP Status</option>
          <option value="ready">Ready</option>
          <option value="partial">Partial</option>
          <option value="not_ready">Not Ready</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input-field text-ds-sm py-2 pr-8 w-auto min-w-[160px]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="btn-secondary gap-1 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* ── Tag Filter Bar ────────────────────────────────────────────── */}
      {(tags.length > 0 || workflows.length > 0) && (
        <div className="flex items-center gap-2 mb-ds-4 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setActiveTagId(null)}
            className={`ds-tag transition-colors ${
              activeTagId === null ? 'ds-tag-brand' : 'ds-tag-neutral hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {tags.map((t) => (
            <div key={t.id} className="group/tag relative flex items-center">
              <button
                onClick={() => {
                  setActiveTagId(activeTagId === t.id ? null : t.id);
                  if (activeTagId !== t.id) {
                    track({ event: 'tag_filter_applied', tagId: t.id });
                  }
                }}
                className="ds-tag transition-colors border"
                style={{
                  backgroundColor: activeTagId === t.id ? t.color + '20' : undefined,
                  borderColor: activeTagId === t.id ? t.color : 'transparent',
                  color: activeTagId === t.id ? t.color : undefined,
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5 flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
                {t.workflowCount > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">{t.workflowCount}</span>
                )}
              </button>
              <button
                onClick={() => handleDeleteTag(t.id)}
                className="absolute -top-1 -right-1 hidden group-hover/tag:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-300 text-white hover:bg-red-400 transition-colors"
                title="Delete tag"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ))}
          {showNewTag ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="input-field text-xs py-0.5 px-2 w-28"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') {
                    setShowNewTag(false);
                    setNewTagName('');
                  }
                }}
              />
              <button
                onClick={handleCreateTag}
                className="p-0.5 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setShowNewTag(false);
                  setNewTagName('');
                }}
                className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTag(true)}
              className="ds-tag ds-tag-neutral hover:bg-gray-200 transition-colors gap-0.5"
            >
              <Plus className="h-3 w-3" />
              New tag
            </button>
          )}
        </div>
      )}

      {/* ── Workflow Table ─────────────────────────────────────────────── */}
      {workflows.length === 0 && hasActiveFilters ? (
        <FilteredEmptyState onClear={clearAllFilters} hasSearch={search.length > 0} />
      ) : workflows.length === 0 ? (
        <EmptyDashboard onLoadSample={handleLoadSample} isLoading={loadingSample} />
      ) : (
        <>
          {/* Table header (desktop) */}
          <div className="hidden lg:grid grid-cols-[32px_1fr_100px_60px_80px_120px_80px_140px_80px_72px] gap-3 items-center px-4 py-2 text-ds-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
            <div>{/* favorite */}</div>
            <div>Workflow</div>
            <div>Health</div>
            <div>Steps</div>
            <div>Duration</div>
            <div>Confidence</div>
            <div>SOP</div>
            <div>Tags</div>
            <div>Active</div>
            <div>{/* actions */}</div>
          </div>

          {/* Workflow rows */}
          <div className="space-y-1">
            {workflows.map((w) => (
              <WorkflowRow
                key={w.id}
                workflow={w}
                allTags={tags}
                editingId={editingId}
                editTitle={editTitle}
                tagMenuWorkflowId={tagMenuWorkflowId}
                onFavoriteToggle={() => handleToggleFavorite(w.id, w.isFavorite)}
                onStartEdit={() => {
                  setEditingId(w.id);
                  setEditTitle(w.title);
                }}
                onCancelEdit={() => setEditingId(null)}
                onConfirmEdit={() => handleRename(w.id)}
                onEditTitleChange={setEditTitle}
                onDelete={() => handleDelete(w.id)}
                onTagMenuToggle={() =>
                  setTagMenuWorkflowId(tagMenuWorkflowId === w.id ? null : w.id)
                }
                onTagMenuClose={() => setTagMenuWorkflowId(null)}
                onToggleTag={handleToggleTag}
              />
            ))}
          </div>
        </>
      )}
      </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 4B — Process Groups View
          ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'process_groups' && (
        <ProcessGroupsView
          definitions={processDefinitions}
          isLoading={isLoadingProcessGroups}
          isRunningAnalysis={isRunningAnalysis}
          onRunAnalysis={handleRunAnalysis}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Sub-components ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Metric Card (Layer 1) ──────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  valueClassName,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  valueClassName?: string | undefined;
  href?: string | undefined;
}) {
  const content = (
    <div className={`card px-ds-4 py-ds-3 ${href ? 'hover:border-brand-300 cursor-pointer' : ''} transition-colors`}>
      <div className="flex items-center gap-ds-2 mb-ds-2">
        {icon}
        <span className="ds-metric-label text-ds-xs text-gray-500 truncate">{label}</span>
      </div>
      <p className={`ds-metric-value text-ds-lg font-semibold ${valueClassName ?? 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ─── Intelligence List (Layer 2) ────────────────────────────────────────────────

function IntelligenceList({
  title,
  icon,
  borderClass,
  items,
  renderMetric,
  onViewAll,
}: {
  title: string;
  icon: React.ReactNode;
  borderClass: string;
  items: WorkflowSummary[];
  renderMetric: (w: WorkflowSummary) => React.ReactNode;
  onViewAll: () => void;
}) {
  return (
    <div className={`card overflow-hidden ${borderClass}`}>
      <div className="flex items-center justify-between px-ds-4 py-ds-3 border-b border-gray-100">
        <div className="flex items-center gap-ds-2">
          {icon}
          <h3 className="text-ds-sm font-semibold text-gray-900">{title}</h3>
          <span className="ds-tag ds-tag-neutral text-[10px]">{items.length}</span>
        </div>
        <button
          onClick={onViewAll}
          className="text-ds-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((w) => {
          const primarySystem = getPrimarySystem(w.toolsUsed);
          return (
            <Link
              key={w.id}
              href={`/workflows/${w.id}`}
              className="flex items-center gap-ds-3 px-ds-4 py-ds-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-ds-sm font-medium text-gray-900 truncate">{w.title}</p>
                {primarySystem && (
                  <span className="text-[11px] text-gray-400">{primarySystem}</span>
                )}
              </div>
              {renderMetric(w)}
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Workflow Row (Layer 4) ─────────────────────────────────────────────────────

function WorkflowRow({
  workflow: w,
  allTags,
  editingId,
  editTitle,
  tagMenuWorkflowId,
  onFavoriteToggle,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onEditTitleChange,
  onDelete,
  onTagMenuToggle,
  onTagMenuClose,
  onToggleTag,
}: {
  workflow: WorkflowSummary;
  allTags: TagWithCount[];
  editingId: string | null;
  editTitle: string;
  tagMenuWorkflowId: string | null;
  onFavoriteToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onDelete: () => void;
  onTagMenuToggle: () => void;
  onTagMenuClose: () => void;
  onToggleTag: (workflowId: string, tagId: string, hasTag: boolean) => void;
}) {
  const isEditing = editingId === w.id;
  const healthConfig = HEALTH_STATUS_CONFIG[w.healthStatus];
  const sopConfig = SOP_READINESS_CONFIG[w.sopReadiness];
  const primarySystem = getPrimarySystem(w.toolsUsed);
  const confidencePct = w.confidence !== null ? Math.round(w.confidence * 100) : null;

  return (
    <div className="card hover:border-gray-300 transition-colors group">
      {/* Desktop layout */}
      <div className="hidden lg:grid grid-cols-[32px_1fr_100px_60px_80px_120px_80px_140px_80px_72px] gap-3 items-center px-4 py-3">
        {/* Favorite */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onFavoriteToggle();
          }}
          className="rounded-ds-sm p-1 hover:bg-gray-100 transition-colors flex-shrink-0"
          title={w.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={`h-4 w-4 ${
              w.isFavorite
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-200 group-hover:text-gray-300'
            }`}
          />
        </button>

        {/* Workflow Name + System */}
        <div className="min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                className="input-field text-sm py-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onConfirmEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button
                onClick={onConfirmEdit}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-ds-1 min-w-0">
              <Link
                href={`/workflows/${w.id}`}
                className="text-ds-sm font-medium text-gray-900 hover:text-brand-600 truncate"
              >
                {w.title}
              </Link>
              {w.processType && w.processType !== 'general' && (
                <span className="ds-tag ds-tag-brand text-[10px] flex-shrink-0">
                  {w.processType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          )}
          {primarySystem && (
            <span className="ds-tag ds-tag-neutral text-[10px] mt-0.5 inline-block">
              {primarySystem}
            </span>
          )}
        </div>

        {/* Health Badge + AI Opportunity + Doc Warning */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${healthConfig.bgClass} ${healthConfig.textClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${healthConfig.dotClass}`} />
            {healthConfig.label}
          </span>
          {w.aiOpportunityScore >= 60 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700"
              title={`AI Automation Opportunity: ${w.aiOpportunityScore}/100`}
            >
              <Zap className="h-2.5 w-2.5" />
              AI: {w.aiOpportunityScore}
            </span>
          )}
          {w.documentationCompleteness < 50 && (
            <span
              className="inline-flex items-center text-amber-500"
              title={`Documentation ${w.documentationCompleteness}% complete`}
            >
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Steps */}
        <div className="text-ds-xs text-gray-600">{w.stepCount ?? '--'}</div>

        {/* Duration */}
        <div className="text-ds-xs text-gray-600">{formatDuration(w.durationMs)}</div>

        {/* Confidence with bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${confidenceBarColorClass(w.confidence)}`}
              style={{ width: `${confidencePct ?? 0}%` }}
            />
          </div>
          <span className={`text-ds-xs font-medium w-8 text-right ${confidenceColorClass(w.confidence)}`}>
            {confidencePct !== null ? `${confidencePct}%` : '--'}
          </span>
        </div>

        {/* SOP Readiness */}
        <div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${sopConfig.bgClass} ${sopConfig.textClass}`}
          >
            {sopConfig.label}
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1 overflow-hidden">
          {w.tags.slice(0, 2).map((t) => (
            <span
              key={t.id}
              className="ds-tag text-[10px] border truncate max-w-[60px]"
              style={{
                backgroundColor: t.color + '15',
                borderColor: t.color + '40',
                color: t.color,
              }}
              title={t.name}
            >
              {t.name}
            </span>
          ))}
          {w.tags.length > 2 && (
            <span className="text-[10px] text-gray-400">+{w.tags.length - 2}</span>
          )}
        </div>

        {/* Last Active */}
        <div className="text-ds-xs text-gray-500" title={w.updatedAt}>
          {formatDateRelative(w.updatedAt)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                onTagMenuToggle();
              }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Manage tags"
            >
              <Tag className="h-3.5 w-3.5" />
            </button>
            {tagMenuWorkflowId === w.id && (
              <TagMenu
                workflowId={w.id}
                workflowTags={w.tags}
                allTags={allTags}
                onToggle={onToggleTag}
                onClose={onTagMenuClose}
              />
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              onStartEdit();
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile / Tablet layout */}
      <div className="lg:hidden p-4">
        <div className="flex items-start gap-3">
          {/* Favorite */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavoriteToggle();
            }}
            className="rounded-ds-sm p-1 hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
          >
            <Star
              className={`h-4 w-4 ${
                w.isFavorite
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-200'
              }`}
            />
          </button>

          <div className="flex-1 min-w-0">
            {/* Title */}
            {isEditing ? (
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => onEditTitleChange(e.target.value)}
                  className="input-field text-sm py-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirmEdit();
                    if (e.key === 'Escape') onCancelEdit();
                  }}
                />
                <button onClick={onConfirmEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={onCancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href={`/workflows/${w.id}`}
                className="text-ds-sm font-medium text-gray-900 hover:text-brand-600 block mb-1"
              >
                {w.title}
              </Link>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${healthConfig.bgClass} ${healthConfig.textClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${healthConfig.dotClass}`} />
                {healthConfig.label}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${sopConfig.bgClass} ${sopConfig.textClass}`}
              >
                SOP: {sopConfig.label}
              </span>
              {w.aiOpportunityScore >= 60 && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700"
                  title={`AI Automation Opportunity: ${w.aiOpportunityScore}/100`}
                >
                  <Zap className="h-2.5 w-2.5" />
                  AI: {w.aiOpportunityScore}
                </span>
              )}
              {w.documentationCompleteness < 50 && (
                <span
                  className="inline-flex items-center text-amber-500"
                  title={`Documentation ${w.documentationCompleteness}% complete`}
                >
                  <AlertTriangle className="h-3 w-3" />
                </span>
              )}
              {primarySystem && (
                <span className="ds-tag ds-tag-neutral text-[10px]">{primarySystem}</span>
              )}
              {w.tags.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  className="ds-tag text-[10px] border"
                  style={{
                    backgroundColor: t.color + '15',
                    borderColor: t.color + '40',
                    color: t.color,
                  }}
                >
                  {t.name}
                </span>
              ))}
              {w.tags.length > 2 && (
                <span className="text-[10px] text-gray-400">+{w.tags.length - 2}</span>
              )}
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-4 text-ds-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {w.stepCount ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(w.durationMs)}
              </span>
              {confidencePct !== null && (
                <span className={`flex items-center gap-1 ${confidenceColorClass(w.confidence)}`}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  {confidencePct}%
                </span>
              )}
              <span className="ml-auto">{formatDateRelative(w.updatedAt)}</span>
            </div>
          </div>

          {/* Mobile actions */}
          <div className="flex flex-col gap-0.5">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onTagMenuToggle();
                }}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Manage tags"
              >
                <Tag className="h-3.5 w-3.5" />
              </button>
              {tagMenuWorkflowId === w.id && (
                <TagMenu
                  workflowId={w.id}
                  workflowTags={w.tags}
                  allTags={allTags}
                  onToggle={onToggleTag}
                  onClose={onTagMenuClose}
                />
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                onStartEdit();
              }}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tag assignment dropdown ────────────────────────────────────────────────────

function TagMenu({
  workflowId,
  workflowTags,
  allTags,
  onToggle,
  onClose,
}: {
  workflowId: string;
  workflowTags: TagSummary[];
  allTags: TagWithCount[];
  onToggle: (workflowId: string, tagId: string, hasTag: boolean) => void;
  onClose: () => void;
}) {
  const assignedIds = new Set(workflowTags.map((t) => t.id));

  return (
    <>
      {/* Backdrop to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-8 z-50 w-48 rounded-ds-md border border-gray-200 bg-white shadow-lg py-1">
        <p className="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Assign tags
        </p>
        {allTags.length === 0 && (
          <p className="px-3 py-2 text-ds-xs text-gray-400">No tags yet. Create one above.</p>
        )}
        {allTags.map((tag) => {
          const isAssigned = assignedIds.has(tag.id);
          return (
            <button
              key={tag.id}
              onClick={(e) => {
                e.preventDefault();
                onToggle(workflowId, tag.id, isAssigned);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ds-xs hover:bg-gray-50 transition-colors"
            >
              <span
                className="h-2.5 w-2.5 rounded-full border-2 flex-shrink-0"
                style={{
                  backgroundColor: isAssigned ? tag.color : 'transparent',
                  borderColor: tag.color,
                }}
              />
              <span className="flex-1 text-left text-gray-700">{tag.name}</span>
              {isAssigned && <Check className="h-3 w-3 text-gray-400" />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Empty Dashboard ────────────────────────────────────────────────────────────

function EmptyDashboard({
  onLoadSample,
  isLoading,
}: {
  onLoadSample: () => void;
  isLoading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <h1 className="text-ds-2xl font-semibold text-gray-900">Process Intelligence</h1>
          <p className="text-ds-sm text-gray-500 mt-0.5">
            Monitor, optimize, and standardize your workflows
          </p>
        </div>
        <Link href="/upload" className="btn-primary gap-1.5">
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-50 via-white to-white px-ds-8 py-ds-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
            <Layers className="h-8 w-8 text-brand-500" />
          </div>
          <h2 className="mt-ds-4 text-ds-lg font-semibold text-gray-900">
            Your process intelligence center is empty
          </h2>
          <p className="mt-ds-2 text-ds-sm text-gray-500 max-w-md mx-auto">
            Record a workflow with the browser extension, or upload a JSON file to generate
            your first SOP and process map.
          </p>
          <div className="mt-ds-6 flex items-center justify-center gap-ds-3">
            <Link href="/upload" className="btn-primary gap-1.5">
              <Upload className="h-4 w-4" />
              Upload a workflow
            </Link>
            <button
              onClick={onLoadSample}
              disabled={isLoading}
              className="btn-secondary gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              {isLoading ? 'Loading...' : 'Try a sample workflow'}
            </button>
          </div>
        </div>
        {/* Quick value props */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
          <div className="px-ds-5 py-ds-4 text-center">
            <p className="text-ds-xs text-gray-400 uppercase tracking-wide">Step 1</p>
            <p className="mt-ds-1 text-ds-sm font-medium text-gray-700">Record</p>
            <p className="text-ds-xs text-gray-500">Capture your real workflow</p>
          </div>
          <div className="px-ds-5 py-ds-4 text-center">
            <p className="text-ds-xs text-gray-400 uppercase tracking-wide">Step 2</p>
            <p className="mt-ds-1 text-ds-sm font-medium text-gray-700">Process</p>
            <p className="text-ds-xs text-gray-500">Deterministic analysis</p>
          </div>
          <div className="px-ds-5 py-ds-4 text-center">
            <p className="text-ds-xs text-gray-400 uppercase tracking-wide">Step 3</p>
            <p className="mt-ds-1 text-ds-sm font-medium text-gray-700">Use</p>
            <p className="text-ds-xs text-gray-500">SOP, process map, report</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Process Groups View ───────────────────────────────────────────────────────

function ProcessGroupsView({
  definitions,
  isLoading,
  isRunningAnalysis,
  onRunAnalysis,
}: {
  definitions: ProcessDefinition[];
  isLoading: boolean;
  isRunningAnalysis: boolean;
  onRunAnalysis: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-ds-sm text-gray-400">Loading process groups...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-ds-4">
        <div className="ds-section">
          <h2 className="ds-section-label text-ds-lg font-semibold text-gray-900">
            Process Groups
          </h2>
          <p className="text-ds-xs text-gray-500">
            {definitions.length} process group{definitions.length !== 1 ? 's' : ''} detected
          </p>
        </div>
        <button
          onClick={onRunAnalysis}
          disabled={isRunningAnalysis}
          className="btn-secondary gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
          {isRunningAnalysis ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Empty state */}
      {definitions.length === 0 && (
        <div className="card p-12 text-center">
          <Boxes className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-ds-sm font-medium text-gray-900">
            No process groups detected yet
          </h3>
          <p className="mt-1 text-ds-sm text-gray-500 max-w-md mx-auto">
            Upload more workflows or click &quot;Run Analysis&quot; to detect recurring processes.
          </p>
          <button
            onClick={onRunAnalysis}
            disabled={isRunningAnalysis}
            className="btn-primary mt-4 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRunningAnalysis ? 'animate-spin' : ''}`} />
            {isRunningAnalysis ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      )}

      {/* Process Group Cards */}
      {definitions.length > 0 && (
        <div className="space-y-2">
          {definitions.map((def) => (
            <ProcessGroupCard key={def.id} definition={def} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Process Group Card ───────────────────────────────────────────────────────

function ProcessGroupCard({ definition: def }: { definition: ProcessDefinition }) {
  const stabilityColor =
    def.stabilityScore === null
      ? 'bg-gray-300'
      : def.stabilityScore >= 0.8
        ? 'bg-emerald-500'
        : def.stabilityScore >= 0.6
          ? 'bg-amber-500'
          : 'bg-red-500';

  const stabilityLabel =
    def.stabilityScore === null
      ? 'N/A'
      : def.stabilityScore >= 0.8
        ? 'Stable'
        : def.stabilityScore >= 0.6
          ? 'Moderate'
          : 'Unstable';

  const warningCount = def.insights.filter((i) => i.severity === 'warning').length;
  const criticalCount = def.insights.filter((i) => i.severity === 'critical').length;

  // Phase 3: standardization score from intelligence data
  const standardizationScore = (def.intelligence as Record<string, unknown> | null)?.standardization as
    | { score: number; level: string }
    | undefined;
  const stdScoreBg =
    standardizationScore?.level === 'excellent' ? 'bg-green-100 text-green-700' :
    standardizationScore?.level === 'good' ? 'bg-blue-100 text-blue-700' :
    standardizationScore?.level === 'moderate' ? 'bg-amber-100 text-amber-700' :
    standardizationScore?.level === 'poor' ? 'bg-red-100 text-red-700' : '';

  const lastRunDate =
    def.workflows.length > 0
      ? def.workflows.reduce((latest, w) =>
          new Date(w.createdAt) > new Date(latest.createdAt) ? w : latest,
        ).createdAt
      : null;

  const systemsUsed = Array.from(
    new Set(
      def.pathSignature
        .split(':')
        .filter((s) => s.length > 0),
    ),
  );

  return (
    <Link
      href={`/analytics/process/${def.id}`}
      className="card hover:border-gray-300 transition-colors group block"
    >
      <div className="px-ds-5 py-ds-4">
        {/* Top row: name + badges */}
        <div className="flex items-start justify-between gap-ds-4 mb-ds-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-ds-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
              {def.canonicalName}
            </h3>
            {def.description && (
              <p className="text-ds-xs text-gray-500 mt-0.5 line-clamp-1">{def.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Stability indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${stabilityColor}`} />
              <span className="text-ds-xs text-gray-500">{stabilityLabel}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex flex-wrap items-center gap-ds-4 text-ds-xs">
          {/* Run count */}
          <span className="ds-tag ds-tag-brand">
            {def.runCount} run{def.runCount !== 1 ? 's' : ''}
          </span>

          {/* Variant count */}
          <span className="flex items-center gap-1 text-gray-600">
            <GitBranch className="h-3.5 w-3.5" />
            {def.variantCount} variant{def.variantCount !== 1 ? 's' : ''}
          </span>

          {/* Avg duration */}
          <span className="flex items-center gap-1 text-gray-600">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(def.avgDurationMs)}
          </span>

          {/* Confidence */}
          {def.confidenceScore !== null && (
            <span className={`flex items-center gap-1 ${confidenceColorClass(def.confidenceScore)}`}>
              <Target className="h-3.5 w-3.5" />
              {formatConfidence(def.confidenceScore)}
            </span>
          )}

          {/* Standardization score */}
          {standardizationScore && (
            <span className={`ds-tag text-[10px] ${stdScoreBg}`}>
              Std: {standardizationScore.score}/100
            </span>
          )}

          {/* Insights */}
          {(criticalCount > 0 || warningCount > 0) && (
            <span className="flex items-center gap-1.5">
              {criticalCount > 0 && (
                <span className="flex items-center gap-0.5 text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {criticalCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {warningCount}
                </span>
              )}
            </span>
          )}

          {/* Path signature chips */}
          {systemsUsed.length > 0 && (
            <div className="flex items-center gap-1">
              {systemsUsed.slice(0, 3).map((sys) => (
                <span key={sys} className="ds-tag ds-tag-neutral text-[10px]">
                  {sys}
                </span>
              ))}
              {systemsUsed.length > 3 && (
                <span className="text-[10px] text-gray-400">+{systemsUsed.length - 3}</span>
              )}
            </div>
          )}

          {/* Last run */}
          {lastRunDate && (
            <span className="text-gray-400 ml-auto">
              Last run {formatDateRelative(lastRunDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Filtered Empty State ───────────────────────────────────────────────────────

function FilteredEmptyState({
  onClear,
  hasSearch,
}: {
  onClear: () => void;
  hasSearch: boolean;
}) {
  return (
    <div className="card p-12 text-center">
      <Filter className="mx-auto h-10 w-10 text-gray-300" />
      <h3 className="mt-3 text-ds-sm font-medium text-gray-900">
        {hasSearch ? 'No workflows match your search' : 'No workflows in this category'}
      </h3>
      <p className="mt-1 text-ds-sm text-gray-500">
        {hasSearch
          ? 'Try different search terms or adjust your filters.'
          : 'Try adjusting your filters to see more workflows.'}
      </p>
      <button
        onClick={onClear}
        className="btn-secondary mt-4 gap-1.5"
      >
        <X className="h-4 w-4" />
        Clear all filters
      </button>
    </div>
  );
}
