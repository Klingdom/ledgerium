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
 */

// ─── Event taxonomy ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // ── Authentication ────────────────────────────────────────────────────────
  | { event: 'signup_completed' }
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

  // ── Feature usage ─────────────────────────────────────────────────────────
  | { event: 'tab_switched'; tab: string; workflowId?: string }
  | { event: 'analysis_run'; workflowId?: string }
  | { event: 'insights_viewed'; workflowId: string; insightCount: number }

  // ── Sharing & collaboration ───────────────────────────────────────────────
  | { event: 'share_link_created'; workflowId: string }
  | { event: 'share_link_disabled'; workflowId: string }
  | { event: 'share_link_copied'; workflowId: string }
  | { event: 'shared_workflow_viewed'; token: string }
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

  // ── Conversion & billing ──────────────────────────────────────────────────
  | { event: 'upgrade_prompt_viewed'; location: string; plan: string }
  | { event: 'upgrade_clicked'; location: string }
  | { event: 'checkout_started' }
  | { event: 'subscription_created'; plan: string }
  | { event: 'subscription_canceled' }
  | { event: 'payment_failed' }
  | { event: 'plan_limit_hit'; limit: string; currentUsage: number }

  // ── Navigation ────────────────────────────────────────────────────────────
  | { event: 'page_viewed'; path: string }

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
 * Tracks a client-side analytics event.
 *
 * In development: logs to console.
 * In production: buffers in memory, sends to backend if configured.
 */
export function track(payload: AnalyticsEvent): void {
  const base: Record<string, unknown> = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  if (IS_BROWSER) base.url = window.location.pathname;
  const enriched = base as EnrichedEvent;

  if (IS_DEV) {
    console.debug('[analytics]', enriched.event, enriched);
  }

  // Buffer for batch sending
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

/**
 * Tracks a server-side analytics event.
 * Used in API routes for events that don't originate from the UI
 * (billing webhooks, sync uploads, background processing).
 */
export function trackServer(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const enriched: EnrichedEvent = {
    event,
    ...properties,
    timestamp: new Date().toISOString(),
    source: 'server',
  };

  // Log for now — replace with PostHog/Segment server SDK when ready
  if (process.env.NODE_ENV !== 'test') {
    console.log('[analytics:server]', JSON.stringify(enriched));
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
