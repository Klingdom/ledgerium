// @vitest-environment jsdom
/**
 * Row #113 (as re-scoped by MR-065): the plan comparison table must expose real
 * table semantics to assistive tech.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import { ComparisonTable, type ComparisonRow } from './ComparisonTable';

// Fixture rows: the production data lives in page.tsx (copy guards scan it there).
const COMPARISON_FEATURES: ComparisonRow[] = [
  { label: 'Price (monthly)', free: '$0', starter: '$49', solo: '$89', team: '$249', growth: '$799', enterprise: 'Custom', category: 'What You Capture' },
  { label: 'Workflows / month', free: '5', starter: '15', solo: 'Unlimited', team: 'Unlimited', growth: 'Unlimited', enterprise: 'Custom' },
  { label: 'Evidence-linked SOPs', free: true, starter: true, solo: true, team: true, growth: true, enterprise: true, category: 'What You Get' },
  { label: 'Process health scores', free: false, starter: true, solo: true, team: true, growth: true, enterprise: true },
  { label: 'Public sharing link', free: true, starter: true, solo: true, team: true, growth: true, enterprise: true, category: 'Sharing & Collaboration' },
  { label: 'SSO', free: false, starter: false, solo: false, team: false, growth: false, enterprise: 'coming-soon', category: 'Advanced & Enterprise' },
];

afterEach(cleanup);

describe('ComparisonTable scroll region (#390)', () => {
  it('wrapper is a focusable region named by the caption', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    const region = container.firstElementChild as HTMLElement;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.className).toContain('overflow-x-auto');
    // #395: positioned so the table's sr-only (absolute) spans are contained here
    expect(region.className.split(/\s+/)).toContain('relative');
    expect(region.className).toContain('focus-visible:ring-2');
    const caption = container.querySelector('caption')!;
    expect(caption.id).not.toBe('');
    expect(region.getAttribute('aria-labelledby')).toBe(caption.id);
    expect(within(container).getByRole('region', { name: 'Plan comparison' })).toBe(region);
  });
});

describe('ComparisonTable semantics (#113)', () => {
  it('is named by a caption', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    expect(container.querySelector('table > caption')?.textContent).toBe('Plan comparison');
  });

  it('column headers are th scope=col (Feature + 6 plans)', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    const cols = container.querySelectorAll('thead th');
    expect(cols).toHaveLength(7);
    cols.forEach((th) => expect(th.getAttribute('scope')).toBe('col'));
    expect(Array.from(cols).map((c) => c.textContent)).toEqual(
      ['Feature', 'Free', 'Starter', 'Solo', 'Team', 'Growth', 'Enterprise'],
    );
  });

  it('every feature row starts with th scope=row carrying the label', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    const rowHeaders = container.querySelectorAll('tbody th[scope="row"]');
    expect(rowHeaders).toHaveLength(COMPARISON_FEATURES.length);
    expect(Array.from(rowHeaders).map((h) => h.textContent)).toEqual(COMPARISON_FEATURES.map((r) => r.label));
    container.querySelectorAll('tbody tr').forEach((tr) => {
      expect(tr.firstElementChild!.tagName).toBe('TH');
    });
  });

  it('category rows are one th scope=rowgroup colSpan=7, one tbody per category', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    const groups = container.querySelectorAll('tbody > tr > th[scope="rowgroup"]');
    expect(Array.from(groups).map((g) => g.textContent)).toEqual([
      'What You Capture', 'What You Get', 'Sharing & Collaboration', 'Advanced & Enterprise',
    ]);
    groups.forEach((g) => expect(g.getAttribute('colspan')).toBe('7'));
    expect(container.querySelectorAll('tbody')).toHaveLength(4);
  });

  it('dash cells expose "Not included" and the dash itself is hidden', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    const expected = COMPARISON_FEATURES.flatMap((r) =>
      [r.free, r.starter, r.solo, r.team, r.growth, r.enterprise],
    ).filter((v) => v === false).length;
    expect(within(container).getAllByText('Not included')).toHaveLength(expected);
    container.querySelectorAll('span[aria-hidden="true"]').forEach((s) => expect(s.textContent).toBe('—'));
  });

  it('check icons are hidden and paired with "Included" text', () => {
    const { container } = render(<ComparisonTable rows={COMPARISON_FEATURES} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.nextElementSibling?.textContent).toBe('Included');
    });
  });
});
