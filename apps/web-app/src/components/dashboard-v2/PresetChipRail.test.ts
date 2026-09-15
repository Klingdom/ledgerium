/**
 * PresetChipRail — pure-logic invariants (Path D D+5, iter-062).
 * Row #188 fix (iter TBD): plan-gate logic now flows through the shared
 * `isPresetUnlockedForPlan` helper + `toPlanType` instead of a hand-rolled
 * `normalizePlanTier` mirror that silently downgraded 'solo' / 'growth' /
 * 'enterprise' to 'free'.
 *
 * Environment: Vitest node — no jsdom, no React rendering.
 *
 * Tests the deterministic logic that drives chip state in PresetChipRail:
 *   E1-E6: detectActivePreset — active-state derivation
 *   F1-F8: toPlanType — plan-tier coercion (real helper, all 6 plans + edge cases)
 *   G1-G9: isPresetUnlockedForPlan — chip-gate predicate (real helper)
 *   H1-H3: catalog integration — chip count, icon map coverage, tooltip copy
 *   I1-I2: rail/getAvailablePresets agreement across every plan × preset pair
 *
 * `detectActivePreset` remains an internal, unexported component function and
 * is still mirrored here exactly (unchanged by this fix). The plan-gating
 * logic (`normalizePlanTier` + `isDisabledByPlan`) is NO LONGER mirrored —
 * this file now imports and exercises the real exported `isPresetUnlockedForPlan`
 * from `presets.ts` and the real `toPlanType` from `plans.ts`, so drift between
 * the rail and `getAvailablePresets` is structurally impossible.
 *
 * @see apps/web-app/src/components/dashboard-v2/PresetChipRail.tsx
 * @see apps/web-app/src/lib/dashboard-columns/presets.ts
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_DASHBOARD_PRESETS,
  getPresetById,
  getAvailablePresets,
  isPresetUnlockedForPlan,
  type PresetId,
  type PresetDefinition,
} from '../../lib/dashboard-columns/presets.js';
import type { UserDashboardPreference } from '../../lib/dashboard-columns/index.js';
import { toPlanType, PLAN_HIERARCHY, type PlanType } from '../../lib/plans.js';
import { isChipDisabledByPlan } from './PresetChipRail';

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

// ── F: toPlanType (real helper from plans.ts) ─────────────────────────────────
// Row #188: the rail now converts its raw `userPlan` string via the real
// `toPlanType`, not a hand-rolled 3-value normalizer. Exercise all 6 plan
// tiers plus undefined / unknown-string edge cases.

describe('F: toPlanType coercion for the preset rail', () => {
  it('F1: every canonical PlanType string round-trips to itself', () => {
    for (const plan of PLAN_HIERARCHY) {
      expect(toPlanType(plan)).toBe(plan);
    }
  });

  it('F2: "free" → free', () => {
    expect(toPlanType('free')).toBe('free');
  });

  it('F3: "starter" → starter', () => {
    expect(toPlanType('starter')).toBe('starter');
  });

  it('F4: "solo" → solo', () => {
    expect(toPlanType('solo')).toBe('solo');
  });

  it('F5: "team" → team', () => {
    expect(toPlanType('team')).toBe('team');
  });

  it('F6: "growth" → growth', () => {
    expect(toPlanType('growth')).toBe('growth');
  });

  it('F7: "enterprise" → enterprise', () => {
    expect(toPlanType('enterprise')).toBe('enterprise');
  });

  it('F8: undefined and unknown strings coerce to "free" (the rail passes userPlan ?? "")', () => {
    expect(toPlanType('' /* rail's userPlan ?? '' */)).toBe('free');
    expect(toPlanType('unknown_plan')).toBe('free');
    // Simulates the component call site: toPlanType(userPlan ?? '')
    const userPlan: string | undefined = undefined;
    expect(toPlanType(userPlan ?? '')).toBe('free');
  });
});

// ── G: isPresetUnlockedForPlan (real helper from presets.ts) ─────────────────
// Row #188: the rail's isDisabledByPlan now delegates directly to the same
// exported helper getAvailablePresets uses — no local mirror.

