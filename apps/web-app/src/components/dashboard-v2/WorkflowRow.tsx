'use client';

/**
 * WorkflowRow — single row in the Workflow Intelligence List.
 *
 * 4 columns inlined per D10 (PRD §5.3):
 *  1. Workflow Name + subtext (systems · last-run · N runs)
 *  2. Systems (icon-only pills, max 3 + "+N" overflow)
 *  3. Opportunity (tag chip: text + icon, never color-only)
 *  4. Health Score (integer + 3-band rail + optional breakdown tooltip for Starter+)
 *
 * Contract enforcement (PRD §10 / iter-021 spec):
 *  - Honest dimension labels: Speed, Consistency, Data Quality, Standardization
 *  - `isGated: true` → shows lock icon + "Upgrade to see breakdown" in tooltip
 *  - `isGated: false` → shows full breakdown tooltip
 *  - `opportunityTag === 'healthy'` → renders green "Healthy" tag (positive signal)
 *  - `aiOpportunityScore` shown in tooltip only when tag === 'automate' and not gated
 *
 * Accessibility (PRD §10):
 *  - <th scope="row"> for name cell
 *  - aria-label on health score cell
 *  - Keyboard: Enter = row click, Space = kebab menu
 *  - Focus rings on all interactive elements
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  GitBranch,
  Target,
  Eye,
  Leaf,
  MoreHorizontal,
  Lock,
  ChevronDown,
  Pencil,
  Archive,
  Link,
  type LucideIcon,
} from 'lucide-react';
import type { WorkflowMetricsOutput, OpportunityTag } from '@/lib/workflow-metrics.js';
import { formatDuration, formatDateRelative } from '@/lib/format.js';

// ── Workflow shape from API response ──────────────────────────────────────────

export interface WorkflowRowData {
  id: string;
  title: string;
  toolsUsed: string[];
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  metricsV2: WorkflowMetricsOutput;
}

interface WorkflowRowProps {
  workflow: WorkflowRowData;
}

// ── Opportunity tag config ────────────────────────────────────────────────────

const OPPORTUNITY_CONFIG: Record<
  OpportunityTag,
  {
    label: string;
    Icon: LucideIcon;
    containerClass: string;
    textClass: string;
  }
> = {
  automate: {
    label: 'Automate',
    Icon: Zap,
    containerClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700',
  },
  standardize: {
    label: 'Standardize',
    Icon: GitBranch,
    containerClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
  },
  optimize: {
    label: 'Optimize',
    Icon: Target,
    containerClass: 'bg-purple-50 border-purple-200',
    textClass: 'text-purple-700',
  },
  monitor: {
    label: 'Monitor',
    Icon: Eye,
    containerClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
  },
  healthy: {
    label: 'Healthy',
    Icon: Leaf,
    containerClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700',
  },
};

// ── Health score band ─────────────────────────────────────────────────────────

function healthBand(score: number): {
  label: 'poor' | 'fair' | 'good';
  railClass: string;
  textClass: string;
} {
  if (score < 40) {
    return { label: 'poor', railClass: 'bg-red-500', textClass: 'text-red-600' };
  }
  if (score < 70) {
    return { label: 'fair', railClass: 'bg-amber-500', textClass: 'text-amber-600' };
  }
  return { label: 'good', railClass: 'bg-green-500', textClass: 'text-green-600' };
}

// ── Health Score breakdown tooltip ───────────────────────────────────────────

interface HealthTooltipProps {
  metricsV2: WorkflowMetricsOutput;
}

function HealthTooltip({ metricsV2 }: HealthTooltipProps) {
  const { healthScore, opportunityTag, aiOpportunityScore } = metricsV2;

  if (healthScore.isGated) {
    return (
      <div className="absolute right-0 top-full mt-ds-2 z-50 w-56 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-md p-ds-3 text-[12px]">
        <div className="flex items-center gap-ds-2 text-[var(--content-secondary)]">
          <Lock size={12} aria-hidden="true" />
          <span>Upgrade to see breakdown</span>
        </div>
        <a
          href="/pricing"
          className="mt-ds-2 block text-[12px] font-medium text-green-600 hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
        >
          View plans →
        </a>
      </div>
    );
  }

  // Honest dimension labels per contract enforcement
  const dimensions: { label: string; score: number; max: number }[] = [
    { label: 'Speed', score: healthScore.speed, max: 30 },
    { label: 'Consistency', score: healthScore.consistency, max: 30 },
    { label: 'Data Quality', score: healthScore.dataQuality, max: 20 },
    { label: 'Standardization', score: healthScore.standardization, max: 20 },
  ];

  return (
    <div className="absolute right-0 top-full mt-ds-2 z-50 w-64 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-md p-ds-3">
      <p className="text-[12px] font-medium text-[var(--content-primary)] mb-ds-2">
        Score breakdown
      </p>
      <ul className="space-y-1.5">
        {dimensions.map((dim) => (
          <li key={dim.label} className="flex items-center justify-between gap-ds-2">
            <span className="text-[12px] text-[var(--content-secondary)]">{dim.label}</span>
            <div className="flex items-center gap-ds-2">
              <div className="w-16 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--content-secondary)]"
                  style={{ width: `${(dim.score / dim.max) * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[12px] font-medium tabular-nums text-[var(--content-primary)] w-10 text-right">
                {dim.score}/{dim.max}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* AI opportunity score — shown only for automate tag (auditable per §7.8) */}
      {opportunityTag === 'automate' && (
        <p className="mt-ds-2 pt-ds-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--content-secondary)]">
          AI opportunity:{' '}
          <span className="font-medium tabular-nums text-[var(--content-primary)]">
            {aiOpportunityScore}/100
          </span>
        </p>
      )}
    </div>
  );
}

