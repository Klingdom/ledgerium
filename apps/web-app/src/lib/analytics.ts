/**
 * Analytics event tracking for Ledgerium AI.
 *
 * Lightweight, structured event system for measuring onboarding,
 * activation, and feature usage. Events are buffered and can be
 * sent to any analytics backend (PostHog, Mixpanel, GA4, etc).
 *
 * Currently logs to console in development and stores events
 * for future backend integration.
 */

// ─── Event types ─────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Onboarding
  | { event: 'onboarding_started' }
  | { event: 'onboarding_step_completed'; step: string }
  | { event: 'onboarding_completed'; durationMs: number }
  | { event: 'onboarding_dismissed' }
  // Activation
  | { event: 'first_workflow_uploaded'; stepCount: number; systemCount: number }
  | { event: 'first_sop_viewed'; workflowId: string }
  | { event: 'first_report_exported'; format: string }
  // Core usage
  | { event: 'workflow_uploaded'; stepCount: number; systemCount: number }
  | { event: 'workflow_viewed'; workflowId: string; tab: string }
  | { event: 'workflow_exported'; workflowId: string; format: string }
  | { event: 'workflow_deleted'; workflowId: string }
  | { event: 'analysis_run' }
  | { event: 'sample_workflow_loaded' }
  // Navigation
  | { event: 'page_viewed'; path: string }
  | { event: 'tab_switched'; tab: string }
  // Errors
  | { event: 'upload_failed'; error: string }
  | { event: 'api_error'; endpoint: string; status: number };

// ─── Track function ──────────────────────────────────────────────────────────

const IS_DEV = typeof window !== 'undefined' && window.location.hostname === 'localhost';

/**
 * Tracks an analytics event. In development, logs to console.
 * In production, events can be forwarded to an analytics backend.
 */
export function track(payload: AnalyticsEvent): void {
  const enriched = {
    ...payload,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };

  if (IS_DEV) {
    console.debug('[analytics]', enriched.event, enriched);
  }

  // Buffer for future backend integration
  if (typeof window !== 'undefined') {
    const buffer = (window as any).__ledgerium_events ?? [];
    buffer.push(enriched);
    (window as any).__ledgerium_events = buffer;

    // Keep buffer bounded
    if (buffer.length > 200) buffer.splice(0, buffer.length - 200);
  }
}
