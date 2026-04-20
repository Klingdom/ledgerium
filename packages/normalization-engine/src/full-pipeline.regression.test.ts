/**
 * Full-pipeline golden-fixture regression test — iter 013.
 *
 * Closes follow-up #25: the existing segmentation-engine regression harness
 * (iters 011/012) uses fixtures whose inputs are already-normalized
 * SegmentableEvent[]. This test closes the gap by running end-to-end:
 *
 *   raw .ndjson  →  @ledgerium/normalization-engine (normalizeSession)
 *                →  @ledgerium/segmentation-engine  (segmentEvents)
 *
 * and asserting byte-identical outputs on every run.
 *
 * ─── Pattern choice: B (separate fixture directory) ──────────────────────────
 *
 * Pattern B was selected over Pattern A for two reasons:
 *   1. Zero coupling risk — the 12 existing segmentation-engine golden fixtures
 *      remain unchanged; no risk of accidentally drifting their `input.ts` vs
 *      `input.raw.ndjson` interpretations.
 *   2. Independent regeneration — normalizer and segmenter fixtures can be
 *      regenerated in isolation. If only the normalizer rule version changes,
 *      only the normalization layer's expected outputs need updating.
 *
 * ─── Fixture locations ───────────────────────────────────────────────────────
 *
 *   packages/normalization-engine/fixtures/golden/raw/*.ndjson
 *     Raw browser-captured events (input to normalizer). One event per line.
 *
 *   packages/normalization-engine/fixtures/golden/normalized/*.json
 *     Expected CanonicalEvent[] after normalization.
 *     (Also used as the intermediate input to the segmenter in the pipeline test.)
 *
 *   packages/normalization-engine/fixtures/golden/pipeline-norm/*.json
 *     Expected CanonicalEvent[] output from the full pipeline (same as normalized/
 *     but stored separately so the pipeline test can be re-run independently).
 *
 *   packages/normalization-engine/fixtures/golden/pipeline-segmentation/*.json
 *     Expected DerivedStep[] output from the full pipeline.
 *
 * ─── event_id determinism note ───────────────────────────────────────────────
 *
 * normalizeSession() assigns UUIDs via generateEventId(). To make golden
 * fixtures reviewable and byte-stable, this test replaces each canonical
 * event's generated event_id with its normalization_meta.sourceEventId
 * (which derives from raw_event_id — controlled, stable input). The same
 * replacement is applied both to the live run and to the stored golden
 * expected fixture. This is a test-layer normalization only; no production
 * code was modified.
 *
 * ─── How to regenerate expected fixtures ─────────────────────────────────────
 *
 * If normalizer or segmenter rules change and expected outputs need updating:
 *
 *   # From the repo root:
 *   npx tsx packages/normalization-engine/scripts/regenerate-pipeline-fixtures.ts
 *
 * This overwrites:
 *   packages/normalization-engine/fixtures/golden/normalized/*.json
 *   packages/normalization-engine/fixtures/golden/pipeline-segmentation/*.json
 *
 * Then commit the updated fixture files alongside the rule change. Never
 * update fixtures to make a test pass without understanding why the output
 * changed — escalate to the coordinator if the change is unexpected.
 *
 * ─── Scope discipline (iter 013) ─────────────────────────────────────────────
 *
 * No production code in normalization-engine/src/ or segmentation-engine/src/
 * was modified by this iteration. The only addition is this test file and the
 * fixture data files under packages/normalization-engine/fixtures/golden/.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { normalizeSession } from './normalizer.js';
import type { RawEvent, CanonicalEvent } from './normalizer.js';

// We import the segmenter via its package entry point to avoid coupling to
// internal file paths. The monorepo resolve conditions make this work in tests.
import { segmentEvents } from '../../segmentation-engine/src/batch-segmenter.js';
import type { SegmentableEvent, DerivedStep } from '../../segmentation-engine/src/types.js';

// ---------------------------------------------------------------------------
// Fixture root
// ---------------------------------------------------------------------------

// __dirname is injected by the vitest runtime even in ESM test files.
const FIXTURES_ROOT = join(__dirname, '..', 'fixtures', 'golden');

// ---------------------------------------------------------------------------
// ID normalizer
//
// Replaces the UUID assigned by generateEventId() with the stable
// sourceEventId from normalization_meta so golden fixtures are byte-stable.
// Applied identically to both "live run" and "expected" outputs.
// ---------------------------------------------------------------------------

function stableId(event: CanonicalEvent): CanonicalEvent {
  return { ...event, event_id: event.normalization_meta.sourceEventId };
}

// ---------------------------------------------------------------------------
// Helpers: load raw → normalize (with stable IDs)
// ---------------------------------------------------------------------------

function loadRaw(name: string): RawEvent[] {
  const path = join(FIXTURES_ROOT, 'raw', `${name}.ndjson`);
  return readFileSync(path, 'utf-8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RawEvent);
}

function runNormalizer(rawEvents: RawEvent[]): CanonicalEvent[] {
  const { events } = normalizeSession(rawEvents);
  return events.map(stableId);
}

function loadExpectedNormalized(name: string): CanonicalEvent[] {
  const path = join(FIXTURES_ROOT, 'normalized', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as CanonicalEvent[];
}

// ---------------------------------------------------------------------------
// Helpers: normalized → segmenter projection → DerivedStep[]
// ---------------------------------------------------------------------------

/**
 * Projects CanonicalEvent to SegmentableEvent (the subset the segmenter
 * accepts). This is the same projection used in the production pipeline
 * (normalizer output feeds the segmenter via this interface).
 */
