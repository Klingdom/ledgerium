/**
 * Prisma query functions for the Admin Operations Dashboard.
 *
 * All functions are pure async queries — no side effects, no auth checks.
 * Auth is enforced at the route layer. These functions can be called in
 * parallel via Promise.all.
 *
 * Cross-DB safety:
 *   - Prisma `findMany` / `count` / `groupBy` calls work on both SQLite and Postgres.
 *   - The DB size query uses `pg_total_relation_size` (Postgres-only) and is
 *     wrapped in try/catch; on SQLite it returns `{ available: false }`.
 *
 * Privacy:
 *   - No raw email addresses are returned from any function.
 *   - userIds are truncated: `${id.slice(0, 8)}...${id.slice(-4)}`.
 *
 * @module admin-operations/queries
 * @iter 071
 */

import { db } from '@/db';
import { toPlanType } from '@/lib/plans';
import {
  MONTHLY_PRICE_USD,
  ANNUAL_MONTHLY_EQUIVALENT_USD,
  MRR_BILLABLE_STATUSES,
  TEAM_MRR_BILLABLE_STATUSES,
  ENTERPRISE_PLAN,
} from './pricing.js';
import type {
  UserVolumeSection,
  RecordingVolumeSection,
  WorkflowProcessingSection,
  SystemHealthSection,
  MemoryUsageSection,
  SubscriptionBreakdownSection,
  NormalizedPlan,
  NormalizedSubscriptionStatus,
  DailyBucket,
  DbSize,
  ErrorEventRow,
} from './types.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Truncate a userId for display. Format: first 8 chars + "..." + last 4 chars.
 * If the id is shorter than 13 chars, return it unchanged (edge case in tests).
 */
export function truncateUserId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD) using UTC.
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Build an array of ISO date strings from startDate to endDate (inclusive),
 * stepping by 1 calendar day. All in UTC.
 */
export function buildDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Bin an array of dates into daily buckets.
 * Returns an array of { date, count } objects for every day in the range,
 * including days with zero events.
 */
