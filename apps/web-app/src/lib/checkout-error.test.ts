/**
 * SUBSCRIPTION_READINESS_001 §G2 regression: internal diagnostic strings
 * ("Billing not configured for this plan", "Billing not configured for this
 * SKU", "User not found", "Unauthorized", "Failed to create checkout
 * session") must never reach a customer. These tests lock the code→copy
 * mapping so it cannot regress to surfacing the raw server `error` text.
 */

import { describe, it, expect } from 'vitest';
import { mapCheckoutError } from './checkout-error';

/** The exact internal diagnostic strings the audit named — must never appear anywhere in mapped output. */
const FORBIDDEN_SUBSTRINGS = [
  'Billing not configured',
  'not configured for this plan',
  'not configured for this SKU',
  'User not found',
  'Unauthorized',
  'Failed to create checkout session',
];

function assertNoInternalDiagnostic(message: string) {
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    expect(message, `message leaked internal diagnostic text: "${forbidden}"`).not.toContain(forbidden);
  }
}

describe('mapCheckoutError — G2, no internal diagnostic reaches the customer', () => {
  it('maps plan_not_configured (was "Billing not configured for this plan") to honest, non-diagnostic copy', () => {
    const result = mapCheckoutError(503, {
      error: 'Billing not configured for this plan',
      code: 'plan_not_configured',
      plan: 'solo',
      interval: 'monthly',
    });
    assertNoInternalDiagnostic(result.message);
    expect(result.message).toMatch(/isn't available|not available/i);
  });

  it('maps sku_not_configured (was "Billing not configured for this SKU") to honest, non-diagnostic copy', () => {
    const result = mapCheckoutError(503, {
      error: 'Billing not configured for this SKU',
      code: 'sku_not_configured',
      sku: 'process_audit',
    });
    assertNoInternalDiagnostic(result.message);
  });

  it('maps checkout_session_failed (was "Failed to create checkout session") to honest, non-diagnostic copy', () => {
    const result = mapCheckoutError(500, {
      error: 'Failed to create checkout session',
      code: 'checkout_session_failed',
    });
    assertNoInternalDiagnostic(result.message);
  });

  it('maps user_not_found (was "User not found") to honest, non-diagnostic copy', () => {
    const result = mapCheckoutError(404, { error: 'User not found', code: 'user_not_found' });
    assertNoInternalDiagnostic(result.message);
  });

  it('maps unauthorized (was "Unauthorized") to honest, non-diagnostic copy', () => {
    const result = mapCheckoutError(401, { error: 'Unauthorized', code: 'unauthorized' });
    assertNoInternalDiagnostic(result.message);
  });

  it('falls back to a safe generic message — never the raw error string — when a response has no code at all', () => {
    // Simulates an old/unmapped server response, or a future error the
    // mapper has not been taught yet. Must not trust `error` blindly.
    const result = mapCheckoutError(503, { error: 'Some brand-new internal diagnostic nobody wrote copy for yet' });
    expect(result.message).not.toContain('internal diagnostic');
    assertNoInternalDiagnostic(result.message);
  });

  it('falls back to a safe generic message for an unrecognized code, not the raw error text', () => {
    const result = mapCheckoutError(503, { error: 'Some future diagnostic', code: 'totally_new_code_v2' });
    expect(result.message).not.toContain('Some future diagnostic');
  });

  it('uses status-based fallback copy when code is missing: 401 -> sign-in, 404 -> account, 5xx -> retry', () => {
    expect(mapCheckoutError(401, {}).message).toMatch(/sign in/i);
    expect(mapCheckoutError(404, {}).message).toMatch(/account/i);
    expect(mapCheckoutError(500, {}).message).toMatch(/try again/i);
  });

  it('never returns an empty message for any status — silence is the bug pattern this codebase already fixed once', () => {
    for (const status of [400, 401, 403, 404, 409, 500, 503]) {
      const result = mapCheckoutError(status, null);
      expect(result.message.trim().length, `status ${status} produced an empty message`).toBeGreaterThan(0);
    }
  });

  // ── Existing codes — values preserved, copy centralized ────────────────────

  it('preserves already_subscribed copy + redirect (relied on by UpgradeButton for the delayed navigate)', () => {
    const result = mapCheckoutError(400, {
      error: 'You already have an active subscription. Manage it from your account.',
      code: 'already_subscribed',
      redirect: '/account',
    });
    expect(result.message).toMatch(/already have an active subscription/i);
    expect(result.redirect).toBe('/account');
  });

  it('maps admin_bypass without leaking "Stripe subscription" internal phrasing', () => {
    const result = mapCheckoutError(400, {
      error: 'This account has admin-granted unlimited access and does not require a Stripe subscription.',
      code: 'admin_bypass',
    });
    expect(result.message.trim().length).toBeGreaterThan(0);
  });

  it('maps audit_not_eligible using the API-supplied minRunsRequired', () => {
    const result = mapCheckoutError(403, {
      error: 'A Process Audit requires at least one recorded process with 5 or more runs...',
      code: 'audit_not_eligible',
      minRunsRequired: 5,
    });
    expect(result.message).toContain('5');
    expect(result.message).toMatch(/record more runs/i);
  });

  it('falls back to generic audit_not_eligible copy when minRunsRequired is missing (never crashes)', () => {
    const result = mapCheckoutError(403, { code: 'audit_not_eligible' });
    expect(result.message.trim().length).toBeGreaterThan(0);
  });

  it('maps missing_sku to a generic, actionable message, not the internal field-name string', () => {
    const result = mapCheckoutError(400, { error: 'Missing required field: sku', code: 'missing_sku' });
    expect(result.message).not.toContain('field: sku');
  });

  it('preserves awaiting_workspace_build waitlist copy for Team/Growth', () => {
    const result = mapCheckoutError(402, {
      code: 'awaiting_workspace_build',
      plan: 'team',
      waitlistMailto: 'hello@ledgerium.ai',
    });
    expect(result.message).toMatch(/waitlist/i);
  });
});
