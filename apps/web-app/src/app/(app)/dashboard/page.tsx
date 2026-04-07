'use client';

import { useEffect, useState, useCallback } from 'react';
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
  CheckCircle2,
  Circle,
  XIcon,
  Star,
  Eye,
  Zap,
  Lock,
  Tag,
  Plus,
  Flame,
  Trophy,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';
import {
  getOnboardingState,
  completeStep,
  dismissOnboarding,
  isOnboardingComplete,
  getCompletionCount,
  ONBOARDING_STEPS,
  type OnboardingState,
  type OnboardingContext,
} from '@/lib/onboarding';

interface TagSummary {
  id: string;
  name: string;
  color: string;
}

interface WorkflowSummary {
  id: string;
  title: string;
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

interface DashboardStats {
  totalWorkflows: number;
  favoriteCount: number;
  recentlyViewedIds: string[];
  insightCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [tagMenuWorkflowId, setTagMenuWorkflowId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('sort', sortBy);
    params.set('dir', sortDir);
    if (activeTagId) params.set('tag', activeTagId);

    const res = await fetch(`/api/workflows?${params}`);
    if (res.ok) {
      const data = await res.json();
      setWorkflows(data.workflows);
      if (data.stats) setStats(data.stats);
    }
    setIsLoading(false);
  }, [search, sortBy, sortDir, activeTagId]);

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

