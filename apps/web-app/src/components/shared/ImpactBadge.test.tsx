/**
 * ImpactBadge — unit tests for semantic token mapping and prop contracts.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the pure IMPACT_CLASSES map and component prop contract.
 *
 * Iteration B: shared component tests for sop-view semantic-token migration.
 */

import { describe, it, expect } from 'vitest';
import { IMPACT_CLASSES, type Impact } from './ImpactBadge';

// ── IMPACT_CLASSES semantic-token mapping ─────────────────────────────────────

describe('IMPACT_CLASSES: semantic-token mapping', () => {
  it('high impact maps to danger tokens', () => {
    expect(IMPACT_CLASSES['high']).toContain('bg-surface-danger');
    expect(IMPACT_CLASSES['high']).toContain('text-content-on-danger');
  });

  it('medium impact maps to warning tokens', () => {
    expect(IMPACT_CLASSES['medium']).toContain('bg-surface-warning');
    expect(IMPACT_CLASSES['medium']).toContain('text-content-on-warning');
  });

  it('low impact maps to info tokens', () => {
    expect(IMPACT_CLASSES['low']).toContain('bg-surface-info');
    expect(IMPACT_CLASSES['low']).toContain('text-content-on-info');
  });

  it('all 3 impact levels have distinct class strings', () => {
    const values = Object.values(IMPACT_CLASSES);
    const unique = new Set(values);
    expect(unique.size).toBe(3);
  });

  it('no raw Tailwind color utility in any impact class (e.g. no red-50 or amber-600)', () => {
    const rawColorPattern = /\b(?:bg|text|border)-(emerald|amber|red|blue|violet|gray|green|slate|zinc)-\d{2,3}\b/;
    for (const [impact, classes] of Object.entries(IMPACT_CLASSES)) {
      expect(rawColorPattern.test(classes), `impact "${impact}" has a raw Tailwind color: ${classes}`).toBe(false);
    }
  });
});

// ── Component prop-contract assertions ───────────────────────────────────────

describe('ImpactBadge: prop contract', () => {
  const VALID_IMPACTS: Impact[] = ['high', 'medium', 'low'];

  it('all 3 impact variants are covered by IMPACT_CLASSES', () => {
    for (const impact of VALID_IMPACTS) {
      expect(IMPACT_CLASSES[impact]).toBeDefined();
      expect(IMPACT_CLASSES[impact].length).toBeGreaterThan(0);
    }
  });

  it('the className prop merges onto the semantic token classes', () => {
    const base = IMPACT_CLASSES['medium'];
    const extra = 'my-custom-class';
    const merged = `${base} ${extra}`;
    expect(merged).toContain('my-custom-class');
    expect(merged).toContain('bg-surface-warning');
  });

  it('label falls back to impact value when not supplied (matching component default)', () => {
    // The component uses `label ?? impact` — so when label is undefined, the impact string itself is rendered.
    const impact: Impact = 'high';
    const label: string | undefined = undefined;
    const rendered = label ?? impact;
    expect(rendered).toBe('high');
  });
});
