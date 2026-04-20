/**
 * Regression tests for confidence threshold constants.
 *
 * These tests lock the canonical threshold values against accidental drift.
 * If a threshold needs tuning, that must be a deliberate threshold-calibration
 * iteration — any change here will fail CI and force explicit review.
 */

import { describe, it, expect } from 'vitest';
import {
  HIGH_CONFIDENCE_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
} from './confidenceThresholds.js';

describe('confidenceThresholds — constant values (regression lock)', () => {
  it('HIGH_CONFIDENCE_THRESHOLD is exactly 0.85', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBe(0.85);
  });

  it('LOW_CONFIDENCE_THRESHOLD is exactly 0.70', () => {
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.70);
  });

  it('HIGH_CONFIDENCE_THRESHOLD is strictly greater than LOW_CONFIDENCE_THRESHOLD', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(LOW_CONFIDENCE_THRESHOLD);
  });

  it('thresholds are in the valid [0, 1] confidence range', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(HIGH_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
    expect(LOW_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(LOW_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
  });
});

describe('confidenceThresholds — re-export from sopTemplates (backward-compat lock)', () => {
  it('sopTemplates re-exports HIGH_CONFIDENCE_THRESHOLD at the same value', async () => {
    const { HIGH_CONFIDENCE_THRESHOLD: fromSopTemplates } = await import('./sopTemplates.js');
    expect(fromSopTemplates).toBe(HIGH_CONFIDENCE_THRESHOLD);
  });

  it('sopTemplates re-exports LOW_CONFIDENCE_THRESHOLD at the same value', async () => {
    const { LOW_CONFIDENCE_THRESHOLD: fromSopTemplates } = await import('./sopTemplates.js');
    expect(fromSopTemplates).toBe(LOW_CONFIDENCE_THRESHOLD);
  });
});
