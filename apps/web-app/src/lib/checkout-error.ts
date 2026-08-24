/**
 * Maps a failed `POST /api/billing/checkout` response to customer-facing
 * copy.
 *
 * SUBSCRIPTION_READINESS_001 §G2: several checkout failure paths returned
 * raw internal diagnostic strings straight to the customer — "Billing not
 * configured for this plan", "Billing not configured for this SKU", "User
 * not found" — because `UpgradeButton` / `ServiceCheckoutButton` / the
 * account page's plan switcher all rendered `data.error` verbatim inside a
 * `role="alert"`. A prospect clicking Buy on Solo was told the product was
 * misconfigured.
 *
 * Every customer-reachable checkout failure now carries a stable `code` (see
 * `checkout/route.ts`). This module is the single place that turns a code
 * into what a customer should read — copy is presentation, the code is the
 * contract. Existing codes (`already_subscribed`, `admin_bypass`,
 * `audit_not_eligible`, `missing_sku`, `awaiting_workspace_build`) are
 * unchanged in VALUE — other code relies on them (analytics, redirect
 * handling) — only their copy is centralized here rather than duplicated
 * inline. New codes (`plan_not_configured`, `sku_not_configured`,
 * `checkout_session_failed`, `user_not_found`, `unauthorized`) replace what
 * were previously raw, code-less `error` strings.
 *
 * Deliberately does NOT fall back to the server's raw `error` text for an
 * unrecognized/missing code — that text may itself be an as-yet-unmapped
 * internal diagnostic (this is exactly how the Solo bug happened). Every
 * path returns safe, generic, honest copy instead.
 *
 * `apps/web-app` has no jsdom/testing-library (verified 2026-08-21) — lifted
 * out of the components for the same reason as `mapCreateTeamError` /
 * `dashboardActionError` / `insightActions`.
 */

export type CheckoutErrorCode =
  | 'already_subscribed'
  | 'admin_bypass'
  | 'audit_not_eligible'
  | 'missing_sku'
  | 'awaiting_workspace_build'
  | 'plan_not_configured'
  | 'sku_not_configured'
  | 'checkout_session_failed'
  | 'user_not_found'
  | 'unauthorized';

export interface CheckoutErrorInfo {
  message: string;
  /** Present only when the API also supplied one (`already_subscribed` today). */
  redirect?: string;
}

/** Plain, honest, never customer-blaming — matches the register used by `mapCreateTeamError` / `dashboardActionError`. */
const COPY: Record<CheckoutErrorCode, string> = {
  already_subscribed: 'You already have an active subscription. Manage it from your account.',
  admin_bypass: 'This account already has unlimited access and does not need a paid plan.',
  // Overridden below with the minRunsRequired-specific message whenever the
  // API supplies that field — this entry is the fallback for the rare case
  // it does not.
  audit_not_eligible:
    'A Process Audit requires more recorded runs of the same process before it can produce a ' +
    'meaningful result. Record more runs, then try again.',
  missing_sku: 'Could not start checkout — please try again.',
  awaiting_workspace_build:
    'Multi-user invites are launching Q3 2026. Please join the waitlist at ' +
    'mailto:hello@ledgerium.ai?subject=Team Plan Waitlist or upgrade to Starter for solo use today.',
  plan_not_configured: "This plan isn't available for purchase yet — please check back soon.",
  sku_not_configured: "This isn't available for purchase yet — please check back soon.",
  checkout_session_failed: 'Could not start checkout — please try again in a moment.',
  user_not_found: 'We could not find your account — try signing in again.',
  unauthorized: 'Please sign in to continue.',
};

const DEFAULT_MESSAGE = 'Could not start checkout — please try again.';

function isKnownCode(code: string): code is CheckoutErrorCode {
  return code in COPY;
}

export function mapCheckoutError(status: number, body: unknown): CheckoutErrorInfo {
  const payload = (body ?? {}) as Record<string, unknown>;
  const code = typeof payload.code === 'string' ? payload.code : undefined;
  const redirect = typeof payload.redirect === 'string' ? payload.redirect : undefined;

  if (code === 'audit_not_eligible' && typeof payload.minRunsRequired === 'number') {
    return {
      message:
        `A Process Audit requires at least one recorded process with ${payload.minRunsRequired} or more ` +
        `runs — below that, variance and variant analysis are not statistically meaningful. Record more ` +
        `runs of the same process, then try again.`,
    };
  }

  if (code && isKnownCode(code)) {
    return redirect !== undefined ? { message: COPY[code], redirect } : { message: COPY[code] };
  }

  // No code, or a code this mapper does not (yet) recognize — never trust
  // the raw server `error` string; fall back to a safe, status-based
  // generic message instead.
  if (status === 401) return { message: COPY.unauthorized };
  if (status === 404) return { message: COPY.user_not_found };
  if (status >= 500) return { message: COPY.checkout_session_failed };
  return { message: DEFAULT_MESSAGE };
}
