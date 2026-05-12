/**
 * Preset catalog invariants — Path D D+5 (iter-062).
 *
 * Test groups:
 *  A. Catalog invariants (count, uniqueness, field budgets, audit-honesty IFF)
 *  B. Lookup helper correctness
 *  C. Plan-tier filtering (`getAvailablePresets`)
 *  D. Frozen-immutability
 */

import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_DASHBOARD_PRESETS,
  getPresetById,
  listPresetIds,
  getAvailablePresets,
  type PresetId,
  type PresetDefinition,
} from './presets.js';
import { WORKFLOW_DASHBOARD_COLUMNS } from './registry.js';

// ── A: Catalog invariants ──────────────────────────────────────────────────────

describe('A: catalog invariants', () => {
  it('A1: catalog contains exactly 10 presets', () => {
    expect(WORKFLOW_DASHBOARD_PRESETS.length).toBe(10);
  });

  it('A2: all 10 PresetId values are present exactly once', () => {
    const expectedIds: readonly PresetId[] = [
      'automation_candidates',
      'needs_attention',
      'standardize',
      'high_volume',
      'recent_activity',
      'ready_to_share',
      'my_teams_bottlenecks',
      'ai_automation_candidates',
      'ai_executions_running',
      'ai_savings_leaders',
    ];
    const actualIds = WORKFLOW_DASHBOARD_PRESETS.map((p) => p.id);
    // No duplicates
    expect(new Set(actualIds).size).toBe(actualIds.length);
    // All expected IDs present
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });

  it('A3: label ≤ 28 chars on every preset', () => {
    for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
      expect(
        preset.label.length,
        `Preset "${preset.id}" label "${preset.label}" exceeds 28 chars`,
      ).toBeLessThanOrEqual(28);
    }
  });

  it('A4: description ≤ 100 chars on every preset', () => {
    for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
      expect(
        preset.description.length,
        `Preset "${preset.id}" description exceeds 100 chars`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it('A5: audit-honesty IFF — AI presets have availability !== available', () => {
    const aiPresets: PresetId[] = [
      'ai_automation_candidates',
      'ai_executions_running',
      'ai_savings_leaders',
    ];
    for (const id of aiPresets) {
      const preset = WORKFLOW_DASHBOARD_PRESETS.find((p) => p.id === id)!;
      expect(preset.availability).not.toBe('available');
    }
  });

  it('A6: non-AI presets are all availability: available', () => {
    const nonAiPresets = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) =>
        !p.id.startsWith('ai_'),
    );
    for (const p of nonAiPresets) {
      expect(p.availability).toBe('available');
    }
  });

  it('A7: AI presets have empty filters arrays (no pending filter refs)', () => {
    const aiPresets = WORKFLOW_DASHBOARD_PRESETS.filter((p) =>
      p.id.startsWith('ai_'),
    );
    for (const p of aiPresets) {
      // AI presets must not enumerate pending column filters
      // (D+2 evaluateFilter would return false anyway, but the catalog should
      // be honest about this)
      expect(p.filters.length).toBe(0);
    }
  });

  it('A8: Team-gated presets are exactly ready_to_share and my_teams_bottlenecks', () => {
    const teamGated = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.planTierGate === 'team',
    );
    const teamGatedIds = teamGated.map((p) => p.id).sort();
    expect(teamGatedIds).toEqual(['my_teams_bottlenecks', 'ready_to_share']);
  });

  it('A9: visibleColumns and columnOrder are non-empty on all presets', () => {
    for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
      expect(
        preset.visibleColumns.length,
        `Preset "${preset.id}" visibleColumns is empty`,
      ).toBeGreaterThan(0);
      expect(
        preset.columnOrder.length,
        `Preset "${preset.id}" columnOrder is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('A10: visibleColumns and columnOrder lengths match on all presets', () => {
    for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
      expect(
        preset.columnOrder.length,
        `Preset "${preset.id}" columnOrder length !== visibleColumns length`,
      ).toBe(preset.visibleColumns.length);
    }
  });
});

// ── B: Lookup helper correctness ───────────────────────────────────────────────

describe('B: lookup helpers', () => {
  it('B1: getPresetById returns correct preset for every id', () => {
    for (const preset of WORKFLOW_DASHBOARD_PRESETS) {
      const found = getPresetById(preset.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(preset.id);
    }
  });

  it('B2: getPresetById returns undefined for unknown id', () => {
    // Cast to bypass TS closed union for runtime test
    const result = getPresetById('nonexistent_id' as PresetId);
    expect(result).toBeUndefined();
  });

  it('B3: listPresetIds returns all 10 ids in catalog order', () => {
    const ids = listPresetIds();
    expect(ids.length).toBe(10);
    const catalogIds = WORKFLOW_DASHBOARD_PRESETS.map((p) => p.id);
    expect([...ids]).toEqual(catalogIds);
  });

  it('B4: getPresetById is referentially identical to catalog entry', () => {
    const preset = WORKFLOW_DASHBOARD_PRESETS[0]!;
    const found = getPresetById(preset.id)!;
    expect(Object.is(found, preset)).toBe(true);
  });
});

// ── C: Plan-tier filtering ─────────────────────────────────────────────────────

describe('C: getAvailablePresets plan-tier filtering', () => {
  it('C1: free tier returns exactly 5 canonical presets (no plan-gated, no AI)', () => {
    const presets = getAvailablePresets('free');
    expect(presets.length).toBe(5);
    for (const p of presets) {
      expect(p.planTierGate).toBeNull();
      expect(p.availability).toBe('available');
    }
  });

  it('C2: starter tier returns exactly 5 canonical presets (same as free — no starter-gated presets exist)', () => {
    const presets = getAvailablePresets('starter');
    expect(presets.length).toBe(5);
    for (const p of presets) {
      expect(p.availability).toBe('available');
    }
  });

  it('C3: team tier returns 7 presets (5 canonical + 2 team-gated)', () => {
    const presets = getAvailablePresets('team');
    expect(presets.length).toBe(7);
    for (const p of presets) {
      expect(p.availability).toBe('available');
    }
  });

  it('C4: AI presets are never returned regardless of plan tier', () => {
    for (const tier of ['free', 'starter', 'team'] as const) {
      const presets = getAvailablePresets(tier);
      const aiPresets = presets.filter((p) => p.id.startsWith('ai_'));
      expect(aiPresets.length).toBe(0);
    }
  });

  it('C5: team-gated preset ids are automation_candidates/etc absent in free, present in team', () => {
    const freePids = getAvailablePresets('free').map((p) => p.id);
    const teamPids = getAvailablePresets('team').map((p) => p.id);
    expect(freePids).not.toContain('ready_to_share');
    expect(freePids).not.toContain('my_teams_bottlenecks');
    expect(teamPids).toContain('ready_to_share');
    expect(teamPids).toContain('my_teams_bottlenecks');
  });

  it('C6: getAvailablePresets is deterministic — same result on repeat calls', () => {
    const first = getAvailablePresets('team');
    const second = getAvailablePresets('team');
    expect([...first].map((p) => p.id)).toEqual([...second].map((p) => p.id));
  });
});

// ── D: Frozen immutability ─────────────────────────────────────────────────────

describe('D: frozen-immutability', () => {
  it('D1: WORKFLOW_DASHBOARD_PRESETS is frozen', () => {
    expect(Object.isFrozen(WORKFLOW_DASHBOARD_PRESETS)).toBe(true);
  });

  it('D2: adding a property to a catalog entry via bracket-assign throws or silently fails (outer array is frozen)', () => {
    // The outer array is frozen — appending or replacing entries is blocked.
    // Individual entries are plain object literals (no per-entry Object.freeze)
    // and are protected via ReadonlyArray<PresetDefinition> TypeScript type.
    // Runtime mutation of the outer array itself is rejected.
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (WORKFLOW_DASHBOARD_PRESETS as any)[0] = null;
    }).toThrow();
  });

  it('D3: catalog reference is identity-stable across re-imports', async () => {
    // The module singleton guarantees the same reference
    const { WORKFLOW_DASHBOARD_PRESETS: same } = await import('./presets.js');
    expect(Object.is(WORKFLOW_DASHBOARD_PRESETS, same)).toBe(true);
  });
});

// ── E: Audit-honesty IFF invariant (D-4 clause 2 architect §3 revision) ───────
// For every preset with `availability: 'available'`, every column referenced
// in `visibleColumns` and every `columnKey` referenced in `filters` MUST
// resolve to a `WORKFLOW_DASHBOARD_COLUMNS` entry with `availability: 'available'`.
// This is the preset-side analog of D+1 Group C audit-honesty IFF invariant
// (`accessor === null` IFF `availability !== 'available'`).
// Without this assertion a future preset author could silently violate the
// chain by referencing a pending column from an available preset.

describe('E: audit-honesty IFF invariant (preset-side)', () => {
  it('E1: every available preset references only available columns in visibleColumns', () => {
    const availablePresets = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.availability === 'available',
    );
    for (const preset of availablePresets) {
      for (const columnKey of preset.visibleColumns) {
        const column = WORKFLOW_DASHBOARD_COLUMNS.find((c) => c.key === columnKey);
        expect(
          column,
          `Preset "${preset.id}" visibleColumns[${columnKey}] not in registry`,
        ).toBeDefined();
        expect(
          column?.availability,
          `Preset "${preset.id}" (available) references pending column "${columnKey}" in visibleColumns`,
        ).toBe('available');
      }
    }
  });

  it('E2: every available preset references only available columns in columnOrder', () => {
    const availablePresets = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.availability === 'available',
    );
    for (const preset of availablePresets) {
      for (const columnKey of preset.columnOrder) {
        const column = WORKFLOW_DASHBOARD_COLUMNS.find((c) => c.key === columnKey);
        expect(
          column,
          `Preset "${preset.id}" columnOrder[${columnKey}] not in registry`,
        ).toBeDefined();
        expect(
          column?.availability,
          `Preset "${preset.id}" (available) references pending column "${columnKey}" in columnOrder`,
        ).toBe('available');
      }
    }
  });

  it('E3: every available preset references only available columns in filters', () => {
    const availablePresets = WORKFLOW_DASHBOARD_PRESETS.filter(
      (p) => p.availability === 'available',
    );
    for (const preset of availablePresets) {
      for (const filter of preset.filters) {
        const column = WORKFLOW_DASHBOARD_COLUMNS.find((c) => c.key === filter.columnKey);
        expect(
          column,
          `Preset "${preset.id}" filters[${filter.columnKey}] not in registry`,
        ).toBeDefined();
        expect(
          column?.availability,
          `Preset "${preset.id}" (available) references pending column "${filter.columnKey}" in filters`,
        ).toBe('available');
      }
    }
  });
});
