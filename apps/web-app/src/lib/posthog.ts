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
    // Row #378: autocapture off. It sends clicked element text ($el_text,
    // $elements_chain: emails, workflow titles) and link hrefs with query
    // strings / share tokens. Nothing reads $autocapture events (the app sends
    // its own named events), so it is removed rather than masked.
    autocapture: false,
    // Defence in depth should autocapture ever be re-enabled
    mask_all_text: true,
    mask_all_element_attributes: true,
    // Mask ad-click ids etc. in URLs (defence in depth; before_send strips queries)
    mask_personal_data_properties: true,
    // Row #375: sanitise utm_* and strip query/fragment from URL properties
    before_send: sanitizePostHogEvent,
    // Don't record sessions (privacy-first)
    disable_session_recording: true,
    // Respect Do Not Track
    respect_dnt: true,
    // Row #378: localStorage only. The cookie held $initial_person_info.u (the
    // full landing URL) and was sent to Ledgerium's own servers on every request.
    persistence: 'localStorage',
    // Row #375: the /flags request sends the persisted person properties
    // ($initial_current_url with the full query string, $initial_utm_* raw) and
    // is NOT passed through before_send. No feature flags are used anywhere in
    // the app, so the request is switched off rather than left as a leak path.
    advanced_disable_flags: true,
    // Row #385: these extensions are inactive today only because remote config never
    // loads (advanced_disable_flags). Force them off locally so a posthog-js upgrade
    // that ships any as a local default cannot start sending clicks, exceptions,
    // timings or survey traffic (none of which pass through the path templating).
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
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
 * Consent withdrawn (row #394): forget the identity, then stop capturing. No-op if
 * PostHog was never initialised in this page (nothing to stop).
 */
export function optOutPostHog(): void {
  if (!initialized || !POSTHOG_KEY) return;
  // Order matters: posthog.reset() also clears the stored opt-in/out state, so
  // opting out first would be silently undone (found by the #394 e2e).
  posthog.reset();
  posthog.opt_out_capturing();
}

/**
 * Consent (re)granted (row #394). If this page opted out earlier, resume capturing
 * without sending an `$opt_in` event. No-op otherwise.
 */
export function optInPostHog(): void {
  if (!initialized || !POSTHOG_KEY) return;
  if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing({ captureEventName: false });
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
