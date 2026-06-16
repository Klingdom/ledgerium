'use client';

/**
 * ActiveFiltersBar — the unified active-filters bar (atglance-review #11).
 *
 * Renders ONE consolidated row, above the list, showing every constraint
 * currently narrowing the workflow list — regardless of which of the four
 * mechanisms (opportunity segment, insight chip, filter panel, preset) applied
 * it. One removable chip per constraint + a single "Clear all".
 *
 * The chips are a read-only projection of the shell's source state (derived by
 * `deriveActiveFilterChips`); each chip's ✕ routes back through `onClearChip`
 * to the correct source setter in the shell, and "Clear all" routes through
 * `onClearAll`. The bar invents no filter state of its own — the list and this
 * bar share the SAME single source of truth.
 *
 * Renders nothing when there are no active filters (honesty: shows only real
 * constraints).
 *
 * A11y: each remove control is a real <button> with an explicit
 * "Remove filter: …" aria-label; "Clear all" is a real button; all are
 * keyboard-operable with visible focus rings. Deterministic; no Date.now().
 *
 * @see activeFilters.ts — pure derivation of ActiveFilterChip[]
 * @see DashboardV2Shell.tsx — owns source state + wires the clear callbacks
 */

import { X } from 'lucide-react';
import type { ActiveFilterChip } from './activeFilters.js';

interface ActiveFiltersBarProps {
  chips: readonly ActiveFilterChip[];
  /** Clear a single constraint (routed by the shell to the right source). */
  onClearChip: (chip: ActiveFilterChip) => void;
  /** Clear every constraint across all four sources. */
  onClearAll: () => void;
}

export default function ActiveFiltersBar({
  chips,
  onClearChip,
  onClearAll,
}: ActiveFiltersBarProps) {
  // Honesty: render nothing when nothing is constraining the list.
  if (chips.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-ds-2 px-ds-8 py-ds-2 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
        Filtering by
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-ds-1 px-ds-2 py-0.5 rounded-ds-sm bg-[var(--surface-primary)] text-[12px] font-medium text-[var(--content-primary)] border border-[var(--border-default)]"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onClearChip(chip)}
            className="ml-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 hover:text-[var(--content-secondary)] transition-colors duration-150"
            aria-label={`Remove filter: ${chip.label}`}
          >
            <X size={11} aria-hidden="true" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-ds-1 text-[12px] font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] underline underline-offset-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded px-ds-1"
      >
        Clear all
      </button>
    </div>
  );
}
