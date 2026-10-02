/**
 * Alert notification state — row #292, extended by row #296.
 *
 * The hourly alerts/check job is stateless; without memory it re-sends every
 * firing alert every hour. This module gives it memory WITHOUT a schema change:
 * each real change is one row in the existing `analytics_events` table,
 *   eventName 'alert_notified', source 'server',
 *   properties {"alertId": "<id>", "state": <kind>, ...}
 * (production applies schema changes via a step that can fail quietly, row #12,
 * so a new table is the riskier option; AnalyticsEvent is already durable,
 * indexed on event_name + created_at, and written/read by this same route's
 * dependencies). Per alert, the LATEST row is the state.
 *
 *  - 'firing'   written only AFTER a notification reached >= 1 channel. A failed
 *               delivery writes nothing, so the next hourly run retries
 *               (duplicate over loss, loop 113). Its time drives the reminder.
 *  - 'resolved' written after ALERT_RESOLVE_AFTER_OK_RUNS `ok` runs with no
 *               firing run in between (insufficient_data runs neither count nor
 *               reset), so a later re-fire is a new incident and notifies immediately.
 *               No resolution message is sent: the hourly job is the authority
 *               and a re-fire is announced anyway.
 *  - 'clear'    first non-firing observation of an open incident (spell start)
 *               and the ok-run counter (okRuns). `insufficient_data`
 *               alone never resolves (we cannot tell) and is neutral: it
 *               neither advances nor resets okRuns.
 *  - 'continued' a firing alert seen again after a 'clear' row without a send;
 *               resets the ok counter and the quiet spell.
 *
 * Row #296 - one incident, one page:
 *  - flapping: a re-fire before the ok hysteresis completes is a continuation.
 *  - a firing alert non-firing for >= ALERT_QUIET_NEW_INCIDENT_MS is a new incident.
 *  - a failed state write never suppresses (see unconfirmedWrites). A failed
 *    'firing' write after a successful send -> duplicate next run (accepted).
 *  Steady states write nothing; writes happen only on change.
 */

import { db } from '@/db';
import type { AlertResult } from '@/lib/compute-alerts';

export const ALERT_EVENT_NAME = 'alert_notified';
/** A still-firing alert is re-sent at most this often. */
export const ALERT_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** How far back state is read; must exceed the reminder interval with margin. */
export const ALERT_STATE_LOOKBACK_MS = 8 * 24 * 60 * 60 * 1000;
/**
 * Hysteresis: an alert must evaluate `ok` on this many hourly runs, with
 * no firing run in between, before `resolved` is recorded (insufficient_data
 * runs neither count nor reset the tally). 3 runs ~ 2-3 h of clean signal: 2 would still
 * page every ~3 h on a signal that flaps with a 2 h period; more than 3 delays
 * a genuine re-fire's "new" classification by hours for no gain.
 */
export const ALERT_RESOLVE_AFTER_OK_RUNS = 3;
/**
 * A firing alert non-firing (ok / insufficient_data) for at least this long is a
 * NEW incident when it fires again. `insufficient_data` is weak evidence (it
 * never resolves by itself), so the bar is longer than the ok hysteresis (~3 h)
 * yet well under the 24 h reminder: an overnight low-volume spell followed by a
 * fresh failure is announced, a 1-5 h blip is not.
 */
export const ALERT_QUIET_NEW_INCIDENT_MS = 6 * 60 * 60 * 1000;

export type AlertStateKind = 'firing' | 'resolved' | 'clear' | 'continued';
export interface AlertState {
  state: AlertStateKind;
  atMs: number;
  /** 'clear' rows: ok runs so far (no firing run in between; insufficient_data is neutral). */
  okRuns?: number;
  /** 'clear' rows: when the non-firing spell began. */
  sinceMs?: number;
  /** Time of the latest notification actually sent (latest 'firing' row). */
  notifiedAtMs?: number;
}
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
export interface AlertDecision {
  /** Firing P1/P2 alerts to notify now. */
  sends: AlertSend[];
  /** Firing P1/P2 alerts not re-notified (same incident, within the reminder interval). */
  suppressed: AlertResult[];
  /** Alert ids that completed the ok hysteresis: record `resolved`. */
  resolved: string[];
  /** Non-firing observations to persist (spell start / ok-run counter). */
  clear: AlertClearWrite[];
  /** Alert ids suppressed as a continuation after a non-firing spell: record `continued`. */
  continued: string[];
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
  const continued: string[] = [];