// ── SOP readiness subtext (Starter+ only) ────────────────────────────────────

function sopReadinessLabel(confidence: number | null): string | null {
  if (confidence === null) return null;
  if (confidence > 0.8) return 'SOP ready';
  if (confidence > 0.5) return 'SOP partial';
  return null; // not_ready: no positive signal to show
}

// ── Quick-action kebab menu ───────────────────────────────────────────────────

interface KebabMenuProps {
  workflowId: string;
  workflowTitle: string;
  onClose: () => void;
}

function KebabMenu({ workflowId, workflowTitle, onClose }: KebabMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function handleCopyLink() {
    const url = `${window.location.origin}/workflows/${workflowId}`;
    void navigator.clipboard.writeText(url);
    onClose();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${workflowTitle}`}
      className="absolute right-0 top-full mt-ds-1 z-50 w-40 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-md py-ds-1"
    >
      <button
        role="menuitem"
        type="button"
        className="w-full flex items-center gap-ds-2 px-ds-3 py-ds-2 text-[14px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)] transition-colors duration-150 focus:outline-none focus-visible:bg-[var(--surface-secondary)]"
        onClick={onClose}
      >
        <Pencil size={12} aria-hidden="true" />
        Edit name
      </button>
      <button
        role="menuitem"
        type="button"
        className="w-full flex items-center gap-ds-2 px-ds-3 py-ds-2 text-[14px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)] transition-colors duration-150 focus:outline-none focus-visible:bg-[var(--surface-secondary)]"
        onClick={onClose}
      >
        <Archive size={12} aria-hidden="true" />
        Archive
      </button>
      <button
        role="menuitem"
        type="button"
        className="w-full flex items-center gap-ds-2 px-ds-3 py-ds-2 text-[14px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)] transition-colors duration-150 focus:outline-none focus-visible:bg-[var(--surface-secondary)]"
        onClick={handleCopyLink}
      >
        <Link size={12} aria-hidden="true" />
        Copy link
      </button>
    </div>
  );
}

// ── Main WorkflowRow ──────────────────────────────────────────────────────────

export default function WorkflowRow({ workflow }: WorkflowRowProps) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showKebab, setShowKebab] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { metricsV2, toolsUsed, title, createdAt, lastViewedAt } = workflow;
  const { healthScore, opportunityTag, runs } = metricsV2;

  const opportunityStyle = OPPORTUNITY_CONFIG[opportunityTag];
  const band = healthBand(healthScore.overall);

  // Systems column: max 3 visible, "+N" overflow
  const MAX_SYSTEMS = 3;
  const visibleSystems = toolsUsed.slice(0, MAX_SYSTEMS);
  const overflowCount = toolsUsed.length - MAX_SYSTEMS;

  // Name subtext: systems · last-run · N runs
  const subtextParts: string[] = [];
  if (toolsUsed.length > 0) {
    subtextParts.push(toolsUsed.slice(0, 2).join(', ') + (toolsUsed.length > 2 ? '…' : ''));
  }
  const lastRunDate = lastViewedAt ?? createdAt;
  subtextParts.push(formatDateRelative(lastRunDate));
  if (runs !== null) {
    subtextParts.push(`${runs} run${runs !== 1 ? 's' : ''}`);
  }

  // SOP readiness subtext (Starter+ — isGated false)
  const sopSubtext = !healthScore.isGated ? sopReadinessLabel(metricsV2.confidence) : null;

  function handleRowClick() {
    router.push(`/workflows/${workflow.id}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleRowClick();
    }
    if (e.key === ' ') {
      e.preventDefault();
      setShowKebab(true);
    }
  }

  return (
    <tr
      className={`
        group relative cursor-pointer transition-all duration-150
        ${isHovered ? 'bg-[var(--surface-secondary)] rounded-[10px] shadow-sm' : 'bg-transparent'}
        focus-within:outline-none
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowTooltip(false); }}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      aria-label={`Workflow: ${title}`}
    >
      {/* Column 1: Workflow Name + subtext */}
      <th scope="row" className="px-ds-4 py-ds-3 text-left font-normal w-2/5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-[var(--content-primary)] truncate">
            {title}
          </span>
          <span className="text-[12px] font-normal text-[var(--content-tertiary)] truncate">
            {subtextParts.join(' · ')}
          </span>
        </div>
      </th>

      {/* Column 2: Systems (icon pills) — hidden < 768px per PRD §5.3 */}
      <td className="px-ds-4 py-ds-3 hidden md:table-cell w-1/5">
        {toolsUsed.length === 0 ? (
          <span className="text-[14px] text-[var(--content-tertiary)]" aria-label="No systems">
            —
          </span>
        ) : (
          <div className="flex items-center gap-ds-1 flex-wrap">
            {visibleSystems.map((system) => (
              <span
                key={system}
                className="inline-flex items-center px-ds-2 py-0.5 rounded-ds-sm bg-[var(--surface-secondary)] text-[12px] font-medium text-[var(--content-secondary)] border border-[var(--border-subtle)]"
                title={system}
                aria-label={system}
              >
                {/* Text pill per D6 — no system icons available in current codebase */}
                {system.length > 10 ? system.slice(0, 8) + '…' : system}
              </span>
            ))}
            {overflowCount > 0 && (
              <span
                className="inline-flex items-center px-ds-2 py-0.5 rounded-ds-sm bg-[var(--surface-secondary)] text-[12px] font-medium text-[var(--content-tertiary)] border border-[var(--border-subtle)]"
                title={toolsUsed.slice(MAX_SYSTEMS).join(', ')}
                aria-label={`${overflowCount} more systems: ${toolsUsed.slice(MAX_SYSTEMS).join(', ')}`}
              >
                +{overflowCount}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Column 3: Opportunity (tag chip) — hidden < 480px per PRD §5.3 */}
      <td className="px-ds-4 py-ds-3 hidden sm:table-cell w-1/5">
        <span
          className={`
            inline-flex items-center gap-ds-1 px-ds-2 py-0.5
            rounded-ds-sm border text-[12px] font-medium
            ${opportunityStyle.containerClass} ${opportunityStyle.textClass}
          `}
          aria-label={`Opportunity: ${opportunityStyle.label}`}
        >
          <opportunityStyle.Icon size={12} aria-hidden="true" />
          {opportunityStyle.label}
        </span>
      </td>

      {/* Column 4: Health Score + breakdown tooltip */}
      <td
        className="px-ds-4 py-ds-3 relative w-1/5"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip((prev) => !prev);
        }}
      >
        <div
          className="flex flex-col items-end gap-0.5 cursor-pointer"
          aria-label={`Health score: ${healthScore.overall}, ${band.label}`}
        >
          {/* Integer + rail */}
          <div className="flex items-center gap-ds-2">
            <div
              className="w-12 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full ${band.railClass}`}
                style={{ width: `${healthScore.overall}%` }}
              />
            </div>
            <span
              className={`text-[16px] font-medium tabular-nums ${band.textClass}`}
              aria-hidden="true"
            >
              {healthScore.overall}
            </span>
            <ChevronDown
              size={10}
              className="text-[var(--content-tertiary)]"
              aria-hidden="true"
            />
          </div>

          {/* SOP subtext pill (Starter+ only) */}
          {sopSubtext && (
            <span className="text-[12px] font-normal text-[var(--content-tertiary)]">
              {sopSubtext}
            </span>
          )}
        </div>

        {/* Breakdown tooltip */}
        {showTooltip && (
          <HealthTooltip metricsV2={metricsV2} />
        )}
      </td>

      {/* Kebab menu trigger — only visible on row hover */}
      <td className="px-ds-2 py-ds-3 relative w-8">
        {isHovered && (
          <div className="relative">
            <button
              type="button"
              className="p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 text-[var(--content-tertiary)] hover:text-[var(--content-primary)] transition-colors duration-150"
              aria-label={`Actions for ${title}`}
              aria-haspopup="menu"
              aria-expanded={showKebab}
              onClick={(e) => {
                e.stopPropagation();
                setShowKebab((prev) => !prev);
              }}
            >
              <MoreHorizontal size={14} aria-hidden="true" />
            </button>

            {showKebab && (
              <KebabMenu
                workflowId={workflow.id}
                workflowTitle={title}
                onClose={() => setShowKebab(false)}
              />
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
