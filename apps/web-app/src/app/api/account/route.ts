import { NextResponse } from 'next/server';
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
      },
      features: flags.features,
      limits: flags.limits,
    },
  });
}
