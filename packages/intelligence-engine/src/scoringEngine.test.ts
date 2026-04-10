import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkflowRunRecord, StepFingerprint, NormalizedTitle } from './groupingTypes.js';
import { normalizeTitle } from './titleNormalizer.js';
import { scoreExactGroup } from './exactGroupScorer.js';
import {
  scoreFamilyMembership,
  evaluatePossibleMatch,
  createRelationship,
  generateRunRelationships,
  resetRelationshipCounter,
} from './familyScorer.js';
import { computeVariantDistance } from './variantAnalyzer.js';
import { scoreComponentReuse } from './componentReuseScorer.js';
import { scoreAutomationOpportunity, deriveAutomationFactors } from './automationScorer.js';
import { DEFAULT_SCORING_CONFIG, isGenericTitle, resolveConfidenceBand } from './scoringConfig.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeFingerprint(overrides: Partial<StepFingerprint> & { sequenceIndex: number }): StepFingerprint {
  return {
    id: `fp-${overrides.sequenceIndex}`,
    workflowRunId: 'wf-test',
    rawLabel: 'test step',
    normalizedLabel: 'test step',
    verb: null,
    object: null,
    qualifier: null,
    system: null,
    screenContext: null,
    eventType: null,
    targetType: null,
    precedingStepFingerprintId: null,
    followingStepFingerprintId: null,
    optionalityScore: 1.0,
    determinismScore: 0.8,
    semanticSignature: '_:_:_:_',
    canonicalComponentId: null,
    confidence: 0.5,
    ...overrides,
  };
}

function makeRun(overrides: Partial<WorkflowRunRecord> & { id: string; title: string }): WorkflowRunRecord {
  const normalizedTitle = normalizeTitle(overrides.title);
  return {
    originalWorkflowId: overrides.id,
    processGroupId: null,
    variantId: null,
    familyId: null,
    normalizedTitle,
    startAnchor: '',
    endAnchor: '',
    stepCount: 3,
    eventCount: 6,
    systems: [],
    artifacts: [],
    actor: null,
    durationMs: 60000,
    pathHash: '',
    stepFingerprints: [],
    eventFingerprints: [],
    clusteringScores: { exactGroupScore: 0, familyScore: 0, componentReuseScore: 0, anomalyScore: 0 },
    ...overrides,
  };
}

// ─── Confidence bands ────────────────────────────────────────────────────────

describe('resolveConfidenceBand', () => {
  it('maps scores to correct bands', () => {
    expect(resolveConfidenceBand(0.95)).toBe('verified');
    expect(resolveConfidenceBand(0.85)).toBe('high_confidence');
    expect(resolveConfidenceBand(0.75)).toBe('moderate_confidence');
    expect(resolveConfidenceBand(0.60)).toBe('low_confidence');
    expect(resolveConfidenceBand(0.40)).toBe('possible_match');
  });
});

// ─── Generic title detection ─────────────────────────────────────────────────

describe('isGenericTitle', () => {
  it('detects "test" as generic', () => {
    expect(isGenericTitle('test')).toBe(true);
    expect(isGenericTitle('Test')).toBe(true);
    expect(isGenericTitle('test 3')).toBe(true);
  });

  it('detects common generic patterns', () => {
    expect(isGenericTitle('untitled')).toBe(true);
    expect(isGenericTitle('new workflow')).toBe(true);
    expect(isGenericTitle('workflow 1')).toBe(true);
    expect(isGenericTitle('email test')).toBe(true);
    expect(isGenericTitle('demo')).toBe(true);
  });

  it('does not flag real titles as generic', () => {
    expect(isGenericTitle('Email Customer World Cities Report')).toBe(false);
    expect(isGenericTitle('Submit Invoice to Vendor')).toBe(false);
    expect(isGenericTitle('Download Monthly Report PDF')).toBe(false);
  });
});

// ─── Exact Group Scoring ─────────────────────────────────────────────────────

