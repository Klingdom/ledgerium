/**
 * Ledgerium AI — Product Analytics System
 *
 * Comprehensive event tracking for measuring activation, engagement,
 * retention, and conversion across all product flows.
 *
 * Architecture:
 * - Client-side: track() for UI events (page views, clicks, feature usage)
 * - Server-side: trackServer() for backend events (uploads, billing, API)
 * - Both share the same event taxonomy and enrichment
 * - Events are buffered client-side and logged server-side
 * - Ready for PostHog/Segment/Mixpanel integration via sendToBackend()
 *
 * Event naming: snake_case, action-oriented, grouped by category
 * Metadata: consistent structure, no PII, useful for analysis
 *
 * PostHog integration: all track() calls also forward to PostHog
 * when NEXT_PUBLIC_POSTHOG_KEY is configured in the environment.
 */

import { captureEvent as posthogCapture, identifyUser as posthogIdentify, isPostHogEnabled } from './posthog';

// ─── Event taxonomy ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // ── Authentication ────────────────────────────────────────────────────────
  | { event: 'signup_completed'; [utm: string]: unknown }
  | { event: 'login_completed' }
  | { event: 'login_failed'; reason: string }
  | { event: 'logout' }

  // ── Onboarding ────────────────────────────────────────────────────────────
  | { event: 'onboarding_started' }
  | { event: 'onboarding_step_completed'; step: string }
  | { event: 'onboarding_completed'; durationMs: number }
  | { event: 'onboarding_dismissed' }

  // ── Activation (first-time milestones) ────────────────────────────────────
  | { event: 'first_workflow_uploaded'; stepCount: number; systemCount: number }
  | { event: 'first_sop_viewed'; workflowId: string }
  | { event: 'first_process_map_viewed'; workflowId: string }
  | { event: 'first_export'; format: string }

  // ── Workflow lifecycle ────────────────────────────────────────────────────
  | { event: 'workflow_uploaded'; stepCount: number; systemCount: number; durationMs?: number }
  | { event: 'workflow_viewed'; workflowId: string; tab: string }
  | { event: 'workflow_exported'; workflowId: string; format: string }
  | { event: 'workflow_deleted'; workflowId: string }
  | { event: 'workflow_favorited'; workflowId: string }
  | { event: 'workflow_unfavorited'; workflowId: string }
  | { event: 'sample_workflow_loaded' }
  | { event: 'sample_workflow_auto_seeded' }

  // ── Feature usage ─────────────────────────────────────────────────────────
  | { event: 'tab_switched'; tab: string; workflowId?: string }
  | { event: 'sop_section_viewed'; workflowId: string; durationMs: number }
  | { event: 'analysis_run'; workflowId?: string }
  | { event: 'insights_viewed'; workflowId: string; insightCount: number }

  // ── Sharing & collaboration ───────────────────────────────────────────────
  | { event: 'share_link_created'; workflowId: string }
  | { event: 'share_link_disabled'; workflowId: string }
  | { event: 'share_link_copied'; workflowId: string }
  | { event: 'shared_workflow_viewed'; token: string }
  | { event: 'signup_from_shared_sop'; token: string }
  | { event: 'workflow_shared_with_user'; workflowId: string }
  | { event: 'workflow_shared_with_team'; workflowId: string; teamId: string }

  // ── Teams ─────────────────────────────────────────────────────────────────
  | { event: 'team_created'; teamId: string }
  | { event: 'team_invite_sent'; teamId: string; role: string }
  | { event: 'team_invite_accepted'; teamId: string }
  | { event: 'team_member_removed'; teamId: string }

  // ── Tags & organization ───────────────────────────────────────────────────
  | { event: 'tag_created'; tagName: string }
  | { event: 'tag_deleted'; tagId: string }
  | { event: 'tag_assigned'; workflowId: string; tagId: string }
  | { event: 'tag_removed'; workflowId: string; tagId: string }
  | { event: 'tag_filter_applied'; tagId: string }

  // ── Portfolios ─────────────────────────────────────────────────────────────
  | { event: 'portfolio_created'; type: string; hasParent: boolean }
  | { event: 'portfolio_renamed'; portfolioId: string }
  | { event: 'portfolio_deleted'; portfolioId: string }
  | { event: 'portfolio_filter_applied'; portfolioId: string }
  | { event: 'workflow_added_to_portfolio'; workflowId: string; portfolioId: string }
  | { event: 'workflow_removed_from_portfolio'; workflowId: string; portfolioId: string }

  // ── Process groups & analysis ─────────────────────────────────────────────
  | { event: 'view_mode_changed'; mode: string }
  | { event: 'process_analysis_triggered' }
  | { event: 'preset_view_applied'; preset: string }

  // ── Conversion & billing ──────────────────────────────────────────────────
  | { event: 'upgrade_prompt_viewed'; location: string; plan: string }
  | { event: 'upgrade_clicked'; location: string }
  | { event: 'upgrade_blocked'; code: 'admin_bypass' | 'already_subscribed'; location: string }
  | { event: 'checkout_started' }
  | { event: 'subscription_created'; plan: string }
  | { event: 'subscription_canceled' }
  | { event: 'payment_failed' }
  | { event: 'plan_limit_hit'; limit: string; currentUsage: number }

  // ── Dashboard V2 instrumentation (iter-030 / PRD §4) ─────────────────────
  | {
      event: 'dashboard_v2_viewed';
      workflowCount: number;
      hasActiveFilters: boolean;
      portfolioFilterActive: boolean;
      /** WDC2-P03 (iter-067): time-range segmentation prereq — the active filter
       *  at the moment the dashboard loaded. Enables per-range retention analysis. */
      time_range: '7d' | '30d' | '90d' | 'all';
    }
  | {
      event: 'workflow_row_clicked';
      workflowId: string;
      elapsedMsSinceDashboardView: number;
      healthBand: 'red' | 'amber' | 'green';
    }
  | {
      event: 'dashboard_v2_sort_changed';
      column: string;
      direction: 'asc' | 'desc';
    }
  | {
      event: 'dashboard_v2_filter_applied';
      filterType: 'systems' | 'opportunity' | 'healthStatus' | 'needsAttention';
      filterValue: string;
    }
  | {
      event: 'insight_chip_clicked';
      severity: 'critical' | 'warning' | 'info' | 'positive';
      filterKey: string;
    }
  | {
      // MDR-P09 (a): bounce instrumentation (iter-038 / PRD §4 metric #2)
      // Fired on beforeunload when dashboard_v2_viewed has fired but zero
      // trackable click interactions occurred during the session.
      event: 'dashboard_bounced';
      workflowCount: number;
      elapsedMsSinceDashboardView: number;
    }

  // ── Navigation ────────────────────────────────────────────────────────────
  | { event: 'page_viewed'; path: string }

  // ── Feedback ───────────────────────────────────────────────────────────────
  | { event: 'sop_usefulness_response'; workflowId: string; response: 'yes_as_is' | 'minor_edits' | 'major_rework' | 'not_useful' }

  // ── Marketing ─────────────────────────────────────────────────────────────
  | { event: 'cta_clicked'; location: string; destination: string }

  // ── Errors ────────────────────────────────────────────────────────────────
  | { event: 'upload_failed'; error: string }
  | { event: 'api_error'; endpoint: string; status: number }
  | { event: 'client_error'; message: string; component?: string };

