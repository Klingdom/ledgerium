'use client';

/**
 * PresetChipRail — horizontal scrollable strip of preset view chips.
 * Path D D+5 (iter-062).
 *
 * Renders 10 preset chips:
 *  - 5 canonical presets (all plan tiers, always enabled)
 *  - 2 Team-plan-gated presets (disabled for Free/Starter, upgrade-CTA on click)
 *  - 3 AI presets (always disabled; "Available after Path C R+1" tooltip)
 *
 * Active state: when `currentPreferences` matches a preset's column config,
 * that chip renders as active (filled background highlight).
 *
 * Accessibility:
 *  - role="toolbar" + aria-label on the rail
 *  - Each chip: role="button" with aria-pressed (active state) and aria-disabled
 *  - Disabled chips: aria-disabled="true" + cursor-not-allowed + tooltip via title
 *  - Keyboard: Tab through chips; Enter activates; Space activates
 *
 * Design:
 *  - Pill-shaped (rounded-full) chips, small icon left of label
 *  - Horizontal scrollable on narrow viewports (overflow-x-auto + scroll-snap-x)
 *  - No Radix — vanilla React per iter-061 coordinator decision
 *  - Tailwind classes consistent with iter-031 + iter-041 + iter-061 patterns
 *
 * @see apps/web-app/src/lib/dashboard-columns/presets.ts — catalog source of truth
 * @see apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx — integration
 * @see docs/meta/WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md §6 + §11
 */

import { useCallback } from 'react';
import {
  Zap,
  AlertTriangle,
  GitBranch,
  BarChart2,
  Clock,
  Share2,
  Target,
  Sparkles,
  Cpu,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import {
  WORKFLOW_DASHBOARD_PRESETS,
  type PresetDefinition,
  type PresetId,
} from '@/lib/dashboard-columns/presets.js';
import type { UserDashboardPreference } from '@/lib/dashboard-columns/index.js';

// ── Icon map ──────────────────────────────────────────────────────────────────

/**
 * Maps the `iconName` string from `PresetDefinition` to a lucide-react icon.
 * Only icons used by the 10 presets are included.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  AlertTriangle,
  GitBranch,
  BarChart2,
  Clock,
  Share2,
  Target,
  Sparkles,
  Cpu,
  TrendingUp,
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PresetChipRailProps {
  /** Current user preferences — used to detect which preset (if any) is active. */
  currentPreferences: UserDashboardPreference;
  /**
   * Called when the user clicks an enabled, non-gated preset.
   * The shell applies the preset by calling PUT /api/dashboard/preferences
   * with the preset's visibleColumns, columnOrder, and filters.
   */
  onApplyPreset: (preset: PresetDefinition) => void;
  /**
   * The user's plan tier — drives plan-gating chip state.
   * `undefined` defaults to 'free' (conservative default before plan loads).
   */
  userPlan?: string;
}

// ── Active-preset detection ────────────────────────────────────────────────────

/**
 * Determine which preset (if any) matches the current preferences.
 *
 * A preset is "active" when its `visibleColumns` and `columnOrder` deeply equal
 * the current preferences values. Filters are NOT compared — the user may have
 * applied a preset and then further refined filters via the picker.
 *
 * Returns the active `PresetId` or `null`.
 * Determinism: same inputs → same result.
 */
function detectActivePreset(
  prefs: UserDashboardPreference,
): PresetId | null {
  for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
    if (preset.availability !== 'available') continue;
    const colsMatch =
      preset.visibleColumns.length === prefs.visibleColumns.length &&
      preset.visibleColumns.every((k, i) => prefs.visibleColumns[i] === k);
    const orderMatch =
      preset.columnOrder.length === prefs.columnOrder.length &&
      preset.columnOrder.every((k, i) => prefs.columnOrder[i] === k);
    if (colsMatch && orderMatch) return preset.id;
  }
  return null;
}

// ── Plan tier normalizer ───────────────────────────────────────────────────────

