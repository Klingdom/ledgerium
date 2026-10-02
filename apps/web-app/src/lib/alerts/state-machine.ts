/**
 * Alert notification state machine (pure) - rows #292, #296, #297.
 * No I/O, no clock: `nowMs` is injected. Persistence is alerts/store.ts; the
 * process-local unconfirmed-write set is alerts/unconfirmed.ts.
 *
 * State is one `alert_notified` row per real change (see store.ts); per alert the
 * LATEST row is the state:
 *  - 'firing'    written only AFTER a notification reached >= 1 channel (a failed
 *                delivery writes nothing, so the next run retries: duplicate over
 *                loss). Its time drives the 24 h reminder.
 *  - 'resolved'  ALERT_RESOLVE_AFTER_OK_RUNS `ok` runs with no firing run between
 *                (insufficient_data neither counts nor resets). A later re-fire is
 *                a new incident. No resolution message is sent.
 *  - 'clear'     first non-firing observation of an open incident; carries the ok
 *                counter (okRuns) and spell start (sinceMs).
 *  - 'continued' a firing alert seen again after a 'clear' without a send; carries
 *                firingRuns (consecutive firing runs since the clear) for re-arm.
 *
 * Re-arm (row #297 (4)): a continuation is paged as a NEW notification once it
 * has fired ALERT_REARM_AFTER_FIRING_RUNS consecutive runs after a clear AND the
 * last page is >= ALERT_REARM_MIN_GAP_MS old. R=2: one firing run after a clear
 * can be a blip, two in a row is a sustained signal. This bounds the silence for a
 * second outage at ~R h instead of the 24 h reminder (~21 h). Flapping is not
 * affected: hourly alternation never produces 2 consecutive firing runs, so it
 * still pages once per 24 h. The min gap is the hysteresis path's floor
 * ((3 ok + 1 fire) runs = 4 h): a signal with period 3 (fire, fire, ok) cannot page
 * faster than a signal that fully resolves and re-fires would (every 4 h).
 */

import type { AlertResult } from '@/lib/compute-alerts';

export const ALERT_EVENT_NAME = 'alert_notified';
/** A still-firing alert is re-sent at most this often. */
export const ALERT_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** How far back state is read; must exceed the reminder interval with margin. */
export const ALERT_STATE_LOOKBACK_MS = 8 * 24 * 60 * 60 * 1000;
/**
 * Hysteresis: `ok` on this many runs, no firing run between, before `resolved`.
 * 2 would page every ~3 h on a signal that flaps with a 2 h period; more than 3
 * delays a genuine re-fire's "new" classification for no gain.
 */
export const ALERT_RESOLVE_AFTER_OK_RUNS = 3;
/**
 * A firing alert non-firing for >= this long is a NEW incident when it fires again
 * (longer than the ok hysteresis, well under the 24 h reminder).
 */
export const ALERT_QUIET_NEW_INCIDENT_MS = 6 * 60 * 60 * 1000;
/** Consecutive firing runs after a clear that re-arm paging (row #297). */
export const ALERT_REARM_AFTER_FIRING_RUNS = 2;
/** Minimum time since the last page for a re-arm (the hourly job's 4-run floor). */
export const ALERT_REARM_MIN_GAP_MS = (ALERT_RESOLVE_AFTER_OK_RUNS + 1) * 60 * 60 * 1000;

interface AlertStateBase {
  atMs: number;
  /** Time of the latest notification actually sent (latest 'firing' row). */
  notifiedAtMs?: number;
}
export type AlertState =
  | (AlertStateBase & { state: 'firing' })
  | (AlertStateBase & { state: 'resolved' })
  | (AlertStateBase & { state: 'clear'; okRuns: number; sinceMs: number })
  /** firingRuns undefined = legacy row written before re-arm: never re-arms. */
  | (AlertStateBase & { state: 'continued'; firingRuns?: number });
export type AlertStateKind = AlertState['state'];
export type AlertStates = Record<string, AlertState>;

export interface AlertSend {
  alert: AlertResult;
  kind: 'new' | 'reminder';
}
export interface AlertClearWrite {
  id: string;
  okRuns: number;
  sinceMs: number;
}
export interface AlertContinuedWrite {
  id: string;
  firingRuns: number;
}
export interface AlertDecision {
  /** Firing P1/P2 alerts to notify now. */
  sends: AlertSend[];
  /** Firing P1/P2 alerts not re-notified (same incident, within the reminder interval). */
  suppressed: AlertResult[];
  /** Alert ids that completed the ok hysteresis: record `resolved`. */
  resolved: string[];
  /** Non-firing observations to persist (spell start / ok-run counter). */
  clear: AlertClearWrite[];
  /** Continuations to persist (counts firing runs toward re-arm). */
  continued: AlertContinuedWrite[];
}

