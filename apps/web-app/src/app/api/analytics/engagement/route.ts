import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { effectivePlanFor } from '@/lib/feature-gating';

/**
 * GET /api/analytics/engagement
 *
 * Admin-only. Computes engagement scores (0–100) for all users based on
 * weighted behavioral signals observed in the last 30 days.
 *
 * Score breakdown (max 100):
 *   workflows    — 3 pts each, max 15  (workflow_uploaded)
 *   sopViews     — 2 pts each, max 10  (sop_section_viewed)
 *   exports      — 3 pts each, max 15  (workflow_exported)
 *   shares       — 5 pts each, max 15  (share_link_created)
 *   mapViews     — 2 pts each, max 10  (first_process_map_viewed | workflow_viewed w/ tab=workflow)
 *   analyses     — 3 pts each, max 15  (analysis_run)
 *   recency      — 10 / 5 / 2 / 0     (login_completed within 7d / 14d / 30d / none)
 *   organization — 2 pts each, max 10  (portfolio_created, tag_assigned)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all users in one query
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        uploadCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (users.length === 0) {
      return NextResponse.json({
        users: [],
        distribution: { high: 0, medium: 0, low: 0, inactive: 0 },
      });
    }

    // Fetch all relevant analytics events for all users in the last 30 days
    // in a single query to avoid N+1
    const events = await (db as any).analyticsEvent.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        createdAt: { gte: thirtyDaysAgo },
        eventName: {
          in: [
            'workflow_uploaded',
            'sop_section_viewed',
            'workflow_exported',
            'share_link_created',
            'first_process_map_viewed',
            'workflow_viewed',
            'analysis_run',
            'login_completed',
            'portfolio_created',
            'tag_assigned',
          ],
        },
      },
      select: {
        userId: true,
        eventName: true,
        properties: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group events by userId for O(1) lookup per user
    const eventsByUser = new Map<string, typeof events>();
    for (const evt of events) {
      if (!evt.userId) continue;
      const bucket = eventsByUser.get(evt.userId) ?? [];
      bucket.push(evt);
      eventsByUser.set(evt.userId, bucket);
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // effectivePlanFor is async (workspace-aware plan lookup); Promise.all
    // is acceptable here because this is an admin-only endpoint used only in
    // the operations dashboard, not a hot user-facing path. N+1 is a known
    // accepted trade-off per TEAM-P03.9 Sub-task B-3 iteration brief.
    const scoredUsers = await Promise.all(users.map(async (user) => {
      const userEvents: Array<{ eventName: string; properties: string | null; createdAt: Date }> =
        eventsByUser.get(user.id) ?? [];

      // Tally counts per signal
      let workflowCount = 0;
      let sopViewCount = 0;
      let exportCount = 0;
      let shareCount = 0;
      let mapViewCount = 0;
      let analysisCount = 0;
      let orgCount = 0;
      let latestLogin: Date | null = null;

      for (const evt of userEvents) {
        switch (evt.eventName) {
          case 'workflow_uploaded':
            workflowCount++;
            break;
          case 'sop_section_viewed':
            sopViewCount++;
            break;
          case 'workflow_exported':
            exportCount++;
            break;
          case 'share_link_created':
            shareCount++;
            break;
          case 'first_process_map_viewed':
            mapViewCount++;
            break;
          case 'workflow_viewed': {
            // Only counts as map view when tab=workflow property is set
            try {
              const props = JSON.parse(evt.properties ?? '{}') as Record<string, unknown>;
              if (props.tab === 'workflow') mapViewCount++;
            } catch {
              // Malformed JSON — skip
            }
            break;
          }
          case 'analysis_run':
            analysisCount++;
            break;
          case 'login_completed': {
            const loginDate = new Date(evt.createdAt);
            if (!latestLogin || loginDate > latestLogin) latestLogin = loginDate;
            break;
          }
          case 'portfolio_created':
          case 'tag_assigned':
            orgCount++;
            break;
        }
      }

      // Compute recency score
      let recencyScore = 0;
      if (latestLogin) {
        if (latestLogin >= sevenDaysAgo) {
          recencyScore = 10;
        } else if (latestLogin >= fourteenDaysAgo) {
          recencyScore = 5;
        } else {
          recencyScore = 2; // within 30 days (already filtered above)
        }
      }

      // Apply weights and caps
      const breakdown = {
        workflows: Math.min(workflowCount * 3, 15),
        sopViews: Math.min(sopViewCount * 2, 10),
        exports: Math.min(exportCount * 3, 15),
        shares: Math.min(shareCount * 5, 15),
        mapViews: Math.min(mapViewCount * 2, 10),
        analyses: Math.min(analysisCount * 3, 15),
        recency: recencyScore,
        organization: Math.min(orgCount * 2, 10),
      };

      const engagementScore =
        breakdown.workflows +
        breakdown.sopViews +
        breakdown.exports +
        breakdown.shares +
        breakdown.mapViews +
        breakdown.analyses +
        breakdown.recency +
        breakdown.organization;

      // Determine last active timestamp across all events
      const lastActiveEvent = userEvents[0]; // already ordered desc
      const lastActive = lastActiveEvent ? new Date(lastActiveEvent.createdAt).toISOString() : null;

      return {
        userId: user.id,
        email: user.email,
        name: user.name ?? null,
        // effectivePlanFor returns the highest plan across solo subscription AND
        // all active workspace memberships (TEAM-P03.9 Sub-task B-3 fix).
        plan: await effectivePlanFor(user.id),
        engagementScore,
        breakdown,
        lastActive,
        signupDate: user.createdAt.toISOString(),
        workflowCount: user.uploadCount,
      };
    }));

    // Sort descending by score
    scoredUsers.sort((a, b) => b.engagementScore - a.engagementScore);

    // Compute distribution
    const distribution = { high: 0, medium: 0, low: 0, inactive: 0 };
    for (const u of scoredUsers) {
      if (u.engagementScore >= 70) distribution.high++;
      else if (u.engagementScore >= 40) distribution.medium++;
      else if (u.engagementScore >= 1) distribution.low++;
      else distribution.inactive++;
    }

    return NextResponse.json({ users: scoredUsers, distribution });
  } catch (err) {
    console.error('[analytics/engagement GET]', err);
    return NextResponse.json({ error: 'Failed to compute engagement scores' }, { status: 500 });
  }
}