function normalizePlanTier(userPlan: string | undefined): 'free' | 'starter' | 'team' {
  if (userPlan === 'team') return 'team';
  if (userPlan === 'starter') return 'starter';
  return 'free';
}

// ── Single chip ───────────────────────────────────────────────────────────────

interface PresetChipProps {
  preset: PresetDefinition;
  isActive: boolean;
  isDisabledByPlan: boolean;
  planTier: 'free' | 'starter' | 'team';
  onApply: (preset: PresetDefinition) => void;
}

function PresetChip({
  preset,
  isActive,
  isDisabledByPlan,
  onApply,
}: PresetChipProps) {
  const Icon = ICON_MAP[preset.iconName] ?? Zap;

  const isPending = preset.availability !== 'available';
  const isDisabled = isPending || isDisabledByPlan;

  // Tooltip copy (shown on hover via title attribute)
  let tooltipText = preset.description;
  if (isPending) {
    tooltipText = 'Available after Path C R+1';
  } else if (isDisabledByPlan) {
    tooltipText = 'Upgrade to Team to access this preset';
  }

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    onApply(preset);
  }, [isDisabled, onApply, preset]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isDisabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onApply(preset);
      }
    },
    [isDisabled, onApply, preset],
  );

  // Visual states:
  // - active: green filled background, white text
  // - disabled (plan): muted text, cursor-not-allowed, neutral border
  // - disabled (pending): same as disabled-by-plan but amber tint to hint "coming soon"
  // - default: border + subtle text, hover lifts
  const chipClass = [
    // Base
    'inline-flex items-center gap-ds-1.5 px-ds-3 py-ds-1',
    'rounded-full text-[12px] font-medium',
    'select-none scroll-snap-align-start flex-shrink-0',
    'transition-colors duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1',
    // State
    isActive
      ? 'bg-green-600 text-white border border-green-600'
      : isPending
        ? 'border border-[var(--border-subtle)] text-[var(--content-disabled,#9ca3af)] cursor-not-allowed opacity-60'
        : isDisabledByPlan
          ? 'border border-[var(--border-subtle)] text-[var(--content-disabled,#9ca3af)] cursor-not-allowed opacity-70'
          : 'border border-[var(--border-default)] text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)] hover:border-[var(--border-default)] cursor-pointer',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-pressed={isActive}
      aria-disabled={isDisabled}
      title={tooltipText}
      className={chipClass}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-preset-id={preset.id}
    >
      <Icon
        size={12}
        aria-hidden="true"
        className="flex-shrink-0"
      />
      <span>{preset.label}</span>
      {isDisabledByPlan && !isPending && (
        <span
          className="ml-0.5 text-[10px] opacity-75"
          aria-label="Team plan required"
        >
          Team
        </span>
      )}
    </div>
  );
}

// ── Rail ──────────────────────────────────────────────────────────────────────

/**
 * Horizontal chip strip placed in the dashboard header, above the WorkflowList.
 *
 * Renders all 10 preset chips from `WORKFLOW_DASHBOARD_PRESETS` in catalog order.
 * The strip scrolls horizontally on narrow viewports without wrapping.
 */
export default function PresetChipRail({
  currentPreferences,
  onApplyPreset,
  userPlan,
}: PresetChipRailProps) {
  const planTier = normalizePlanTier(userPlan);
  const activePresetId = detectActivePreset(currentPreferences);

  return (
    <div
      role="toolbar"
      aria-label="Preset views"
      className="
        flex items-center gap-ds-2
        overflow-x-auto
        [scroll-snap-type:x_mandatory]
        px-ds-4 py-ds-2
        border-b border-[var(--border-subtle)]
        scrollbar-none
      "
    >
      {WORKFLOW_DASHBOARD_PRESETS.map((preset) => {
        const isDisabledByPlan =
          preset.planTierGate === 'team' && planTier !== 'team';

        return (
          <PresetChip
            key={preset.id}
            preset={preset}
            isActive={activePresetId === preset.id}
            isDisabledByPlan={isDisabledByPlan}
            planTier={planTier}
            onApply={onApplyPreset}
          />
        );
      })}
    </div>
  );
}
