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
 *
 * iter-031 interaction hardening:
 *  - DV2-R02a: inline edit mode replaces window.prompt for rename
 *  - DV2-R02b: inline confirm affordance replaces window.confirm for archive
 *  - DV2-R03: tooltip Escape dismiss + blur-outside dismiss (WCAG 2.1 SC 1.4.13)
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics.js';
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
  AlertTriangle,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { WorkflowMetricsOutput, OpportunityTag } from '@/lib/workflow-metrics.js';
import { formatDate, formatDateRelative } from '@/lib/format.js';
import type { TimeRange } from './CommandHeader.js';
import {
  getColumnByKey,
  type ColumnKey,
  type ColumnAccessorContext,
} from '@/lib/dashboard-columns/index.js';
import { densityRowPaddingClass, type RowDensity } from './density.js';

// ── Dynamic column rendering helpers ─────────────────────────────────────────

/**
 * Column keys that receive special hardcoded rendering.
 * These are always rendered by their dedicated JSX blocks regardless of
 * `visibleColumns`. Pending columns that slip through accessors also return null.
 */
const SPECIAL_RENDER_KEYS = new Set<ColumnKey>(['workflow_title', 'health_score']);

/**
 * Format an accessor return value for display in a generic `<td>` cell.
 * Returns "—" (em-dash) for null/undefined (audit-honesty — never fabricate).
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    // Durations (large ms numbers) — show as human-readable time
    if (value > 1000) {
      const s = Math.round(value / 1000);
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      const remS = s % 60;
      if (m < 60) return remS > 0 ? `${m}m ${remS}s` : `${m}m`;
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
    }
    // Percentages 0-100
    if (value >= 0 && value <= 100 && String(value).includes('.')) {
      return `${value.toFixed(1)}%`;
    }
    return String(Math.round(value));
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return (value as unknown[]).slice(0, 3).join(', ') + (value.length > 3 ? `…` : '');
  }
  return String(value);
}

// ── Workflow shape from API response ──────────────────────────────────────────

export interface WorkflowRowData {
  id: string;
  title: string;
  toolsUsed: string[];
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  /**
   * ISO timestamp from `ProcessDefinition.updatedAt` — when the process
   * definition last gained or changed a run.  Used as the honest "Last Run"
   * proxy (Batch A / dashboard-redesign P0 item 2).  Null when no
   * ProcessDefinition exists for this workflow yet.
   */
  processDefinitionUpdatedAt: string | null;
  /**
   * Batch C item 19: server-computed staleness signal (route.ts
   * `computeIsStale`). Drives the inline "Stale" badge. Optional because not
   * every fixture / call site populates it; treated as `false` when absent
   * (honest — no badge unless the server says the workflow is stale).
   */
  isStale?: boolean;
  metricsV2: WorkflowMetricsOutput;
}

