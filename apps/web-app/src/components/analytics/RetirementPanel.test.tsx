/**
 * RetirementPanel (row #307): a reported rate below 100 users says it is indicative,
 * and the pooled counts under each rate are labelled as combined totals, not the
 * rate's numerator and denominator.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RetirementPanel } from './RetirementPanel';
import {
  INDICATIVE_NOTE,
  MIN_USERS_FOR_RATE,
  type DashboardV2RetirementMetrics,
} from '@/lib/dashboard-v2-retirement-metrics';

(globalThis as unknown as { React: typeof React }).React = React;

const base: DashboardV2RetirementMetrics = {
  views: 100,
  bounces: 9,
  bounceRate: 0.9,
  bounceUsers: 12,
  chipsRendered: 40,
  chipClicks: 5,
  chipClickRate: 0.1,
  chipUsers: 12,
  minUsers: MIN_USERS_FOR_RATE,
  viewsMissingChipCount: 0,
};
const html = (m: DashboardV2RetirementMetrics) =>
  renderToString(React.createElement(RetirementPanel, { metrics: m })).replace(/<!-- -->/g, '');
const count = (s: string, sub: string) => s.split(sub).length - 1;
const NOTE = INDICATIVE_NOTE.replace(/'/g, '&#x27;');
const POOLED = 'All users combined (the rate averages each user’s own rate):';

describe('RetirementPanel (row #307)', () => {
  it('both rates below 100 users carry the indicative note', () => {
    expect(count(html(base), NOTE)).toBe(2);
  });

  it('a rate at 100 users carries no note; the other still does', () => {
    expect(count(html({ ...base, bounceUsers: 100 }), NOTE)).toBe(1);
    expect(count(html({ ...base, bounceUsers: 100, chipUsers: 250 }), NOTE)).toBe(0);
  });

  it('an insufficient-data rate shows no note (it is not a reading)', () => {
    const out = html({ ...base, bounceRate: null, chipClickRate: null, bounceUsers: 3, chipUsers: 3 });
    expect(count(out, NOTE)).toBe(0);
    expect(out).toContain('Insufficient data (fewer than 10 users)');
  });

  it('the pooled counts are labelled as combined totals under both rates', () => {
    const out = html(base);
    expect(count(out, POOLED)).toBe(2);
    expect(out).toContain(`${POOLED} 9 bounces / 100 views · 12 users`);
    expect(out).toContain(`${POOLED} 5 clicks / 40 chips shown · 12 users`);
  });
});