// ─── Enriched event (what actually gets stored/sent) ─────────────────────────

interface EnrichedEvent {
  event: string;
  timestamp: string;
  url?: string;
  userPlan?: string;
  sessionId?: string;
  [key: string]: unknown;
}

// ─── Client-side tracking ────────────────────────────────────────────────────

const IS_BROWSER = typeof window !== 'undefined';
const IS_DEV = IS_BROWSER && window.location.hostname === 'localhost';

/**
 * MDR-P09 (b): set the current user's plan for automatic enrichment of all
 * subsequent track() calls.  Call this from the dashboard shell after the
 * plan is resolved from the API response.  Stored in a window-level slot so
 * it flows into EnrichedEvent.userPlan without requiring every event variant
 * to carry the field explicitly.
 */
export function setUserPlanForAnalytics(plan: string | undefined): void {
  if (!IS_BROWSER) return;
  (window as any).__ledgerium_userPlan = plan ?? null;
}

export function track(payload: AnalyticsEvent): void {
  const base: Record<string, unknown> = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  if (IS_BROWSER) {
    base.url = window.location.pathname;
    // MDR-P09 (b): enrich every event with userPlan when available.
    const userPlan: unknown = (window as any).__ledgerium_userPlan;
    if (userPlan != null) base.userPlan = userPlan;
  }
  const enriched = base as EnrichedEvent;

  if (IS_DEV) {
    console.debug('[analytics]', enriched.event, enriched);
  }

  // Forward to PostHog (if configured)
  if (IS_BROWSER && isPostHogEnabled()) {
    const { event: eventName, timestamp: _ts, url: _url, ...properties } = enriched;
    posthogCapture(eventName, properties);

    // Auto-identify on signup/login
    if (eventName === 'signup_completed' || eventName === 'login_completed') {
      // PostHog identify will be called separately via identifyUser()
      // when the session is available
    }
  }

  // Buffer for batch sending to our own analytics API
  if (IS_BROWSER) {
    const buffer: EnrichedEvent[] = (window as any).__ledgerium_events ?? [];
    buffer.push(enriched);
    (window as any).__ledgerium_events = buffer;
    if (buffer.length > 500) buffer.splice(0, buffer.length - 500);

    // Flush to backend if endpoint is configured
    if (buffer.length >= 10) {
      flushEvents();
    }
  }
}

