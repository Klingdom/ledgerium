/**
 * Phase 3 — Process Intelligence Layer Tests
 *
 * Tests for SOP alignment engine, standardization scoring,
 * outlier detection, and recommended canonical path.
 */

import { describe, it, expect } from 'vitest';
import { analyzeSopAlignment } from './sopAlignmentEngine.js';
import type { SOPStep } from './sopAlignmentEngine.js';
import {
  computeStandardizationScore,
  computeDocumentationDriftScore,
  detectOutlierRuns,
  deriveRecommendedCanonicalPath,
} from './standardizationScorer.js';
import type { ProcessRunBundle, VariantSet, VarianceReport, ProcessMetrics } from './types.js';
import type { ProcessRun, ProcessDefinition, StepDefinition } from '@ledgerium/process-engine';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStepDef(ordinal: number, category: string, title: string): StepDefinition {
  return {
    ordinal,
    stepId: `step-${ordinal}`,
    title,
    category: category as any,
    categoryLabel: category,
    categoryColor: '#000',
    categoryBg: '#fff',
    operationalDefinition: '',
    purpose: '',
    systems: ['TestSystem'],
    domains: ['test.com'],
    inputs: [],
    outputs: [],
    completionCondition: '',
    confidence: 0.85,
    durationMs: 5000,
    durationLabel: '5s',
    eventCount: 3,
    hasSensitiveEvents: false,
    sourceEventIds: [],
  };
}

function makeBundle(runId: string, categories: string[]): ProcessRunBundle {
  return {
    processRun: {
      runId,
      sessionId: runId,
      activityName: 'Test Workflow',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-01T00:01:00Z',
      durationMs: 60000,
      durationLabel: '1m',
      stepCount: categories.length,
      eventCount: categories.length * 3,
      humanEventCount: categories.length * 2,
      systemEventCount: categories.length,
      errorStepCount: 0,
      navigationStepCount: 1,
      systemsUsed: ['TestSystem'],
      completionStatus: 'complete',
      engineVersion: '1.0.0',
    } as ProcessRun,
    processDefinition: {
      definitionId: `def-${runId}`,
      name: 'Test Workflow',
      version: '1.0',
      description: '',
      purpose: '',
      scope: '',
      systems: ['TestSystem'],
      domains: ['test.com'],
      estimatedDurationMs: 60000,
      estimatedDurationLabel: '1m',
      stepDefinitions: categories.map((cat, i) => makeStepDef(i + 1, cat, `Step ${i + 1}`)),
      ruleVersion: '1.0.0',
    } as ProcessDefinition,
  };
}

function makeVariantSet(
  runs: ProcessRunBundle[],
  standardCategories: string[],
  variantCategories: string[][] = [],
): VariantSet {
  const standardRunIds = runs.slice(0, Math.ceil(runs.length / 2)).map(r => r.processRun.runId);
  const standardFreq = standardRunIds.length / runs.length;

  const variants = [
    {
      variantId: 'variant-1',
      pathSignature: { signature: standardCategories.join(':'), stepCategories: standardCategories, stepCount: standardCategories.length },
      runCount: standardRunIds.length,
      frequency: standardFreq,
      isStandardPath: true,
      similarityToStandard: 1.0,
      evidenceRunIds: standardRunIds,
    },
    ...variantCategories.map((cats, i) => ({
      variantId: `variant-${i + 2}`,
      pathSignature: { signature: cats.join(':'), stepCategories: cats, stepCount: cats.length },
      runCount: 1,
      frequency: 1 / runs.length,
      isStandardPath: false,
      similarityToStandard: 0.7,
      evidenceRunIds: [runs[Math.ceil(runs.length / 2) + i]?.processRun.runId ?? 'unknown'],
    })),
  ];

  return {
    ruleVersion: '1.0.0',
    runCount: runs.length,
    computedAt: new Date().toISOString(),
    variantCount: variants.length,
    standardPath: variants[0]!,
    variants,
    variantSimilarityThreshold: 0.75,
    evidenceRunIds: runs.map(r => r.processRun.runId),
  };
}

// ─── SOP Alignment Tests ────────────────────────────────────────────────────