function toSegmentable(events: CanonicalEvent[]): SegmentableEvent[] {
  return events.map((e) => {
    const se: SegmentableEvent = {
      event_id: e.event_id,
      session_id: e.session_id,
      t_ms: e.t_ms,
      event_type: e.event_type,
      normalization_meta: { sourceEventType: e.normalization_meta.sourceEventType },
    };
    if (e.page_context !== undefined) {
      se.page_context = {
        domain: e.page_context.domain,
        routeTemplate: e.page_context.routeTemplate,
        applicationLabel: e.page_context.applicationLabel,
        pageTitle: e.page_context.pageTitle,
      };
    }
    if (e.target_summary !== undefined) {
      se.target_summary = {};
      if (e.target_summary.label !== undefined) se.target_summary.label = e.target_summary.label;
      if (e.target_summary.role !== undefined) se.target_summary.role = e.target_summary.role;
      if (e.target_summary.elementType !== undefined) se.target_summary.elementType = e.target_summary.elementType;
      if (e.target_summary.selector !== undefined) se.target_summary.selector = e.target_summary.selector;
    }
    if (e.annotation_text !== undefined) se.annotation_text = e.annotation_text;
    return se;
  });
}

function runPipeline(rawEvents: RawEvent[], sessionId: string): {
  normalized: CanonicalEvent[];
  steps: DerivedStep[];
} {
  const normalized = runNormalizer(rawEvents);
  const segmentable = toSegmentable(normalized);
  const { steps } = segmentEvents(segmentable, sessionId);
  return { normalized, steps };
}

function loadExpectedSteps(name: string): DerivedStep[] {
  const path = join(FIXTURES_ROOT, 'pipeline-segmentation', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as DerivedStep[];
}

// ---------------------------------------------------------------------------
// Fixture names and session ID
// ---------------------------------------------------------------------------

const SESSION = 'test-pipeline-golden';

/**
 * Three fixtures covering distinct normalizer code paths:
 *   click-with-label  — basic click with target label; session start/stop lifecycle
 *   fill-and-submit   — element_focused / input_changed / form_submitted; dedup + fill_and_submit grouping
 *   route-change      — spa_route_changed → navigation.route_change
 */
const FIXTURE_NAMES = [
  'click-with-label',
  'fill-and-submit',
  'route-change',
] as const;

// ---------------------------------------------------------------------------
// Suite 1: Normalizer layer — raw .ndjson → CanonicalEvent[] byte identity
// ---------------------------------------------------------------------------

describe('full-pipeline: normalizer layer golden fixtures', () => {
  for (const name of FIXTURE_NAMES) {
    it(`normalized output matches golden for fixture: ${name}`, () => {
      const raw = loadRaw(name);
      const observed = runNormalizer(raw);
      const expected = loadExpectedNormalized(name);

      expect(JSON.stringify(observed)).toBe(JSON.stringify(expected));
    });

    it(`normalizer output is deterministic (two runs) for fixture: ${name}`, () => {
      const raw = loadRaw(name);
      const run1 = runNormalizer(raw);
      const run2 = runNormalizer(raw);

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 2: Full pipeline — raw .ndjson → normalizer → segmenter DerivedStep[]
// ---------------------------------------------------------------------------

describe('full-pipeline: end-to-end pipeline golden fixtures', () => {
  for (const name of FIXTURE_NAMES) {
    it(`pipeline DerivedStep[] matches golden for fixture: ${name}`, () => {
      const raw = loadRaw(name);
      const { steps: observed } = runPipeline(raw, SESSION);
      const expected = loadExpectedSteps(name);

      expect(JSON.stringify(observed)).toBe(JSON.stringify(expected));
    });

    it(`full pipeline is deterministic (two runs) for fixture: ${name}`, () => {
      const raw = loadRaw(name);
      const { steps: run1 } = runPipeline(raw, SESSION);
      const { steps: run2 } = runPipeline(raw, SESSION);

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });
  }
});
