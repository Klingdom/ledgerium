import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { checkBundleEvidenceIntegrity, type EvidenceIntegrityInput } from './bundle-evidence-integrity';
import { buildSampleBundle } from './sample-workflow';
import { buildSampleVariantBundles } from './sample-variants';

const CLEAN = { ok: true, unresolvedSourceRefs: 0, duplicateEventIds: 0, sessionIdMismatches: 0 } as const;

function good(): EvidenceIntegrityInput {
  return {
    sessionJson: { sessionId: 's1' },
    normalizedEvents: [
      { event_id: 'e1', session_id: 's1' },
      { event_id: 'e2', session_id: 's1' },
      { event_id: 'e3', session_id: 's1' },
    ],
    derivedSteps: [
      { session_id: 's1', source_event_ids: ['e1', 'e2'] },
      { session_id: 's1', source_event_ids: ['e3'] },
    ],
    manifest: { sessionId: 's1' },
  };
}

describe('checkBundleEvidenceIntegrity (row #10)', () => {
  it('accepts a bundle whose step evidence resolves', () => {
    expect(checkBundleEvidenceIntegrity(good())).toMatchObject(CLEAN);
  });

  it('accepts an empty bundle (no events, no steps)', () => {
    expect(
      checkBundleEvidenceIntegrity({ sessionJson: { sessionId: 's1' }, normalizedEvents: [], derivedSteps: [] }),
    ).toMatchObject(CLEAN);
  });

  it('accepts a bundle with no manifest', () => {
    const b = good();
    delete b.manifest;
    expect(checkBundleEvidenceIntegrity(b)).toMatchObject(CLEAN);
  });

  it('counts source_event_ids that resolve to no event', () => {
    const b = good();
    b.derivedSteps = [{ session_id: 's1', source_event_ids: ['e1', 'ghost-1', 'ghost-2'] }];
    expect(checkBundleEvidenceIntegrity(b)).toEqual({
      ok: false, unresolvedSourceRefs: 2, duplicateEventIds: 0, sessionIdMismatches: 0,
    });
  });

  it('counts repeated event ids', () => {
    const b = good();
    b.normalizedEvents = [...b.normalizedEvents, { event_id: 'e1', session_id: 's1' }, { event_id: 'e1', session_id: 's1' }];
    expect(checkBundleEvidenceIntegrity(b)).toEqual({
      ok: false, unresolvedSourceRefs: 0, duplicateEventIds: 2, sessionIdMismatches: 0,
    });
  });

  it('counts session id disagreement across events, steps and manifest — and ACCEPTS (MR-044)', () => {
    const b = good();
    b.normalizedEvents = [{ event_id: 'e1', session_id: 'other' }, ...b.normalizedEvents.slice(1)];
    b.derivedSteps = [b.derivedSteps[0]!, { session_id: 'other', source_event_ids: ['e3'] }];
    b.manifest = { sessionId: 'other' };
    expect(checkBundleEvidenceIntegrity(b)).toEqual({
      ok: true, unresolvedSourceRefs: 0, duplicateEventIds: 0, sessionIdMismatches: 3,
    });
  });

  it('reports all three classes together', () => {
    const b = good();
    b.normalizedEvents = [...b.normalizedEvents, { event_id: 'e2', session_id: 'x' }];
    b.derivedSteps = [...b.derivedSteps, { session_id: 's1', source_event_ids: ['nope'] }];
    expect(checkBundleEvidenceIntegrity(b)).toEqual({
      ok: false, unresolvedSourceRefs: 1, duplicateEventIds: 1, sessionIdMismatches: 1,
    });
  });

  it('a step with no source_event_ids cites no evidence and is rejected (row #269 (4))', () => {
    const b = good();
    b.derivedSteps = [...b.derivedSteps, { session_id: 's1', source_event_ids: [] }];
    expect(checkBundleEvidenceIntegrity(b)).toMatchObject({ ok: false, unresolvedSourceRefs: 1 });
  });

  it('truncation does not exempt: a truncated-session bundle with dangling refs is still rejected', () => {
    // sessionJson.persistenceTruncated is the recorder's quota flag. Real
    // truncated bundles are self-consistent (steps are derived from the same
    // truncated array), so the flag grants no leniency.
    const b = { ...good(), sessionJson: { sessionId: 's1', persistenceTruncated: true } };
    b.derivedSteps = [{ session_id: 's1', source_event_ids: ['lost-event'] }];
    expect(checkBundleEvidenceIntegrity(b)).toMatchObject({ ok: false, unresolvedSourceRefs: 1 });
  });

  it('a truncated session whose steps cite only the retained events passes', () => {
    const b = { ...good(), sessionJson: { sessionId: 's1', persistenceTruncated: true } };
    b.normalizedEvents = b.normalizedEvents.slice(0, 1);
    b.derivedSteps = [{ session_id: 's1', source_event_ids: ['e1'] }];
    expect(checkBundleEvidenceIntegrity(b)).toMatchObject(CLEAN);
  });

  it('is deterministic and does not mutate its input', () => {
    const b = good();
    b.derivedSteps = [{ session_id: 's1', source_event_ids: ['ghost'] }];
    const snapshot = JSON.stringify(b);
    const r1 = checkBundleEvidenceIntegrity(b);
    const r2 = checkBundleEvidenceIntegrity(b);
    expect(r1).toEqual(r2);
    expect(JSON.stringify(b)).toBe(snapshot);
  });

  it('result carries counts only: no ids from the bundle', () => {
    const b = good();
    b.derivedSteps = [{ session_id: 's1', source_event_ids: ['SECRET-ID'] }];
    b.normalizedEvents = [...b.normalizedEvents, { event_id: 'e1', session_id: 'SECRET-SESSION' }];
    expect(JSON.stringify(checkBundleEvidenceIntegrity(b))).not.toMatch(/SECRET/);
  });
});