describe('SOP Alignment Engine', () => {
  const standardPath = ['click_then_navigate', 'data_entry', 'fill_and_submit', 'send_action'];

  it('should compute high alignment for matching SOP', () => {
    const sopSteps: SOPStep[] = standardPath.map((cat, i) => ({
      ordinal: i + 1,
      title: `Step ${i + 1}`,
      category: cat,
    }));

    const runs = [
      makeBundle('run-1', standardPath),
      makeBundle('run-2', standardPath),
      makeBundle('run-3', standardPath),
    ];

    const variant = makeVariantSet(runs, standardPath);
    const result = analyzeSopAlignment(sopSteps, runs, variant.standardPath);

    expect(result.alignmentScore).toBeGreaterThan(0.7);
    expect(result.alignmentLevel).toBe('high');
    expect(result.undocumentedSteps).toHaveLength(0);
    expect(result.unusedDocumentedSteps).toHaveLength(0);
  });

  it('should detect undocumented steps', () => {
    const sopSteps: SOPStep[] = [
      { ordinal: 1, title: 'Navigate', category: 'click_then_navigate' },
      { ordinal: 2, title: 'Submit', category: 'send_action' },
    ];

    const runs = [
      makeBundle('run-1', ['click_then_navigate', 'data_entry', 'fill_and_submit', 'send_action']),
      makeBundle('run-2', ['click_then_navigate', 'data_entry', 'fill_and_submit', 'send_action']),
    ];

    const variant = makeVariantSet(runs, ['click_then_navigate', 'data_entry', 'fill_and_submit', 'send_action']);
    const result = analyzeSopAlignment(sopSteps, runs, variant.standardPath);

    expect(result.undocumentedSteps.length).toBeGreaterThan(0);
    expect(result.undocumentedSteps.some(s => s.category === 'data_entry')).toBe(true);
  });

  it('should detect unused documented steps', () => {
    const sopSteps: SOPStep[] = [
      { ordinal: 1, title: 'Navigate', category: 'click_then_navigate' },
      { ordinal: 2, title: 'Approval', category: 'annotation' }, // Not in runs
      { ordinal: 3, title: 'Submit', category: 'send_action' },
    ];

    const runs = [
      makeBundle('run-1', ['click_then_navigate', 'send_action']),
      makeBundle('run-2', ['click_then_navigate', 'send_action']),
    ];

    const variant = makeVariantSet(runs, ['click_then_navigate', 'send_action']);
    const result = analyzeSopAlignment(sopSteps, runs, variant.standardPath);

    expect(result.unusedDocumentedSteps.length).toBeGreaterThan(0);
    expect(result.unusedDocumentedSteps[0]!.sopCategory).toBe('annotation');
  });

  it('should return critical alignment for empty inputs', () => {
    const result = analyzeSopAlignment([], [], null);
    expect(result.alignmentScore).toBe(0);
    expect(result.alignmentLevel).toBe('critical');
  });
});

// ─── Standardization Score Tests ────────────────────────────────────────────

describe('Standardization Scorer', () => {
  it('should score highly standardized process', () => {
    const variants: VariantSet = {
      ruleVersion: '1.0.0',
      runCount: 10,
      computedAt: new Date().toISOString(),
      variantCount: 1,
      standardPath: {
        variantId: 'variant-1',
        pathSignature: { signature: 'a:b:c', stepCategories: ['a', 'b', 'c'], stepCount: 3 },
        runCount: 10,
        frequency: 1.0,
        isStandardPath: true,
        similarityToStandard: 1.0,
        evidenceRunIds: [],
      },
      variants: [],
      variantSimilarityThreshold: 0.75,
      evidenceRunIds: [],
    };

    const variance: VarianceReport = {
      ruleVersion: '1.0.0',
      runCount: 10,
      computedAt: new Date().toISOString(),
      durationVariance: { stdDevMs: 1000, coefficientOfVariation: 0.1, isHighVariance: false },
      stepCountVariance: { min: 3, max: 3, stdDev: 0, isHighVariance: false },
      sequenceStability: 1.0,
      highVarianceSteps: [],
      evidenceRunIds: [],
    };

    const metrics: ProcessMetrics = {
      runCount: 10, completedRunCount: 10, completionRate: 1, errorStepFrequency: 0,
      navigationStepFrequency: 1, medianDurationMs: 60000, meanDurationMs: 60000,
      p90DurationMs: 65000, minDurationMs: 55000, maxDurationMs: 65000,
      medianStepCount: 3, meanStepCount: 3, uniqueSystems: ['A'],
      evidenceRunIds: [], ruleVersion: '1.0.0', computedAt: new Date().toISOString(),
    };

    const result = computeStandardizationScore(variants, variance, metrics);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe('excellent');
    expect(result.factors.dominantPathAdherence).toBe(1);
    expect(result.factors.sequenceStability).toBe(1);
  });

  it('should score poorly standardized process', () => {
    const variants: VariantSet = {
      ruleVersion: '1.0.0', runCount: 10, computedAt: new Date().toISOString(),
      variantCount: 5,
      standardPath: {
        variantId: 'v1', pathSignature: { signature: 'a', stepCategories: ['a'], stepCount: 1 },
        runCount: 3, frequency: 0.3, isStandardPath: true, similarityToStandard: 1.0, evidenceRunIds: [],
      },
      variants: [], variantSimilarityThreshold: 0.75, evidenceRunIds: [],
    };

    const variance: VarianceReport = {
      ruleVersion: '1.0.0', runCount: 10, computedAt: new Date().toISOString(),
      durationVariance: { stdDevMs: 30000, coefficientOfVariation: 0.8, isHighVariance: true },
      stepCountVariance: { min: 2, max: 12, stdDev: 4, isHighVariance: true },
      sequenceStability: 0.3,
      highVarianceSteps: [], evidenceRunIds: [],
    };

    const metrics: ProcessMetrics = {
      runCount: 10, completedRunCount: 8, completionRate: 0.8, errorStepFrequency: 0.5,
      navigationStepFrequency: 3, medianDurationMs: 120000, meanDurationMs: 120000,
      p90DurationMs: 200000, minDurationMs: 30000, maxDurationMs: 300000,
      medianStepCount: 6, meanStepCount: 7, uniqueSystems: ['A', 'B', 'C'],
      evidenceRunIds: [], ruleVersion: '1.0.0', computedAt: new Date().toISOString(),
    };

    const result = computeStandardizationScore(variants, variance, metrics);

    expect(result.score).toBeLessThan(40);
    expect(result.level).toBe('poor');
  });
});

