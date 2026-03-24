/**
 * Tests for the stateful StreamingSegmenter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StreamingSegmenter } from './streaming-segmenter.js';
import type { SegmentableEvent, DerivedStep } from './types.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeEvent(overrides?: Partial<SegmentableEvent>): SegmentableEvent {
  return {
    event_id: 'test-evt-1',
    event_type: 'interaction.click',
    t_ms: 0,
    session_id: 'test-session',
    normalization_meta: { sourceEventType: 'click' },
    ...overrides,
  };
}

const SESSION_ID = 'sess-stream-1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StreamingSegmenter', () => {
  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('getProvisionalStep() returns null on a fresh instance', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());
      expect(segmenter.getProvisionalStep()).toBeNull();
    });

    it('getFinalizedSteps() returns an empty array on a fresh instance', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());
      expect(segmenter.getFinalizedSteps()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Provisional step emission
  // -------------------------------------------------------------------------

  describe('provisional step emission', () => {
    it('processEvent with a non-boundary click calls the callback once with a provisional step', () => {
      const callback = vi.fn<[DerivedStep], void>();
      const segmenter = new StreamingSegmenter(SESSION_ID, callback);

      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0]![0].status).toBe('provisional');
    });

    it('getProvisionalStep() is not null after a non-boundary event is processed', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());

      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );

      expect(segmenter.getProvisionalStep()).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Finalized step emission
  // -------------------------------------------------------------------------

  describe('finalized step emission on submit boundary', () => {
    it('click then submit emits a finalized step and adds it to getFinalizedSteps()', () => {
      const callback = vi.fn<[DerivedStep], void>();
      const segmenter = new StreamingSegmenter(SESSION_ID, callback);

      segmenter.processEvent(
        makeEvent({
          event_id: 'evt-1',
          event_type: 'interaction.input_change',
          t_ms: 0,
        }),
      );
      segmenter.processEvent(
        makeEvent({
          event_id: 'evt-2',
          event_type: 'interaction.submit',
          t_ms: 300,
        }),
      );

      // The final callback invocation must be for a finalized step.
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1]!;
      expect(lastCall[0].status).toBe('finalized');

      expect(segmenter.getFinalizedSteps()).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // getFinalizedSteps only returns finalized steps
  // -------------------------------------------------------------------------

  describe('getFinalizedSteps isolation', () => {
    it('getFinalizedSteps() does not include provisional step data', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());

      // Non-boundary event → provisional only.
      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );

      const finalized = segmenter.getFinalizedSteps();
      expect(finalized).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // finalize()
  // -------------------------------------------------------------------------

  describe('finalize()', () => {
    it('finalize() flushes remaining provisional events and returns all finalized steps', () => {
      const callback = vi.fn<[DerivedStep], void>();
      const segmenter = new StreamingSegmenter(SESSION_ID, callback);

      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );

      const steps = segmenter.finalize();

      expect(steps).toHaveLength(1);
      expect(steps[0]!.status).toBe('finalized');
    });

    it('getProvisionalStep() returns null after finalize()', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());

      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );
      segmenter.finalize();

      expect(segmenter.getProvisionalStep()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // reset()
  // -------------------------------------------------------------------------

  describe('reset()', () => {
    it('reset() clears provisional events, finalized steps, and step counter', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());

      // Build up some state.
      segmenter.processEvent(
        makeEvent({
          event_id: 'evt-1',
          event_type: 'interaction.input_change',
          t_ms: 0,
        }),
      );
      segmenter.processEvent(
        makeEvent({
          event_id: 'evt-2',
          event_type: 'interaction.submit',
          t_ms: 200,
        }),
      );
      segmenter.processEvent(
        makeEvent({
          event_id: 'evt-3',
          event_type: 'interaction.click',
          t_ms: 300,
        }),
      );

      segmenter.reset();

      expect(segmenter.getProvisionalStep()).toBeNull();
      expect(segmenter.getFinalizedSteps()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Annotation: flushes prior accumulator
  // -------------------------------------------------------------------------

  describe('annotation events', () => {
    it('two sequential annotation events each flush the prior accumulator', () => {
      const callback = vi.fn<[DerivedStep], void>();
      const segmenter = new StreamingSegmenter(SESSION_ID, callback);

      const annotation1 = makeEvent({
        event_id: 'ann-1',
        event_type: 'session.annotation_added',
        t_ms: 0,
        target_summary: { label: 'First note' },
      });
      const annotation2 = makeEvent({
        event_id: 'ann-2',
        event_type: 'session.annotation_added',
        t_ms: 1000,
        target_summary: { label: 'Second note' },
      });

      segmenter.processEvent(annotation1);
      segmenter.processEvent(annotation2);

      // Each annotation creates its own finalized step.
      const finalized = segmenter.getFinalizedSteps();
      expect(finalized).toHaveLength(2);
      expect(finalized[0]!.grouping_reason).toBe('annotation');
      expect(finalized[1]!.grouping_reason).toBe('annotation');
    });

    it('annotation after a click flushes the click accumulator first, then creates annotation step', () => {
      const segmenter = new StreamingSegmenter(SESSION_ID, vi.fn());

      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );
      segmenter.processEvent(
        makeEvent({
          event_id: 'ann-1',
          event_type: 'session.annotation_added',
          t_ms: 500,
          target_summary: { label: 'Note after click' },
        }),
      );

      const finalized = segmenter.getFinalizedSteps();
      // Two finalized steps: the click step and the annotation step.
      expect(finalized).toHaveLength(2);
      expect(finalized[1]!.grouping_reason).toBe('annotation');
    });
  });

  // -------------------------------------------------------------------------
  // Callback call count
  // -------------------------------------------------------------------------

  describe('callback call count', () => {
    it('processing three non-boundary clicks triggers the callback three times', () => {
      const callback = vi.fn<[DerivedStep], void>();
      const segmenter = new StreamingSegmenter(SESSION_ID, callback);

      segmenter.processEvent(makeEvent({ event_id: 'evt-1', t_ms: 0 }));
      segmenter.processEvent(makeEvent({ event_id: 'evt-2', t_ms: 100 }));
      segmenter.processEvent(makeEvent({ event_id: 'evt-3', t_ms: 200 }));

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('a submit event triggers the callback once for the finalized step (no provisional emitted for boundary events)', () => {
      const callback = vi.fn<[DerivedStep], void>();
      const segmenter = new StreamingSegmenter(SESSION_ID, callback);

      // One non-boundary click (provisional emitted) then a submit (finalized emitted, returns early).
      segmenter.processEvent(
        makeEvent({ event_id: 'evt-1', event_type: 'interaction.click', t_ms: 0 }),
      );
      const callsAfterClick = callback.mock.calls.length;

      segmenter.processEvent(
        makeEvent({
          event_id: 'evt-2',
          event_type: 'interaction.submit',
          t_ms: 200,
        }),
      );
      const callsAfterSubmit = callback.mock.calls.length;

      // Click emits one provisional; submit emits one finalized (returns early — no extra provisional).
      expect(callsAfterClick).toBe(1);
      expect(callsAfterSubmit).toBe(2);
      expect(callback.mock.calls[1]![0].status).toBe('finalized');
    });
  });
});
