/**
 * Convergence Invariant I1a — LiveStep-level cross-path equality.
 *
 * Authority: docs/architecture/CONVERGENCE_LIVESTEPBUILDER_STREAMING_SEGMENTER.md
 * §5.3 revision (coordinator, iter 012, 2026-04-19)
 *
 * ─── What I1a catches ────────────────────────────────────────────────────────
 *
 * For every fixture in the golden set, this test asserts:
 *
 *   JSON.stringify(livePathLiveSteps) === JSON.stringify(batchPathLiveSteps)
 *
 * where:
 *   - livePathLiveSteps  = LiveStepBuilder.processEvent(each event) + .finalize()
 *                         + .getFinalizedSteps()
 *   - batchPathLiveSteps = buildDerivedSteps(events).map(toLiveStep)
 *
 * Both paths produce LiveStep[]. Since iter-011 convergence made both paths
 * delegate to the same StreamingSegmenter internals (live) and segmentEvents
 * (batch), boundary detection, grouping classification, title derivation,
 * confidence, and timing fields are structurally identical at the LiveStep
 * projection boundary.
 *
 * I1a catches:
 *   - step-boundary drift (wrong number of steps, wrong split points)
 *   - grouping_reason drift
 *   - title drift
 *   - confidence drift
 *   - status drift
 *   - timing drift (startedAt / finalizedAt)
 *   - eventCount drift (detects set-size divergence in source_event_ids even
 *     without comparing array content)
 *   - page-label drift
 *
 * ─── What I1a does NOT catch ─────────────────────────────────────────────────
 *
 * Because LiveStep is a lossy projection of DerivedStep, I1a cannot observe:
 *   - source_event_ids array content (collapsed to eventCount: number)
 *   - session_id (dropped from LiveStep)
 *   - ordinal (dropped from LiveStep)
 *
 * These three fields are trivially equal in both paths after iter-011
 * convergence (both derive them via the same segmentation-engine internals).
 * I1b CLOSED iter 053 — DerivedStep-level byte-identity is now asserted in
 * this file (see describe block below). getDerivedSteps() exposes the raw
 * DerivedStep layer so the strict comparison closes this gap without requiring
 * the lossy toLiveStep projection.
 *
 * ─── Scope discipline confirmation ───────────────────────────────────────────
 *
 * The only production-code change in this iteration is the `export` keyword
 * added to `toLiveStep` in live-steps.ts. This is a test-wiring edit: it
 * exposes an already-landed function (no logic change) to a neighbouring test
 * file. No new production logic was introduced. Per coordinator guidance, this
 * is permitted within the iter-012 scope.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

import { LiveStepBuilder, toLiveStep } from './live-steps.js'
import { buildDerivedSteps } from './bundle-builder.js'
import type { CanonicalEvent } from '../shared/types.js'

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

// __dirname is injected by the Vitest runtime (even in ESM mode).
// Relative path: apps/extension-app/src/background -> root -> packages/segmentation-engine/fixtures/golden
const GOLDEN_ROOT = join(
  __dirname,
  '..', '..', '..', '..',  // -> ledgerium/
  'packages', 'segmentation-engine', 'fixtures', 'golden',
)

function loadGoldenEvents(name: string): CanonicalEvent[] {
  const filePath = join(GOLDEN_ROOT, `${name}.json`)
  return JSON.parse(readFileSync(filePath, 'utf-8')) as CanonicalEvent[]
}

// ---------------------------------------------------------------------------
// Live-path runners
// ---------------------------------------------------------------------------

/**
 * Feeds events through LiveStepBuilder (the streaming live path) and returns
 * the finalized LiveStep array via getFinalizedSteps().
 *
 * Uses the same sessionId constant as convergence-batch.regression.test.ts so
 * stepId strings are comparable across both test files if inspected manually.
 */
function runLivePath(events: CanonicalEvent[], sessionId: string) {
  const builder = new LiveStepBuilder(sessionId, () => {/* not used */})
  for (const event of events) {
    builder.processEvent(event)
  }
  builder.finalize()
  return builder.getFinalizedSteps()
}