interface WorkflowRowProps {
  workflow: WorkflowRowData;
  /** D7: when time range is not "all", runs subtext gets "(all-time)" qualifier */
  timeRange?: TimeRange;
  /** Callback to notify parent when this workflow's title changes (kebab rename) */
  onRename?: (id: string, newTitle: string) => void;
  /** Callback to notify parent when this workflow is archived (kebab archive) */
  onArchive?: (id: string) => void;
  /** PRD §4 metric #2: perf timestamp captured at dashboard_v2_viewed emission.
   * Used to compute elapsedMsSinceDashboardView on row-click navigation. */
  dashboardViewPerfTimestampMs?: number;
  /**
   * D+4 (iter-061): ordered list of visible column keys from user preferences.
   * workflow_title (col 0) and health_score are always rendered by their
   * dedicated hardcoded blocks and are skipped when iterating this list.
   * Defaults to the 6 hard-coded display columns to preserve backward-compat.
   */
  visibleColumns?: readonly ColumnKey[];
  /**
   * Batch C item 16: row density. Controls the vertical padding of every cell
   * in the row. Defaults to 'regular' — the pre-Batch-C padding — so existing
   * call sites render byte-identically.
   */
  density?: RowDensity;
  /**
   * atglance-review item #17 — SINGLE shared clock boundary. The list computes
   * one `referenceNowMs` snapshot (WorkflowList's `nowMs = useMemo(() =>
   * Date.now(), [])`) and threads it into every row, so all rows in one render
   * share ONE wall-clock value — matching the `route.ts` single-upstream-clock
   * pattern. Removes the latent hydration/determinism landmine of a per-row
   * `Date.now()`. Today's accessors are lifetime accessors that ignore this
   * value; Wave A time-windowed accessors will consume it deterministically.
   *
   * Optional + defaulted so standalone/test call sites that don't thread a clock
   * still get a STABLE (non-Date.now()) value — never a fresh per-row clock.
   */
  referenceNowMs?: number;
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

/**
 * 3-state health band.
 * Thresholds: <60 → poor/red, 60–79 → fair/amber, ≥80 → good/green
 * iter-024: tightened from 40/70 to 60/80 per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4.
 */
function healthBand(score: number): {
  label: 'poor' | 'fair' | 'good';
  railClass: string;
  textClass: string;
  pipClass: string;
} {
  if (score < 60) {
    // text-red-400 (#f87171) ≈ 6.1:1 on dark surface (#0D1117) — WCAG AA compliant
    return { label: 'poor', railClass: 'bg-red-500', textClass: 'text-red-400', pipClass: 'bg-red-500' };
  }
  if (score < 80) {
    // text-amber-400 (#fbbf24) ≈ 9.3:1 on dark surface — WCAG AA compliant
    return { label: 'fair', railClass: 'bg-amber-500', textClass: 'text-amber-400', pipClass: 'bg-amber-500' };
  }
  // text-green-400 (#34d399) ≈ 7.1:1 on dark surface — WCAG AA compliant
  return { label: 'good', railClass: 'bg-green-500', textClass: 'text-green-400', pipClass: 'bg-green-500' };
}

// ── Health pill (Batch C item 17) ─────────────────────────────────────────────

/**
 * Map a health score to its colored-pill tier presentation. Reuses the SAME
 * 60/80 thresholds as `healthBand` (single source of truth — no new logic).
 * The pill shows the human-readable tier word; the numeric score stays
 * accessible via the cell's aria-label and the pill's `title`.
 *
 * Honest: the pill reflects only the computed `healthScore.overall` band — it
 * never alters or re-derives the underlying value.
 */
export function healthPillTier(score: number): {
  label: 'Healthy' | 'At risk' | 'Needs review';
  pillClass: string;
} {
  if (score < 60) {
    return { label: 'Needs review', pillClass: 'bg-red-50 border-red-200 text-red-700' };
  }
  if (score < 80) {
    return { label: 'At risk', pillClass: 'bg-amber-50 border-amber-200 text-amber-700' };
  }
  return { label: 'Healthy', pillClass: 'bg-green-50 border-green-200 text-green-700' };
}

// ── Health Score breakdown tooltip ───────────────────────────────────────────

interface HealthTooltipProps {
  metricsV2: WorkflowMetricsOutput;
  /** DV2-R03: called when tooltip should close (Escape key or blur-outside) */
  onDismiss: () => void;
  /** DV2-R03: ref for returning focus to the trigger element on dismiss */
  triggerRef: React.RefObject<HTMLElement | null>;
}

function HealthTooltip({ metricsV2, onDismiss, triggerRef }: HealthTooltipProps) {
  const { healthScore, opportunityTag, aiOpportunityScore } = metricsV2;
  const containerRef = useRef<HTMLDivElement>(null);

  // DV2-R03: blur-outside dismiss — fires when focus leaves the tooltip region
  // NOTE: Escape handling is centralized in WorkflowRow via useEscapeDispatch (MDR-P08)
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    // relatedTarget is the element receiving focus; if it's outside the container, dismiss
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node | null)) {
      onDismiss();
    }
  }

  if (healthScore.isGated) {
    return (
      <div
        ref={containerRef}
        role="tooltip"
        tabIndex={-1}
        onBlur={handleBlur}
        className="absolute right-0 top-full mt-ds-2 z-50 w-56 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-md p-ds-3 text-[12px]"
      >
        <div className="flex items-center gap-ds-2 text-[var(--content-secondary)]">
          <Lock size={12} aria-hidden="true" />
          <span>Upgrade to see breakdown</span>
        </div>
        <a
          href="/pricing"
          className="mt-ds-2 block text-[12px] font-medium text-green-600 hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
          onClick={() => {
            // PRD §4 metric #6: upgrade CTA from gated health state
            track({ event: 'upgrade_clicked', location: 'dashboard_v2_health_gate' });
          }}
        >
          Compare plans →
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
    <div
      ref={containerRef}
      role="tooltip"
      tabIndex={-1}
      onBlur={handleBlur}
      className="absolute right-0 top-full mt-ds-2 z-50 w-64 rounded-[10px] bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-md p-ds-3"
    >
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
  workflowTitle: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  /** DV2-R02a: signals parent to activate inline edit mode — no window.prompt */
  onStartRename: () => void;
  /** DV2-R02b: signals parent to activate inline archive confirmation — no window.confirm */
  onStartArchiveConfirm: () => void;
  onCopyLink: () => void;
}

function KebabMenu({
  workflowTitle,
  triggerRef,
  onClose,
  onStartRename,
  onStartArchiveConfirm,
  onCopyLink,
}: KebabMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus first menu item on open
  useEffect(() => {
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  // NOTE: Escape handling is centralized in WorkflowRow via useEscapeDispatch (MDR-P08)

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
        onClick={() => {
          onClose();
          onStartRename();
        }}
      >
        <Pencil size={12} aria-hidden="true" />
        Edit name
      </button>
      <button
        role="menuitem"
        type="button"
        className="w-full flex items-center gap-ds-2 px-ds-3 py-ds-2 text-[14px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)] transition-colors duration-150 focus:outline-none focus-visible:bg-[var(--surface-secondary)]"
        onClick={() => {
          onClose();
          onStartArchiveConfirm();
        }}
      >
        <Archive size={12} aria-hidden="true" />
        Archive
      </button>
      <button
        role="menuitem"
        type="button"
        className="w-full flex items-center gap-ds-2 px-ds-3 py-ds-2 text-[14px] text-[var(--content-primary)] hover:bg-[var(--surface-secondary)] transition-colors duration-150 focus:outline-none focus-visible:bg-[var(--surface-secondary)]"
        onClick={onCopyLink}
      >
        <Link size={12} aria-hidden="true" />
        Copy link
      </button>
    </div>
  );
}

// ── Inline edit affordance (DV2-R02a) ────────────────────────────────────────

interface InlineEditProps {
  currentTitle: string;
  workflowId: string;
  onCommit: (newTitle: string) => void;
  onCancel: () => void;
}

function InlineEdit({ currentTitle, workflowId, onCommit, onCancel }: InlineEditProps) {
  const [value, setValue] = useState(currentTitle);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when edit mode activates
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentTitle) {
      onCancel();
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Rename failed — changes not saved.');
        setIsBusy(false);
        return;
      }
      onCommit(trimmed);
    } catch {
      setError('Network error. Could not rename workflow.');
      setIsBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  function handleBlur() {
    // Blur commits (same as Enter), unless already busy or errored
    if (!isBusy) {
      void commit();
    }
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={isBusy}
        aria-label="Rename workflow"
        className="text-[14px] font-medium text-[var(--content-primary)] bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 w-full"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {isBusy && (
        <span className="text-[12px] text-[var(--content-tertiary)]">Saving…</span>
      )}
      {error && (
        <span role="alert" className="text-[12px] text-red-600">{error}</span>
      )}
    </div>
  );
}

// ── Inline archive confirmation (DV2-R02b) ───────────────────────────────────

interface InlineArchiveConfirmProps {
  workflowId: string;
  workflowTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Ref to element that triggered the confirmation, for focus-return on cancel/complete */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function InlineArchiveConfirm({
  workflowId,
  workflowTitle,
  onConfirm,
  onCancel,
  triggerRef,
}: InlineArchiveConfirmProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button when the affordance appears
  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  // NOTE: Escape handling is centralized in WorkflowRow via useEscapeDispatch (MDR-P08)

  async function handleConfirmArchive() {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Archive failed — workflow not archived.');
        setIsBusy(false);
        return;
      }
      onConfirm();
    } catch {
      setError('Network error. Could not archive workflow.');
      setIsBusy(false);
    }
  }

  return (
    <div
      className="px-ds-4 py-ds-2 flex flex-col gap-ds-1"
      role="region"
      aria-label={`Confirm archive for ${workflowTitle}`}
    >
      <span className="text-[12px] text-[var(--content-secondary)]">
        Archive workflow?
      </span>
      {error && (
        <span role="alert" className="text-[12px] text-red-600">{error}</span>
      )}
      <div className="flex items-center gap-ds-2">
        <button
          ref={confirmBtnRef}
          type="button"
          disabled={isBusy}
          aria-label={`Confirm archive for ${workflowTitle}`}
          className="px-ds-2 py-0.5 rounded text-[12px] font-medium bg-red-600 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 transition-colors duration-150"
          onClick={() => { void handleConfirmArchive(); }}
        >
          {isBusy ? 'Archiving…' : 'Archive'}
        </button>
        <button
          type="button"
          disabled={isBusy}
          aria-label="Cancel — do not archive"
          className="px-ds-2 py-0.5 rounded text-[12px] font-medium text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 transition-colors duration-150"
          onClick={() => {
            onCancel();
            triggerRef.current?.focus();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Centralized Escape dispatch (MDR-P08) ────────────────────────────────────

/**
 * Installs a single document-level `keydown` listener when ANY overlay is
 * active. Dispatches to exactly one callback on Escape using innermost-first
 * priority, then calls preventDefault + stopPropagation to prevent bubbling to
 * ancestor listeners (e.g. PortfolioSidebar Escape handlers in future).
 *
 * Priority order (highest → lowest):
 *   1. InlineArchiveConfirm → onArchiveCancel
 *   2. InlineEdit — handled by its own onKeyDown on the input; if active but
 *      input does not have focus, fall through to priority 3.
 *   3. KebabMenu open → onKebabClose
 *   4. HealthTooltip visible → onTooltipDismiss
 *
 * Sub-components retain their onDismiss / onClose / onCancel prop contracts
 * unchanged; this hook merely decides which one fires on a given keypress.
 */
interface EscapeDispatchConfig {
  isConfirmingArchive: boolean;
  isEditingName: boolean;
  showKebab: boolean;
  showTooltip: boolean;
  onArchiveCancel: () => void;
  onKebabClose: () => void;
  onTooltipDismiss: () => void;
  kebabTriggerRef: React.RefObject<HTMLButtonElement | null>;
  tooltipTriggerRef: React.RefObject<HTMLDivElement | null>;
}

function useEscapeDispatch({
  isConfirmingArchive,
  isEditingName,
  showKebab,
  showTooltip,
  onArchiveCancel,
  onKebabClose,
  onTooltipDismiss,
  kebabTriggerRef,
  tooltipTriggerRef,
}: EscapeDispatchConfig): void {
  const anyOverlayActive = isConfirmingArchive || showKebab || showTooltip;

  // Use refs for callbacks so the effect closure never stales without
  // re-binding. The dependency array tracks the active-state booleans only.
  const onArchiveCancelRef = useRef(onArchiveCancel);
  const onKebabCloseRef = useRef(onKebabClose);
  const onTooltipDismissRef = useRef(onTooltipDismiss);
  onArchiveCancelRef.current = onArchiveCancel;
  onKebabCloseRef.current = onKebabClose;
  onTooltipDismissRef.current = onTooltipDismiss;

  useEffect(() => {
    if (!anyOverlayActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;

      // Priority 1: InlineArchiveConfirm
      if (isConfirmingArchive) {
        e.preventDefault();
        e.stopPropagation();
        onArchiveCancelRef.current();
        kebabTriggerRef.current?.focus();
        return;
      }

      // Priority 2: InlineEdit — its input's own onKeyDown handles Escape when
      // the input has focus (browser delivers to focused element first). This
      // fallback fires only if InlineEdit is mounted but its input is not
      // focused. In that edge case, treat as a no-op here and let the input
      // regain focus naturally; we do NOT interfere with the edit session.
      if (isEditingName) return;

      // Priority 3: KebabMenu
      if (showKebab) {
        e.preventDefault();
        e.stopPropagation();
        onKebabCloseRef.current();
        kebabTriggerRef.current?.focus();
        return;
      }

      // Priority 4: HealthTooltip
      if (showTooltip) {
        e.preventDefault();
        e.stopPropagation();
        onTooltipDismissRef.current();
        tooltipTriggerRef.current?.focus();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    anyOverlayActive,
    isConfirmingArchive,
    isEditingName,
    showKebab,
    showTooltip,
    kebabTriggerRef,
    tooltipTriggerRef,
  ]);
}

// ── Main WorkflowRow ──────────────────────────────────────────────────────────

export default function WorkflowRow({
  workflow,
  timeRange,
  onRename,
  onArchive,
  dashboardViewPerfTimestampMs = 0,
  visibleColumns,
  density = 'regular',
  // atglance-review item #17: single shared clock threaded from WorkflowList.
  // Default 0 is a STABLE sentinel (NOT Date.now()) — today's lifetime accessors
  // ignore it, so a stable default keeps render deterministic + hydration-safe.
  referenceNowMs = 0,
}: WorkflowRowProps) {
  const router = useRouter();
  // Batch C item 16: density-driven vertical padding for every cell in this row.
  const cellPadY = densityRowPaddingClass(density);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showKebab, setShowKebab] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(workflow.title);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const kebabTriggerRef = useRef<HTMLButtonElement>(null);
  // DV2-R03: ref for the health score cell trigger (for tooltip focus-return)
  const tooltipTriggerRef = useRef<HTMLDivElement>(null);

  // MDR-P08: centralized single Escape listener — replaces three per-component listeners
  useEscapeDispatch({
    isConfirmingArchive,
    isEditingName,
    showKebab,
    showTooltip,
    onArchiveCancel: () => setIsConfirmingArchive(false),
    onKebabClose: () => setShowKebab(false),
    onTooltipDismiss: () => setShowTooltip(false),
    kebabTriggerRef,
    tooltipTriggerRef,
  });

  const { metricsV2, toolsUsed, createdAt, lastViewedAt } = workflow;
  const { healthScore, opportunityTag, runs } = metricsV2;

  // D+4: build accessor context once per render for dynamic column resolution.
  //
  // iter-065 / WDC2-P01: `referenceNowMs` + `activeTimeRange` are now mandatory
  // fields on `ColumnAccessorContext`. Existing accessors (iter-056) ignore
  // them — they return lifetime values. Wave A accessors (row #101) will
  // consume them to compute time-windowed statistics.
  //
  // atglance-review item #17 (DONE): `referenceNowMs` is now threaded from the
  // SINGLE WorkflowList-level boundary (`nowMs = useMemo(() => Date.now(), [])`)
  // instead of a fresh per-row `Date.now()`. All rows in one render share one
  // wall-clock value — matching the `route.ts:485-487` single-upstream-clock
  // pattern from iter-037 / MDR-P03. This removes the latent hydration/
  // determinism landmine the moment a Wave A time-windowed accessor consumes it.
  const accessorContext: ColumnAccessorContext = {
    title: workflow.title,
    toolsUsed: workflow.toolsUsed,
    lastViewedAt: workflow.lastViewedAt,
    createdAt: workflow.createdAt,
    // Batch A (2026-06-12): processDefinitionUpdatedAt for honest "Last Run" proxy
    processDefinitionUpdatedAt: workflow.processDefinitionUpdatedAt,
    metricsV2: workflow.metricsV2,
    referenceNowMs,
    activeTimeRange: timeRange ?? 'all',
  };

  // Columns to render between workflow_title and health_score.
  // If visibleColumns is provided, use it (excluding locked special-render keys).
  // Otherwise fall back to the legacy hardcoded set.
  const dynamicColumnKeys: ColumnKey[] = visibleColumns
    ? visibleColumns.filter((k) => !SPECIAL_RENDER_KEYS.has(k)) as ColumnKey[]
    : ['systems', 'opportunity_tag'];

  const opportunityStyle = OPPORTUNITY_CONFIG[opportunityTag];
  const band = healthBand(healthScore.overall);
  // Batch C item 17: colored health tier pill (reuses the 60/80 band thresholds).
  const healthTier = healthPillTier(healthScore.overall);

  // PRD §4 metric #2: derive analytics healthBand string from the same 60/80 thresholds
  const analyticsHealthBand: 'red' | 'amber' | 'green' =
    healthScore.overall < 60 ? 'red' : healthScore.overall < 80 ? 'amber' : 'green';

  // Systems column: max 3 visible, "+N" overflow
  const MAX_SYSTEMS = 3;
  const visibleSystems = toolsUsed.slice(0, MAX_SYSTEMS);
  const overflowCount = toolsUsed.length - MAX_SYSTEMS;

  // D7: annotate runs with "(all-time)" when time range is not "all"
  const isAllTime = !timeRange || timeRange === 'all';

  // Name subtext: systems · last-run · N runs [(all-time)]
  const subtextParts: string[] = [];
  if (toolsUsed.length > 0) {
    subtextParts.push(toolsUsed.slice(0, 2).join(', ') + (toolsUsed.length > 2 ? '…' : ''));
  }
  const lastRunDate = lastViewedAt ?? createdAt;
  subtextParts.push(formatDateRelative(lastRunDate));
  if (runs !== null) {
    const runsLabel = `${runs} run${runs !== 1 ? 's' : ''}${isAllTime ? '' : ' (all-time)'}`;
    subtextParts.push(runsLabel);
  }
  // Process-variation grouping signal: distinct variant paths, shown only when the
  // group has real multi-run variation (honest — never "1 variant" noise).
  const variantCount = metricsV2.variantCount ?? null;
  if (runs !== null && runs >= 2 && variantCount !== null && variantCount >= 2) {
    subtextParts.push(`${variantCount} variants`);
  }

  // SOP readiness subtext (Starter+ — isGated false)
  const sopSubtext = !healthScore.isGated ? sopReadinessLabel(metricsV2.confidence) : null;

  function handleRowClick() {
    // Do not navigate when inline interactions are active
    if (isEditingName || isConfirmingArchive) return;
    // PRD §4 metric #2: time-to-first-click (p50 <8s, p95 <15s)
    const elapsed =
      dashboardViewPerfTimestampMs > 0
        ? Math.round(performance.now() - dashboardViewPerfTimestampMs)
        : 0;
    track({
      event: 'workflow_row_clicked',
      workflowId: workflow.id,
      elapsedMsSinceDashboardView: elapsed,
      healthBand: analyticsHealthBand,
    });
    router.push(`/workflows/${workflow.id}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent) {
    if (isEditingName || isConfirmingArchive) return;
    if (e.key === 'Enter') {
      handleRowClick();
    }
    if (e.key === ' ') {
      e.preventDefault();
      setShowKebab(true);
    }
  }

  // DV2-R02a: inline edit callbacks
  function handleRenameCommit(newTitle: string) {
    setDisplayTitle(newTitle);
    setIsEditingName(false);
    onRename?.(workflow.id, newTitle);
  }

  function handleRenameCancel() {
    setIsEditingName(false);
    kebabTriggerRef.current?.focus();
  }

  // DV2-R02b: inline archive confirm callbacks
  function handleArchiveConfirm() {
    setIsConfirmingArchive(false);
    onArchive?.(workflow.id);
  }

  function handleArchiveCancel() {
    setIsConfirmingArchive(false);
  }

  // DV2-R03: tooltip dismiss
  function handleTooltipDismiss() {
    setShowTooltip(false);
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/workflows/${workflow.id}`;
    void navigator.clipboard.writeText(url);
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
      aria-label={`Workflow: ${displayTitle}`}
    >
      {/* Column 1: Workflow Name + subtext + variation badge (item d) */}
      <th scope="row" className={`px-ds-4 ${cellPadY} text-left font-normal w-2/5`}>
        {/* DV2-R02a: inline edit input replaces name text when editing */}
        {isEditingName ? (
          <InlineEdit
            currentTitle={displayTitle}
            workflowId={workflow.id}
            onCommit={handleRenameCommit}
            onCancel={handleRenameCancel}
          />
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-[var(--content-primary)] truncate">
              {displayTitle}
            </span>
            <span className="text-[12px] font-normal text-[var(--content-secondary)] truncate">
              {subtextParts.join(' · ')}
            </span>
            {/* Badge row — high-variation and stale signals sit together so a
                row with both does not stack into two lines. Honest: each badge
                reflects only a server-computed signal. */}
            {(metricsV2.variationLabel === 'high' || workflow.isStale === true) && (
              <div className="flex items-center gap-ds-1 flex-wrap mt-0.5">
                {/* High variation badge (iter-024 §4.1 item d) */}
                {metricsV2.variationLabel === 'high' && (
                  <span
                    className="inline-flex items-center gap-[3px] self-start px-1 py-0.5 rounded-ds-sm bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700"
                    aria-label="This workflow has high run-to-run variation"
                  >
                    <AlertTriangle size={10} aria-hidden="true" />
                    High variation
                  </span>
                )}
                {/* Batch C item 19: stale badge — honest, driven by the
                    server-computed isStale signal (route.ts computeIsStale). */}
                {workflow.isStale === true && (
                  <span
                    className="inline-flex items-center gap-[3px] self-start px-1 py-0.5 rounded-ds-sm bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[10px] font-medium text-[var(--content-secondary)]"
                    aria-label="This workflow is stale — not reviewed recently"
                  >
                    <Clock size={10} aria-hidden="true" />
                    Stale
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* DV2-R02b: inline archive confirmation banner */}
        {isConfirmingArchive && (
          <InlineArchiveConfirm
            workflowId={workflow.id}
            workflowTitle={displayTitle}
            onConfirm={handleArchiveConfirm}
            onCancel={handleArchiveCancel}
            triggerRef={kebabTriggerRef}
          />
        )}
      </th>

      {/* Dynamic middle columns (D+4): driven by visibleColumns from user preferences.
          Falls back to [systems, opportunity_tag] when no preferences are provided,
          preserving the pre-D+4 visual layout byte-identically. */}
      {dynamicColumnKeys.map((colKey) => {
        // Special rendering for the two original display columns
        if (colKey === 'systems') {
          return (
            <td key="systems" className={`px-ds-4 ${cellPadY} hidden md:table-cell w-1/5`}>
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
          );
        }

        if (colKey === 'opportunity_tag') {
          return (
            <td key="opportunity_tag" className={`px-ds-4 ${cellPadY} hidden sm:table-cell w-1/5`}>
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
          );
        }

        // Generic dynamic column: use accessor from registry
        const colDef = getColumnByKey(colKey);
        if (!colDef) return null;

        // Audit-honesty: pending columns always render "—" (accessor is null)
        const rawValue = colDef.accessor ? colDef.accessor(accessorContext) : null;
        // Date columns: format as absolute date string ("Jun 12, 2026") using
        // the UTC-anchored formatDate helper — deterministic across server/client
        // (hydration-safe).  Do NOT use Date.now()-relative strings in render.
        const cellText = colDef.dataType === 'date' && typeof rawValue === 'string'
          ? formatDate(rawValue) || '—'
          : formatCellValue(rawValue);

        return (
          <td
            key={colKey}
            className={`px-ds-4 ${cellPadY} text-[13px] text-[var(--content-secondary)] truncate max-w-[140px]`}
            title={cellText !== '—' ? cellText : undefined}
            aria-label={`${colDef.label}: ${cellText}`}
          >
            {cellText}
          </td>
        );
      })}

      {/* Column 4: Health Score + color pip + run-count qualifier + breakdown tooltip */}
      <td
        className={`px-ds-4 ${cellPadY} relative w-1/5`}
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip((prev) => !prev);
        }}
      >
        <div
          ref={tooltipTriggerRef}
          role="group"
          className="flex flex-col items-end gap-0.5 cursor-pointer"
          aria-label={
            runs !== null && runs < 10
              ? `Health score: ${healthScore.overall}, ${band.label}, based on ${runs} run${runs !== 1 ? 's' : ''} — low confidence`
              : runs === null
              ? `Health score: ${healthScore.overall}, ${band.label}, no runs recorded`
              : `Health score: ${healthScore.overall}, ${band.label}`
          }
        >
          {/* Color pip + integer + rail (iter-024 §4.1 item c) */}
          <div className="flex items-center gap-ds-2">
            {/* Batch C item 17: colored tier pill — honest computed-band verdict.
                Numeric score remains accessible via the cell aria-label, the
                visible integer below, and the pill's title attribute. */}
            <span
              className={`inline-flex items-center px-ds-2 py-0.5 rounded-ds-sm border text-[11px] font-medium ${healthTier.pillClass}`}
              title={`Health score: ${healthScore.overall}`}
              aria-hidden="true"
            >
              {healthTier.label}
            </span>
            {/* 6px solid color pip — primary visual verdict for scannability */}
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${band.pipClass}`}
              aria-hidden="true"
            />
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
              className="text-[var(--content-secondary)]"
              aria-hidden="true"
            />
          </div>

          {/* SOP subtext pill (Starter+ only) */}
          {sopSubtext && (
            <span className="text-[12px] font-normal text-[var(--content-secondary)]">
              {sopSubtext}
            </span>
          )}

          {/* Run-count qualifier: shown when runs < 10 or runs === null (iter-024 §4.1 item f) */}
          {runs !== null && runs < 10 && (
            <span className="text-[10px] text-[var(--content-secondary)]" aria-hidden="true">
              n={runs}
            </span>
          )}
          {runs === null && (
            <span className="text-[10px] text-[var(--content-secondary)]" aria-hidden="true">
              n=0 — no runs
            </span>
          )}
        </div>

        {/* DV2-R03: Breakdown tooltip — now with Escape + blur-outside dismiss */}
        {showTooltip && (
          <HealthTooltip
            metricsV2={metricsV2}
            onDismiss={handleTooltipDismiss}
            triggerRef={tooltipTriggerRef}
          />
        )}
      </td>

      {/* Kebab menu trigger — always mounted; hidden by default, revealed on
          row hover, row focus-within, or direct focus-visible (MDR-P06 fix:
          keyboard-only users can now reach this trigger via Tab). */}
      <td className={`px-ds-2 ${cellPadY} relative w-8`}>
        <div className="relative">
          <button
            ref={kebabTriggerRef}
            type="button"
            className="p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 text-[var(--content-tertiary)] hover:text-[var(--content-primary)] transition-colors duration-150 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
            aria-label={`Actions for ${displayTitle}`}
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
              workflowTitle={displayTitle}
              triggerRef={kebabTriggerRef}
              onClose={() => setShowKebab(false)}
              onStartRename={() => setIsEditingName(true)}
              onStartArchiveConfirm={() => setIsConfirmingArchive(true)}
              onCopyLink={handleCopyLink}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