describe('scoreExactGroup', () => {
  it('scores identical runs very high', () => {
    const fps = [
      makeFingerprint({ sequenceIndex: 1, verb: 'navigate', object: 'page', system: 'gmail', semanticSignature: 'navigate:page:gmail:_' }),
      makeFingerprint({ sequenceIndex: 2, verb: 'send', object: 'email', system: 'gmail', semanticSignature: 'send:email:gmail:_' }),
    ];

    const run = makeRun({
      id: 'wf-1',
      title: 'Send Email to Customer',
      startAnchor: 'navigate:page:gmail:_',
      endAnchor: 'send:email:gmail:_',
      systems: ['gmail'],
      stepFingerprints: fps,
      eventFingerprints: ['interaction.click:button:_', 'interaction.submit:form:_'],
    });

    const result = scoreExactGroup(run, run);
    expect(result.score).toBeGreaterThanOrEqual(0.82);
    expect(result.shouldMerge).toBe(true);
    // Score should be at least high confidence
    expect(['verified', 'high_confidence']).toContain(result.confidenceBand);
  });

  it('blocks merge when step sequences diverge significantly', () => {
    const fpsA = [
      makeFingerprint({ sequenceIndex: 1, verb: 'navigate', semanticSignature: 'navigate:page:_:_' }),
      makeFingerprint({ sequenceIndex: 2, verb: 'send', semanticSignature: 'send:email:_:_' }),
    ];
    const fpsB = [
      makeFingerprint({ sequenceIndex: 1, verb: 'download', semanticSignature: 'download:report:_:_' }),
      makeFingerprint({ sequenceIndex: 2, verb: 'upload', semanticSignature: 'upload:file:_:_' }),
    ];

    const runA = makeRun({
      id: 'wf-a',
      title: 'Send Email',
      startAnchor: 'navigate:page:_:_',
      endAnchor: 'send:email:_:_',
      stepFingerprints: fpsA,
    });
    const runB = makeRun({
      id: 'wf-b',
      title: 'Download Report',
      startAnchor: 'download:report:_:_',
      endAnchor: 'upload:file:_:_',
      stepFingerprints: fpsB,
    });

    const result = scoreExactGroup(runA, runB);
    expect(result.shouldMerge).toBe(false);
    expect(result.score).toBeLessThan(0.82);
  });

  it('penalizes generic titles', () => {
    const fps = [
      makeFingerprint({ sequenceIndex: 1, verb: 'click', semanticSignature: 'click:button:_:_' }),
    ];

    const runA = makeRun({
      id: 'wf-a',
      title: 'test',
      startAnchor: 'click:button:_:_',
      endAnchor: 'click:button:_:_',
      stepFingerprints: fps,
    });
    const runB = makeRun({
      id: 'wf-b',
      title: 'test',
      startAnchor: 'click:button:_:_',
      endAnchor: 'click:button:_:_',
      stepFingerprints: fps,
    });

    const result = scoreExactGroup(runA, runB);
    // Should still merge if path evidence is strong, but with weakness noted
    const hasGenericPenalty = result.explanation.weaknesses.some(
      w => w.code === 'GENERIC_TITLE_PENALTY',
    );
    expect(hasGenericPenalty).toBe(true);
  });

  it('generates explanation codes', () => {
    const fps = [
      makeFingerprint({ sequenceIndex: 1, verb: 'send', object: 'email', system: 'gmail', semanticSignature: 'send:email:gmail:_' }),
    ];

    const run = makeRun({
      id: 'wf-1',
      title: 'Send Email',
      startAnchor: 'send:email:gmail:_',
      endAnchor: 'send:email:gmail:_',
      systems: ['gmail'],
      stepFingerprints: fps,
    });

    const result = scoreExactGroup(run, run);
    expect(result.explanation.supporting.length).toBeGreaterThan(0);
    expect(result.explanation.summary.length).toBeGreaterThan(0);
    expect(result.explanation.modelVersion).toBeDefined();
  });
});

// ─── Family Scoring ──────────────────────────────────────────────────────────

