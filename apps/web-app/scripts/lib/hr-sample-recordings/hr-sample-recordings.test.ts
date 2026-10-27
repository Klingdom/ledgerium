/**
 * The HR sample recordings in docs/samples/hr-recordings are only useful if
 * they behave like real extension exports. Every committed file is checked:
 *
 *  - it is exactly what the generator produces now (no hand edits, no drift
 *    after a normalizer or segmenter rule change);
 *  - the upload route would accept it: shape (validateBundle) and evidence
 *    integrity (every step cites events that exist, no duplicate ids);
 *  - the process engine turns it into a workflow with steps and an SOP;
 *  - fields the policy rules call sensitive are redacted, and no field label
 *    in any file names a government id.
 *
 * Limits: the samples are synthetic, so this proves they run through the real
 * pipeline, not that they match how any particular vendor's screens behave.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validateBundle, runProcessEngine } from '@/lib/ingestion';
import { checkBundleEvidenceIntegrity } from '@/lib/bundle-evidence-integrity';
import { renderHrSampleFiles, buildHrSampleBundles } from './render-files';
import { HR_SAMPLE_SCRIPTS } from './hr-catalog';
import { buildSampleBundle } from './build-recording';

const SAMPLES_DIR = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'samples', 'hr-recordings');
const rendered = renderHrSampleFiles();
const bundles = buildHrSampleBundles();

describe('HR sample recordings: committed files', () => {
  it('the directory holds exactly the generated files', () => {
    const committed = fs.readdirSync(SAMPLES_DIR).sort();
    expect(committed).toEqual(Object.keys(rendered).sort());
  });

  it.each(Object.keys(rendered))('%s matches the generator byte for byte', (name) => {
    const committed = fs.readFileSync(path.join(SAMPLES_DIR, name), 'utf-8');
    expect(committed, `${name} drifted; run pnpm --filter @ledgerium/web-app samples:hr`).toBe(rendered[name]);
  });
});

describe('HR sample recordings: catalog', () => {
  it('slugs are unique, so no file overwrites another', () => {
    const slugs = HR_SAMPLE_SCRIPTS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('building a script twice gives the same bundle', () => {
    for (const script of HR_SAMPLE_SCRIPTS) {
      const start = Date.UTC(2026, 0, 5);
      expect(JSON.stringify(buildSampleBundle(script, start))).toBe(JSON.stringify(buildSampleBundle(script, start)));
    }
  });
});

describe.each(bundles.map((b) => [b.slug, b.bundle] as const))('HR sample %s', (_slug, bundle) => {
  it('passes upload shape validation', () => {
    const result = validateBundle(JSON.parse(JSON.stringify(bundle)));
    expect(result.valid ? [] : result.errors).toEqual([]);
  });

  it('passes the evidence-integrity check with zero findings', () => {
    expect(checkBundleEvidenceIntegrity(bundle)).toEqual({
      ok: true,
      unresolvedSourceRefs: 0,
      duplicateEventIds: 0,
      sessionIdMismatches: 0,
    });
  });

  // The segmenter leaves out system events (toasts, modals, redactions) and
  // route changes ("a transition signal, not a user action",
  // batch-segmenter.ts); every user interaction must land in a step.
  it('every interaction belongs to exactly one step', () => {
    const cited = bundle.derivedSteps.flatMap((s) => s.source_event_ids);
    expect(new Set(cited).size).toBe(cited.length);
    const uncited = bundle.normalizedEvents.filter((e) => !cited.includes(e.event_id));
    for (const e of uncited) expect(e.event_type).toMatch(/^(system\.|session\.|navigation\.route_change$)/);
  });

  it('the process engine produces a workflow with steps and an SOP', () => {
    const validated = validateBundle(JSON.parse(JSON.stringify(bundle)));
    if (!validated.valid) throw new Error(validated.errors.join('; '));
    const output = runProcessEngine(validated.bundle);
    expect(output.processRun.stepCount).toBeGreaterThan(0);
    expect(output.sop.steps.length).toBeGreaterThan(0);
  });

  it('sensitive fields are redacted and no label names a government id', () => {
    for (const e of bundle.normalizedEvents) {
      if (e.target_summary?.isSensitive) {
        expect(e.normalization_meta.redactionApplied).toBe(true);
        expect(e.target_summary.label).toBeUndefined();
      }
      const label = e.target_summary?.label ?? '';
      if (KNOWN_UNFLAGGED_LABELS.has(label)) continue;
      expect(label).not.toMatch(/ssn|social[\s_-]*security|tax(payer)?[\s_-]*id/i);
    }
  });
});

/**
 * Known gap, pinned so a fix shows up here: the policy rule `tax[_-]?id`
 * (policy-engine sensitivity.ts) does not match "Taxpayer ID", so the
 * recorder keeps that field's label. Only the label: values are never
 * recorded. When the rule is widened, this test fails; remove the label from
 * this set and regenerate the samples.
 */
const KNOWN_UNFLAGGED_LABELS = new Set(['Taxpayer ID']);

describe('HR sample recordings: known policy gap', () => {
  it('"Taxpayer ID" is not flagged sensitive by the current policy rules', () => {
    const payroll = bundles.find((b) => b.slug === 'set-up-payroll-new-hire')!.bundle;
    const taxpayer = payroll.normalizedEvents.filter((e) => e.target_summary?.selector === '#taxpayer-id');
    expect(taxpayer.length).toBeGreaterThan(0);
    for (const e of taxpayer) {
      expect(e.target_summary?.isSensitive).toBe(false);
      expect(e.target_summary?.label).toBe('Taxpayer ID');
    }
  });
});

describe('HR sample recordings: redaction is exercised', () => {
  it('the catalog includes recordings whose government-id fields were redacted', () => {
    const redacting = bundles.filter((b) => b.bundle.normalizedEvents.some((e) => e.normalization_meta.redactionApplied));
    expect(redacting.map((b) => b.slug)).toEqual(
      expect.arrayContaining(['complete-i9-verification', 'hire-employee-in-hris', 'send-cobra-notice']),
    );
  });
});
