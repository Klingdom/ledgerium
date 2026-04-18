/**
 * Batch convergence regression test (CHECKPOINT-E).
 *
 * Asserts that `segmentEvents` (package batch segmenter) produces byte-identical
 * DerivedStep output to the golden fixtures captured from `buildDerivedSteps`
 * (extension bundle-builder) BEFORE convergence.
 *
 * STATUS at Step 1: EXPECTED TO FAIL — segmentEvents uses package-style
 * `deriveStepTitle` which produces different title strings. After Step 4 (title
 * migration), Step 5 (bundle-builder wrapper), and full rule alignment, both
 * tests in this file must pass.
 *
 * Do NOT update these golden fixtures to make tests pass. If a fixture is
 * wrong, escalate to the coordinator.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { segmentEvents } from './batch-segmenter.js';
import type { SegmentableEvent, DerivedStep } from './types.js';

// __dirname is injected by the vitest runtime even in ESM test files.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FIXTURES_ROOT = join(__dirname, '..', 'fixtures');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadGoldenInputs(name: string): SegmentableEvent[] {
  const path = join(FIXTURES_ROOT, 'golden', `${name}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>[];
  // The golden inputs are CanonicalEvent-shaped; project to SegmentableEvent.
  // Cast through unknown to satisfy exactOptionalPropertyTypes — the fixture
  // JSON always includes page_context when present, matching the optional shape.
  return raw.map((e) => {
    const event: SegmentableEvent = {
      event_id: e['event_id'] as string,
      session_id: e['session_id'] as string,
      t_ms: e['t_ms'] as number,
      event_type: e['event_type'] as string,
      normalization_meta: e['normalization_meta'] as SegmentableEvent['normalization_meta'],
    };
    if (e['page_context'] !== undefined) {
      event.page_context = e['page_context'] as NonNullable<SegmentableEvent['page_context']>;
    }
    if (e['target_summary'] !== undefined) {
      event.target_summary = e['target_summary'] as NonNullable<SegmentableEvent['target_summary']>;
    }
    if (e['annotation_text'] !== undefined) {
      event.annotation_text = e['annotation_text'] as string;
    }
    return event;
  });
}

function loadGoldenDerived(name: string): DerivedStep[] {
  const path = join(FIXTURES_ROOT, 'expected', 'derived', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as DerivedStep[];
}

const SESSION = 'test-session-golden';

const FIXTURE_NAMES = [
  'demo',
  'spreadsheet-cells',
  'action-button-then-other',
  'action-button-rapid-repeat',
  'annotation-mid-stream',
  'idle-gap',
  'multi-domain-tabs',
  'spa-route-change',
  'error-recovery',
  'fill-and-submit',
  'single-action-no-label',
  'empty-session',
] as const;

// ---------------------------------------------------------------------------
// Regression suite
// ---------------------------------------------------------------------------

describe('convergence-batch regression', () => {
  for (const name of FIXTURE_NAMES) {
    it(`segmentEvents output matches golden for fixture: ${name}`, () => {
      const events = loadGoldenInputs(name);
      const golden = loadGoldenDerived(name);
      const result = segmentEvents(events, SESSION);

      expect(JSON.stringify(result.steps)).toBe(JSON.stringify(golden));
    });

    it(`segmentEvents is deterministic for fixture: ${name}`, () => {
      const events = loadGoldenInputs(name);
      const run1 = segmentEvents(events, SESSION);
      const run2 = segmentEvents(events, SESSION);

      expect(JSON.stringify(run1.steps)).toBe(JSON.stringify(run2.steps));
    });
  }
});
