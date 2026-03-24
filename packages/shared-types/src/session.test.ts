import { describe, it, expect } from 'vitest';
import { isValidTransition, VALID_TRANSITIONS } from './session.js';
import type { RecorderState } from './session.js';

// ---------------------------------------------------------------------------
// All states defined in the machine
// ---------------------------------------------------------------------------

const ALL_STATES: RecorderState[] = [
  'idle',
  'arming',
  'recording',
  'paused',
  'stopping',
  'review_ready',
  'error',
];

// ---------------------------------------------------------------------------
// isValidTransition — exhaustive allowed transitions
// ---------------------------------------------------------------------------

describe('isValidTransition — allowed transitions', () => {
  it('idle → arming is valid', () => {
    expect(isValidTransition('idle', 'arming')).toBe(true);
  });

  it('idle → error is valid', () => {
    expect(isValidTransition('idle', 'error')).toBe(true);
  });

  it('arming → recording is valid', () => {
    expect(isValidTransition('arming', 'recording')).toBe(true);
  });

  it('arming → idle is valid', () => {
    expect(isValidTransition('arming', 'idle')).toBe(true);
  });

  it('arming → error is valid', () => {
    expect(isValidTransition('arming', 'error')).toBe(true);
  });

  it('recording → paused is valid', () => {
    expect(isValidTransition('recording', 'paused')).toBe(true);
  });

  it('recording → stopping is valid', () => {
    expect(isValidTransition('recording', 'stopping')).toBe(true);
  });

  it('recording → error is valid', () => {
    expect(isValidTransition('recording', 'error')).toBe(true);
  });

  it('paused → recording is valid', () => {
    expect(isValidTransition('paused', 'recording')).toBe(true);
  });

  it('paused → stopping is valid', () => {
    expect(isValidTransition('paused', 'stopping')).toBe(true);
  });

  it('paused → error is valid', () => {
    expect(isValidTransition('paused', 'error')).toBe(true);
  });

  it('stopping → review_ready is valid', () => {
    expect(isValidTransition('stopping', 'review_ready')).toBe(true);
  });

  it('stopping → error is valid', () => {
    expect(isValidTransition('stopping', 'error')).toBe(true);
  });

  it('review_ready → idle is valid', () => {
    expect(isValidTransition('review_ready', 'idle')).toBe(true);
  });

  it('review_ready → error is valid', () => {
    expect(isValidTransition('review_ready', 'error')).toBe(true);
  });

  it('error → idle is valid', () => {
    expect(isValidTransition('error', 'idle')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidTransition — key invariants
// ---------------------------------------------------------------------------

describe('isValidTransition — key invariants', () => {
  it('idle cannot go directly to recording (must go through arming)', () => {
    expect(isValidTransition('idle', 'recording')).toBe(false);
  });

  it('paused cannot go directly to idle', () => {
    expect(isValidTransition('paused', 'idle')).toBe(false);
  });

  it('review_ready can only go to idle or error', () => {
    expect(isValidTransition('review_ready', 'idle')).toBe(true);
    expect(isValidTransition('review_ready', 'error')).toBe(true);

    const disallowed: RecorderState[] = ['arming', 'recording', 'paused', 'stopping'];
    for (const state of disallowed) {
      expect(isValidTransition('review_ready', state)).toBe(false);
    }
  });

  it('error can only go to idle', () => {
    expect(isValidTransition('error', 'idle')).toBe(true);

    const disallowed: RecorderState[] = ['arming', 'recording', 'paused', 'stopping', 'review_ready', 'error'];
    for (const state of disallowed) {
      expect(isValidTransition('error', state)).toBe(false);
    }
  });

  it('no self-transitions are valid for any state', () => {
    for (const state of ALL_STATES) {
      expect(isValidTransition(state, state)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// isValidTransition — disallowed transitions (sampled)
// ---------------------------------------------------------------------------

describe('isValidTransition — disallowed transitions', () => {
  it('idle cannot go to paused', () => {
    expect(isValidTransition('idle', 'paused')).toBe(false);
  });

  it('idle cannot go to stopping', () => {
    expect(isValidTransition('idle', 'stopping')).toBe(false);
  });

  it('idle cannot go to review_ready', () => {
    expect(isValidTransition('idle', 'review_ready')).toBe(false);
  });

  it('arming cannot go to paused', () => {
    expect(isValidTransition('arming', 'paused')).toBe(false);
  });

  it('arming cannot go to stopping', () => {
    expect(isValidTransition('arming', 'stopping')).toBe(false);
  });

  it('arming cannot go to review_ready', () => {
    expect(isValidTransition('arming', 'review_ready')).toBe(false);
  });

  it('recording cannot go to idle', () => {
    expect(isValidTransition('recording', 'idle')).toBe(false);
  });

  it('recording cannot go to arming', () => {
    expect(isValidTransition('recording', 'arming')).toBe(false);
  });

  it('recording cannot go to review_ready directly', () => {
    expect(isValidTransition('recording', 'review_ready')).toBe(false);
  });

  it('paused cannot go to arming', () => {
    expect(isValidTransition('paused', 'arming')).toBe(false);
  });

  it('paused cannot go to review_ready directly', () => {
    expect(isValidTransition('paused', 'review_ready')).toBe(false);
  });

  it('stopping cannot go to idle directly', () => {
    expect(isValidTransition('stopping', 'idle')).toBe(false);
  });

  it('stopping cannot go to recording', () => {
    expect(isValidTransition('stopping', 'recording')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VALID_TRANSITIONS shape
// ---------------------------------------------------------------------------

describe('VALID_TRANSITIONS', () => {
  it('contains an entry for every state', () => {
    for (const state of ALL_STATES) {
      expect(VALID_TRANSITIONS).toHaveProperty(state);
    }
  });

  it('has exactly the correct total number of valid transitions', () => {
    // idle: 2 (arming, error)
    // arming: 3 (recording, idle, error)
    // recording: 3 (paused, stopping, error)
    // paused: 3 (recording, stopping, error)
    // stopping: 2 (review_ready, error)
    // review_ready: 2 (idle, error)
    // error: 1 (idle)
    // Total: 2 + 3 + 3 + 3 + 2 + 2 + 1 = 16
    const EXPECTED_TOTAL = 16;
    const total = Object.values(VALID_TRANSITIONS).reduce(
      (sum, destinations) => sum + destinations.length,
      0,
    );
    expect(total).toBe(EXPECTED_TOTAL);
  });

  it('all destination states in VALID_TRANSITIONS are valid RecorderState values', () => {
    const stateSet = new Set<string>(ALL_STATES);
    for (const [, destinations] of Object.entries(VALID_TRANSITIONS)) {
      for (const dest of destinations) {
        expect(stateSet.has(dest)).toBe(true);
      }
    }
  });

  it('idle has exactly 2 allowed transitions', () => {
    expect(VALID_TRANSITIONS['idle']).toHaveLength(2);
  });

  it('arming has exactly 3 allowed transitions', () => {
    expect(VALID_TRANSITIONS['arming']).toHaveLength(3);
  });

  it('recording has exactly 3 allowed transitions', () => {
    expect(VALID_TRANSITIONS['recording']).toHaveLength(3);
  });

  it('paused has exactly 3 allowed transitions', () => {
    expect(VALID_TRANSITIONS['paused']).toHaveLength(3);
  });

  it('stopping has exactly 2 allowed transitions', () => {
    expect(VALID_TRANSITIONS['stopping']).toHaveLength(2);
  });

  it('review_ready has exactly 2 allowed transitions', () => {
    expect(VALID_TRANSITIONS['review_ready']).toHaveLength(2);
  });

  it('error has exactly 1 allowed transition', () => {
    expect(VALID_TRANSITIONS['error']).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// isValidTransition agrees with VALID_TRANSITIONS for all state pairs
// ---------------------------------------------------------------------------

describe('isValidTransition is consistent with VALID_TRANSITIONS for all state pairs', () => {
  it('returns true for every pair in VALID_TRANSITIONS and false for every pair not in it', () => {
    for (const from of ALL_STATES) {
      const allowedSet = new Set<string>(VALID_TRANSITIONS[from]);
      for (const to of ALL_STATES) {
        const expected = allowedSet.has(to);
        expect(isValidTransition(from, to)).toBe(expected);
      }
    }
  });
});
