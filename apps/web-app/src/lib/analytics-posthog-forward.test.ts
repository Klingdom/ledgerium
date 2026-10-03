/**
 * Row #400 - track() forwards to PostHog without the persistent first-party
 * visitorId, while the first-party buffer keeps it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const capture = vi.hoisted(() => vi.fn());
vi.mock('./posthog', () => ({
  captureEvent: capture,
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
  isPostHogEnabled: () => true,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  capture.mockClear();
});

describe('track(): PostHog forwarding (#400)', () => {
  it('omits visitorId from PostHog properties but keeps it in the first-party buffer', async () => {
    const store = new Map<string, string>();
    const win: Record<string, unknown> = {
      location: { pathname: '/pricing', hostname: 'ledgerium.ai' },
      addEventListener: () => undefined,
      __ledgerium_userPlan: 'team',
    };
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: () => undefined });
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    vi.resetModules();
    const mod = await import('./analytics.js');
    mod.track({ event: 'page_viewed', path: '/pricing' });

    expect(capture).toHaveBeenCalledTimes(1);
    const [name, props] = capture.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('page_viewed');
    expect(props).not.toHaveProperty('visitorId');
    expect(props.userPlan).toBe('team'); // plan tier, not an identifier: still forwarded

    const buffered = (win.__ledgerium_events as Array<Record<string, unknown>>)[0]!;
    expect(typeof buffered.visitorId).toBe('string');
    expect(buffered.visitorId).toBe(store.get('ledgerium_visitor_id'));
  });
});
