/**
 * PresetChipRail — pure-logic invariants (Path D D+5, iter-062).
 *
 * Environment: Vitest node — no jsdom, no React rendering.
 *
 * Tests the deterministic logic that drives chip state in PresetChipRail:
 *   E1-E6: detectActivePreset — active-state derivation
 *   F1-F3: normalizePlanTier — plan-tier coercion
 *   G1-G4: chip-gate predicates — plan-gating + AI-pending rules
 *   H1-H3: catalog integration — chip count, icon map coverage, tooltip copy
 *
 * The component's internal functions (detectActivePreset, normalizePlanTier)
 * are not exported; their logic is mirrored here exactly as in ColumnPicker.test.ts.
 *
 * @see apps/web-app/src/components/dashboard-v2/PresetChipRail.tsx
 * @see apps/web-app/src/lib/dashboard-columns/presets.ts
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_DASHBOARD_PRESETS,
  getPresetById,
  getAvailablePresets,
  type PresetId,
  type PresetDefinition,
} from '../../lib/dashboard-columns/presets.js';
import type { UserDashboardPreference } from '../../lib/dashboard-columns/index.js';

// ── Mirror: detectActivePreset ────────────────────────────────────────────────
// Exact copy of the component's internal detectActivePreset function.
// If the component changes this logic, the test must update accordingly.

function detectActivePreset(prefs: UserDashboardPreference): PresetId | null {
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

// ── Mirror: normalizePlanTier ─────────────────────────────────────────────────

function normalizePlanTier(
  userPlan: string | undefined,
): 'free' | 'starter' | 'team' {
  if (userPlan === 'team') return 'team';
  if (userPlan === 'starter') return 'starter';
  return 'free';
}

// ── Mirror: isDisabledByPlan ──────────────────────────────────────────────────

function isDisabledByPlan(
  preset: PresetDefinition,
  planTier: 'free' | 'starter' | 'team',
): boolean {
  return preset.planTierGate === 'team' && planTier !== 'team';
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makePrefs(preset: PresetDefinition): UserDashboardPreference {
  return {
    schemaVersion: 1,
    visibleColumns: preset.visibleColumns,
    columnOrder: preset.columnOrder,
    filters: [],
    savedViews: [],
  };
}

// ── E: detectActivePreset ─────────────────────────────────────────────────────

describe('E: detectActivePreset', () => {
  it('E1: returns preset id when visibleColumns + columnOrder both match', () => {
    const preset = WORKFLOW_DASHBOARD_PRESETS.find(
      (p) => p.id === 'automation_candidates',
    )!;
    const prefs = makePrefs(preset);
    expect(detectActivePreset(prefs)).toBe('automation_candidates');
  });

  it('E2: returns null when visibleColumns do not match (different length)', () => {
    const prefs: UserDashboardPreference = {
      schemaVersion: 1,
      visibleColumns: ['workflow_title'],
      columnOrder: ['workflow_title'],
      filters: [],
      savedViews: [],
    };
    expect(detectActivePreset(prefs)).toBeNull();
  });

  it('E3: returns null when visibleColumns same length but different content', () => {
    const preset = WORKFLOW_DASHBOARD_PRESETS.find(
      (p) => p.id === 'automation_candidates',
    )!;
    // Replace first column with a different one
    const mutated = [...preset.visibleColumns];
    mutated[0] = 'last_run_at';
    const prefs: UserDashboardPreference = {
      schemaVersion: 1,
      visibleColumns: mutated,
      columnOrder: mutated,
      filters: [],
      savedViews: [],
    };
    expect(detectActivePreset(prefs)).toBeNull();
  });

  it('E4: AI presets are never detected as active (availability guard)', () => {
    const aiPresets = WORKFLOW_DASHBOARD_PRESETS.filter((p) =>
      p.id.startsWith('ai_'),
    );
    for (const preset of aiPresets) {
      // Build prefs that would match if availability check did not exist
      const prefs: UserDashboardPreference = {
        schemaVersion: 1,
        visibleColumns: preset.visibleColumns.length
          ? preset.visibleColumns
          : ['workflow_title', 'health_score'],
        columnOrder: preset.columnOrder.length
          ? preset.columnOrder
          : ['workflow_title', 'health_score'],
        filters: [],
        savedViews: [],
      };
      const result = detectActivePreset(prefs);
      // AI presets have visibleColumns matching available presets; result may be
      // null OR another canonical preset — but never the AI preset itself
      expect(result).not.toBe(preset.id);
    }
  });

  it('E5: is deterministic — same inputs produce same output on repeat calls', () => {
    const preset = getPresetById('needs_attention')!;
    const prefs = makePrefs(preset);
    const r1 = detectActivePreset(prefs);
    const r2 = detectActivePreset(prefs);
    const r3 = detectActivePreset(prefs);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
    expect(r1).toBe('needs_attention');
  });

  it('E6: returns null for empty preferences (no column selections)', () => {
    const prefs: UserDashboardPreference = {
      schemaVersion: 1,
      visibleColumns: [],
      columnOrder: [],
      filters: [],
      savedViews: [],
    };
    expect(detectActivePreset(prefs)).toBeNull();
  });
});

// ── F: normalizePlanTier ───────────────────────────────────────────────────────

describe('F: normalizePlanTier', () => {
  it('F1: "team" string → team tier', () => {
    expect(normalizePlanTier('team')).toBe('team');
  });

  it('F2: "starter" string → starter tier', () => {
    expect(normalizePlanTier('starter')).toBe('starter');
  });

  it('F3: undefined and unknown strings → free tier (conservative default)', () => {
    expect(normalizePlanTier(undefined)).toBe('free');
    expect(normalizePlanTier('free')).toBe('free');
    expect(normalizePlanTier('unknown_plan')).toBe('free');
    expect(normalizePlanTier('')).toBe('free');
  });
});

// ── G: chip-gate predicates ────────────────────────────────────────────────────

describe('G: chip-gate predicates', () => {
  it('G1: team-gated presets are disabled for free tier', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    expect(teamGated.length).toBe(2); // catalog invariant A8
    for (const preset of teamGated) {
      expect(isDisabledByPlan(preset, 'free')).toBe(true);
    }
  });

  it('G2: team-gated presets are disabled for starter tier', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    for (const preset of teamGated) {
      expect(isDisabledByPlan(preset, 'starter')).toBe(true);
    }
  });

  it('G3: team-gated presets are NOT disabled for team tier', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    for (const preset of teamGated) {
      expect(isDisabledByPlan(preset, 'team')).toBe(false);
    }
  });

  it('G4: canonical presets (null planTierGate) are never disabled by plan', () => {
    const canonical = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === null,
    );
    // 5 canonical + 3 AI presets all have null planTierGate
    expect(canonical.length).toBeGreaterThanOrEqual(5);
    for (const preset of canonical) {
      expect(isDisabledByPlan(preset, 'free')).toBe(false);
      expect(isDisabledByPlan(preset, 'starter')).toBe(false);
      expect(isDisabledByPlan(preset, 'team')).toBe(false);
    }
  });
});

// ── H: catalog integration ─────────────────────────────────────────────────────

describe('H: catalog integration for chip rail', () => {
  it('H1: chip rail renders exactly 10 chips (one per preset)', () => {
    // The chip rail maps WORKFLOW_DASHBOARD_PRESETS 1:1 to chips
    expect(WORKFLOW_DASHBOARD_PRESETS.length).toBe(10);
  });

  it('H2: every preset has an iconName that maps to a known Lucide icon', () => {
    // Mirror of the ICON_MAP in the component
    const KNOWN_ICON_NAMES = new Set([
      'Zap', 'AlertTriangle', 'GitBranch', 'BarChart2',
      'Clock', 'Share2', 'Target', 'Sparkles', 'Cpu', 'TrendingUp',
    ]);
    for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
      expect(
        KNOWN_ICON_NAMES.has(preset.iconName),
        `Preset "${preset.id}" iconName "${preset.iconName}" not in ICON_MAP`,
      ).toBe(true);
    }
  });

  it('H3: AI presets produce "Available after Path C R+1" tooltip copy (pending availability)', () => {
    const aiPresets = WORKFLOW_DASHBOARD_PRESETS.filter((p) =>
      p.id.startsWith('ai_'),
    );
    expect(aiPresets.length).toBe(3);
    for (const preset of aiPresets) {
      // The tooltip text is set by the component when isPending === true
      // (availability !== 'available'). Verify the availability drives it.
      expect(preset.availability).not.toBe('available');
      // When this preset is NOT available, getAvailablePresets never returns it
      for (const tier of ['free', 'starter', 'team'] as const) {
        const available = getAvailablePresets(tier);
        const ids = available.map((p) => p.id);
        expect(ids).not.toContain(preset.id);
      }
    }
  });
});
