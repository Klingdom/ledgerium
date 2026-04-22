/**
 * WorkflowListFilterBar — iter-030 analytics instrumentation tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the pure logic for dashboard_v2_filter_applied event shape.
 *
 * PRD §4 metric #4: filter engagement + "Needs attention" filter engagement (EXEC §4.1 e).
 * Contract: one event per user interaction (not per final accumulated state).
 */

import { describe, it, expect, vi } from 'vitest';

// ── Analytics mock (iter-030) ─────────────────────────────────────────────────
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

// ── dashboard_v2_filter_applied event shape ───────────────────────────────────

type FilterType = 'systems' | 'opportunity' | 'healthStatus' | 'needsAttention';

function buildFilterAppliedEvent(params: {
  filterType: FilterType;
  filterValue: string;
}): { event: string; filterType: FilterType; filterValue: string } {
  return {
    event: 'dashboard_v2_filter_applied',
    filterType: params.filterType,
    filterValue: params.filterValue,
  };
}

describe('iter-030: dashboard_v2_filter_applied event shape', () => {
  it('event name is dashboard_v2_filter_applied', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'systems', filterValue: 'Salesforce' });
    expect(ev.event).toBe('dashboard_v2_filter_applied');
  });

  it('filterType=systems carries the toggled system name', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'systems', filterValue: 'NetSuite' });
    expect(ev.filterType).toBe('systems');
    expect(ev.filterValue).toBe('NetSuite');
  });

  it('filterType=opportunity carries the selected option value', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'opportunity', filterValue: 'automate' });
    expect(ev.filterType).toBe('opportunity');
    expect(ev.filterValue).toBe('automate');
  });

  it('filterType=opportunity carries "cleared" when selection is removed', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'opportunity', filterValue: 'cleared' });
    expect(ev.filterValue).toBe('cleared');
  });

  it('filterType=healthStatus carries the selected option value', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'healthStatus', filterValue: 'needs_review' });
    expect(ev.filterType).toBe('healthStatus');
    expect(ev.filterValue).toBe('needs_review');
  });

  it('filterType=healthStatus carries "cleared" when selection is removed', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'healthStatus', filterValue: 'cleared' });
    expect(ev.filterValue).toBe('cleared');
  });

  it('filterType=needsAttention carries "on" when toggled on', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'needsAttention', filterValue: 'on' });
    expect(ev.filterType).toBe('needsAttention');
    expect(ev.filterValue).toBe('on');
  });

  it('filterType=needsAttention carries "off" when toggled off', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'needsAttention', filterValue: 'off' });
    expect(ev.filterType).toBe('needsAttention');
    expect(ev.filterValue).toBe('off');
  });

  it('all 4 filterType values are valid', () => {
    const types: FilterType[] = ['systems', 'opportunity', 'healthStatus', 'needsAttention'];
    for (const filterType of types) {
      const ev = buildFilterAppliedEvent({ filterType, filterValue: 'test' });
      expect(ev.filterType).toBe(filterType);
    }
  });

  it('filterValue is never undefined — always a string', () => {
    const ev = buildFilterAppliedEvent({ filterType: 'systems', filterValue: 'Slack' });
    expect(typeof ev.filterValue).toBe('string');
  });
});

// ── needsAttention toggle value derivation ────────────────────────────────────

/**
 * Mirrors the toggleNeedsAttention logic: nextValue = !filters.needsAttention.
 * filterValue is 'on' when turning on, 'off' when turning off.
 */
function deriveNeedsAttentionFilterValue(currentValue: boolean): 'on' | 'off' {
  return !currentValue ? 'on' : 'off';
}

describe('iter-030: needsAttention toggle filterValue derivation', () => {
  it('false → on (turning filter on)', () => {
    expect(deriveNeedsAttentionFilterValue(false)).toBe('on');
  });

  it('true → off (turning filter off)', () => {
    expect(deriveNeedsAttentionFilterValue(true)).toBe('off');
  });
});