/**
 * Feeds events through LiveStepBuilder and returns the raw DerivedStep array
 * via getDerivedSteps() (I1b accessor, iter 053).
 *
 * Same runner structure as runLivePath — only the final accessor differs.
 */
function runLivePathDerived(events: CanonicalEvent[], sessionId: string) {
  const builder = new LiveStepBuilder(sessionId, () => {/* not used */})
  for (const event of events) {
    builder.processEvent(event)
  }
  builder.finalize()
  return builder.getDerivedSteps()
}

/**
 * Runs the batch path and maps each DerivedStep to LiveStep via toLiveStep.
 * This is the I1a "batch path via toLiveStep" defined in §5.3 revision.
 */
function runBatchPath(events: CanonicalEvent[], sessionId: string) {
  return buildDerivedSteps(events, sessionId).map(toLiveStep)
}

// ---------------------------------------------------------------------------
// Fixture names (§5.2 canonical set)
// ---------------------------------------------------------------------------

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
] as const

const SESSION = 'test-session-golden'

// ---------------------------------------------------------------------------
// I1a assertion suite
// ---------------------------------------------------------------------------

describe('convergence invariant I1a — live path LiveSteps === batch path via toLiveStep', () => {
  for (const name of FIXTURE_NAMES) {
    it(`I1a: ${name} — live path LiveSteps === batch path via toLiveStep`, () => {
      const events = loadGoldenEvents(name)
      const livePathLiveSteps = runLivePath(events, SESSION)
      const batchPathLiveSteps = runBatchPath(events, SESSION)

      expect(JSON.stringify(livePathLiveSteps)).toBe(JSON.stringify(batchPathLiveSteps))
    })
  }
})

// ---------------------------------------------------------------------------
// I1b assertion suite — DerivedStep-level byte-identity (iter 053, row #26)
// ---------------------------------------------------------------------------

describe('I1b: LiveStepBuilder.getDerivedSteps() byte-identity vs buildDerivedSteps()', () => {
  // Per-fixture byte-identity: streaming live path DerivedSteps must equal
  // batch-path DerivedSteps at the JSON.stringify level for every golden fixture.
  for (const name of FIXTURE_NAMES) {
    it(`I1b: ${name} — getDerivedSteps() byte-identical to buildDerivedSteps()`, () => {
      const events = loadGoldenEvents(name)
      const livePathDerivedSteps = runLivePathDerived(events, SESSION)
      const batchPathDerivedSteps = buildDerivedSteps(events, SESSION)

      expect(JSON.stringify(livePathDerivedSteps)).toBe(JSON.stringify(batchPathDerivedSteps))
    })
  }

  // Determinism: calling getDerivedSteps() twice on the same builder returns
  // byte-identical results — no mutation between calls.
  it('I1b: getDerivedSteps() is deterministic — repeat call returns byte-identical result', () => {
    const events = loadGoldenEvents('demo')
    const builder = new LiveStepBuilder(SESSION, () => {/* not used */})
    for (const event of events) {
      builder.processEvent(event)
    }
    builder.finalize()

    const first = JSON.stringify(builder.getDerivedSteps())
    const second = JSON.stringify(builder.getDerivedSteps())
    expect(first).toBe(second)
  })

  // Defensive copy: mutations to the returned array do not affect the builder's
  // internal state — a second call reflects original data.
  it('I1b: getDerivedSteps() returns a defensive copy — mutation does not affect internal state', () => {
    const events = loadGoldenEvents('fill-and-submit')
    const builder = new LiveStepBuilder(SESSION, () => {/* not used */})
    for (const event of events) {
      builder.processEvent(event)
    }
    builder.finalize()

    const first = builder.getDerivedSteps()
    const originalLength = first.length
    // Mutate the returned array.
    first.splice(0, first.length)
    // Internal state must be unaffected.
    const second = builder.getDerivedSteps()
    expect(second).toHaveLength(originalLength)
  })
})
