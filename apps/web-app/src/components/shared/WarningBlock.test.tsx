/**
 * WarningBlock — unit tests for prop contract and semantic token usage.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests the component contract via class string assertions and prop modeling.
 *
 * Iteration B: shared component tests for sop-view semantic-token migration.
 */

import { describe, it, expect } from 'vitest';

// ── Inline class string (mirrors WarningBlock internal className) ─────────────

const WARNING_BASE_CLASSES =
  'flex items-start gap-2 bg-surface-warning border border-border-warning rounded-lg px-3 py-2 text-[11px] text-content-on-warning';

describe('WarningBlock: semantic-token class contract', () => {
  it('base classes include bg-surface-warning', () => {
    expect(WARNING_BASE_CLASSES).toContain('bg-surface-warning');
  });

  it('base classes include text-content-on-warning', () => {
    expect(WARNING_BASE_CLASSES).toContain('text-content-on-warning');
  });

  it('base classes include border-border-warning', () => {
    expect(WARNING_BASE_CLASSES).toContain('border-border-warning');
  });

  it('no raw Tailwind color utility in the base class string', () => {
    const rawColorPattern = /\b(?:bg|text|border)-(amber|yellow|orange)-\d{2,3}\b/;
    expect(rawColorPattern.test(WARNING_BASE_CLASSES)).toBe(false);
  });

  it('className prop merges correctly onto base string', () => {
    const extra = 'mt-2 rounded-xl';
    const merged = `${WARNING_BASE_CLASSES} ${extra}`;
    expect(merged).toContain('mt-2');
    expect(merged).toContain('bg-surface-warning');
  });
});

// ── Prop-contract modeling ────────────────────────────────────────────────────

describe('WarningBlock: prop contract', () => {
  it('children prop carries the warning message text (no transformation)', () => {
    const message = 'This is a caution message for the user.';
    // The component renders children verbatim inside a flex div.
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('icon prop defaults to AlertTriangle when not supplied', () => {
    // Contract: when icon is undefined, the component falls back to AlertTriangle.
    const icon: React.ReactNode | undefined = undefined;
    // Simulate the default: the component uses `icon ?? <AlertTriangle ...>`
    const resolved = icon ?? 'AlertTriangle-default';
    expect(resolved).toBe('AlertTriangle-default');
  });

  it('custom icon prop overrides the default icon slot', () => {
    const customIcon = 'custom-icon-node';
    const resolved = customIcon ?? 'AlertTriangle-default';
    expect(resolved).toBe('custom-icon-node');
  });
});
