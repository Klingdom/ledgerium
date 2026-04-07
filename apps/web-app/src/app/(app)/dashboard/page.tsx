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

interface WorkflowSummary {
  id: string;
  title: string;
  toolsUsed: string[];
  durationMs: number | null;
  stepCount: number | null;
  phaseCount: number | null;
  confidence: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
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

  const fetchWorkflows = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('sort', sortBy);
    params.set('dir', sortDir);

    const res = await fetch(`/api/workflows?${params}`);
    if (res.ok) {
      const data = await res.json();
      setWorkflows(data.workflows);
    }
    setIsLoading(false);
  }, [search, sortBy, sortDir]);

  useEffect(() => {
    fetchWorkflows();
    setOnboarding(getOnboardingState());
    track({ event: 'page_viewed', path: '/dashboard' });
  }, [fetchWorkflows]);

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

                {/* Tool badges */}
                {w.toolsUsed.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.toolsUsed.slice(0, 4).map((tool) => (
                      <span key={tool} className="ds-tag ds-tag-neutral text-[11px]">{tool}</span>
                    ))}
                    {w.toolsUsed.length > 4 && (
                      <span className="text-ds-xs text-gray-400">+{w.toolsUsed.length - 4}</span>
                    )}
                  </div>
                )}
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
                <span className="w-16 text-right" title={w.createdAt}>
                  {formatDateRelative(w.createdAt)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
