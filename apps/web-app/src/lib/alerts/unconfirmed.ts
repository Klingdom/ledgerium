/**
 * Alerts whose last state write FAILED in this process. Their stored state is
 * stale (a failed `resolved` write leaves `firing`, which would suppress the next
 * re-fire: a LOSS). `withoutUnconfirmed` discards it so the next decision is "no
 * memory" -> notify: duplicate-shaped. Process-local by necessity (the store is
 * what failed); a restart or second instance between the failed write and the next
 * run forgets it (known residual, rows #296/#297 (5)).
 */
import type { AlertStates } from './state-machine';

const unconfirmedWrites = new Set<string>();

export function markWriteFailed(alertId: string): void {
  unconfirmedWrites.add(alertId);
}
export function markWriteConfirmed(alertId: string): void {
  unconfirmedWrites.delete(alertId);
}

export function withoutUnconfirmed(states: AlertStates): AlertStates {
  if (unconfirmedWrites.size === 0) return states;
  const out: AlertStates = {};
  for (const [id, s] of Object.entries(states)) if (!unconfirmedWrites.has(id)) out[id] = s;
  return out;
}

export function clearUnconfirmedAlertWrites(): void {
  unconfirmedWrites.clear();
}
