import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecorderStateMachine } from './state-machine.js'
import type { RecorderState } from '../shared/types.js'

describe('RecorderStateMachine', () => {
  let sm: RecorderStateMachine

  beforeEach(() => {
    sm = new RecorderStateMachine()
  })

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts in idle', () => {
      expect(sm.state).toBe('idle')
    })
  })

  // ---------------------------------------------------------------------------
  // canTransition
  // ---------------------------------------------------------------------------

  describe('canTransition', () => {
    it('allows valid transition from idle → arming', () => {
      expect(sm.canTransition('arming')).toBe(true)
    })

    it('disallows direct idle → recording (must go through arming)', () => {
      expect(sm.canTransition('recording')).toBe(false)
    })

    it('disallows idle → paused', () => {
      expect(sm.canTransition('paused')).toBe(false)
    })

    it('allows idle → error', () => {
      expect(sm.canTransition('error')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // transition
  // ---------------------------------------------------------------------------

  describe('transition', () => {
    it('changes state on valid transition', () => {
      sm.transition('arming')
      expect(sm.state).toBe('arming')
    })

    it('throws on invalid transition', () => {
      expect(() => sm.transition('recording')).toThrow('idle → recording')
    })

    it('calls listeners after transition', () => {
      const listener = vi.fn()
      sm.onChange(listener)
      sm.transition('arming')
      expect(listener).toHaveBeenCalledWith('arming')
    })

    it('calls all registered listeners', () => {
      const a = vi.fn()
      const b = vi.fn()
      sm.onChange(a)
      sm.onChange(b)
      sm.transition('arming')
      expect(a).toHaveBeenCalledOnce()
      expect(b).toHaveBeenCalledOnce()
    })
  })

  // ---------------------------------------------------------------------------
  // onChange / unsubscribe
  // ---------------------------------------------------------------------------

  describe('onChange', () => {
    it('returns an unsubscribe function', () => {
      const listener = vi.fn()
      const unsub = sm.onChange(listener)
      unsub()
      sm.transition('arming')
      expect(listener).not.toHaveBeenCalled()
    })

    it('only removes the specific listener', () => {
      const a = vi.fn()
      const b = vi.fn()
      const unsubA = sm.onChange(a)
      sm.onChange(b)
      unsubA()
      sm.transition('arming')
      expect(a).not.toHaveBeenCalled()
      expect(b).toHaveBeenCalledOnce()
    })
  })

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('resets to idle from any state', () => {
      sm.transition('arming')
      sm.transition('recording')
      sm.reset()
      expect(sm.state).toBe('idle')
    })

    it('calls listeners on reset', () => {
      const listener = vi.fn()
      sm.onChange(listener)
      sm.transition('arming')
      listener.mockClear()
      sm.reset()
      expect(listener).toHaveBeenCalledWith('idle')
    })
  })

  // ---------------------------------------------------------------------------
  // Full lifecycle
  // ---------------------------------------------------------------------------

  describe('full lifecycle', () => {
    it('completes a normal recording session without throwing', () => {
      const states: RecorderState[] = []
      sm.onChange(s => states.push(s))

      sm.transition('arming')
      sm.transition('recording')
      sm.transition('paused')
      sm.transition('recording')
      sm.transition('stopping')
      sm.transition('review_ready')
      sm.transition('idle')

      expect(states).toEqual([
        'arming', 'recording', 'paused', 'recording', 'stopping', 'review_ready', 'idle',
      ])
    })

    it('handles recording → error → idle recovery', () => {
      sm.transition('arming')
      sm.transition('recording')
      sm.transition('error')
      expect(sm.state).toBe('error')

      // error can only go to idle
      expect(sm.canTransition('idle')).toBe(true)
      expect(sm.canTransition('arming')).toBe(false)

      sm.transition('idle')
      expect(sm.state).toBe('idle')
    })

    it('review_ready cannot go back to recording', () => {
      sm.transition('arming')
      sm.transition('recording')
      sm.transition('stopping')
      sm.transition('review_ready')

      expect(sm.canTransition('recording')).toBe(false)
      expect(sm.canTransition('arming')).toBe(false)
      expect(sm.canTransition('idle')).toBe(true)
      expect(sm.canTransition('error')).toBe(true)
    })

    it('paused cannot go directly to idle', () => {
      sm.transition('arming')
      sm.transition('recording')
      sm.transition('paused')

      expect(sm.canTransition('idle')).toBe(false)
    })
  })
})
