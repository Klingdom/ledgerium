/**
 * Alert notification state — row #292.
 *
 * The hourly alerts/check job is stateless; without memory it re-sends every
 * firing alert every hour. This module gives it memory WITHOUT a schema change:
 * each real change is one row in the existing `analytics_events` table,
 *   eventName 'alert_notified', source 'server',
 *   properties {"alertId": "<id>", "state": "firing" | "resolved"}
 * (production applies schema changes via a step that can fail quietly, row #12,
 * so a new table is the riskier option; AnalyticsEvent is already durable,
 * indexed on event_name + created_at, and written/read by this same route's
 * dependencies). Per alert, the LATEST row is the state.
 *
 *  - 'firing'   written only AFTER a notification reached >= 1 channel. A failed
 *               delivery writes nothing, so the next hourly run retries
 *               (duplicate over loss, loop 113).
 *  - 'resolved' written when a previously-firing alert evaluates `ok`, so a
 *               later re-fire is a new transition and notifies immediately.
 *               No resolution message is sent: the hourly job is the authority
 *               and a re-fire is announced anyway; an extra "all clear" is one
 *               more message per incident for no decision it enables.
 *               `insufficient_data` neither resolves nor re-notifies (we cannot
 *               tell, so the firing state is kept).
 */

import { db } from '@/db';
import type { AlertResult } from '@/lib/compute-alerts';

export const ALERT_EVENT_NAME = 'alert_notified';
/** A still-firing alert is re-sent at most this often. */
export const ALERT_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** How far back state is read; must exceed the reminder interval with margin. */
export const ALERT_STATE_LOOKBACK_MS = 8 * 24 * 60 * 60 * 1000;

export type AlertStateKind = 'firing' | 'resolved';
export interface AlertState {
  state: AlertStateKind;
  atMs: number;
}
export type AlertStates = Record<string, AlertState>;

export interface AlertSend {
  alert: AlertResult;
  kind: 'new' | 'reminder';
}
export interface AlertDecision {
  /** Firing P1/P2 alerts to notify now. */
  sends: AlertSend[];
  /** Firing P1/P2 alerts already notified within the reminder interval. */
  suppressed: AlertResult[];
  /** Alert ids that were firing and are now `ok`: record `resolved`. */
  resolved: string[];
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

  for (const alert of current) {
    if (alert.severity !== 'P1' && alert.severity !== 'P2') continue;
    const prev = previous[alert.id];

    if (alert.status === 'firing') {
      if (!prev || prev.state === 'resolved') {
        sends.push({ alert, kind: 'new' });
      } else if (nowMs - prev.atMs >= ALERT_REMINDER_INTERVAL_MS) {
        sends.push({ alert, kind: 'reminder' });
      } else {
        suppressed.push(alert);
      }
    } else if (alert.status === 'ok' && prev?.state === 'firing') {
      resolved.push(alert.id);
    }
  }
  return { sends, suppressed, resolved };
}

/** Latest recorded state per alert id (rows may arrive in any order). */
export function reduceAlertStates(
  rows: { properties: string | null; createdAt: Date }[],
): AlertStates {
  const states: AlertStates = {};
  for (const row of rows) {
    if (!row.properties) continue;
    let alertId: unknown;
    let state: unknown;
    try {
      const p = JSON.parse(row.properties) as Record<string, unknown>;
      alertId = p['alertId'];
      state = p['state'];
    } catch {
      continue; // malformed row: ignore (treated as no state -> notify; duplicate over loss)
    }
    if (typeof alertId !== 'string' || (state !== 'firing' && state !== 'resolved')) continue;
    const atMs = row.createdAt.getTime();
    const existing = states[alertId];
    if (!existing || atMs > existing.atMs) states[alertId] = { state, atMs };
  }
  return states;
}

export async function loadAlertStates(nowMs: number): Promise<AlertStates> {
  const rows = (await db.analyticsEvent.findMany({
    where: {
      eventName: ALERT_EVENT_NAME,
      createdAt: { gte: new Date(nowMs - ALERT_STATE_LOOKBACK_MS) },
    },
    select: { properties: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })) as { properties: string | null; createdAt: Date }[];
  return reduceAlertStates(rows);
}

/** Record a state change. Never throws: a failed write only means a duplicate next run. */
export async function recordAlertState(
  alertId: string,
  state: AlertStateKind,
  nowMs: number,
): Promise<boolean> {
  try {
    await db.analyticsEvent.create({
      data: {
        eventName: ALERT_EVENT_NAME,
        properties: JSON.stringify({ alertId, state }),
        source: 'server',
        createdAt: new Date(nowMs),
      },
    });
    return true;
  } catch (err) {
    console.error('[alert-state] failed to record state (next run will re-send):', err);
    return false;
  }
}
