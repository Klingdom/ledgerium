/**
 * Workspace billing helpers for Team-scoped Stripe webhook processing.
 *
 * Consumed exclusively by POST /api/billing/webhook (iter 083 / TEAM-P03).
 *
 * Design notes:
 *   - `resolveTeamFromCustomer` is the single lookup entry-point: given a Stripe
 *     customer ID it returns the Team row including all current TeamMember rows.
 *     The webhook handler uses the included members to build downgrade-notification
 *     context without issuing a second DB query.
 *
 *   - `notifyOwnerOfDowngrade` is a **stub**.  It logs the downgrade context and
 *     returns `{ emailQueued: false, reason: 'stub_not_yet_implemented' }`.
 *     TEAM-P04 will replace this with a real Resend email call.
 *
 * Clock contract: callers are responsible for injecting `nowMs` so the entire
 * request shares a single upstream clock boundary (iter 037 MDR-P03/P04 pattern).
 *
 * @iter 083 / TEAM-P03 Part A + Part D
 */

import { db } from '@/db';
import type { PlanType } from '@/lib/plans';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Minimal TeamMember fields needed for downgrade notification context.
 * Derived from the members array returned by `resolveTeamFromCustomer`.
 */
export interface DeactivatedMemberInfo {
  /** TeamMember.id */
  id: string;
  /** The FK user ID (TeamMember.userId). */
  userId: string;
  /** TeamMember.role — always non-owner when deactivated. */
  role: string;
}

/**
 * Context passed to `notifyOwnerOfDowngrade`.
 * All fields are required so the notification stub (and future real implementation)
 * can log a deterministic, auditable record of what happened.
 */
export interface DowngradeNotificationContext {
  /** The team whose plan was downgraded. */
  teamId: string;
  /** Display name of the team. */
  teamName: string;
  /** The old plan tier (before downgrade). */
  fromPlan: PlanType;
  /** The new plan tier (after downgrade). */
  toPlan: PlanType;
  /** Member IDs that were soft-deactivated as a result of the quota reduction. */
  deactivatedMemberIds: string[];
  /** Unix epoch milliseconds at which the downgrade occurred (injected clock). */
  nowMs: number;
}

/**
 * Result of `notifyOwnerOfDowngrade`.
 * `emailQueued` will be true once TEAM-P04 wires the real Resend call.
 */
export interface NotifyOwnerResult {
  emailQueued: boolean;
  reason?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve a Team (with all current TeamMember rows) from a Stripe customer ID.
 *
 * Returns `null` if no team is linked to the given customer ID, which signals
 * the webhook handler to fall back to the solo-subscriber User.plan update path.
 *
 * @param stripeCustomerId - The `customer` field on a Stripe Subscription or
 *   Checkout.Session object.
 */
export async function resolveTeamFromCustomer(
  stripeCustomerId: string,
): Promise<({ id: string; name: string; plan: string; stripeCustomerId: string | null; stripeSubscriptionId: string | null } & { members: Array<{ id: string; teamId: string; userId: string; role: string; joinedAt: Date; status: string; deactivatedAt: Date | null; reactivationDeadline: Date | null }> }) | null> {
  return (db as any).team.findFirst({
    where: { stripeCustomerId },
    include: { members: true },
  });
}

/**
 * Notify the workspace owner(s) that a plan downgrade occurred and that excess
 * members have been soft-deactivated.
 *
 * **STUB** — logs the context via `console.warn` and returns
 * `{ emailQueued: false, reason: 'stub_not_yet_implemented' }`.
 * TEAM-P04 will replace this stub with a real Resend transactional email.
 *
 * Clock contract: `nowMs` is injected by the caller (iter 037 MDR-P03/P04 pattern).
 *
 * @param ctx - Downgrade notification context including team, plan transition,
 *   deactivated member IDs, and the clock reference.
 */
export async function notifyOwnerOfDowngrade(
  ctx: DowngradeNotificationContext,
): Promise<NotifyOwnerResult> {
  console.warn(
    `[billing] TEAM-P03 stub — downgrade notification for team ${ctx.teamId} ` +
      `(${ctx.teamName}): ${ctx.fromPlan} → ${ctx.toPlan} at ${new Date(ctx.nowMs).toISOString()}; ` +
      `${ctx.deactivatedMemberIds.length} member(s) deactivated: [${ctx.deactivatedMemberIds.join(', ')}]. ` +
      `TEAM-P04 will replace this stub with a Resend email to workspace owner(s).`,
  );
  return { emailQueued: false, reason: 'stub_not_yet_implemented' };
}
