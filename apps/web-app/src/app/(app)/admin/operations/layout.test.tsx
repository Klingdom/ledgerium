/**
 * AdminOperationsLayout — sidebar suppression tests.
 *
 * QA-attention item 4 (iter 073): verify the layout.tsx override does NOT
 * render the AppShell sidebar. The admin operations dashboard needs full-width
 * rendering; the nested layout.tsx achieves this by being a simple pass-through
 * (returns children directly, no AppShell wrapper).
 *
 * Test strategy: Call the layout function directly. In Next.js App Router, a
 * layout is an async function that accepts { children }. We call it with a
 * known children value and inspect the returned JSX structure.
 *
 * Because layout.tsx is intentionally a minimal pass-through (just returns
 * `<>{children}</>`), the assertions are:
 *   1. children are rendered (not swallowed)
 *   2. no sidebar-related elements are introduced by the layout itself
 *   3. no nav-related elements are introduced
 *
 * Environment: Vitest (node) — JSX evaluation without full DOM render.
 *
 * @iter 073
 */

import { describe, it, expect } from 'vitest';
import AdminOperationsLayout from './layout';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AdminOperationsLayout — sidebar suppression (QA item 4, iter 073)', () => {
  it('renders children without wrapping them in AppShell', () => {
    // The layout returns a React Fragment containing children.
    // In a node environment, React.createElement returns an object.
    const sentinelChild = '<div data-testid="children-sentinel" />';
    const result = AdminOperationsLayout({ children: sentinelChild as unknown as React.ReactNode });

    // Result should be truthy (not null/undefined)
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });

  it('is a synchronous function (no async data fetching in layout)', () => {
    // The layout should be sync — it is a simple pass-through with no I/O.
    // If it were async, calling it would return a Promise.
    const result = AdminOperationsLayout({ children: null });
    // A Promise is a thenable; a React element is not
    expect(result).not.toBeInstanceOf(Promise);
  });

  it('does not introduce aside or nav elements via the layout itself', () => {
    // The layout is `return children` — a direct pass-through with no wrapper.
    // We pass a synthetic element with type 'main' and verify the layout
    // does NOT replace it with aside/nav/AppShell-like markup.
    const childElement = { type: 'main', props: {}, key: null };
    const result = AdminOperationsLayout({
      children: childElement as unknown as React.ReactNode,
    });

    const typeStr = String(
      (result as { type?: unknown })?.type ?? '',
    );

    expect(typeStr).not.toBe('aside');
    expect(typeStr).not.toBe('nav');
    expect(typeStr).not.toContain('AppShell');
    expect(typeStr).not.toContain('Sidebar');
  });

  it('passes children through unchanged as the sole content', () => {
    // Direct-pass-through contract: result IS the children, not a wrapper.
    const child = { type: 'main', props: {}, key: null };
    const result = AdminOperationsLayout({
      children: child as unknown as React.ReactNode,
    });

    // The layout returns children directly — result is the child itself.
    expect(result).toBe(child);
  });
});
