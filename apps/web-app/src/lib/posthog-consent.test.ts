// @vitest-environment jsdom
/**
 * #394 - withdrawing consent stops PostHog and forgets the identity; dormant
 * (never initialised) is a safe no-op; re-granting resumes without an $opt_in event.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const ph = vi.hoisted(() => ({
  init: vi.fn(),
  opt_out_capturing: vi.fn(),
  opt_in_capturing: vi.fn(),
  has_opted_out_capturing: vi.fn(() => false),
  reset: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
  debug: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: ph }));

async function load(withKey: boolean) {
  vi.resetModules();
  if (withKey) process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
  else delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return import('./posthog');
}

beforeEach(() => Object.values(ph).forEach((f) => 'mockClear' in f && f.mockClear()));

describe('posthog consent transitions', () => {
  it('optOut after init: reset THEN opt_out_capturing (reset clears the opt-out flag)', async () => {
    const m = await load(true);
    m.initPostHog();
    m.optOutPostHog();
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(ph.reset).toHaveBeenCalledTimes(1);
    expect(ph.reset).toHaveBeenCalledWith(true); // new device id (#400)
    expect(ph.reset.mock.invocationCallOrder[0]!).toBeLessThan(ph.opt_out_capturing.mock.invocationCallOrder[0]!);
  });

  it('optOut when never initialised is a no-op (no key, or not yet granted)', async () => {
    const noKey = await load(false);
    noKey.optOutPostHog();
    const keyed = await load(true);
    keyed.optOutPostHog(); // key set, initPostHog never called
    expect(ph.opt_out_capturing).not.toHaveBeenCalled();
    expect(ph.reset).not.toHaveBeenCalled();
  });

  it('optIn resumes only if opted out, without an $opt_in event', async () => {
    const m = await load(true);
    m.initPostHog();
    m.optInPostHog();
    expect(ph.opt_in_capturing).not.toHaveBeenCalled();
    ph.has_opted_out_capturing.mockReturnValueOnce(true);
    m.optInPostHog();
    expect(ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  });
});