// ─── Documentation Drift Tests ──────────────────────────────────────────────

describe('Documentation Drift Score', () => {
  it('should report aligned when SOP matches well', () => {
    const result = computeDocumentationDriftScore({
      alignmentScore: 0.9,
      alignmentLevel: 'high',
      undocumentedSteps: [],
      unusedDocumentedSteps: [],
      structuralSimilarity: 0.95,
      alignedRunCount: 9,
      totalRunCount: 10,
      driftIndicators: [],
      evidenceRunIds: [],
      computedAt: new Date().toISOString(),
    });

    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.level).toBe('aligned');
  });

  it('should report outdated when SOP is significantly drifted', () => {
    const result = computeDocumentationDriftScore({
      alignmentScore: 0.2,
      alignmentLevel: 'critical',
      undocumentedSteps: [
        { category: 'data_entry', frequency: 0.9, runCount: 9, typicalPosition: 3 },
        { category: 'error_handling', frequency: 0.7, runCount: 7, typicalPosition: 5 },
      ],
      unusedDocumentedSteps: [
        { sopOrdinal: 2, sopTitle: 'Approval', sopCategory: 'annotation' },
      ],
      structuralSimilarity: 0.3,
      alignedRunCount: 1,
      totalRunCount: 10,
      driftIndicators: [
        { type: 'extra_step', severity: 'high', description: 'test', frequency: 0.9 },
      ],
      evidenceRunIds: [],
      computedAt: new Date().toISOString(),
    });

    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.level).toBe('outdated');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('should handle null SOP alignment', () => {
    const result = computeDocumentationDriftScore(null);
    expect(result.score).toBe(0);
    expect(result.level).toBe('aligned');
  });
});

// ─── Outlier Detection Tests ────────────────────────────────────────────────

describe('Outlier Detection', () => {
  it('should detect outlier runs', () => {
    const standardCats = ['click_then_navigate', 'data_entry', 'fill_and_submit', 'send_action'];
    const outlierCats = ['error_handling', 'annotation', 'file_action'];

    const runs = [
      makeBundle('run-1', standardCats),
      makeBundle('run-2', standardCats),
      makeBundle('run-3', standardCats),
      makeBundle('outlier', outlierCats), // Very different
    ];

    const variants = makeVariantSet(runs, standardCats);
    const outliers = detectOutlierRuns(runs, variants);

    expect(outliers.length).toBeGreaterThan(0);
    expect(outliers[0]!.runId).toBe('outlier');
    expect(outliers[0]!.bestVariantSimilarity).toBeLessThan(0.5);
  });

  it('should return empty for consistent runs', () => {
    const cats = ['click_then_navigate', 'data_entry', 'send_action'];
    const runs = [
      makeBundle('run-1', cats),
      makeBundle('run-2', cats),
      makeBundle('run-3', cats),
    ];

    const variants = makeVariantSet(runs, cats);
    const outliers = detectOutlierRuns(runs, variants);

    expect(outliers).toHaveLength(0);
  });
});

// ─── Recommended Canonical Path Tests ───────────────────────────────────────

describe('Recommended Canonical Path', () => {
  it('should derive path from dominant variant', () => {
    const cats = ['click_then_navigate', 'data_entry', 'fill_and_submit'];
    const runs = [
      makeBundle('run-1', cats),
      makeBundle('run-2', cats),
    ];

    const variants = makeVariantSet(runs, cats);
    const result = deriveRecommendedCanonicalPath(runs, variants);

    expect(result).not.toBeNull();
    expect(result!.stepCategories).toEqual(cats);
    expect(result!.frequency).toBeGreaterThan(0);
    expect(result!.rationale).toContain('%');
  });

  it('should return null when no standard path', () => {
    const variants: VariantSet = {
      ruleVersion: '1.0.0', runCount: 0, computedAt: '', variantCount: 0,
      standardPath: null, variants: [], variantSimilarityThreshold: 0.75, evidenceRunIds: [],
    };
    expect(deriveRecommendedCanonicalPath([], variants)).toBeNull();
  });
});