  for (const alert of current) {
    if (alert.severity !== 'P1' && alert.severity !== 'P2') continue;
    const prev = previous[alert.id];

    if (alert.status === 'firing') {
      if (!prev || prev.state === 'resolved') {
        sends.push({ alert, kind: 'new' });
        continue;
      }
      const quietSince = prev.state === 'clear' ? (prev.sinceMs ?? prev.atMs) : null;
      const notifiedAt = prev.notifiedAtMs ?? prev.atMs;
      // A negative gap (clock moved backwards) must never suppress: treat as
      // "send" (duplicate over loss).
      const quietGap = quietSince !== null ? nowMs - quietSince : 0;
      const notifiedGap = nowMs - notifiedAt;
      if (quietSince !== null && (quietGap < 0 || quietGap >= ALERT_QUIET_NEW_INCIDENT_MS)) {
        sends.push({ alert, kind: 'new' });
      } else if (notifiedGap < 0 || notifiedGap >= ALERT_REMINDER_INTERVAL_MS) {
        sends.push({ alert, kind: 'reminder' });
      } else {
        suppressed.push(alert);
        if (prev.state === 'clear') continued.push(alert.id);
      }
    } else if (alert.status === 'ok' && prev && prev.state !== 'resolved') {
      const inClear = prev.state === 'clear';
      const okRuns = (inClear ? (prev.okRuns ?? 0) : 0) + 1;
      if (okRuns >= ALERT_RESOLVE_AFTER_OK_RUNS) {
        resolved.push(alert.id);
      } else {
        clear.push({ id: alert.id, okRuns, sinceMs: inClear ? (prev.sinceMs ?? prev.atMs) : nowMs });
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
      const next: AlertState = { state: state as AlertStateKind, atMs };
      if (typeof p['okRuns'] === 'number') next.okRuns = p['okRuns'];
      if (typeof p['sinceMs'] === 'number') next.sinceMs = p['sinceMs'];
      states[alertId] = next;
    }
  }
  for (const [id, at] of Object.entries(notified)) {
    const s = states[id];
    if (s) s.notifiedAtMs = at;
  }
  return states;
}

export async function loadAlertStates(nowMs: number): Promise<AlertStates> {
  const rows = (await db.analyticsEvent.findMany({
    where: {
      eventName: ALERT_EVENT_NAME,
      // Row #295: only rows this server wrote; never a client-ingested row.
      source: 'server',
      createdAt: { gte: new Date(nowMs - ALERT_STATE_LOOKBACK_MS) },
    },
    select: { properties: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })) as { properties: string | null; createdAt: Date }[];
  return reduceAlertStates(rows);
}

/**
 * Alerts whose last state write FAILED in this process. Their stored state is
 * stale (a failed `resolved` write leaves `firing`, which would suppress the
 * next re-fire: a LOSS). `withoutUnconfirmed` discards it so the next decision
 * is "no memory" -> notify: duplicate-shaped. Process-local by necessity (the
 * store is what failed); a restart between the failed write and the next run
 * forgets it (residual, row #296).
 */
const unconfirmedWrites = new Set<string>();

export function withoutUnconfirmed(states: AlertStates): AlertStates {
  if (unconfirmedWrites.size === 0) return states;
  const out: AlertStates = {};
  for (const [id, s] of Object.entries(states)) if (!unconfirmedWrites.has(id)) out[id] = s;
  return out;
}

export function clearUnconfirmedAlertWrites(): void {
  unconfirmedWrites.clear();
}

/** Record a state change. Never throws; returns false on failure (caller reports it). */
export async function recordAlertState(
  alertId: string,
  state: AlertStateKind,
  nowMs: number,
  extra: { okRuns?: number; sinceMs?: number } = {},
): Promise<boolean> {
  try {
    await db.analyticsEvent.create({
      data: {
        eventName: ALERT_EVENT_NAME,
        properties: JSON.stringify({ alertId, state, ...extra }),
        source: 'server',
        createdAt: new Date(nowMs),
      },
    });
    unconfirmedWrites.delete(alertId);
    return true;
  } catch (err) {
    unconfirmedWrites.add(alertId);
    console.error('[alert-state] failed to record state (next run ignores stale state and may re-send):', err);
    return false;
  }
}
