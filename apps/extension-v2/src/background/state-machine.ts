import type { RecorderState } from '../shared/types.js'

const VALID_TRANSITIONS: Record<RecorderState, RecorderState[]> = {
  idle:         ['arming', 'error'],
  arming:       ['recording', 'idle', 'error'],
  recording:    ['paused', 'stopping', 'error'],
  paused:       ['recording', 'stopping', 'error'],
  stopping:     ['review_ready', 'error'],
  review_ready: ['idle', 'error'],
  error:        ['idle'],
}

export class RecorderStateMachine {
  private _state: RecorderState = 'idle'
  private _listeners: Array<(state: RecorderState) => void> = []

  get state(): RecorderState {
    return this._state
  }

  canTransition(to: RecorderState): boolean {
    return VALID_TRANSITIONS[this._state]?.includes(to) ?? false
  }

  transition(to: RecorderState): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid state transition: ${this._state} → ${to}`)
    }
    this._state = to
    this._listeners.forEach(fn => fn(this._state))
  }

  onChange(fn: (state: RecorderState) => void): () => void {
    this._listeners.push(fn)
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn)
    }
  }

  reset(): void {
    this._state = 'idle'
    this._listeners.forEach(fn => fn(this._state))
  }
}