export function binByDay(
  timestamps: Date[],
  startDate: Date,
  endDate: Date,
): DailyBucket[] {
  const dateRange = buildDateRange(startDate, endDate);
  const counts = new Map<string, number>(dateRange.map((d) => [d, 0]));
  for (const ts of timestamps) {
    const key = toIsoDate(ts);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return dateRange.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/**
 * Format bytes as a human-readable string (e.g. "42.3 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Error event names ──────────────────────────────────────────────────────────

const ERROR_EVENT_NAMES = ['upload_failed', 'api_error', 'client_error'] as const;

// ── Section query functions ────────────────────────────────────────────────────

/**
 * Section 1 — User volume.
 *
 * Computes:
 *   - totalUsers (all time count)
 *   - mau30d (users with updatedAt >= now - 30d, regardless of range param)
 *   - newUsersTimeSeries (daily signups in range)
 *   - topUploaders (top 10 by upload count in range, truncated userId)
 */
export async function getUserVolume(
  startDate: Date,
  endDate: Date,
): Promise<UserVolumeSection> {
  const now = new Date();
  const mau30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    mau30d,
    newUsersRaw,
    topUploadersRaw,
  ] = await Promise.all([
    // Total registered users
    db.user.count(),

    // MAU proxy: updated in last 30 days
    db.user.count({
      where: {
        updatedAt: { gte: mau30dStart },
      },
    }),

    // New signups in range — pull raw timestamps for Node-side binning
    db.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { createdAt: true },
    }),

    // Top 10 uploaders by upload count in range
    db.upload.groupBy({
      by: ['userId'],
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const newUsersTimeSeries = binByDay(
    newUsersRaw.map((u) => u.createdAt),
    startDate,
    endDate,
  );

  const topUploaders = topUploadersRaw.map((row) => ({
    userId: truncateUserId(row.userId),
    uploadCount: row._count.id,
  }));

  // Activation rate: distinct users with ≥1 non-deleted workflow / totalUsers × 100.
  const workflowUserRows = await db.workflow.findMany({
    where: { status: { not: 'deleted' } },
    select: { userId: true },
  });
  const distinctUserIds = new Set(workflowUserRows.map((w) => w.userId));
  const activationRatePct =
    totalUsers === 0
      ? 0
      : Math.round((distinctUserIds.size / totalUsers) * 10000) / 100;

  const newUsersInRange = newUsersTimeSeries.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  return {
    totalUsers,
    mau30d,
    newUsersTimeSeries,
    topUploaders,
    activationRatePct,
    newUsersInRange,
  };
}

/**
 * Section 2 — Recording volume.
 *
 * Computes:
 *   - uploadsInRange (total uploads in time window)
 *   - uploadsTimeSeries (daily upload counts in range)
 *   - uploadsByStatus (breakdown by validationStatus in range)
 */
export async function getRecordingVolume(
  startDate: Date,
  endDate: Date,
): Promise<RecordingVolumeSection> {
  const [uploadsInRange, uploadsRaw, uploadsByStatusRaw] = await Promise.all([
    // Total count in range
    db.upload.count({
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),

    // Raw timestamps for time series binning
    db.upload.findMany({
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { uploadedAt: true },
    }),

    // Group by validationStatus
    db.upload.groupBy({
      by: ['validationStatus'],
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { id: true },
    }),
  ]);

  const uploadsTimeSeries = binByDay(
    uploadsRaw.map((u) => u.uploadedAt),
    startDate,
    endDate,
  );

  const statusCounts = { pending: 0, valid: 0, invalid: 0 };
  for (const row of uploadsByStatusRaw) {
    const status = row.validationStatus as keyof typeof statusCounts;
    if (status in statusCounts) {
      statusCounts[status] = row._count.id;
    }
  }

  return {
    uploadsInRange,
    uploadsTimeSeries,
    uploadsByStatus: statusCounts,
  };
}

/**
 * Section 3 — Workflow processing.
 *
 * Computes:
 *   - totalWorkflows (active + archived; excludes deleted)
 *   - processingSuccessRate (confidence IS NOT NULL / total * 100)
 *   - workflowsTimeSeries (daily workflow creation in range)
 *
 * Note: There is no WorkflowRun model in the current schema. Processing success
 * is proxied by the presence of a non-null `confidence` field on the Workflow.
 */
export async function getWorkflowVolume(
  startDate: Date,
  endDate: Date,
): Promise<WorkflowProcessingSection> {
  const [
    totalWorkflows,
    processedCount,
    workflowsRaw,
    workflowUpdatesRaw,
  ] = await Promise.all([
    // Total non-deleted workflows
    db.workflow.count({
      where: {
        status: { not: 'deleted' },
      },
    }),

    // Workflows with a non-null confidence value (processing proxy)
    db.workflow.count({
      where: {
        status: { not: 'deleted' },
        confidence: { not: null },
      },
    }),

    // Raw creation timestamps in range for time series
    db.workflow.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'deleted' },
      },
      select: { createdAt: true },
    }),

    // Workflow update timestamps in range (engagement signal)
    db.workflow.findMany({
      where: {
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'deleted' },
      },
      select: { updatedAt: true },
    }),
  ]);

  const processingSuccessRate =
    totalWorkflows === 0
      ? null
      : Math.round((processedCount / totalWorkflows) * 10000) / 100;

  const workflowsTimeSeries = binByDay(
    workflowsRaw.map((w) => w.createdAt),
    startDate,
    endDate,
  );

  const workflowUpdatesTimeSeries = binByDay(
    workflowUpdatesRaw.map((w) => w.updatedAt),
    startDate,
    endDate,
  );

  return {
    totalWorkflows,
    processingSuccessRate,
    workflowsTimeSeries,
    workflowUpdatesTimeSeries,
  };
}

/**
 * Section 4 — System health.
 *
 * Computes:
 *   - dbSize: Postgres pg_total_relation_size, or { available: false } on SQLite
 *   - errorEvents24h: analytics events with error-class names in last 24 hours
 *   - errorEvents24hTotal: total count
 */