  useEffect(() => {
    fetchWorkflows();
    fetchTags();
    fetchStreak();
    setOnboarding(getOnboardingState());
    track({ event: 'page_viewed', path: '/dashboard' });
  }, [fetchWorkflows, fetchTags, fetchStreak]);

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
  }

  async function handleDeleteTag(tagId: string) {
    await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    if (activeTagId === tagId) setActiveTagId(null);
    fetchTags();
    fetchWorkflows();
  }

  const onboardingContext: OnboardingContext = {
    workflowCount: workflows.length,
    hasExtensionKey: false, // Would check from account API
  };

  const showOnboarding = onboarding !== null
    && !onboarding.isDismissed
    && !isOnboardingComplete(onboarding, onboardingContext);

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

  function handleDismissOnboarding() {
    dismissOnboarding();
    setOnboarding(getOnboardingState());
    track({ event: 'onboarding_dismissed' });
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  return (
    <div>
      {/* ── Onboarding Checklist ──────────────────────────────────────── */}
      {showOnboarding && onboarding && (
        <div className="card mb-ds-6 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-50 to-white px-ds-6 py-ds-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-ds-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-ds-lg bg-brand-100">
                  <Sparkles className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-ds-lg font-semibold text-gray-900">Get started with Ledgerium</h2>
                  <p className="text-ds-sm text-gray-500">
                    {getCompletionCount(onboarding, onboardingContext)} of {ONBOARDING_STEPS.length} steps complete
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissOnboarding}
                className="rounded-ds-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Dismiss"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-ds-4 h-1.5 w-full rounded-full bg-brand-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{
                  width: `${(getCompletionCount(onboarding, onboardingContext) / ONBOARDING_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="divide-y divide-gray-100">
            {ONBOARDING_STEPS.map((step) => {
              const done = step.isCompleted(onboarding, onboardingContext);
              return (
                <Link
                  key={step.id}
                  href={step.actionHref}
                  className={`flex items-center gap-ds-4 px-ds-6 py-ds-4 transition-colors ${
                    done ? 'bg-gray-50/50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (!done) {
                      track({ event: 'onboarding_step_completed', step: step.id });
                    }
                  }}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-ds-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {step.title}
                    </p>
                    <p className="text-ds-xs text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                  {!done && (
                    <span className="text-ds-xs text-brand-600 font-medium flex-shrink-0 flex items-center gap-1">
                      {step.actionLabel}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Insights Banner (retention driver) ─────────────────────── */}
      {stats && stats.insightCount > 0 && workflows.length > 0 && (
        <Link
          href="/analytics"
          className="card flex items-center gap-ds-4 px-ds-5 py-ds-4 mb-ds-4 bg-amber-50/50 border-amber-200 hover:border-amber-300 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-ds-md bg-amber-100">
            <BarChart3 className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-ds-sm font-medium text-gray-900">
              {stats.insightCount} insight{stats.insightCount !== 1 ? 's' : ''} available
            </p>
            <p className="text-ds-xs text-gray-500">
              Process intelligence detected bottlenecks or patterns in your workflows.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
        </Link>
      )}

      {/* ── Streak Banner ──────────────────────────────────────────── */}
      {streak && streak.totalCount > 0 && (
        <StreakBanner streak={streak} />
      )}

      {/* ── Upgrade prompt (near or at free limit) ─────────────────── */}
      {workflows.length >= 4 && workflows.length <= 5 && !onboarding?.isDismissed && (
        <UpgradeBanner
          usage={workflows.length}
          limit={5}
          atLimit={workflows.length >= 5}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <h1 className="text-ds-xl font-semibold text-gray-900">Workflow Library</h1>
          <p className="text-ds-sm text-gray-500">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/upload" className="btn-primary gap-1.5">
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {/* ── Search & Sort ─────────────────────────────────────────────── */}
      {workflows.length > 0 && (
        <div className="flex items-center gap-3 mb-ds-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={() => toggleSort('created_at')}
            className={`btn-secondary gap-1 text-xs ${sortBy === 'created_at' ? 'bg-gray-100' : ''}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Date
          </button>
          <button
            onClick={() => toggleSort('title')}
            className={`btn-secondary gap-1 text-xs ${sortBy === 'title' ? 'bg-gray-100' : ''}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Name
          </button>
          <button
            onClick={() => toggleSort('step_count')}
            className={`btn-secondary gap-1 text-xs ${sortBy === 'step_count' ? 'bg-gray-100' : ''}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Steps
          </button>
        </div>
      )}

      {/* ── Tag Filter Bar ──────────────────────────────────────────── */}
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
                onClick={() => setActiveTagId(activeTagId === t.id ? null : t.id)}
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
                  if (e.key === 'Escape') { setShowNewTag(false); setNewTagName(''); }
                }}
              />
              <button onClick={handleCreateTag} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setShowNewTag(false); setNewTagName(''); }} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded">
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

      {/* ── Workflow List / Empty State ────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center text-ds-sm text-gray-400 py-20">Loading...</div>
      ) : workflows.length === 0 && !search ? (
        /* Enhanced empty state */
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-50 via-white to-white px-ds-8 py-ds-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
              <Layers className="h-8 w-8 text-brand-500" />
            </div>
            <h2 className="mt-ds-4 text-ds-lg font-semibold text-gray-900">
              Your workflow library is empty
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
                onClick={handleLoadSample}
                disabled={loadingSample}
                className="btn-secondary gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                {loadingSample ? 'Loading...' : 'Try a sample workflow'}
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
      ) : workflows.length === 0 && search ? (
        <div className="card p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-ds-sm font-medium text-gray-900">No workflows match your search</h3>
          <p className="mt-1 text-ds-sm text-gray-500">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="card flex items-center gap-4 p-4 hover:border-gray-300 transition-colors group"
            >
              {/* Favorite */}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  const newVal = !w.isFavorite;
                  setWorkflows(prev => prev.map(wf => wf.id === w.id ? { ...wf, isFavorite: newVal } : wf));
                  await fetch(`/api/workflows/${w.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isFavorite: newVal }),
                  });
                }}
                className="rounded-ds-sm p-1 hover:bg-gray-100 transition-colors flex-shrink-0"
                title={w.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`h-4 w-4 ${w.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-200 group-hover:text-gray-300'}`} />
              </button>

              {/* Title */}
              <div className="flex-1 min-w-0">
                {editingId === w.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="input-field text-sm py-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(w.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button onClick={() => handleRename(w.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/workflows/${w.id}`}
                    className="text-ds-sm font-medium text-gray-900 hover:text-brand-600 truncate block"
                  >
                    {w.title}
                  </Link>
                )}

                {/* Tool badges + Tag chips */}
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.toolsUsed.slice(0, 4).map((tool) => (
                    <span key={tool} className="ds-tag ds-tag-neutral text-[11px]">{tool}</span>
                  ))}
                  {w.toolsUsed.length > 4 && (
                    <span className="text-ds-xs text-gray-400">+{w.toolsUsed.length - 4}</span>
                  )}
                  {w.tags.map((t) => (
                    <span
                      key={t.id}
                      className="ds-tag text-[11px] border"
                      style={{
                        backgroundColor: t.color + '15',
                        borderColor: t.color + '40',
                        color: t.color,
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="hidden sm:flex items-center gap-4 text-ds-xs text-gray-500 flex-shrink-0">
                <span className="flex items-center gap-1" title="Steps">
                  <Layers className="h-3.5 w-3.5" />
                  {w.stepCount ?? 0}
                </span>
                <span className="flex items-center gap-1" title="Duration">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(w.durationMs)}
                </span>
                {w.confidence !== null && (
                  <span className="flex items-center gap-1" title="Confidence">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {formatConfidence(w.confidence)}
                  </span>
                )}
                {w.viewCount > 0 && (
                  <span className="flex items-center gap-1" title="Views">
                    <Eye className="h-3.5 w-3.5" />
                    {w.viewCount}
                  </span>
                )}
                <span className="w-16 text-right" title={w.createdAt}>
                  {formatDateRelative(w.createdAt)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setTagMenuWorkflowId(tagMenuWorkflowId === w.id ? null : w.id);
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
                      allTags={tags}
                      onToggle={handleToggleTag}
                      onClose={() => setTagMenuWorkflowId(null)}
                    />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingId(w.id);
                    setEditTitle(w.title);
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(w.id);
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpgradeBanner({ usage, limit, atLimit }: { usage: number; limit: number; atLimit: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
    } catch { /* handled */ }
    setLoading(false);
  }

  return (
    <div className={`card px-ds-5 py-ds-4 mb-ds-4 flex items-center gap-ds-4 ${atLimit ? 'border-amber-200 bg-amber-50/50' : 'bg-brand-50/30 border-brand-100'}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-ds-md ${atLimit ? 'bg-amber-100' : 'bg-brand-100'}`}>
        {atLimit ? <Lock className="h-5 w-5 text-amber-600" /> : <Zap className="h-5 w-5 text-brand-600" />}
      </div>
      <div className="flex-1">
        <p className="text-ds-sm font-medium text-gray-900">
          {atLimit
            ? 'Free plan limit reached'
            : `${usage} of ${limit} free uploads used`}
        </p>
        <p className="text-ds-xs text-gray-500">
          {atLimit
            ? 'Upgrade to Pro for unlimited workflows, advanced templates, and process intelligence.'
            : 'Upgrade to Pro for unlimited uploads and advanced features.'}
        </p>
      </div>
      <button onClick={handleUpgrade} disabled={loading} className="btn-primary text-xs gap-1 flex-shrink-0">
        <Zap className="h-3.5 w-3.5" />
        {loading ? 'Redirecting...' : 'Upgrade to Pro'}
      </button>
    </div>
  );
}

// ─── Tag assignment dropdown ────────────────────────────────────────────────

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

// ─── Streak tracking banner ─────────────────────────────────────────────────

function StreakBanner({ streak }: { streak: StreakData }) {
  const nextMilestone = streak.milestones.find((m) => !m.isReached);
  const lastReached = [...streak.milestones].reverse().find((m) => m.isReached);

  return (
    <div className="card flex items-center gap-ds-4 px-ds-5 py-ds-4 mb-ds-4 bg-gradient-to-r from-orange-50/50 to-white border-orange-100">
      <div className="flex h-9 w-9 items-center justify-center rounded-ds-md bg-orange-100">
        <Flame className="h-5 w-5 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {streak.currentStreak > 0 && (
            <div className="flex items-baseline gap-1">
              <span className="text-ds-lg font-bold text-orange-600">{streak.currentStreak}</span>
              <span className="text-ds-xs text-gray-500">day streak</span>
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-ds-sm font-semibold text-gray-700">{streak.monthlyCount}</span>
            <span className="text-ds-xs text-gray-500">this month</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-ds-sm font-semibold text-gray-700">{streak.totalCount}</span>
            <span className="text-ds-xs text-gray-500">total</span>
          </div>
        </div>
        {lastReached && (
          <div className="flex items-center gap-1.5 mt-1">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] text-gray-500">
              {lastReached.label}
              {nextMilestone && (
                <> &middot; {nextMilestone.threshold - streak.totalCount} more to {nextMilestone.label}</>
              )}
            </span>
          </div>
        )}
      </div>
      {streak.longestStreak > 1 && (
        <div className="text-right flex-shrink-0">
          <p className="text-ds-xs text-gray-400">Best streak</p>
          <p className="text-ds-sm font-semibold text-gray-600">{streak.longestStreak} days</p>
        </div>
      )}
    </div>
  );
}
