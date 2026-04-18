/**
 * Adapter field-mapping tests for LiveStepBuilder.
 *
 * Verifies that LiveStepBuilder correctly maps DerivedStep fields to
 * LiveStep fields via the toLiveStep adapter (CHECKPOINT-F).
 *
 * These tests cover the adapter contract — not the underlying segmentation
 * logic (covered by convergence-live.regression.test.ts in the package).
 */

import { describe, it, expect } from 'vitest'
import { LiveStepBuilder } from './live-steps.js'
import type { CanonicalEvent, LiveStep } from '../shared/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanonicalEvent(overrides: Partial<CanonicalEvent> & Pick<CanonicalEvent, 'event_id' | 'event_type' | 't_ms'>): CanonicalEvent {
  return {
    schema_version: '1.0.0',
    session_id: 'test-session',
    t_wall: '2026-01-01T00:00:00Z',
    actor_type: 'human',
    normalization_meta: {
      sourceEventId: overrides.event_id,
      sourceEventType: overrides.event_type,
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
    ...overrides,
  }
}

function collectFinalized(events: CanonicalEvent[], sessionId: string): LiveStep[] {
  const finalized: LiveStep[] = []
  const builder = new LiveStepBuilder(sessionId, (step) => {
    if (step.status === 'finalized') {
      finalized.push(step)
    }
  })
  for (const e of events) {
    builder.processEvent(e)
  }
  builder.finalize()
  return finalized
}

// ---------------------------------------------------------------------------
// Field mapping: stepId, title, status
// ---------------------------------------------------------------------------

describe('LiveStepBuilder adapter field mapping', () => {
  it('stepId is derived from sessionId and ordinal', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1',
        event_type: 'interaction.click',
        t_ms: 1000,
        target_summary: { label: 'Save', selector: '#save', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'test-session-001')
    expect(steps).toHaveLength(1)
    expect(steps[0]!.stepId).toBe('test-session-001-step-1')
  })

  it('title maps from DerivedStep title', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1',
        event_type: 'interaction.click',
        t_ms: 1000,
        target_summary: { label: 'Inbox', selector: '#inbox', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.title).toBe('Click Inbox')
  })

  it('status is "finalized" for completed steps', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
        target_summary: { label: 'OK', selector: '#ok', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.status).toBe('finalized')
  })

  it('boundaryReason is present on finalized steps', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
        target_summary: { label: 'Button', selector: '#btn', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.boundaryReason).toBeDefined()
  })

  it('grouping maps from grouping_reason', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
        target_summary: { label: 'Button', selector: '#btn', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.grouping).toBe('single_action')
  })

  it('pageLabel maps from page_context.applicationLabel', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
        page_context: {
          url: 'https://app.example.com/page',
          urlNormalized: 'https://app.example.com/page',
          domain: 'app.example.com',
          routeTemplate: '/page',
          pageTitle: 'Page',
          applicationLabel: 'MyApp',
        },
        target_summary: { label: 'Button', selector: '#btn', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.pageLabel).toBe('MyApp')
  })

  it('pageLabel is absent when no page_context', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.pageLabel).toBeUndefined()
  })

  it('confidence maps from DerivedStep confidence', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
        target_summary: { label: 'Send', selector: '#send', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    // send_action → 0.9
    expect(steps[0]!.confidence).toBe(0.9)
  })

  it('eventCount maps from source_event_ids.length', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
        target_summary: { label: 'Btn', selector: '#btn', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.eventCount).toBe(1)
  })

  it('startedAt maps from start_t_ms', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 5000,
        target_summary: { label: 'Btn', selector: '#btn', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.startedAt).toBe(5000)
  })

  it('finalizedAt maps from end_t_ms for finalized steps', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'interaction.click', t_ms: 5000,
        target_summary: { label: 'Btn', selector: '#btn', isSensitive: false },
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps[0]!.finalizedAt).toBe(5000)
  })

  // ---------------------------------------------------------------------------
  // Provisional step
  // ---------------------------------------------------------------------------

  it('getProvisionalStep returns a provisional LiveStep while accumulating', () => {
    const finalized: LiveStep[] = []
    const builder = new LiveStepBuilder('sess', (step) => {
      if (step.status === 'finalized') finalized.push(step)
    })
    builder.processEvent(makeCanonicalEvent({
      event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
      target_summary: { label: 'Btn', selector: '#btn', isSensitive: false },
    }))
    const provisional = builder.getProvisionalStep()
    expect(provisional).not.toBeNull()
    expect(provisional!.status).toBe('provisional')
    expect(provisional!.stepId).toContain('provisional')
    expect(finalized).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  it('reset clears state so subsequent events start fresh', () => {
    const finalized: LiveStep[] = []
    const builder = new LiveStepBuilder('sess', (step) => {
      if (step.status === 'finalized') finalized.push(step)
    })
    builder.processEvent(makeCanonicalEvent({
      event_id: 'e1', event_type: 'interaction.click', t_ms: 1000,
      target_summary: { label: 'Btn', selector: '#btn', isSensitive: false },
    }))
    builder.reset()
    expect(builder.getProvisionalStep()).toBeNull()
    expect(builder.getFinalizedSteps()).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // annotation_text passthrough
  // ---------------------------------------------------------------------------

  it('annotation_text is used as the step title for annotation events', () => {
    const events = [
      makeCanonicalEvent({
        event_id: 'e1', event_type: 'session.annotation_added', t_ms: 1000,
        annotation_text: 'Review this step',
      }),
    ]
    const steps = collectFinalized(events, 'sess')
    expect(steps).toHaveLength(1)
    expect(steps[0]!.title).toBe('Review this step')
    expect(steps[0]!.grouping).toBe('annotation')
  })
})
