import { describe, it, expect } from 'vitest';
import {
  GUIDED_ONBOARDING_SKU,
  PROCESS_AUDIT_SKU,
  MIN_RECORDED_RUNS_FOR_AUDIT,
  MAX_AUDITED_PROCESSES,
  SERVICE_SKUS,
  hasQualifyingProcessForAudit,
  countQualifyingProcesses,
  isServiceSkuKey,
} from './service-skus';

describe('service-skus catalog', () => {
  it('defines both real SKUs with distinct keys', () => {
    expect(GUIDED_ONBOARDING_SKU).toBe('guided_onboarding');
    expect(PROCESS_AUDIT_SKU).toBe('process_audit');
    expect(GUIDED_ONBOARDING_SKU).not.toBe(PROCESS_AUDIT_SKU);
  });

  it('catalog entries key correctly and are internally consistent', () => {
    expect(SERVICE_SKUS[GUIDED_ONBOARDING_SKU].skuKey).toBe(GUIDED_ONBOARDING_SKU);
    expect(SERVICE_SKUS[PROCESS_AUDIT_SKU].skuKey).toBe(PROCESS_AUDIT_SKU);
  });

  it('every deliverable named for the Process Audit maps to a real engine capability per SKU_SPEC_001', () => {
    // Not exhaustive proof of engine wiring (that's a build-time/typecheck
    // concern for the intelligence engine itself) — this locks the copy so a
    // future edit cannot silently add a fabricated deliverable without
    // updating this list + SKU_SPEC_001 in the same review.
    const expected = [
      'Cycle-time distribution per step, with variance',
      'Ranked bottleneck identification',
      'Variant analysis — how many different ways the process is actually run',
      'Recommended canonical path',
      'Standardization score',
      'Documentation drift — where the written SOP diverges from observed reality',
      'Automation opportunity with ROI estimate',
      'A written report plus a walkthrough session — every finding traceable to the source events that produced it',
    ];
    expect(SERVICE_SKUS[PROCESS_AUDIT_SKU].whatYouGet).toEqual(expected);
  });

  it('prices are the coordinator-proposed figures from SKU_SPEC_001', () => {
    expect(SERVICE_SKUS[GUIDED_ONBOARDING_SKU].price).toBe(299);
    expect(SERVICE_SKUS[PROCESS_AUDIT_SKU].price).toBe(1500);
  });

  it('MIN_RECORDED_RUNS_FOR_AUDIT matches the SKU_SPEC_001 hard gate (5)', () => {
    expect(MIN_RECORDED_RUNS_FOR_AUDIT).toBe(5);
  });

  it('MAX_AUDITED_PROCESSES matches SKU_SPEC_001 ("up to 3 processes")', () => {
    expect(MAX_AUDITED_PROCESSES).toBe(3);
  });

  it('fulfilment copy for the audit cites the actual gate constant, not a hardcoded duplicate number', () => {
    expect(SERVICE_SKUS[PROCESS_AUDIT_SKU].fulfilment).toContain(
      `minimum ${MIN_RECORDED_RUNS_FOR_AUDIT} recorded runs`,
    );
  });
});

describe('isServiceSkuKey', () => {
  it('returns true for both real SKU keys', () => {
    expect(isServiceSkuKey('guided_onboarding')).toBe(true);
    expect(isServiceSkuKey('process_audit')).toBe(true);
  });

  it('returns false for the inert placeholder key and arbitrary strings', () => {
    expect(isServiceSkuKey('example_onboarding_audit')).toBe(false);
    expect(isServiceSkuKey('not_a_real_sku')).toBe(false);
    expect(isServiceSkuKey('')).toBe(false);
  });
});

describe('hasQualifyingProcessForAudit', () => {
  it('returns false for an empty run-count list (no processes recorded at all)', () => {
    expect(hasQualifyingProcessForAudit([])).toBe(false);
  });

  it('returns false when every process is below the gate', () => {
    expect(hasQualifyingProcessForAudit([1, 2, 3, 4])).toBe(false);
  });

  it('returns true when exactly one process is at the gate boundary (5)', () => {
    expect(hasQualifyingProcessForAudit([5])).toBe(true);
  });

  it('returns false one run below the boundary (4) — the gate is a hard minimum, not "close enough"', () => {
    expect(hasQualifyingProcessForAudit([4])).toBe(false);
  });

  it('returns true when at least one of several processes qualifies, even if others do not', () => {
    expect(hasQualifyingProcessForAudit([1, 5, 2])).toBe(true);
  });

  it('returns true for a process well above the gate', () => {
    expect(hasQualifyingProcessForAudit([42])).toBe(true);
  });
});

describe('countQualifyingProcesses', () => {
  it('counts zero for an empty list', () => {
    expect(countQualifyingProcesses([])).toBe(0);
  });

  it('counts only processes at or above the gate', () => {
    expect(countQualifyingProcesses([1, 5, 6, 4, 5])).toBe(3);
  });

  it('counts zero when none qualify', () => {
    expect(countQualifyingProcesses([1, 2, 3])).toBe(0);
  });

  it('counts every process when all qualify', () => {
    expect(countQualifyingProcesses([5, 10, 20])).toBe(3);
  });
});
