import { describe, it, expect } from 'vitest';
import { computeUpgradePromptByLocation } from './upgrade-prompt-by-location';

const ev = (eventName: string, props: unknown) => ({
  eventName,
  userId: 'u1' as string | null,
  properties: typeof props === 'string' ? props : JSON.stringify(props),
});
const view = (location?: unknown) => ev('upgrade_prompt_viewed', { location, plan: 'team' });
const click = (location?: unknown) => ev('upgrade_clicked', { location });

describe('computeUpgradePromptByLocation', () => {
  it('groups views and clicks per location', () => {
    const r = computeUpgradePromptByLocation([
      view('teams_create'), view('teams_create'), click('teams_create'),
      view('quota'), click('quota'), click('quota'),
      ev('page_viewed', { location: 'teams_create' }),
    ]);
    expect(r.locations).toEqual([
      { location: 'teams_create', views: 2, clicks: 1, clickRate: 0.5, isViewlessByDesign: false },
      { location: 'quota', views: 1, clicks: 2, clickRate: 2, isViewlessByDesign: false },
    ]);
    expect(r.missingLocationViews).toBe(0);
    expect(r.missingLocationClicks).toBe(0);
  });

  it('counts rows with missing, blank, non-string or unparseable location instead of dropping them', () => {
    const r = computeUpgradePromptByLocation([
      view(), view('  '), view(5), ev('upgrade_prompt_viewed', 'not json'), ev('upgrade_prompt_viewed', { plan: 'x' }),
      click(), click(null), { eventName: 'upgrade_clicked', userId: 'u1', properties: null },
      view('a'),
    ]);
    expect(r.missingLocationViews).toBe(5);
    expect(r.missingLocationClicks).toBe(3);
    expect(r.locations).toHaveLength(1);
  });

  it('keeps a click-without-view location, null rate, by-design label only for the pricing button', () => {
    const r = computeUpgradePromptByLocation([click('upgrade_button'), click('mystery')]);
    const pricing = r.locations.find((l) => l.location === 'upgrade_button')!;
    const mystery = r.locations.find((l) => l.location === 'mystery')!;
    expect(pricing).toEqual({ location: 'upgrade_button', views: 0, clicks: 1, clickRate: null, isViewlessByDesign: true });
    expect(mystery.isViewlessByDesign).toBe(false);
    expect(mystery.clickRate).toBeNull();
  });

  it('preserves a rate above 1 without clamping', () => {
    const r = computeUpgradePromptByLocation([view('x'), click('x'), click('x'), click('x')]);
    expect(r.locations[0]!.clickRate).toBe(3);
  });

  it('returns an empty result for no relevant events', () => {
    expect(computeUpgradePromptByLocation([])).toEqual({ locations: [], missingLocationViews: 0, missingLocationClicks: 0 });
    expect(computeUpgradePromptByLocation([ev('page_viewed', {})]).locations).toEqual([]);
  });

  it('zero views yields null, never 0', () => {
    expect(computeUpgradePromptByLocation([click('z')]).locations[0]!.clickRate).toBeNull();
  });

  it('is deterministic and independent of row order', () => {
    const rows = [view('b'), click('b'), view('a'), view('a'), click('c'), view(), click('a')];
    const a = computeUpgradePromptByLocation(rows);
    expect(computeUpgradePromptByLocation([...rows].reverse())).toEqual(a);
    expect(computeUpgradePromptByLocation(rows)).toEqual(a);
  });

  it('anonymous rows do not count in any column, including missing-location (row #298)', () => {
    const anon = (r: ReturnType<typeof ev>) => ({ ...r, userId: null });
    const real = [view('teams_create'), click('teams_create')];
    const forged = [anon(view('teams_create')), anon(click('teams_create')), anon(click('upgrade_button')), anon(click()), anon(view())];
    const r = computeUpgradePromptByLocation([...real, ...forged]);
    expect(r).toEqual(computeUpgradePromptByLocation(real));
    expect(r.locations).toHaveLength(1);
    expect(r.missingLocationClicks).toBe(0);
    expect(r.missingLocationViews).toBe(0);
  });
});