export async function getSystemHealth(): Promise<SystemHealthSection> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [dbSize, errorEventsRaw] = await Promise.all([
    // DB size — Postgres only; SQLite degrades gracefully
    (async (): Promise<DbSize> => {
      try {
        const result = await db.$queryRaw<Array<{ size: bigint }>>`
          SELECT pg_total_relation_size(quote_ident(table_name))::bigint AS size
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `;
        const totalBytes = result.reduce(
          (sum, row) => sum + Number(row.size),
          0,
        );
        return {
          available: true,
          totalBytes,
          humanReadable: formatBytes(totalBytes),
        };
      } catch {
        return {
          available: false,
          reason: 'sqlite-dev-mode',
        };
      }
    })(),

    // Error-class analytics events in last 24h
    db.analyticsEvent.groupBy({
      by: ['eventName'],
      where: {
        eventName: { in: [...ERROR_EVENT_NAMES] },
        createdAt: { gte: last24h },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  const errorEvents24h: ErrorEventRow[] = errorEventsRaw.map((row) => ({
    eventName: row.eventName,
    count: row._count.id,
  }));

  const errorEvents24hTotal = errorEvents24h.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return {
    dbSize,
    errorEvents24h,
    errorEvents24hTotal,
  };
}

/**
 * Section 6 — Subscription breakdown (Growth Intelligence Extension).
 *
 * Range-independent snapshot (like getSystemHealth) — always reflects
 * current DB state, not windowed by the date range parameter.
 *
 * CORRECTNESS NOTE (R-5):
 *   We use a SINGLE compound groupBy({ by: ['plan','subscriptionStatus','billingInterval'] }).
 *   This gives joint distribution rows like:
 *     { plan: 'starter', subscriptionStatus: 'active', billingInterval: 'monthly', _count: { id: 5 } }
 *   Marginal (single-dimension) groupBys cannot reconstruct the billable
 *   intersection (plan=X AND status=active AND interval=Y), so MRR would be
 *   incorrect. billingInterval was added to the compound key (REVENUE_PLAN_20K
 *   fix) for the same reason plan+status were compounded originally — an
 *   annual subscriber and a monthly subscriber on the same plan+status must
 *   contribute different dollar amounts, and a marginal groupBy loses that
 *   distinction.
 *
 * AUTHORITATIVE MODEL NOTE — User vs Team double-source fix (REVENUE_PLAN_20K,
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §1.2b):
 *   The User table above is authoritative for MRR ONLY for the 'free',
 *   'starter', and 'solo' plans (solo-billed; never Team-linked — 'solo'
 *   added REVENUE_PLAN_20K §6 Option B, docs/meta/REVENUE_PLAN_20K_001.md,
 *   same single-user billing model as 'starter'). It is NOT authoritative
 *   for 'team' or 'growth': checkout.session.completed writes User.plan for
 *   the purchasing owner once, at checkout, purely so effective-plan lookups
 *   have a sane value immediately — but every subsequent lifecycle event
 *   (trial→paid conversion, upgrade, downgrade, renewal-driven status change)
 *   is delivered via customer.subscription.updated, which — for team-linked
 *   subscriptions — writes ONLY Team.plan / Team.subscriptionStatus and
 *   `break`s before reaching the User-sync branch (see webhook/route.ts).
 *   The owner's User row is therefore a write-once snapshot that drifts from
 *   reality the moment the subscription's real lifecycle begins. Reading it
 *   for MRR would either double-count (Team already counts the same
 *   subscription) or silently miss every later state change.
 *
 *   We therefore EXCLUDE 'team'/'growth' User rows from the MRR fold below
 *   entirely and read the `Team` table directly instead (second query) —
 *   Team is the single, continuously-updated source of truth for team/growth
 *   billing state. byPlan / byStatus (the raw User plan-distribution display,
 *   NOT a dollar figure) are intentionally left untouched by this fix and
 *   still reflect the User table verbatim — see the doc comment on
 *   `paidUserCount` below for the corresponding scope note.
 *
 * MRR formula:
 *   Σ over solo-billed (starter/solo, User-sourced) billable rows of monthlyEquivalentUsd(row)
 *   + Σ over team-linked (team/growth, Team-sourced) billable accounts of monthlyEquivalentUsd(team)
 * where monthlyEquivalentUsd() is MONTHLY_PRICE_USD[plan] for billingInterval
 * !== 'annual', else ANNUAL_MONTHLY_EQUIVALENT_USD[plan] (REVENUE_PLAN_20K
 * §1.2c — annual subscribers must not be counted at the full monthly price).
 *
 * No Date.now() in the fold — pure deterministic reduction over DB rows.
 * No PII — counts only. No Stripe ids or email addresses.
 */
export async function getSubscriptionBreakdown(): Promise<SubscriptionBreakdownSection> {
  // Known plan and status keys for zero-filled closed unions
  const KNOWN_PLANS: NormalizedPlan[] = [
    'free',
    'starter',
    'solo',
    'team',
    'growth',
    'enterprise',
  ];
  const KNOWN_STATUSES: NormalizedSubscriptionStatus[] = [
    'none',
    'trialing',
    'active',
    'past_due',
    'canceled',
  ];

  // Billable plans for MRR (enterprise is excluded — separate count, no fixed price)
  const MRR_PLANS = ['starter', 'solo', 'team', 'growth'] as const;

  // Single compound groupBy — gives joint (plan × subscriptionStatus × billingInterval)
  // distribution for individually-billed Users. Run in parallel with the
  // Team-linked billing query below (independent reads, no shared state).
  const [jointRows, teamRows] = await Promise.all([
    db.user.groupBy({
      by: ['plan', 'subscriptionStatus', 'billingInterval'],
      _count: { id: true },
    }),
    // Team rows with a live Stripe subscription link — see AUTHORITATIVE
    // MODEL NOTE above for why Team, not User, is read for team/growth MRR.
    // `(db as any)` matches the existing cast convention for the Team model
    // used throughout webhook/route.ts and team-billing.ts.
    (db as any).team.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: { plan: true, subscriptionStatus: true, billingInterval: true },
    }) as Promise<
      Array<{ plan: string; subscriptionStatus: string; billingInterval: string | null }>
    >,
  ]);

  // Initialise zero-filled maps
  const byPlan = Object.fromEntries(
    KNOWN_PLANS.map((p) => [p, 0]),
  ) as Record<NormalizedPlan, number>;

  const byStatus = Object.fromEntries(
    KNOWN_STATUSES.map((s) => [s, 0]),
  ) as Record<NormalizedSubscriptionStatus, number>;

  const byPlanUsd = Object.fromEntries(
    MRR_PLANS.map((p) => [p, 0]),
  ) as Record<'starter' | 'solo' | 'team' | 'growth', number>;

  let enterpriseCount = 0;
  let paidUserCount = 0;
  let totalUsersFromJoint = 0;

  /** MONTHLY_PRICE_USD for monthly billing, ANNUAL_MONTHLY_EQUIVALENT_USD for annual. */
  function monthlyEquivalentUsd(
    plan: 'starter' | 'solo' | 'team' | 'growth',
    billingInterval: string | null | undefined,
  ): number {
    return billingInterval === 'annual'
      ? ANNUAL_MONTHLY_EQUIVALENT_USD[plan]
      : MONTHLY_PRICE_USD[plan];
  }

  // Fold the joint distribution rows (User — authoritative for free/starter only)
  for (const row of jointRows) {
    const count = row._count.id;
    totalUsersFromJoint += count;

    // Normalize plan string (handles legacy 'pro' → 'starter', unknown → 'free')
    const rawPlan = row.plan ?? 'free';
    const normalizedPlan: NormalizedPlan =
      rawPlan === 'enterprise'
        ? 'enterprise'
        : (toPlanType(rawPlan) as NormalizedPlan);

    // Normalize subscription status string
    const rawStatus = row.subscriptionStatus ?? 'none';
    const normalizedStatus: NormalizedSubscriptionStatus = (
      KNOWN_STATUSES as readonly string[]
    ).includes(rawStatus)
      ? (rawStatus as NormalizedSubscriptionStatus)
      : 'none';

    // Accumulate plan and status counts — raw User distribution, unaffected
    // by the team/growth MRR-sourcing fix (display-only, not a dollar figure).
    byPlan[normalizedPlan] = (byPlan[normalizedPlan] ?? 0) + count;
    byStatus[normalizedStatus] = (byStatus[normalizedStatus] ?? 0) + count;

    // Enterprise count (shown separately; excluded from MRR — no fixed price)
    if (normalizedPlan === ENTERPRISE_PLAN) {
      enterpriseCount += count;
    }

    // MRR contribution: User rows are billable ONLY for 'starter'/'solo' —
    // team/growth are read from the Team table below instead (see
    // AUTHORITATIVE MODEL NOTE). The inline `plan === 'starter' || plan
    // === 'solo'` check (rather than a separately-computed boolean) is
    // deliberate — it narrows `normalizedPlan` to the byPlanUsd key type at
    // the point of use, so TypeScript can verify the indexed write below.
    const isBillableStatus = (MRR_BILLABLE_STATUSES as readonly string[]).includes(
      normalizedStatus,
    );

    if ((normalizedPlan === 'starter' || normalizedPlan === 'solo') && isBillableStatus) {
      byPlanUsd[normalizedPlan] += monthlyEquivalentUsd(normalizedPlan, row.billingInterval) * count;
      // paidUserCount = active non-free solo subscribers (team/growth accounts
      // are counted separately below, one per Stripe subscription).
      paidUserCount += count;
    }
  }

  // Fold Team-linked billing rows — authoritative for team/growth MRR.
  // One paying ACCOUNT per Stripe subscription (not per seat) — matches the
  // existing paidUserCount semantics of "how many distinct bills are being
  // paid", not "how many people have access".
  for (const team of teamRows) {
    const normalizedTeamPlan = toPlanType(team.plan ?? 'free');
    if (normalizedTeamPlan !== 'team' && normalizedTeamPlan !== 'growth') {
      // Team rows can also be 'free' (never subscribed), 'starter' (not a
      // real workspace-billing tier), or 'enterprise' (custom pricing, no
      // fixed price to fold here) — none contribute to byPlanUsd.
      continue;
    }
    const isBillableTeamStatus = (TEAM_MRR_BILLABLE_STATUSES as readonly string[]).includes(
      team.subscriptionStatus ?? 'none',
    );
    if (!isBillableTeamStatus) continue;

    const plan = normalizedTeamPlan as 'team' | 'growth';
    byPlanUsd[plan] += monthlyEquivalentUsd(plan, team.billingInterval);
    paidUserCount += 1;
  }

  const estimatedUsd = Object.values(byPlanUsd).reduce(
    (sum, v) => sum + v,
    0,
  );

  const freeToPaidConversionPct =
    totalUsersFromJoint === 0
      ? 0
      : Math.round((paidUserCount / totalUsersFromJoint) * 10000) / 100;

  return {
    byPlan,
    byStatus,
    mrr: {
      estimatedUsd,
      byPlanUsd,
      enterpriseCount,
      basis: {
        monthlyPriceUsd: { ...MONTHLY_PRICE_USD },
        billableStatuses: MRR_BILLABLE_STATUSES,
      },
    },
    paidUserCount,
    freeToPaidConversionPct,
  };
}

/**
 * Section 5 — Node runtime memory.
 *
 * Reads process.memoryUsage() and process.uptime() at call time.
 * No async I/O — synchronous system call wrapped for consistent interface.
 */
export function getMemoryUsage(): MemoryUsageSection {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const heapUsedPercent =
    mem.heapTotal === 0
      ? 0
      : Math.round((mem.heapUsed / mem.heapTotal) * 10000) / 100;

  return {
    uptimeSeconds,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    rssBytes: mem.rss,
    heapUsedPercent,
  };
}
