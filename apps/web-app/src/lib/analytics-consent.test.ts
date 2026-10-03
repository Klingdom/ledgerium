// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  requestAnalyticsConsentPrompt,
  subscribeAnalyticsConsentPrompt,
} from './analytics-consent';

beforeEach(() => window.localStorage.clear());

describe('analytics consent store (#394)', () => {
  it('reads null until chosen, ignores junk values, round-trips full/essential', () => {
    expect(getAnalyticsConsent()).toBeNull();
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'yes');
    expect(getAnalyticsConsent()).toBeNull();
    setAnalyticsConsent('full');
    expect(getAnalyticsConsent()).toBe('full');
    expect(window.localStorage.getItem('ledgerium_analytics_consent')).toBe('full');
    setAnalyticsConsent('essential');
    expect(getAnalyticsConsent()).toBe('essential');
  });

  it('notifies same-tab subscribers on set, and stops after unsubscribe', () => {
    const cb = vi.fn();
    const off = subscribeAnalyticsConsent(cb);
    setAnalyticsConsent('full');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    setAnalyticsConsent('essential');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('notifies on a cross-tab storage event for the consent key (and clear), not other keys', () => {
    const cb = vi.fn();
    const off = subscribeAnalyticsConsent(cb);
    window.dispatchEvent(new StorageEvent('storage', { key: 'something_else' }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: ANALYTICS_CONSENT_KEY, newValue: 'full' }));
    expect(cb).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(cb).toHaveBeenCalledTimes(2);
    off();
  });

  it('a storage failure on write does not throw and still notifies', () => {
    const cb = vi.fn();
    const off = subscribeAnalyticsConsent(cb);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => setAnalyticsConsent('full')).not.toThrow();
    expect(cb).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    off();
  });

  it('prompt request reaches prompt subscribers only', () => {
    const prompt = vi.fn();
    const change = vi.fn();
    const off1 = subscribeAnalyticsConsentPrompt(prompt);
    const off2 = subscribeAnalyticsConsent(change);
    requestAnalyticsConsentPrompt();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
    off1(); off2();
  });
});