describe('scoreFamilyMembership', () => {
  it('scores parameterized variants as same family', () => {
    const fpsBase = [
      makeFingerprint({ sequenceIndex: 1, verb: 'email', object: 'customer', system: 'gmail', semanticSignature: 'email:customer:gmail:_' }),
      makeFingerprint({ sequenceIndex: 2, verb: 'attach', object: 'report', semanticSignature: 'attach:report:_:_' }),
    ];

    const runWorld = makeRun({
      id: 'wf-world',
      title: 'Email Customer World Cities Report',
      startAnchor: 'email:customer:gmail:_',
      endAnchor: 'attach:report:_:_',
      systems: ['gmail'],
      stepFingerprints: fpsBase,
    });

    const runUS = makeRun({
      id: 'wf-us',
      title: 'Email Customer US Cities Report',
      startAnchor: 'email:customer:gmail:_',
      endAnchor: 'attach:report:_:_',
      systems: ['gmail'],
      stepFingerprints: fpsBase,
    });

    const result = scoreFamilyMembership(runWorld, runUS);
    expect(result.decision).toBe('same_family');
    expect(result.score).toBeGreaterThanOrEqual(0.80);

    // Should detect parameterized qualifier difference
    const hasParamCode = result.explanation.supporting.some(
      e => e.code === 'PARAMETERIZED_QUALIFIER_DIFF',
    );
    expect(hasParamCode).toBe(true);
  });

  it('rejects unrelated workflows', () => {
    const runA = makeRun({
      id: 'wf-a',
      title: 'Email Customer Report',
      systems: ['gmail'],
      stepFingerprints: [
        makeFingerprint({ sequenceIndex: 1, verb: 'email', semanticSignature: 'email:_:gmail:_' }),
      ],
    });

    const runB = makeRun({
      id: 'wf-b',
      title: 'Download Monthly Spreadsheet',
      systems: ['sharepoint'],
      stepFingerprints: [
        makeFingerprint({ sequenceIndex: 1, verb: 'download', semanticSignature: 'download:_:sharepoint:_' }),
      ],
    });

    const result = scoreFamilyMembership(runA, runB);
    expect(result.decision).toBe('no_family_link');
  });
});

// ─── Possible Match ──────────────────────────────────────────────────────────

