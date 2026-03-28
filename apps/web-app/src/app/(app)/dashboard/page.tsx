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
  Filter,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';

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
  }, [fetchWorkflows]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this workflow?')) return;
    await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Workflow Library</h1>
          <p className="text-sm text-gray-500">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/upload" className="btn-primary gap-1.5">
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-3 mb-4">
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

      {/* Workflow list */}
      {isLoading ? (
        <div className="text-center text-sm text-gray-400 py-20">Loading...</div>
      ) : workflows.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-sm font-medium text-gray-900">No workflows yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? 'No workflows match your search.' : 'Upload a recorder JSON file to get started.'}
          </p>
          {!search && (
            <Link href="/upload" className="btn-primary mt-4 inline-flex">
              Upload Your First Workflow
            </Link>
          )}
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
                    className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate block"
                  >
                    {w.title}
                  </Link>
                )}

                {/* Tool badges */}
                {w.toolsUsed.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.toolsUsed.slice(0, 4).map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                      >
                        {tool}
                      </span>
                    ))}
                    {w.toolsUsed.length > 4 && (
                      <span className="text-[10px] text-gray-400">
                        +{w.toolsUsed.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
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
