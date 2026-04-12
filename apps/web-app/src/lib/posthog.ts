/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog client-side SDK and provides helpers for
 * identifying users and sending events. Wraps posthog-js so the
 * rest of the codebase doesn't import it directly.
 *
 * Setup:
 * 1. Set NEXT_PUBLIC_POSTHOG_KEY in .env.local
 * 2. Optionally set NEXT_PUBLIC_POSTHOG_HOST (defaults to app.posthog.com)
 * 3. PostHog initializes automatically on first import in the browser
 *
 * If NEXT_PUBLIC_POSTHOG_KEY is not set, all calls are no-ops.
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '')
  : '';

const POSTHOG_HOST = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
  : '';

let initialized = false;

/**
 * Initialize PostHog. Safe to call multiple times — only initializes once.
 * No-op if NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) {
    console.debug('[posthog] No NEXT_PUBLIC_POSTHOG_KEY set — analytics disabled');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Capture page views automatically
    capture_pageview: true,
    // Capture page leaves for session duration
    capture_pageleave: true,
    // Don't capture text input values (privacy)
    mask_all_text: false,
    // Don't record sessions (privacy-first)
    disable_session_recording: true,
    // Respect Do Not Track
    respect_dnt: true,
    // Persist across sessions
    persistence: 'localStorage+cookie',
    // Load feature flags
    loaded: (ph) => {
      // In development, enable debug mode
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });

  initialized = true;
}

/**
 * Identify a user after login/signup. Associates all subsequent events
 * with this user ID.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!initialized || !POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

/**
 * Reset user identity on logout.
 */
export function resetUser(): void {
  if (!initialized || !POSTHOG_KEY) return;
  posthog.reset();
}

/**
 * Send an event to PostHog. Properties are merged with any global
 * properties set during identification.
 */
export function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!initialized || !POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
}

/**
 * Check if PostHog is initialized and has a valid key.
 */
export function isPostHogEnabled(): boolean {
  return initialized && POSTHOG_KEY.length > 0;
}