/** Pure. Decide what to send from the last recorded state per alert. */
export function decideAlertSends(
  previous: AlertStates,
  current: AlertResult[],
  nowMs: number,
): AlertDecision {
  const sends: AlertSend[] = [];
  const suppressed: AlertResult[] = [];
  const resolved: string[] = [];
  const clear: AlertClearWrite[] = [];
  const continued: AlertContinuedWrite[] = [];

  for (const alert of current) {
    if (alert.severity !== 'P1' && alert.severity !== 'P2') continue;
    const prev = previous[alert.id];

    if (alert.status === 'firing') {
      if (!prev || prev.state === 'resolved') {
        sends.push({ alert, kind: 'new' });
        continue;
      }
      const quietSince = prev.state === 'clear' ? prev.sinceMs : null;
      const notifiedAt = prev.notifiedAtMs ?? prev.atMs;
      // A negative gap (clock moved backwards) must never suppress: treat as
      // "send" (duplicate over loss).
      const quietGap = quietSince !== null ? nowMs - quietSince : 0;
      const notifiedGap = nowMs - notifiedAt;
      // Consecutive firing runs since the clear, including this one. Legacy
      // 'continued' rows (no counter) never re-arm.
      const runs =
        prev.state === 'clear' ? 1
        : prev.state === 'continued' && prev.firingRuns !== undefined ? prev.firingRuns + 1
        : null;
      if (quietSince !== null && (quietGap < 0 || quietGap >= ALERT_QUIET_NEW_INCIDENT_MS)) {
        sends.push({ alert, kind: 'new' });
      } else if (notifiedGap < 0 || notifiedGap >= ALERT_REMINDER_INTERVAL_MS) {
        sends.push({ alert, kind: 'reminder' });
      } else if (runs !== null && runs >= ALERT_REARM_AFTER_FIRING_RUNS && notifiedGap >= ALERT_REARM_MIN_GAP_MS) {
        sends.push({ alert, kind: 'new' });
      } else {
        suppressed.push(alert);
        // Persist only while still counting toward re-arm (steady states write nothing).
        if (runs !== null && runs < ALERT_REARM_AFTER_FIRING_RUNS) {
          continued.push({ id: alert.id, firingRuns: runs });
        }
      }
    } else if (alert.status === 'ok' && prev && prev.state !== 'resolved') {
      const okRuns = (prev.state === 'clear' ? prev.okRuns : 0) + 1;
      if (okRuns >= ALERT_RESOLVE_AFTER_OK_RUNS) {
        resolved.push(alert.id);
      } else {
        clear.push({ id: alert.id, okRuns, sinceMs: prev.state === 'clear' ? prev.sinceMs : nowMs });
      }
    } else if (alert.status === 'insufficient_data' && prev && (prev.state === 'firing' || prev.state === 'continued')) {
      // Start of a quiet spell; further insufficient runs write nothing. Never resolves.
      clear.push({ id: alert.id, okRuns: 0, sinceMs: nowMs });
    }
  }
  return { sends, suppressed, resolved, clear, continued };
}

const KINDS: readonly string[] = ['firing', 'resolved', 'clear', 'continued'];

/** Latest recorded state per alert id (rows may arrive in any order). */
export function reduceAlertStates(
  rows: { properties: string | null; createdAt: Date }[],
): AlertStates {
  const states: AlertStates = {};
  const notified: Record<string, number> = {};
  for (const row of rows) {
    if (!row.properties) continue;
    let p: Record<string, unknown>;
    try {
      p = JSON.parse(row.properties) as Record<string, unknown>;
    } catch {
      continue; // malformed row: ignore (treated as no state -> notify; duplicate over loss)
    }
    const alertId = p['alertId'];
    const state = p['state'];
    if (typeof alertId !== 'string' || typeof state !== 'string' || !KINDS.includes(state)) continue;
    const atMs = row.createdAt.getTime();
    if (state === 'firing' && atMs > (notified[alertId] ?? -Infinity)) notified[alertId] = atMs;
    const existing = states[alertId];
    if (!existing || atMs > existing.atMs) {
      const num = (k: string): number | undefined => (typeof p[k] === 'number' ? (p[k] as number) : undefined);
      let next: AlertState;
      switch (state as AlertStateKind) {
        case 'clear':
          next = { state: 'clear', atMs, okRuns: num('okRuns') ?? 0, sinceMs: num('sinceMs') ?? atMs };
          break;
        case 'continued': {
          const firingRuns = num('firingRuns');
          next = firingRuns === undefined ? { state: 'continued', atMs } : { state: 'continued', atMs, firingRuns };
          break;
        }
        case 'firing':
          next = { state: 'firing', atMs };
          break;
        case 'resolved':
          next = { state: 'resolved', atMs };
          break;
      }
      states[alertId] = next;
    }
  }
  for (const [id, at] of Object.entries(notified)) {
    const s = states[id];
    if (s) s.notifiedAtMs = at;
  }
  return states;
}
