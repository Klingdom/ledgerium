'use client';

/**
 * PortfolioSidebar — Portfolio tree navigation panel
 *
 * Displays a collapsible left sidebar with the user's portfolio hierarchy.
 * Provides:
 * - "All Workflows" and "Uncategorized" virtual nodes at the top
 * - Recursive tree with expand/collapse for nested portfolios
 * - Workflow count badge per portfolio
 * - Inline rename, delete actions on hover
 * - "New Portfolio" trigger that opens CreatePortfolioDialog
 */

import { useState, useCallback } from 'react';
import {
  FolderOpen,
  Briefcase,
  Building2,
  Users,
  Bookmark,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { track } from '@/lib/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PortfolioType = 'folder' | 'project' | 'business_unit' | 'department' | 'custom';

export interface PortfolioNode {
  id: string;
  name: string;
  description: string | null;
  type: PortfolioType;
  color: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  workflowCount: number;
  children: PortfolioNode[];
}

interface PortfolioSidebarProps {
  portfolios: PortfolioNode[];
  activePortfolioId: string | null;
  onSelectPortfolio: (id: string | null) => void;
  onCreatePortfolio: () => void;
  onRefresh: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

// ─── Icon resolver ────────────────────────────────────────────────────────────

function PortfolioTypeIcon({ type, className }: { type: PortfolioType; className?: string }) {
  switch (type) {
    case 'folder':
      return <FolderOpen className={className} />;
    case 'project':
      return <Briefcase className={className} />;
    case 'business_unit':
      return <Building2 className={className} />;
    case 'department':
      return <Users className={className} />;
    case 'custom':
      return <Bookmark className={className} />;
    default:
      return <FolderOpen className={className} />;
  }
}

// ─── Single tree node ─────────────────────────────────────────────────────────

function PortfolioTreeNode({
  node,
  depth,
  activePortfolioId,
  onSelect,
  onRefresh,
}: {
  node: PortfolioNode;
  depth: number;
  activePortfolioId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [isHovered, setIsHovered] = useState(false);

  const isActive = activePortfolioId === node.id;
  const hasChildren = node.children.length > 0;

  const handleRename = useCallback(async () => {
    const name = renameValue.trim();
    if (!name || name === node.name) {
      setIsRenaming(false);
      setRenameValue(node.name);
      return;
    }
    try {
      const res = await fetch(`/api/portfolios/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? 'Failed to rename portfolio.';
        window.alert(message);
        setRenameValue(node.name);
        setIsRenaming(false);
        return;
      }
      setIsRenaming(false);
      onRefresh();
      track({ event: 'portfolio_renamed', portfolioId: node.id });
    } catch {
      window.alert('Network error. Could not rename portfolio.');
      setRenameValue(node.name);
      setIsRenaming(false);
    }
  }, [renameValue, node.id, node.name, onRefresh]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete "${node.name}"? Workflows inside will not be deleted.`)) return;
    try {
      const res = await fetch(`/api/portfolios/${node.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? 'Failed to delete portfolio.';
        window.alert(message);
        return;
      }
      onRefresh();
      track({ event: 'portfolio_deleted', portfolioId: node.id });
    } catch {
      window.alert('Network error. Could not delete portfolio.');
    }
  }, [node.id, node.name, onRefresh]);

  const indentPx = depth * 12;

  return (
    <div>
      <div
        className={`group/node flex items-center gap-1.5 rounded-ds-sm px-2 py-1.5 cursor-pointer transition-colors select-none ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${8 + indentPx}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (!isRenaming) {
            onSelect(node.id);
            track({ event: 'portfolio_filter_applied', portfolioId: node.id });
          }
        }}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded((v) => !v);
          }}
          className={`flex-shrink-0 h-3.5 w-3.5 ${!hasChildren ? 'invisible' : ''}`}
        >
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          }
        </button>

        {/* Color dot + icon */}
        <span
          className="flex-shrink-0 h-2 w-2 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <PortfolioTypeIcon
          type={node.type}
          className={`flex-shrink-0 h-3.5 w-3.5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`}
        />

        {/* Name or rename input */}
        {isRenaming ? (
          <div
            className="flex items-center gap-1 flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="input-field text-xs py-0.5 px-1.5 flex-1 min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setIsRenaming(false);
                  setRenameValue(node.name);
                }
              }}
            />
            <button
              onClick={handleRename}
              className="p-0.5 text-green-600 hover:bg-green-50 rounded flex-shrink-0"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setIsRenaming(false);
                setRenameValue(node.name);
              }}
              className="p-0.5 text-gray-400 hover:bg-gray-100 rounded flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex-1 min-w-0 text-ds-xs font-medium truncate ${
              isActive ? 'text-brand-700' : 'text-gray-700'
            }`}>
              {node.name}
            </span>

            {/* Workflow count badge */}
            {node.workflowCount > 0 && !isHovered && (
              <span className="flex-shrink-0 text-[10px] text-gray-400 tabular-nums">
                {node.workflowCount}
              </span>
            )}

            {/* Action buttons — only on hover */}
            {isHovered && (
              <div
                className="flex items-center gap-0.5 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsRenaming(true)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recursive children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <PortfolioTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activePortfolioId={activePortfolioId}
              onSelect={onSelect}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function PortfolioSidebar({
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  onCreatePortfolio,
  onRefresh,
  isCollapsed,
  onToggleCollapsed,
}: PortfolioSidebarProps) {
  const totalWorkflowsInPortfolios = portfolios.reduce((sum, p) => sum + p.workflowCount, 0);

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center pt-2 gap-2 w-8">
        <button
          onClick={onToggleCollapsed}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Expand portfolio sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-52 flex-shrink-0">
      {/* Sidebar header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Portfolios
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreatePortfolio}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="New portfolio"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleCollapsed}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Virtual nodes */}
      <div className="space-y-0.5 mb-2">
        {/* All Workflows */}
        <button
          onClick={() => onSelectPortfolio(null)}
          className={`w-full flex items-center gap-1.5 rounded-ds-sm px-2 py-1.5 text-ds-xs font-medium transition-colors ${
            activePortfolioId === null
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers className={`h-3.5 w-3.5 flex-shrink-0 ${activePortfolioId === null ? 'text-brand-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">All Workflows</span>
        </button>

        {/* Uncategorized */}
        <button
          onClick={() => onSelectPortfolio('uncategorized')}
          className={`w-full flex items-center gap-1.5 rounded-ds-sm px-2 py-1.5 text-ds-xs font-medium transition-colors ${
            activePortfolioId === 'uncategorized'
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FolderOpen className={`h-3.5 w-3.5 flex-shrink-0 ${activePortfolioId === 'uncategorized' ? 'text-brand-600' : 'text-gray-400'}`} />
          <span className="flex-1 text-left">Uncategorized</span>
        </button>
      </div>

      {/* Divider */}
      {portfolios.length > 0 && (
        <div className="border-t border-gray-100 mb-2" />
      )}

      {/* Portfolio tree */}
      {portfolios.length === 0 ? (
        <div className="px-2 py-3 text-center">
          <p className="text-[11px] text-gray-400">No portfolios yet.</p>
          <button
            onClick={onCreatePortfolio}
            className="mt-1.5 text-[11px] text-brand-600 hover:text-brand-700 font-medium"
          >
            Create one &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {portfolios.map((node) => (
            <PortfolioTreeNode
              key={node.id}
              node={node}
              depth={0}
              activePortfolioId={activePortfolioId}
              onSelect={onSelectPortfolio}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Footer: portfolio count */}
      {portfolios.length > 0 && (
        <div className="mt-3 px-2">
          <p className="text-[10px] text-gray-400">
            {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''} &middot; {totalWorkflowsInPortfolios} assigned
          </p>
        </div>
      )}
    </div>
  );
}
