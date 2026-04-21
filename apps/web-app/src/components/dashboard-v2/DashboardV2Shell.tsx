'use client';

/**
 * DashboardV2Shell — top-level layout for the Dashboard V2 experience.
 *
 * Owns:
 *  - Data fetching (fetch + useState, matching codebase pattern — TanStack Query
 *    not installed; see FRONTEND_NOTES deviation)
 *  - Time range state (D7: UI-only, default 30d)
 *  - Filter state (system, opportunity, health status)
 *  - Insight chip filter state
 *
 * Renders the 3 sections:
 *  1. CommandHeader
 *  2. InsightsStrip
 *  3. WorkflowList
 *
 * State machine derivation (PRD §9):
 *  - loading      → isLoading
 *  - error        → isError
 *  - empty        → workflows.length === 0 && !hasActiveFilters
 *  - no-results   → workflows.length === 0 && hasActiveFilters (after filter)
 *  - sparse       → 0 < filteredCount < 3 (before filters)
 *  - ready        → else
 *
 * Note: the state is derived from post-filter results so the list body
 * reflects the active filter context accurately.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import CommandHeader, { type TimeRange } from './CommandHeader.js';
import InsightsStrip from './InsightsStrip.js';
import WorkflowList, {
  type WorkflowListState,
  applyFilters,
} from './WorkflowList.js';
import type { FilterState } from './WorkflowListFilterBar.js';
import { hasActiveFilters } from './WorkflowListFilterBar.js';
import type { WorkflowRowData } from './WorkflowRow.js';
import type { InsightChip } from '@/lib/workflow-metrics.js';

// ── API response types ────────────────────────────────────────────────────────

interface WorkflowsApiResponse {
  workflows: WorkflowRowData[];
  stats: {
    portfolioHealthScore: number;
    insightChips: InsightChip[];
    topInsights: Array<{ id: string; title: string; severity: string; insightType: string }>;
  };
}

// ── Minimum skeleton display to avoid flash ───────────────────────────────────

const SKELETON_MIN_MS = 300;

// ── Time range filter ─────────────────────────────────────────────────────────

function filterByTimeRange(workflows: WorkflowRowData[], range: TimeRange): WorkflowRowData[] {
  if (range === 'all') return workflows;
  const now = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return workflows.filter((w) => new Date(w.createdAt).getTime() >= cutoff);
}

// ── Extract unique systems from workflow set ──────────────────────────────────

function extractSystems(workflows: WorkflowRowData[]): string[] {
  const seen = new Set<string>();
  for (const w of workflows) {
    for (const s of w.toolsUsed) {
      seen.add(s);
    }
  }
  return Array.from(seen).sort();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardV2Shell() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [allWorkflows, setAllWorkflows] = useState<WorkflowRowData[]>([]);
  const [portfolioHealthScore, setPortfolioHealthScore] = useState<number | null>(null);
  const [insightChips, setInsightChips] = useState<InsightChip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Enforce minimum skeleton display time
  const loadStartRef = useRef<number>(Date.now());

  // ── UI state ────────────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [filters, setFilters] = useState<FilterState>({
    systems: [],
    opportunity: null,
    healthStatus: null,
  });
  const [insightFilterKey, setInsightFilterKey] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchWorkflows = useCallback(async () => {
    const elapsed = Date.now() - loadStartRef.current;
    const remainingDelay = Math.max(0, SKELETON_MIN_MS - elapsed);

    try {
      const res = await fetch('/api/workflows?sort=health_score&dir=asc');
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data = (await res.json()) as WorkflowsApiResponse;

      // Enforce minimum skeleton display
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      setAllWorkflows(data.workflows ?? []);
      setPortfolioHealthScore(data.stats?.portfolioHealthScore ?? null);
      setInsightChips(data.stats?.insightChips ?? []);
      setIsError(false);
    } catch {
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    loadStartRef.current = Date.now();
    void fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    loadStartRef.current = Date.now();
    void fetchWorkflows();
  }, [fetchWorkflows]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Apply time range (UI-only, D7)
  const timeFilteredWorkflows = filterByTimeRange(allWorkflows, timeRange);

  // Apply user filters + insight filter to determine UI state
  const filteredWorkflows = applyFilters(timeFilteredWorkflows, filters, insightFilterKey);

  const availableSystems = extractSystems(allWorkflows);

  const anyFiltersActive =
    hasActiveFilters(filters) || insightFilterKey !== null;

  // Derive UI state
  function deriveState(): WorkflowListState {
    if (isLoading) return 'loading';
    if (isError) return 'error';
    if (filteredWorkflows.length === 0 && !anyFiltersActive) return 'empty';
    if (filteredWorkflows.length === 0 && anyFiltersActive) return 'no-results';
    if (filteredWorkflows.length < 3) return 'sparse';
    return 'ready';
  }
  const listState = deriveState();

  // Top insight: highest-severity chip
  const topInsight =
    insightChips.length > 0
      ? insightChips.reduce((best, chip) => {
          const order: Record<InsightChip['severity'], number> = {
            critical: 4,
            warning: 3,
            info: 2,
            positive: 1,
          };
          return order[chip.severity] > order[best.severity] ? chip : best;
        })
      : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 min-h-0">
      {/* Section 1: Command Header */}
      <CommandHeader
        portfolioHealthScore={isLoading ? null : portfolioHealthScore}
        topInsight={topInsight}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* Section 2: Insights Strip */}
      {!isLoading && !isError && insightChips.length > 0 && (
        <InsightsStrip
          chips={insightChips}
          activeFilterKey={insightFilterKey}
          onChipClick={(key) => {
            setInsightFilterKey((prev) => (prev === key ? null : key));
          }}
        />
      )}

      {/* Section 3: Workflow Intelligence List */}
      <WorkflowList
        state={listState}
        workflows={timeFilteredWorkflows}
        filters={filters}
        insightFilterKey={insightFilterKey}
        availableSystems={availableSystems}
        onFiltersChange={setFilters}
        onClearInsightFilter={() => setInsightFilterKey(null)}
        onRetry={handleRetry}
      />
    </div>
  );
}