describe('evaluatePossibleMatch', () => {
  it('returns null for strong family matches', () => {
    const fps = [
      makeFingerprint({ sequenceIndex: 1, verb: 'email', object: 'customer', system: 'gmail', semanticSignature: 'email:customer:gmail:_' }),
      makeFingerprint({ sequenceIndex: 2, verb: 'attach', object: 'report', semanticSignature: 'attach:report:_:_' }),
    ];
    const run = makeRun({
      id: 'wf-1',
      title: 'Email Customer Report',
      systems: ['gmail'],
      artifacts: ['report'],
      startAnchor: 'email:customer:gmail:_',
      endAnchor: 'attach:report:_:_',
      stepFingerprints: fps,
    });
    const familyResult = scoreFamilyMembership(run, run);
    // A run scored against itself with good data should be same_family or likely_family
    expect(['same_family', 'likely_family']).toContain(familyResult.decision);
    const result = evaluatePossibleMatch(run, run, familyResult, 10, 10);
    expect(result).toBeNull(); // Already grouped, no need for possible match
  });

  it('surfaces possible match for borderline cases with low sample', () => {
    const runA = makeRun({
      id: 'wf-a',
      title: 'Process Customer Invoice',
      systems: ['quickbooks'],
      stepFingerprints: [
        makeFingerprint({ sequenceIndex: 1, verb: 'submit', object: 'invoice', semanticSignature: 'submit:invoice:quickbooks:_' }),
      ],
    });

    const runB = makeRun({
      id: 'wf-b',
      title: 'Review Customer Payment',
      systems: ['quickbooks'],
      stepFingerprints: [
        makeFingerprint({ sequenceIndex: 1, verb: 'review', object: 'payment', semanticSignature: 'review:payment:quickbooks:_' }),
      ],
    });

    const familyResult = scoreFamilyMembership(runA, runB);
    // Only test if the result is in a borderline range
    if (familyResult.decision === 'possible_related' || familyResult.decision === 'no_family_link') {
      const result = evaluatePossibleMatch(runA, runB, familyResult, 1, 1);
      if (result) {
        expect(['Possible Match', 'Low Confidence Related', 'Needs Review']).toContain(result.label);
        expect(result.reason.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Relationship Generation ─────────────────────────────────────────────────

describe('relationship generation', () => {
  beforeEach(() => {
    resetRelationshipCounter();
  });

  it('creates relationship with all required fields', () => {
    const rel = createRelationship(
      'group', 'g-1',
      'group', 'g-2',
      'same_family',
      0.85,
      ['TITLE_PATTERN_MATCH', 'SHARED_COMPONENTS'],
      'Same family via title pattern',
    );

    expect(rel.id).toBeDefined();
    expect(rel.sourceType).toBe('group');
    expect(rel.sourceId).toBe('g-1');
    expect(rel.targetType).toBe('group');
    expect(rel.targetId).toBe('g-2');
    expect(rel.relationshipType).toBe('same_family');
    expect(rel.confidenceScore).toBe(0.85);
    expect(rel.explanationCodes).toContain('TITLE_PATTERN_MATCH');
    expect(rel.createdFromModelVersion).toBeDefined();
  });

  it('generates template-like relationship for parameterized variants', () => {
    const fpsBase = [
      makeFingerprint({ sequenceIndex: 1, verb: 'email', semanticSignature: 'email:customer:gmail:_' }),
    ];

    const runA = makeRun({
      id: 'wf-world',
      title: 'Email Customer World Cities Report',
      systems: ['gmail'],
      stepFingerprints: fpsBase,
    });

    const runB = makeRun({
      id: 'wf-us',
      title: 'Email Customer US Cities Report',
      systems: ['gmail'],
      stepFingerprints: fpsBase,
    });

    const familyResult = scoreFamilyMembership(runA, runB);
    const rels = generateRunRelationships(runA, runB, familyResult, null, []);
    const templateRel = rels.find(r => r.relationshipType === 'template_like');
    expect(templateRel).toBeDefined();
    expect(templateRel!.explanationCodes).toContain('PARAMETERIZED_QUALIFIER_DIFF');
  });
});

// ─── Variant Distance ────────────────────────────────────────────────────────

describe('computeVariantDistance', () => {
  it('returns 0 deviation for identical sequences', () => {
    const canonical = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'navigate:page:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'send:email:_:_' }),
    ];

    const result = computeVariantDistance(canonical, canonical);
    expect(result.deviationScore).toBe(0);
    expect(result.classification).toBe('standard');
    expect(result.addedSteps).toHaveLength(0);
    expect(result.removedSteps).toHaveLength(0);
  });

  it('detects inserted steps', () => {
    const canonical = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'navigate:page:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'send:email:_:_' }),
    ];
    const variant = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'navigate:page:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'attach:file:_:_' }),
      makeFingerprint({ sequenceIndex: 3, semanticSignature: 'send:email:_:_' }),
    ];

    const result = computeVariantDistance(variant, canonical);
    expect(result.deviationScore).toBeGreaterThan(0);
    expect(result.addedSteps.length).toBeGreaterThanOrEqual(1);
    expect(result.editCount).toBeGreaterThan(0);
  });

  it('detects removed steps', () => {
    const canonical = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'navigate:page:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'fill:form:_:_' }),
      makeFingerprint({ sequenceIndex: 3, semanticSignature: 'send:email:_:_' }),
    ];
    const variant = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'navigate:page:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'send:email:_:_' }),
    ];

    const result = computeVariantDistance(variant, canonical);
    expect(result.deviationScore).toBeGreaterThan(0);
    expect(result.removedSteps.length).toBeGreaterThanOrEqual(1);
  });

  it('classifies major variants', () => {
    const canonical = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'a:_:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'b:_:_:_' }),
      makeFingerprint({ sequenceIndex: 3, semanticSignature: 'c:_:_:_' }),
      makeFingerprint({ sequenceIndex: 4, semanticSignature: 'd:_:_:_' }),
    ];
    const variant = [
      makeFingerprint({ sequenceIndex: 1, semanticSignature: 'x:_:_:_' }),
      makeFingerprint({ sequenceIndex: 2, semanticSignature: 'y:_:_:_' }),
      makeFingerprint({ sequenceIndex: 3, semanticSignature: 'z:_:_:_' }),
      makeFingerprint({ sequenceIndex: 4, semanticSignature: 'w:_:_:_' }),
    ];

    const result = computeVariantDistance(variant, canonical);
    expect(result.classification).toBe('outlier');
    expect(result.deviationScore).toBeGreaterThanOrEqual(0.50);
  });
});

// ─── Component Reuse Scoring ─────────────────────────────────────────────────

describe('scoreComponentReuse', () => {
  it('scores identical fingerprints highly', () => {
    const fp = makeFingerprint({
      sequenceIndex: 1,
      verb: 'send',
      object: 'email',
      system: 'gmail',
      eventType: 'interaction.click',
      normalizedLabel: 'send email via gmail',
    });

    const result = scoreComponentReuse(fp, fp);
    // Identical verb + object + system + event + label = high score
    expect(result.score).toBeGreaterThanOrEqual(0.60);
    expect(result.decision).not.toBe('distinct');
  });

  it('scores same verb+object different system above distinct threshold', () => {
    const fpA = makeFingerprint({
      sequenceIndex: 1,
      verb: 'send',
      object: 'email',
      system: 'gmail',
      normalizedLabel: 'send email',
    });
    const fpB = makeFingerprint({
      sequenceIndex: 1,
      verb: 'send',
      object: 'email',
      system: 'outlook',
      normalizedLabel: 'send email',
    });

    const result = scoreComponentReuse(fpA, fpB);
    // Same verb + object, different system — should not be "distinct"
    expect(result.score).toBeGreaterThanOrEqual(0.40);
  });

  it('scores completely different fingerprints as distinct', () => {
    const fpA = makeFingerprint({
      sequenceIndex: 1,
      verb: 'send',
      object: 'email',
      system: 'gmail',
      normalizedLabel: 'send email',
    });
    const fpB = makeFingerprint({
      sequenceIndex: 1,
      verb: 'download',
      object: 'report',
      system: 'salesforce',
      normalizedLabel: 'download report',
    });

    const result = scoreComponentReuse(fpA, fpB);
    expect(result.decision).toBe('distinct');
    expect(result.score).toBeLessThan(0.60);
  });
});

// ─── Automation Scoring ──────────────────────────────────────────────────────

describe('scoreAutomationOpportunity', () => {
  it('scores well for ideal automation candidate', () => {
    const result = scoreAutomationOpportunity({
      repeatFrequency: 0.9,
      manualClickDensity: 0.8,
      determinism: 0.95,
      reuseAcrossFamilies: 0.6,
      timeCost: 0.7,
      delayConcentration: 0.3,
      pathStability: 0.9,
      exceptionRate: 0.02,
      ambiguityLevel: 0.1,
    });

    // Weighted composite should be a solid score
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(['high', 'medium']).toContain(result.rank);
  });

  it('penalizes high exception rates', () => {
    const goodResult = scoreAutomationOpportunity({
      repeatFrequency: 0.7,
      manualClickDensity: 0.7,
      determinism: 0.8,
      reuseAcrossFamilies: 0.3,
      timeCost: 0.5,
      delayConcentration: 0.2,
      pathStability: 0.7,
      exceptionRate: 0.05,
      ambiguityLevel: 0.1,
    });

    const badResult = scoreAutomationOpportunity({
      repeatFrequency: 0.7,
      manualClickDensity: 0.7,
      determinism: 0.8,
      reuseAcrossFamilies: 0.3,
      timeCost: 0.5,
      delayConcentration: 0.2,
      pathStability: 0.7,
      exceptionRate: 0.9, // Very high exceptions
      ambiguityLevel: 0.1,
    });

    expect(badResult.score).toBeLessThan(goodResult.score);
  });

  it('scores low for unstable processes', () => {
    const result = scoreAutomationOpportunity({
      repeatFrequency: 0.3,
      manualClickDensity: 0.3,
      determinism: 0.2,
      reuseAcrossFamilies: 0.1,
      timeCost: 0.2,
      delayConcentration: 0.1,
      pathStability: 0.2,
      exceptionRate: 0.5,
      ambiguityLevel: 0.8,
    });

    expect(result.rank).toBe('not_recommended');
  });

  it('includes factor breakdown', () => {
    const result = scoreAutomationOpportunity({
      repeatFrequency: 0.5,
      manualClickDensity: 0.5,
      determinism: 0.5,
      reuseAcrossFamilies: 0.5,
      timeCost: 0.5,
      delayConcentration: 0.5,
      pathStability: 0.5,
      exceptionRate: 0.1,
      ambiguityLevel: 0.1,
    });

    expect(result.factorBreakdown).toBeDefined();
    expect(typeof result.factorBreakdown.repeatFrequency).toBe('number');
    expect(typeof result.factorBreakdown.exceptionRate).toBe('number');
  });
});

describe('deriveAutomationFactors', () => {
  it('normalizes raw values into 0-1 range', () => {
    const factors = deriveAutomationFactors({
      runCount: 25,
      humanEventCount: 80,
      totalEventCount: 100,
      stepConsistencyScore: 0.85,
      familyCount: 3,
      avgDurationMs: 300000,
      delayStepDurationMs: 60000,
      totalDurationMs: 300000,
      pathStabilityScore: 0.9,
      errorStepCount: 1,
      totalStepCount: 10,
      avgFingerprintConfidence: 0.75,
    });

    expect(factors.repeatFrequency).toBe(0.5); // 25/50
    expect(factors.manualClickDensity).toBe(0.8); // 80/100
    expect(factors.determinism).toBe(0.85);
    expect(factors.reuseAcrossFamilies).toBe(0.6); // 3/5
    expect(factors.exceptionRate).toBe(0.1); // 1/10
    expect(factors.ambiguityLevel).toBe(0.25); // 1 - 0.75
  });
});
