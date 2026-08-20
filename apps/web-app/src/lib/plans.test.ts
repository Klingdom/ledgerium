/**
 * Tests for the Solo tier (REVENUE_PLAN_20K §6 Option B,
 * docs/meta/REVENUE_PLAN_20K_001.md).
 *
 * Solo is a single-user, self-serve tier that unlocks the intelligence layer
 * (bottleneckAnalysis, automationScoring, variantDetection) without any
 * dependency on the team data layer. These tests lock:
 *   1. Solo's feature set is Starter + intelligence layer, minus the two
 *      team-dependent features (sharedLibrary, teamWorkspace).
 *   2. PLAN_HIERARCHY places `solo` strictly between `starter` and `team` —
 *      this ordering is load-bearing for effectivePlanFor() and every
 *      isPlanAtLeast() / indexOf() comparison in the codebase.
 *   3. toPlanType('pro') still maps to 'starter' — a regression lock on the
 *      "introduce a `pro` PlanType and silently downgrade legacy Pro
 *      subscribers" trap named explicitly in the task brief.
 *   4. maxSeats / maxRecorders / maxRecordingsPerMonth match the design spec.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_FEATURES,
  PLAN_HIERARCHY,
  toPlanType,
  hasFeature,
  isPlanAtLeast,
  getPlanConfig,
} from './plans';
import type { PlanType } from './plans';

describe('Solo plan tier (REVENUE_PLAN_20K §6 Option B)', () => {
  describe('feature set', () => {
    it('has intelligenceLayer', () => {
      expect(hasFeature('solo', 'intelligenceLayer')).toBe(true);
    });

    it('has bottleneckAnalysis', () => {
      expect(hasFeature('solo', 'bottleneckAnalysis')).toBe(true);
    });

    it('has automationScoring', () => {
      expect(hasFeature('solo', 'automationScoring')).toBe(true);
    });

    it('has variantDetection', () => {
      expect(hasFeature('solo', 'variantDetection')).toBe(true);
    });

    it('inherits cleanExports from Starter', () => {
      expect(hasFeature('solo', 'cleanExports')).toBe(true);
    });

    it('inherits healthScores from Starter', () => {
      expect(hasFeature('solo', 'healthScores')).toBe(true);
    });

    it('inherits personalWorkspace from Starter', () => {
      expect(hasFeature('solo', 'personalWorkspace')).toBe(true);
    });

    it('does NOT have sharedLibrary (team data layer dependency)', () => {
      expect(hasFeature('solo', 'sharedLibrary')).toBe(false);
    });

    it('does NOT have teamWorkspace (team data layer dependency)', () => {
      expect(hasFeature('solo', 'teamWorkspace')).toBe(false);
    });

    it('does NOT have advancedAnalytics (Growth+ only)', () => {
      expect(hasFeature('solo', 'advancedAnalytics')).toBe(false);
    });

    it('does NOT have sso/rbac/auditTrail (Enterprise only)', () => {
      expect(hasFeature('solo', 'sso')).toBe(false);
      expect(hasFeature('solo', 'rbac')).toBe(false);
      expect(hasFeature('solo', 'auditTrail')).toBe(false);
    });

    it('matches Starter plus exactly the 4 intelligence-layer flags — no more, no less', () => {
      const starterFeatures = PLAN_FEATURES.starter.features;
      const soloFeatures = PLAN_FEATURES.solo.features;
      const intelligenceFlags = [
        'intelligenceLayer',
        'bottleneckAnalysis',
        'automationScoring',
        'variantDetection',
      ] as const;

      for (const key of Object.keys(soloFeatures) as (keyof typeof soloFeatures)[]) {
        if ((intelligenceFlags as readonly string[]).includes(key)) {
          expect(soloFeatures[key], `solo.${key} should be true`).toBe(true);
        } else {
          expect(soloFeatures[key], `solo.${key} should match starter.${key}`).toBe(
            starterFeatures[key],
          );
        }
      }
    });
  });

  describe('limits', () => {
    it('maxSeats is 1 (single-user tier)', () => {
      expect(PLAN_FEATURES.solo.maxSeats).toBe(1);
    });

    it('maxRecorders is 1 (single-user tier)', () => {
      expect(PLAN_FEATURES.solo.maxRecorders).toBe(1);
    });

    it('maxRecordingsPerMonth is unlimited', () => {
      expect(PLAN_FEATURES.solo.maxRecordingsPerMonth).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('getPlanConfig("solo") returns the same config object', () => {
      expect(getPlanConfig('solo')).toBe(PLAN_FEATURES.solo);
    });
  });

  describe('PLAN_HIERARCHY ordering', () => {
    it('solo sits strictly between starter and team', () => {
      const starterIdx = PLAN_HIERARCHY.indexOf('starter');
      const soloIdx = PLAN_HIERARCHY.indexOf('solo');
      const teamIdx = PLAN_HIERARCHY.indexOf('team');

      expect(soloIdx).toBeGreaterThan(starterIdx);
      expect(soloIdx).toBeLessThan(teamIdx);
    });

    it('solo is included exactly once in PLAN_HIERARCHY', () => {
      const occurrences = PLAN_HIERARCHY.filter((p) => p === 'solo').length;
      expect(occurrences).toBe(1);
    });

    it('PLAN_HIERARCHY has 6 entries (free, starter, solo, team, growth, enterprise)', () => {
      expect(PLAN_HIERARCHY).toEqual([
        'free',
        'starter',
        'solo',
        'team',
        'growth',
        'enterprise',
      ]);
    });

    it('isPlanAtLeast: solo is at least starter', () => {
      expect(isPlanAtLeast('solo', 'starter')).toBe(true);
    });

    it('isPlanAtLeast: solo is NOT at least team', () => {
      expect(isPlanAtLeast('solo', 'team')).toBe(false);
    });

    it('isPlanAtLeast: team is at least solo (hierarchy holds above too)', () => {
      expect(isPlanAtLeast('team', 'solo')).toBe(true);
    });

    it('isPlanAtLeast: starter is NOT at least solo', () => {
      expect(isPlanAtLeast('starter', 'solo')).toBe(false);
    });
  });

  describe('PLAN_FEATURES has an entry for every PlanType (exhaustiveness)', () => {
    it('PLAN_FEATURES.solo exists and is well-formed', () => {
      expect(PLAN_FEATURES.solo).toBeDefined();
      expect(typeof PLAN_FEATURES.solo.maxSeats).toBe('number');
      expect(typeof PLAN_FEATURES.solo.maxRecorders).toBe('number');
      expect(typeof PLAN_FEATURES.solo.maxRecordingsPerMonth).toBe('number');
    });
  });

  describe('toPlanType', () => {
    it('returns "solo" for the raw string "solo"', () => {
      expect(toPlanType('solo')).toBe('solo');
    });

    // ── Regression lock: the legacy-'pro'-collision trap named in the brief ──
    it('REGRESSION LOCK: toPlanType("pro") still returns "starter", NOT "solo"', () => {
      // toPlanType() has a hardcoded legacy mapping: raw === 'pro' → 'starter'.
      // If a future change introduced a `pro` PlanType (instead of `solo`) or
      // altered this mapping, every existing legacy-Pro subscriber would be
      // silently reassigned to a different tier. This test exists specifically
      // to catch that class of regression for the Solo tier rollout.
      expect(toPlanType('pro')).toBe('starter');
      expect(toPlanType('pro')).not.toBe('solo');
    });

    it('returns "free" for an unrecognized raw string', () => {
      expect(toPlanType('not-a-real-plan')).toBe('free');
    });

    it('is idempotent for every known PlanType', () => {
      const knownPlans: PlanType[] = ['free', 'starter', 'solo', 'team', 'growth', 'enterprise'];
      for (const plan of knownPlans) {
        expect(toPlanType(plan)).toBe(plan);
      }
    });
  });
});