describe('G: chip-gate predicates (isPresetUnlockedForPlan)', () => {
  const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
    (p) => p.planTierGate === 'team',
  );

  it('G0: catalog invariant — exactly 2 team-gated presets', () => {
    expect(teamGated.length).toBe(2); // catalog invariant A8
  });

  it('G1: team-gated presets are LOCKED for free, starter, and solo (below Team)', () => {
    for (const belowTeam of ['free', 'starter', 'solo'] as const) {
      for (const preset of teamGated) {
        expect(
          isPresetUnlockedForPlan(preset, belowTeam),
          `preset "${preset.id}" should be locked for plan "${belowTeam}"`,
        ).toBe(false);
      }
    }
  });

  it('G2: team-gated presets are UNLOCKED for team, growth, and enterprise (at/above Team)', () => {
    for (const atOrAboveTeam of ['team', 'growth', 'enterprise'] as const) {
      for (const preset of teamGated) {
        expect(
          isPresetUnlockedForPlan(preset, atOrAboveTeam),
          `preset "${preset.id}" should be unlocked for plan "${atOrAboveTeam}"`,
        ).toBe(true);
      }
    }
  });

  it('G3: canonical presets (null planTierGate) are unlocked for every plan tier', () => {
    const canonical = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === null,
    );
    // 5 canonical + 3 AI presets all have null planTierGate
    expect(canonical.length).toBeGreaterThanOrEqual(5);
    for (const plan of PLAN_HIERARCHY) {
      for (const preset of canonical) {
        expect(isPresetUnlockedForPlan(preset, plan)).toBe(true);
      }
    }
  });

  it('G4: is deterministic — same (preset, plan) produces same result on repeat calls', () => {
    const preset = teamGated[0]!;
    const r1 = isPresetUnlockedForPlan(preset, 'starter');
    const r2 = isPresetUnlockedForPlan(preset, 'starter');
    expect(r1).toBe(r2);
    expect(r1).toBe(false);
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

// ── I: rail / getAvailablePresets agreement (row #188 regression) ────────────
// `isChipDisabledByPlan` is imported directly from PresetChipRail.tsx — the
// EXACT function the rail's render loop calls (`isDisabledByPlan =
// isChipDisabledByPlan(preset, userPlan)`), not a hand mirror. This means a
// regression re-introduced inside the component's real exported logic (e.g.
// restoring the old 'team'/'starter'-else-'free' normalizer) is caught here,
// not just validated against a parallel copy.
//
// The rail computes per-chip enabled state as
//   (preset.availability === 'available') && !isChipDisabledByPlan(preset, userPlan)
// `getAvailablePresets` filters the catalog via `isPresetUnlockedForPlan` with
// the equivalent predicate (once `userPlan` is converted through `toPlanType`).
// These MUST agree for every plan × preset pair — this is the failure mode
// row #188 reported: Growth/Enterprise users saw Team presets disabled.

describe('I: rail and getAvailablePresets agree for every plan x preset combination', () => {
  function railWouldEnable(preset: PresetDefinition, userPlan: string): boolean {
    const isPending = preset.availability !== 'available';
    const isDisabledByPlan = isChipDisabledByPlan(preset, userPlan);
    return !(isPending || isDisabledByPlan);
  }

  it('I1: for every plan tier, the set of rail-enabled presets equals getAvailablePresets(plan)', () => {
    for (const plan of PLAN_HIERARCHY) {
      const availableIds = new Set(
        getAvailablePresets(plan).map((p) => p.id),
      );
      for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
        expect(
          railWouldEnable(preset, plan),
          `plan="${plan}" preset="${preset.id}": rail vs getAvailablePresets disagree`,
        ).toBe(availableIds.has(preset.id));
      }
    }
  });

  it('I2: Growth and Enterprise users see Team-gated presets enabled (row #188 regression)', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    for (const plan of ['growth', 'enterprise'] as const) {
      const availableIds = getAvailablePresets(plan).map((p) => p.id);
      for (const preset of teamGated) {
        expect(railWouldEnable(preset, plan)).toBe(true);
        expect(availableIds).toContain(preset.id);
      }
    }
  });

  it('I3: solo users see Team-gated presets disabled (unlike growth/enterprise)', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    for (const preset of teamGated) {
      expect(railWouldEnable(preset, 'solo')).toBe(false);
    }
  });

  it('I4: undefined userPlan behaves as free (locks Team-gated presets)', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    for (const preset of teamGated) {
      expect(isChipDisabledByPlan(preset, undefined)).toBe(true);
    }
  });
});