// Every legitimate producer must satisfy the checks.

describe('legitimate producers satisfy all three checks', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');

  it('server-side sample bundle', () => {
    expect(checkBundleEvidenceIntegrity(buildSampleBundle() as unknown as EvidenceIntegrityInput)).toMatchObject(CLEAN);
  });

  it('server-side sample variant bundles (all)', () => {
    const bundles = buildSampleVariantBundles();
    expect(bundles.length).toBeGreaterThan(0);
    for (const b of bundles) {
      expect(checkBundleEvidenceIntegrity(b as unknown as EvidenceIntegrityInput)).toMatchObject(CLEAN);
    }
  });

  const bundleFiles = [
    'apps/web-app/fixtures/test-fixture.json',
    ...fs.readdirSync(path.join(repoRoot, 'fixtures/workflows')).filter((f) => f.endsWith('.json')).map((f) => `fixtures/workflows/${f}`),
    ...fs
      .readdirSync(path.join(repoRoot, 'packages/process-engine/fixtures/vagueness-golden'))
      .map((f) => `packages/process-engine/fixtures/vagueness-golden/${f}`),
  ];

  it.each(bundleFiles)('fixture bundle %s', (rel) => {
    const raw = JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
    // Fixtures wrap the bundle in different envelopes; locate the object.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const find = (o: any, d = 0): any =>
      o && typeof o === 'object' && d < 4
        ? Array.isArray(o.normalizedEvents) && Array.isArray(o.derivedSteps)
          ? o
          : Object.values(o).map((v) => find(v, d + 1)).find(Boolean)
        : undefined;
    const bundle = find(raw);
    expect(bundle).toBeDefined();
    const input: EvidenceIntegrityInput = {
      sessionJson: { sessionId: bundle.sessionJson?.sessionId ?? bundle.normalizedEvents[0]?.session_id ?? 'none' },
      normalizedEvents: bundle.normalizedEvents,
      derivedSteps: bundle.derivedSteps,
      manifest: bundle.manifest,
    };
    expect(checkBundleEvidenceIntegrity(input)).toMatchObject(CLEAN);
  });

  it('segmentation + normalization golden event/step pairs', () => {
    const seg = path.join(repoRoot, 'packages/segmentation-engine/fixtures');
    const norm = path.join(repoRoot, 'packages/normalization-engine/fixtures/golden');
    const pairs: Array<[string, string]> = [
      ...fs.readdirSync(path.join(seg, 'golden')).map((f): [string, string] => [path.join(seg, 'golden', f), path.join(seg, 'expected/derived', f)]),
      ...fs.readdirSync(path.join(norm, 'normalized')).map((f): [string, string] => [path.join(norm, 'normalized', f), path.join(norm, 'pipeline-segmentation', f)]),
    ];
    expect(pairs.length).toBe(16);
    for (const [ev, st] of pairs) {
      const events = JSON.parse(fs.readFileSync(ev, 'utf8'));
      const steps = JSON.parse(fs.readFileSync(st, 'utf8'));
      const sid = events[0]?.session_id ?? 'none';
      expect(
        checkBundleEvidenceIntegrity({ sessionJson: { sessionId: sid }, normalizedEvents: events, derivedSteps: steps }),
        ev,
      ).toMatchObject(CLEAN);
    }
  });
});