/**
 * Identify the current user in PostHog after login/signup.
 * Call this when the session becomes available.
 */
export function identifyAnalyticsUser(userId: string, properties?: Record<string, unknown>): void {
  if (IS_BROWSER && isPostHogEnabled()) {
    posthogIdentify(userId, properties);
  }
}

/**
 * Sends buffered events to the analytics API endpoint.
 * Non-blocking — failures are silently ignored.
 */
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function flushEvents(): void {
  if (flushTimeout) return; // Already scheduled
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    if (!IS_BROWSER) return;
    const buffer: EnrichedEvent[] = (window as any).__ledgerium_events ?? [];
    if (buffer.length === 0) return;

    const events = buffer.splice(0, buffer.length);
    // Fire-and-forget POST to analytics endpoint
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch(() => {
      // Silently fail — analytics should never break the app
    });
  }, 2000); // 2-second debounce
}

// Flush on page unload
if (IS_BROWSER) {
  window.addEventListener('beforeunload', () => {
    const buffer: EnrichedEvent[] = (window as any).__ledgerium_events ?? [];
    if (buffer.length > 0) {
      // Use sendBeacon for reliable delivery on page exit
      const blob = new Blob([JSON.stringify({ events: buffer })], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/events', blob);
    }
  });
}

// ─── Server-side tracking ────────────────────────────────────────────────────
// trackServer() lives in './analytics-server' to keep Node.js-only dependencies
// (posthog-node, Prisma) out of the client bundle.
// API routes should import { trackServer } from '@/lib/analytics-server'.

// ─── Funnel helpers ──────────────────────────────────────────────────────────

// ─── UTM helpers ─────────────────────────────────────────────────────────────

const FIRST_TOUCH_UTM_KEY = 'ledgerium_first_touch_utm';

/**
 * Returns the first-touch UTM data stored by UTMCapture, or null if none.
 * Safe to call on the server — returns null in that context.
 */
export function getFirstTouchUTM(): Record<string, string> | null {
  if (!IS_BROWSER) return null;
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_UTM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Return only string values to keep the shape clean for event properties
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') result[k] = v;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

// ─── Funnel helpers ──────────────────────────────────────────────────────────

/**
 * Tracks an activation milestone. Call when a user reaches a first-time event.
 * Checks localStorage to avoid duplicate first-time tracking.
 */
export function trackActivation(
  milestone: 'first_workflow' | 'first_sop' | 'first_map' | 'first_export',
  metadata: Record<string, unknown> = {},
): void {
  if (!IS_BROWSER) return;
  const key = `ledgerium_activation_${milestone}`;
  if (localStorage.getItem(key)) return; // Already tracked
  localStorage.setItem(key, new Date().toISOString());

  switch (milestone) {
    case 'first_workflow':
      track({ event: 'first_workflow_uploaded', stepCount: 0, systemCount: 0, ...metadata } as any);
      break;
    case 'first_sop':
      track({ event: 'first_sop_viewed', workflowId: '', ...metadata } as any);
      break;
    case 'first_map':
      track({ event: 'first_process_map_viewed', workflowId: '', ...metadata } as any);
      break;
    case 'first_export':
      track({ event: 'first_export', format: '', ...metadata } as any);
      break;
  }
}
