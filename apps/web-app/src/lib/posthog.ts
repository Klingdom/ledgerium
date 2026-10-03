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
import type { PostHogConfig } from 'posthog-js';
import { sanitizePostHogEvent } from '@/lib/posthog-privacy';

const POSTHOG_KEY = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '')
  : '';

const POSTHOG_HOST = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
  : '';

let initialized = false;

/**
 * Init options. Exported so tests exercise exactly what production uses.
 * Row #375: before_send strips campaign tags / query strings from every event;
 * capture_pageview is off because PostHogProvider sends the one $pageview per
 * load and per client-side navigation (posthog-js would send a second one).
 */
export function buildPostHogConfig(host: string, debug: boolean): Partial<PostHogConfig> {
  return {
    api_host: host,
    // PostHogProvider is the only page-view sender (covers client navigation too)
    capture_pageview: false,
    // Capture page leaves for session duration
    capture_pageleave: true,
    // Don't capture text input values (privacy)
    mask_all_text: false,
    // Mask ad-click ids etc. in URLs (defence in depth; before_send strips queries)
    mask_personal_data_properties: true,
    // Row #375: sanitise utm_* and strip query/fragment from URL properties
    before_send: sanitizePostHogEvent,
    // Don't record sessions (privacy-first)
    disable_session_recording: true,
    // Respect Do Not Track
    respect_dnt: true,
    // Persist across sessions
    persistence: 'localStorage+cookie',
    // Row #375: the /flags request sends the persisted person properties
    // ($initial_current_url with the full query string, $initial_utm_* raw) and
    // is NOT passed through before_send. No feature flags are used anywhere in
    // the app, so the request is switched off rather than left as a leak path.
    advanced_disable_flags: true,
    loaded: (ph) => {
      // In development, enable debug mode
      if (debug) {
        ph.debug();
      }
    },
  };
}

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

  posthog.init(POSTHOG_KEY, buildPostHogConfig(POSTHOG_HOST, process.env.NODE_ENV === 'development'));

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
