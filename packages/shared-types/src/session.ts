export type RecorderState =
  | 'idle'
  | 'arming'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'review_ready'
  | 'error';

export type RecorderStateTransition = {
  from: RecorderState;
  to: RecorderState;
  at: number;
  reason?: string;
};

export interface SessionMeta {
  sessionId: string;
  activityName: string;
  startedAt: string;
  endedAt?: string;
  state: RecorderState;
  pauseIntervals: Array<{ pausedAt: string; resumedAt?: string }>;
  schemaVersion: string;
  recorderVersion: string;
  uploadUrl?: string;
}

export const VALID_TRANSITIONS: Record<RecorderState, RecorderState[]> = {
  idle: ['arming', 'error'],
  arming: ['recording', 'idle', 'error'],
  recording: ['paused', 'stopping', 'error'],
  paused: ['recording', 'stopping', 'error'],
  stopping: ['review_ready', 'error'],
  review_ready: ['idle', 'error'],
  error: ['idle'],
} as const;

export function isValidTransition(from: RecorderState, to: RecorderState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed.includes(to);
}
