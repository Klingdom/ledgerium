import { NextResponse } from 'next/server';
import {
  isReverseTrialActive,
  hasReverseTrialLapsed,
  reverseTrialDaysRemaining,
  activeReverseTrialPlan,
} from '@/lib/reverse-trial';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { buildFeatureFlagsWithUsage } from '@/lib/feature-gating';

/**
 * GET /api/account
 *
 * Returns the authenticated user's profile, plan, feature flags, and usage limits.
 * The client uses this to render feature-gated UI and show upgrade prompts.
 *
 * Response shape:
 * {
 *   data: {
 *     user: { id, email, name, plan },
 *     features: { cleanExports: true, intelligenceLayer: false, ... },
 *     limits: {
 *       recordings: { used: 3, max: 15 },
 *       seats: { max: 1 },
 *       recorders: { max: 1 }
 *     }
 *   }
 * }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const flags = await buildFeatureFlagsWithUsage(user);

  return NextResponse.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: flags.plan,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        hasStripeCustomer: !!user.stripeCustomerId,
        // P0-2 (billing hardening, 2026-08): non-null IFF Stripe currently has
        // an open invoice on this subscription requiring SCA/3-D Secure
        // customer authentication. The account page surfaces this as a
        // direct "complete payment" link — see webhook/route.ts
        // invoice.payment_action_required for the write side.
        pendingInvoiceUrl: user.pendingInvoiceUrl ?? null,
      },
      features: flags.features,
      limits: flags.limits,
      /*
        Reverse-trial state (TRIAL_REVIEW_001). Surfaced so the UI can tell a
        user they are on a trial and how long is left — previously nothing
        anywhere in the product said so, and the window simply ended in
        silence.

        `daysRemaining` is computed here from the same clock as `isActive`, not
        derived separately in the client. Two independent computations would be
        free to disagree, and a countdown that contradicts the access a user
        actually has is worse than showing no countdown at all.

        `hasLapsed` is deliberately distinct from `!isActive`: someone who
        never had a trial should be told nothing about one, while someone whose
        trial ended should be told what changed.
      */
      reverseTrial: (() => {
        const nowMs = Date.now();
        const fields = {
          reverseTrialPlan: user.reverseTrialPlan,
          reverseTrialEndsAt: user.reverseTrialEndsAt,
        };
        return {
          isActive: isReverseTrialActive(fields, nowMs),
          hasLapsed: hasReverseTrialLapsed(fields, nowMs),
          daysRemaining: reverseTrialDaysRemaining(fields, nowMs),
          plan: activeReverseTrialPlan(fields, nowMs),
          endsAt: user.reverseTrialEndsAt ?? null,
        };
      })(),
    },
  });
}
