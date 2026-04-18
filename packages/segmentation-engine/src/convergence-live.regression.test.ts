/**
 * Live convergence regression test (CHECKPOINT-F).
 *
 * Asserts that the converged `StreamingSegmenter` (extended with all D1-D11
 * rules) + `toLiveStep` adapter produces finalized `LiveStep` output that
 * matches the golden fixtures.
 *
 * STATUS at Step 1: EXPECTED TO FAIL — the current `StreamingSegmenter` is
 * missing D1 (idle_gap), D2 (route_changed), D3 (target_changed),
 * D4 (action_completed), D5 (error_handling), D6 (send_action/file_action/
 * data_entry grouping). The test will fail on fixtures that exercise these
 * boundaries. After Steps 2-6 are complete, all tests must pass.
 *
 * Do NOT update these golden fixtures to make tests pass. If a fixture is
 * wrong, escalate to the coordinator.
 *
 * NOTE: This test compares only FINALIZED LiveStep objects (not provisional
 * streaming updates). Invariant I1 requires that finalized live steps match
 * finalized batch steps after mapping through the adapter.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { StreamingSegmenter } from './streaming-segmenter.js';
import type { SegmentableEvent, DerivedStep } from './types.js';

// __dirname is injected by the vitest runtime even in ESM test files.
const FIXTURES_ROOT = join(__dirname, '..', 'fixtures');

// ---------------------------------------------------------------------------
// LiveStep type (mirrors apps/extension-app/src/shared/types.ts LiveStep)
// ---------------------------------------------------------------------------

interface LiveStep {
  stepId: string;
  title: string;
  status: 'provisional' | 'finalized';
  boundaryReason?: string;
  grouping?: string;
  pageLabel?: string;
  confidence: number;
  eventCount: number;
  startedAt: number;
  finalizedAt?: number;
}

// ---------------------------------------------------------------------------
// toLiveStep adapter (mirrors the design doc Section 3.6 contract)
// ---------------------------------------------------------------------------

function toLiveStep(step: DerivedStep): LiveStep {
  return {
    stepId: step.step_id,
    title: step.title,
    status: step.status,
    ...(step.boundary_reason !== undefined ? { boundaryReason: step.boundary_reason } : {}),
    grouping: step.grouping_reason,
    ...(step.page_context?.applicationLabel !== undefined
      ? { pageLabel: step.page_context.applicationLabel }
      : {}),
    confidence: step.confidence,
    eventCount: step.source_event_ids.length,
    startedAt: step.start_t_ms,
    ...(step.status === 'finalized' && step.end_t_ms !== undefined
      ? { finalizedAt: step.end_t_ms }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadGoldenInputs(name: string): SegmentableEvent[] {
  const path = join(FIXTURES_ROOT, 'golden', `${name}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>[];
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
    return event;
  });
}

function loadGoldenLive(name: string): LiveStep[] {
  const path = join(FIXTURES_ROOT, 'expected', 'live', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as LiveStep[];
}

function runStreamingToFinalizedLiveSteps(
  events: SegmentableEvent[],
  sessionId: string,
): LiveStep[] {
  const finalizedSteps: LiveStep[] = [];
  const segmenter = new StreamingSegmenter(sessionId, (step) => {
    if (step.status === 'finalized') {
      finalizedSteps.push(toLiveStep(step));
    }
  });
  for (const event of events) {
    segmenter.processEvent(event);
  }
  segmenter.finalize();
  return finalizedSteps;
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

describe('convergence-live regression', () => {
  for (const name of FIXTURE_NAMES) {
    it(`finalized LiveStep output matches golden for fixture: ${name}`, () => {
      const events = loadGoldenInputs(name);
      const golden = loadGoldenLive(name);
      const observed = runStreamingToFinalizedLiveSteps(events, SESSION);

      expect(JSON.stringify(observed)).toBe(JSON.stringify(golden));
    });

    it(`streaming output is deterministic for fixture: ${name}`, () => {
      const events = loadGoldenInputs(name);
      const run1 = runStreamingToFinalizedLiveSteps(events, SESSION);
      const run2 = runStreamingToFinalizedLiveSteps(events, SESSION);

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });
  }
});
