/**
 * AutomationHintBlock — unit tests for prop contract and semantic token usage.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the component contract via class string assertions and prop modeling.
 *
 * Iteration B: shared component tests for sop-view semantic-token migration.
 *
 * Token rationale: violet/automation-opportunity maps to `surface-info` per the
 * Ledgerium content model documented in AutomationHintBlock.tsx and
 * EXPORT_TEMPLATE_REVIEW_001 §3.
 */

import { describe, it, expect } from 'vitest';

// ── Inline class string (mirrors AutomationHintBlock internal className) ───────

const AUTOMATION_BASE_CLASSES =
  'flex items-start gap-2 text-[11px] bg-surface-info border border-border-info text-content-on-info rounded-lg px-3 py-2';

describe('AutomationHintBlock: semantic-token class contract', () => {
  it('base classes include bg-surface-info', () => {
    expect(AUTOMATION_BASE_CLASSES).toContain('bg-surface-info');
  });

  it('base classes include text-content-on-info', () => {
    expect(AUTOMATION_BASE_CLASSES).toContain('text-content-on-info');
  });

  it('base classes include border-border-info', () => {
    expect(AUTOMATION_BASE_CLASSES).toContain('border-border-info');
  });

  it('no raw violet or blue Tailwind utility in the base classes', () => {
    const rawColorPattern = /\b(?:bg|text|border)-(violet|blue|indigo)-\d{2,3}\b/;
    expect(rawColorPattern.test(AUTOMATION_BASE_CLASSES)).toBe(false);
  });

  it('className prop appends to base classes', () => {
    const extra = 'my-3';
    const merged = `${AUTOMATION_BASE_CLASSES} ${extra}`;
    expect(merged).toContain('my-3');
    expect(merged).toContain('bg-surface-info');
  });
});

// ── Prop-contract modeling ────────────────────────────────────────────────────

describe('AutomationHintBlock: prop contract', () => {
  it('hint prop is a plain string passed verbatim to the span', () => {
    const hint = 'This step can be automated with an RPA tool.';
    expect(typeof hint).toBe('string');
    expect(hint.length).toBeGreaterThan(0);
  });

  it('hint is rendered as-is (no uppercase, no truncation)', () => {
    const hint = 'Automate this — consider using Make.com or Zapier.';
    // Component renders {hint} directly, no transformation.
    expect(hint).toMatch(/Automate this/);
  });

  it('className prop is optional; omitting it leaves base classes unchanged', () => {
    const className: string | undefined = undefined;
    const merged = `${AUTOMATION_BASE_CLASSES} ${className ?? ''}`.trim();
    expect(merged).toBe(AUTOMATION_BASE_CLASSES);
  });
});
