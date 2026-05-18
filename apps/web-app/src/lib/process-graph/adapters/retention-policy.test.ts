/**
 * Path E — Reviewed-Evidence Retention Policy Tests (iter 076 / PATHE-P01)
 *
 * Group E (CEO directive Appendix C): retention policy invariants.
 *
 * Verifies:
 *  - 365-day retention floor for Team / Growth / Enterprise
 *  - 90-day retention floor for Free / Starter
 *  - 90-day floor for unreviewed evidence
 *  - Deterministic arithmetic (no clock reads inside the helpers)
 *  - Expiry predicate semantics
 */

import { describe, it, expect } from 'vitest';

import {
  reviewedEvidenceRetentionDaysForPlan,
  reviewedEvidenceRetentionUntil,
  unreviewedEvidenceRetentionUntil,
  isEvidenceRetentionExpired,
  REVIEWED_EVIDENCE_RETENTION_DAYS_PAID,
  REVIEWED_EVIDENCE_RETENTION_DAYS_FREE,
  UNREVIEWED_EVIDENCE_RETENTION_DAYS,
} from './retention-policy.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('reviewedEvidenceRetentionDaysForPlan (Group E.1)', () => {
  it('E1.1: free tier → 90 days', () => {
    expect(reviewedEvidenceRetentionDaysForPlan('free')).toBe(90);
  });

  it('E1.2: starter tier → 90 days', () => {
    expect(reviewedEvidenceRetentionDaysForPlan('starter')).toBe(90);
  });

  it('E1.3: team tier → 365 days', () => {
    expect(reviewedEvidenceRetentionDaysForPlan('team')).toBe(365);
  });

  it('E1.4: growth tier → 365 days', () => {
    expect(reviewedEvidenceRetentionDaysForPlan('growth')).toBe(365);
  });

  it('E1.5: enterprise tier → 365 days', () => {
    expect(reviewedEvidenceRetentionDaysForPlan('enterprise')).toBe(365);
  });

  it('E1.6: exported constants match the per-tier lookup', () => {
    expect(REVIEWED_EVIDENCE_RETENTION_DAYS_PAID).toBe(365);
    expect(REVIEWED_EVIDENCE_RETENTION_DAYS_FREE).toBe(90);
    expect(UNREVIEWED_EVIDENCE_RETENTION_DAYS).toBe(90);
  });
});

describe('reviewedEvidenceRetentionUntil (Group E.2)', () => {
  it('E2.1: team tier → reviewedAt + exactly 365 days', () => {
    const reviewedAt = new Date('2026-05-18T12:00:00.000Z');
    const until = reviewedEvidenceRetentionUntil(reviewedAt, 'team');
    expect(until.getTime() - reviewedAt.getTime()).toBe(365 * MS_PER_DAY);
  });

  it('E2.2: free tier → reviewedAt + exactly 90 days', () => {
    const reviewedAt = new Date('2026-05-18T12:00:00.000Z');
    const until = reviewedEvidenceRetentionUntil(reviewedAt, 'free');
    expect(until.getTime() - reviewedAt.getTime()).toBe(90 * MS_PER_DAY);
  });

  it('E2.3: starter tier → 90 days (matches free, NOT paid)', () => {
    const reviewedAt = new Date('2026-05-18T12:00:00.000Z');
    const until = reviewedEvidenceRetentionUntil(reviewedAt, 'starter');
    expect(until.getTime() - reviewedAt.getTime()).toBe(90 * MS_PER_DAY);
  });

  it('E2.4: enterprise tier → 365 days', () => {
    const reviewedAt = new Date('2026-05-18T12:00:00.000Z');
    const until = reviewedEvidenceRetentionUntil(reviewedAt, 'enterprise');
    expect(until.getTime() - reviewedAt.getTime()).toBe(365 * MS_PER_DAY);
  });

  it('E2.5: deterministic — repeat calls produce byte-identical Date', () => {
    const reviewedAt = new Date('2026-05-18T12:00:00.000Z');
    const r1 = reviewedEvidenceRetentionUntil(reviewedAt, 'team');
    const r2 = reviewedEvidenceRetentionUntil(reviewedAt, 'team');
    expect(r1.getTime()).toBe(r2.getTime());
  });

  it('E2.6: distinct reviewedAt values produce distinct retentionUntil', () => {
    const t1 = reviewedEvidenceRetentionUntil(
      new Date('2026-05-18T12:00:00.000Z'),
      'team',
    );
    const t2 = reviewedEvidenceRetentionUntil(
      new Date('2026-05-19T12:00:00.000Z'),
      'team',
    );
    expect(t2.getTime() - t1.getTime()).toBe(MS_PER_DAY);
  });
});

describe('unreviewedEvidenceRetentionUntil (Group E.3)', () => {
  it('E3.1: unreviewed → evidence timestamp + 90 days', () => {
    const evidenceTs = new Date('2026-05-18T12:00:00.000Z');
    const until = unreviewedEvidenceRetentionUntil(evidenceTs);
    expect(until.getTime() - evidenceTs.getTime()).toBe(90 * MS_PER_DAY);
  });
});

describe('isEvidenceRetentionExpired (Group E.4)', () => {
  it('E4.1: now < retentionUntil → not expired', () => {
    const retentionUntil = new Date('2026-12-31T00:00:00.000Z');
    expect(isEvidenceRetentionExpired(retentionUntil, retentionUntil.getTime() - 1)).toBe(
      false,
    );
  });

  it('E4.2: now > retentionUntil → expired', () => {
    const retentionUntil = new Date('2026-01-01T00:00:00.000Z');
    expect(isEvidenceRetentionExpired(retentionUntil, retentionUntil.getTime() + 1)).toBe(
      true,
    );
  });

  it('E4.3: now === retentionUntil exactly → NOT expired (strict less-than)', () => {
    const retentionUntil = new Date('2026-05-18T12:00:00.000Z');
    expect(isEvidenceRetentionExpired(retentionUntil, retentionUntil.getTime())).toBe(
      false,
    );
  });
});

describe('Plan-tier gating invariants (Group E.5 — Appendix C)', () => {
  it('E5.1: PAID retention (365d) > FREE retention (90d) by exactly 275 days', () => {
    expect(REVIEWED_EVIDENCE_RETENTION_DAYS_PAID - REVIEWED_EVIDENCE_RETENTION_DAYS_FREE).toBe(
      275,
    );
  });

  it('E5.2: FREE reviewed retention === unreviewed retention (both 90d)', () => {
    expect(REVIEWED_EVIDENCE_RETENTION_DAYS_FREE).toBe(UNREVIEWED_EVIDENCE_RETENTION_DAYS);
  });

  it('E5.3: cleanup-job query selector includes all expired rows (boundary test)', () => {
    // Simulate cleanup-job snapshot: nowMs = a fixed value.
    const nowMs = new Date('2027-01-01T00:00:00.000Z').getTime();
    // Three rows: one well-past, one boundary, one not-yet-expired.
    const expired = new Date(nowMs - MS_PER_DAY); // 1 day past
    const boundary = new Date(nowMs); // exact
    const future = new Date(nowMs + MS_PER_DAY); // 1 day future
    expect(isEvidenceRetentionExpired(expired, nowMs)).toBe(true);
    expect(isEvidenceRetentionExpired(boundary, nowMs)).toBe(false);
    expect(isEvidenceRetentionExpired(future, nowMs)).toBe(false);
  });
});
