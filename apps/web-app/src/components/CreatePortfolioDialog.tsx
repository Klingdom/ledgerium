'use client';

/**
 * CreatePortfolioDialog — Modal form for creating a new portfolio
 *
 * Fields:
 * - Name (required)
 * - Type (dropdown with icons)
 * - Color (preset color circles)
 * - Description (optional textarea)
 * - Parent portfolio (optional dropdown from existing flat list)
 *
 * Calls POST /api/portfolios on submit.
 * Calls onCreated() on success so the parent can refresh.
 */

import { useState } from 'react';
import {
  X,
  FolderOpen,
  Briefcase,
  Building2,
  Users,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { track } from '@/lib/analytics';
import type { PortfolioNode, PortfolioType } from './PortfolioSidebar';

// ─── Constants ────────────────────────────────────────────────────────────────

const PORTFOLIO_TYPES: { value: PortfolioType; label: string; Icon: React.ElementType }[] = [
  { value: 'folder',        label: 'Folder',        Icon: FolderOpen  },
  { value: 'project',       label: 'Project',       Icon: Briefcase   },
  { value: 'business_unit', label: 'Business Unit', Icon: Building2   },
  { value: 'department',    label: 'Department',    Icon: Users       },
  { value: 'custom',        label: 'Custom',        Icon: Bookmark    },
];

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

// ─── Helper: flatten tree to a list (for parent dropdown) ─────────────────────

function flattenPortfolios(nodes: PortfolioNode[], depth = 0): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenPortfolios(node.children, depth + 1));
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreatePortfolioDialogProps {
  portfolios: PortfolioNode[];
  onCreated: () => void;
  onClose: () => void;
}

export default function CreatePortfolioDialog({
  portfolios,
  onCreated,
  onClose,
}: CreatePortfolioDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PortfolioType>('folder');
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatPortfolios = flattenPortfolios(portfolios);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: trimmedName,
      type,
      color,
    };
    if (description.trim()) body.description = description.trim();
    if (parentId) body.parentId = parentId;

    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        track({ event: 'portfolio_created', type, hasParent: !!parentId });
        onCreated();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to create portfolio. Please try again.');
      }
    } catch {
      setError('Network error. Could not create portfolio. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="card w-full max-w-md p-0 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-ds-5 py-ds-4 border-b border-gray-100">
            <h2 className="text-ds-sm font-semibold text-gray-900">New Portfolio</h2>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-ds-5 py-ds-4 space-y-ds-4">
            {/* Name */}
            <div>
              <label className="block text-ds-xs font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Finance Workflows"
                className="input-field w-full"
                autoFocus
                required
                maxLength={100}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-ds-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {PORTFOLIO_TYPES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`flex flex-col items-center gap-1 rounded-ds-md border py-2 px-1 transition-colors text-center ${
                      type === value
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium leading-tight">{label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-ds-xs font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      color === c ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-ds-xs font-medium text-gray-700 mb-1">
                Description <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What workflows belong here?"
                className="input-field w-full resize-none"
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Parent portfolio */}
            {flatPortfolios.length > 0 && (
              <div>
                <label className="block text-ds-xs font-medium text-gray-700 mb-1">
                  Parent Portfolio <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="input-field w-full text-ds-xs"
                >
                  <option value="">None (top level)</option>
                  {flatPortfolios.map(({ id, name: n, depth }) => (
                    <option key={id} value={id}>
                      {'  '.repeat(depth)}{depth > 0 ? '└ ' : ''}{n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-ds-xs text-red-600 bg-red-50 border border-red-200 rounded-ds-sm px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-ds-2 pt-ds-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="btn-primary gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Portfolio'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
