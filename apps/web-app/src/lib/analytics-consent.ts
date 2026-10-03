/**
 * Analytics consent store (row #394).
 *
 * One place that owns `localStorage['ledgerium_analytics_consent']`. Writers go
 * through `setAnalyticsConsent`, which notifies same-tab subscribers; other tabs
 * are notified by the browser's `storage` event. Subscribers (PostHogProvider,
 * useAnalyticsIdentity, the banner, the account page) therefore see a change
 * without a reload.
 *
 * Values are unchanged from the original banner: 'full' | 'essential'. Anything
 * else (or storage unavailable) reads as null = not chosen yet.
 */
import { useSyncExternalStore } from 'react';

export const ANALYTICS_CONSENT_KEY = 'ledgerium_analytics_consent';
export type AnalyticsConsentValue = 'full' | 'essential';

const CHANGE_EVENT = 'ledgerium:analytics-consent-change';
const PROMPT_EVENT = 'ledgerium:analytics-consent-prompt';

export function getAnalyticsConsent(): AnalyticsConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return stored === 'full' || stored === 'essential' ? stored : null;
  } catch {
    return null;
  }
}

/** Persist the choice and notify subscribers in this tab. Storage failure is swallowed
 * (the choice then lasts only until reload, and nothing is tracked in the meantime). */
export function setAnalyticsConsent(value: AnalyticsConsentValue): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribe to consent changes from this tab and (via `storage`) other tabs. Returns unsubscribe. */
export function subscribeAnalyticsConsent(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    // key === null: localStorage.clear() in another tab
    if (e.key === null || e.key === ANALYTICS_CONSENT_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Ask the banner to open (footer "Analytics preferences" link). */
export function requestAnalyticsConsentPrompt(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PROMPT_EVENT));
}

export function subscribeAnalyticsConsentPrompt(onPrompt: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PROMPT_EVENT, onPrompt);
  return () => window.removeEventListener(PROMPT_EVENT, onPrompt);
}

/** React binding. null on the server and before hydration, and when not chosen yet. */
export function useAnalyticsConsent(): AnalyticsConsentValue | null {
  return useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent, () => null);
}
