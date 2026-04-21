'use client';

/**
 * WorkflowListFilterBar — filter controls for the Workflow Intelligence List.
 *
 * Filters (PRD §5.3):
 *  - "Needs attention" pinned chip (iter-024 §4.1 item e) — FIRST in the bar
 *  - System (multi-select from unique toolsUsed values in user's workflow set)
 *  - Opportunity (Automate / Standardize / Optimize / Monitor / Healthy)
 *  - Health Status (healthy / needs_review / high_variation / stale)
 *  - Active-filter chip display with individual clear buttons
 *
 * "Needs attention" filter definition (PRD §D-E5, v1):
 *   health < 60 OR variationLabel === 'high'
 *   Note: delta ≤ −10 per PRD confirmed definition is excluded from v1 —
 *   per-workflow delta is not available in MVP. Tracked as a follow-up.
 *
 * Design tokens (PRD §5.4): 12px/500 labels, 6px radius, 8px/12px spacing
 */

import { X, Filter, AlertTriangle } from 'lucide-react';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';

export type HealthStatusFilter = 'healthy' | 'needs_review' | 'high_variation' | 'stale';

export interface FilterState {
  systems: string[];
  opportunity: OpportunityTag | null;
  healthStatus: HealthStatusFilter | null;
  /** iter-024 §4.1 item e: health <60 OR variationLabel==='high' */
  needsAttention: boolean;
}

interface WorkflowListFilterBarProps {
  availableSystems: string[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const OPPORTUNITY_OPTIONS: { value: OpportunityTag; label: string }[] = [
  { value: 'automate', label: 'Automate' },
  { value: 'standardize', label: 'Standardize' },
  { value: 'optimize', label: 'Optimize' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'healthy', label: 'Healthy' },
];

const HEALTH_STATUS_OPTIONS: { value: HealthStatusFilter; label: string }[] = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'high_variation', label: 'High Variation' },
  { value: 'stale', label: 'Stale' },
];

function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.systems.length > 0 ||
    filters.opportunity !== null ||
    filters.healthStatus !== null ||
    filters.needsAttention === true
  );
}

export default function WorkflowListFilterBar({
  availableSystems,
  filters,
  onFiltersChange,
}: WorkflowListFilterBarProps) {
  function toggleSystem(system: string) {
    const next = filters.systems.includes(system)
      ? filters.systems.filter((s) => s !== system)
      : [...filters.systems, system];
    onFiltersChange({ ...filters, systems: next });
  }

  function setOpportunity(value: OpportunityTag | null) {
    onFiltersChange({ ...filters, opportunity: value });
  }

  function setHealthStatus(value: HealthStatusFilter | null) {
    onFiltersChange({ ...filters, healthStatus: value });
  }

  function toggleNeedsAttention() {
    onFiltersChange({ ...filters, needsAttention: !filters.needsAttention });
  }

  function clearAll() {
    onFiltersChange({ systems: [], opportunity: null, healthStatus: null, needsAttention: false });
  }

  const active = hasActiveFilters(filters);

  return (
    <div className="px-ds-8 py-ds-3 flex flex-wrap items-center gap-ds-2 border-b border-[var(--border-subtle)]">
      {/* "Needs attention" pinned chip — rendered FIRST (iter-024 §4.1 item e) */}
      <button
        type="button"
        onClick={toggleNeedsAttention}
        aria-pressed={filters.needsAttention}
        className={`
          inline-flex items-center gap-ds-1 px-ds-2 py-0.5
          rounded-ds-sm border text-[12px] font-medium
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
          ${
            filters.needsAttention
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-transparent border-[var(--border-default)] text-[var(--content-secondary)] hover:border-red-300 hover:text-red-700'
          }
        `}
      >
        <AlertTriangle size={12} aria-hidden="true" />
        Needs attention
      </button>

      {/* Filter icon label */}
      <span className="flex items-center gap-ds-1 text-[12px] font-medium text-[var(--content-secondary)]">
        <Filter size={12} aria-hidden="true" />
        Filters
      </span>

      {/* System filter (multi-select pills) */}
      {availableSystems.length > 0 && (
        <div className="flex items-center gap-ds-1 flex-wrap">
          {availableSystems.map((system) => {
            const isSelected = filters.systems.includes(system);
            return (
              <button
                key={system}
                type="button"
                onClick={() => toggleSystem(system)}
                aria-pressed={isSelected}
                className={`
                  px-ds-2 py-0.5 rounded-ds-sm border text-[12px] font-medium
                  transition-colors duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
                  ${
                    isSelected
                      ? 'bg-[var(--content-primary)] text-[var(--surface-primary)] border-[var(--content-primary)]'
                      : 'bg-transparent text-[var(--content-secondary)] border-[var(--border-default)] hover:border-[var(--content-secondary)]'
                  }
                `}
              >
                {system}
              </button>
            );
          })}
        </div>
      )}

      {/* Opportunity filter */}
      <select
        value={filters.opportunity ?? ''}
        onChange={(e) =>
          setOpportunity(e.target.value === '' ? null : (e.target.value as OpportunityTag))
        }
        className="text-[12px] font-medium text-[var(--content-secondary)] bg-transparent border border-[var(--border-default)] rounded-ds-sm px-ds-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer"
        aria-label="Filter by opportunity"
      >
        <option value="">Opportunity</option>
        {OPPORTUNITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Health status filter */}
      <select
        value={filters.healthStatus ?? ''}
        onChange={(e) =>
          setHealthStatus(
            e.target.value === '' ? null : (e.target.value as HealthStatusFilter),
          )
        }
        className="text-[12px] font-medium text-[var(--content-secondary)] bg-transparent border border-[var(--border-default)] rounded-ds-sm px-ds-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer"
        aria-label="Filter by health status"
      >
        <option value="">Health Status</option>
        {HEALTH_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Active filter chips */}
      {active && (
        <div className="flex items-center gap-ds-1 flex-wrap ml-ds-2">
          {filters.systems.map((system) => (
            <span
              key={system}
              className="inline-flex items-center gap-ds-1 px-ds-2 py-0.5 rounded-ds-sm bg-[var(--surface-secondary)] text-[12px] font-medium text-[var(--content-primary)] border border-[var(--border-default)]"
            >
              {system}
              <button
                type="button"
                onClick={() => toggleSystem(system)}
                className="ml-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label={`Remove ${system} filter`}
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          ))}

          {filters.opportunity && (
            <span className="inline-flex items-center gap-ds-1 px-ds-2 py-0.5 rounded-ds-sm bg-[var(--surface-secondary)] text-[12px] font-medium text-[var(--content-primary)] border border-[var(--border-default)]">
              {OPPORTUNITY_OPTIONS.find((o) => o.value === filters.opportunity)?.label}
              <button
                type="button"
                onClick={() => setOpportunity(null)}
                className="ml-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label="Remove opportunity filter"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          )}

          {filters.healthStatus && (
            <span className="inline-flex items-center gap-ds-1 px-ds-2 py-0.5 rounded-ds-sm bg-[var(--surface-secondary)] text-[12px] font-medium text-[var(--content-primary)] border border-[var(--border-default)]">
              {HEALTH_STATUS_OPTIONS.find((o) => o.value === filters.healthStatus)?.label}
              <button
                type="button"
                onClick={() => setHealthStatus(null)}
                className="ml-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label="Remove health status filter"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded px-ds-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

export { hasActiveFilters };
