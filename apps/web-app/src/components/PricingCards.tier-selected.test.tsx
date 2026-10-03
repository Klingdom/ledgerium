// @vitest-environment jsdom
/**
 * Row #116 P1 — every tier CTA on the pricing cards emits exactly one
 * pricing_tier_selected (tierId / billingInterval / location), additive to the
 * existing upgrade_clicked / team_waitlist_clicked / cta_clicked events, which
 * must be unchanged.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const trackMock = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (p: unknown) => trackMock(p) }));

let signedIn = true;
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    status: signedIn ? 'authenticated' : 'unauthenticated',
    data: signedIn ? { user: { id: 'u1' } } : null,
  }),
}));

import { PricingCards } from './PricingCards';
import { PRICING_CONFIG } from '@/lib/config';

type Ev = Record<string, unknown>;
const events = (name: string): Ev[] =>
  trackMock.mock.calls.map((c) => c[0] as Ev).filter((e) => e.event === name);

function ctaFor(planId: string): HTMLElement {
  const plan = PRICING_CONFIG.plans.find((p) => p.id === planId)!;
  const label = planId === 'team' || planId === 'growth' ? 'Join Waitlist' : plan.cta;
  const all = screen.getAllByText(label);
  // Waitlist label appears on both team and growth; pick by card order.
  if (label === 'Join Waitlist') return all[planId === 'team' ? 0 : 1]!;
  return all[0]!;
}

beforeEach(() => {
  trackMock.mockClear();
  signedIn = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('sku-availability')) {
        return new Response(
          JSON.stringify({
            plans: { starter: { monthly: true, annual: true }, solo: { monthly: true, annual: true } },
          }),
        );
      }
      // checkout: no url, no error -> UpgradeButton just stops loading.
      return new Response(JSON.stringify({}));
    }),
  );
  // Keep jsdom from attempting navigation on anchor clicks.
  document.addEventListener('click', (e) => e.preventDefault());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderCards(): Promise<void> {
  render(<PricingCards />);
  if (signedIn) await waitFor(() => expect(screen.queryAllByText('Not available yet')).toHaveLength(0));
  await waitFor(() => expect(screen.getByText(PRICING_CONFIG.plans.find((p) => p.id === 'starter')!.cta)).toBeTruthy());
}

describe('pricing_tier_selected on pricing cards', () => {
  it('free CTA: tierId free, monthly, card; existing cta_clicked unchanged', async () => {
    await renderCards();
    fireEvent.click(ctaFor('free'));
    expect(events('pricing_tier_selected')).toEqual([
      { event: 'pricing_tier_selected', tierId: 'free', billingInterval: 'monthly', location: 'card' },
    ]);
    expect(events('cta_clicked')).toEqual([{ event: 'cta_clicked', location: 'pricing_cta', destination: '/signup' }]);
  });

  it('starter and solo (signed in): one selection each, plus unchanged upgrade_clicked', async () => {
    await renderCards();
    fireEvent.click(ctaFor('starter'));
    await waitFor(() => expect(events('upgrade_clicked')).toHaveLength(1));
    fireEvent.click(ctaFor('solo'));
    await waitFor(() => expect(events('upgrade_clicked')).toHaveLength(2));
    expect(events('pricing_tier_selected').map((e) => [e.tierId, e.billingInterval, e.location])).toEqual([
      ['starter', 'monthly', 'card'],
      ['solo', 'monthly', 'card'],
    ]);
    expect(events('upgrade_clicked')).toEqual([
      { event: 'upgrade_clicked', location: 'upgrade_button' },
      { event: 'upgrade_clicked', location: 'upgrade_button' },
    ]);
  });

  it('starter signed out (signup link): still one selection, no upgrade_clicked', async () => {
    signedIn = false;
    render(<PricingCards />);
    // signed out: availability resolves; button is still rendered as the fallback Link
    await waitFor(() => expect(screen.getByText('Start 14-Day Trial')).toBeTruthy());
    fireEvent.click(screen.getByText('Start 14-Day Trial'));
    expect(events('pricing_tier_selected')).toEqual([
      { event: 'pricing_tier_selected', tierId: 'starter', billingInterval: 'monthly', location: 'card' },
    ]);
    expect(events('upgrade_clicked')).toHaveLength(0);
  });

  it('team and growth waitlist CTAs: one selection each, team_waitlist_clicked unchanged', async () => {
    await renderCards();
    fireEvent.click(ctaFor('team'));
    fireEvent.click(ctaFor('growth'));
    expect(events('pricing_tier_selected').map((e) => e.tierId)).toEqual(['team', 'growth']);
    expect(events('team_waitlist_clicked')).toEqual([
      { event: 'team_waitlist_clicked', plan: 'team', location: 'pricing_cards' },
      { event: 'team_waitlist_clicked', plan: 'growth', location: 'pricing_cards' },
    ]);
  });

  it('enterprise CTA: tierId enterprise', async () => {
    await renderCards();
    fireEvent.click(ctaFor('enterprise'));
    expect(events('pricing_tier_selected')).toEqual([
      { event: 'pricing_tier_selected', tierId: 'enterprise', billingInterval: 'monthly', location: 'card' },
    ]);
  });

  it('billingInterval follows the annual toggle', async () => {
    await renderCards();
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(ctaFor('free'));
    fireEvent.click(ctaFor('team'));
    expect(events('pricing_tier_selected').map((e) => [e.tierId, e.billingInterval])).toEqual([
      ['free', 'annual'],
      ['team', 'annual'],
    ]);
  });

  it('a click emits exactly one selection (no double count)', async () => {
    await renderCards();
    fireEvent.click(ctaFor('starter'));
    await waitFor(() => expect(events('upgrade_clicked')).toHaveLength(1));
    expect(events('pricing_tier_selected')).toHaveLength(1);
  });
});
