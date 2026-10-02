/**
 * DB adapter for alert state: `alert_notified` rows in `analytics_events`
 * (source 'server', properties {"alertId","state",...}); no schema change (row #292).
 *
 * Read (row #297): per alert, the latest row (one bounded `findFirst`) plus, only
 * when that row is not itself a 'firing' row, the latest 'firing' row for
 * notifiedAtMs. No shared window, so volume from other alerts cannot push an
 * alert's state out. The alert ids come from the evaluated alerts, not a
 * hard-coded list. Both queries are bounded by ALERT_STATE_LOOKBACK_MS.
 *
 * Retention (row #297 (2)): none of its own, deliberately. Writes happen only on
 * state change; the 90-day analytics cleanup already bounds the table; and a
 * dedicated prune could delete the only state row of a long-steady alert. The
 * per-alert read makes row count irrelevant to correctness.
 */
import { db } from '@/db';
import {
  ALERT_EVENT_NAME,
  ALERT_STATE_LOOKBACK_MS,
  reduceAlertStates,
  type AlertStateKind,
  type AlertStates,
} from './state-machine';
import { markWriteConfirmed, markWriteFailed } from './unconfirmed';

type Row = { properties: string | null; createdAt: Date };

export async function loadAlertStates(nowMs: number, alertIds: readonly string[]): Promise<AlertStates> {
  const since = new Date(nowMs - ALERT_STATE_LOOKBACK_MS);
  const latest = (needles: readonly string[]): Promise<Row | null> =>
    db.analyticsEvent.findFirst({
      where: {
        eventName: ALERT_EVENT_NAME,
        // Row #295: only rows this server wrote; never a client-ingested row.
        source: 'server',
        createdAt: { gte: since },
        // Independent filters: key order inside the stored JSON must not matter (D4 M1).
        AND: needles.map((n) => ({ properties: { contains: n } })),
      },
      select: { properties: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Row | null>;

  const perAlert = await Promise.all(
    [...new Set(alertIds)].map(async (id) => {
      const idNeedle = `"alertId":${JSON.stringify(id)}`;
      const newest = await latest([idNeedle]);
      if (!newest) return [];
      if ((newest.properties ?? '').includes('"state":"firing"')) return [newest];
      const lastFiring = await latest([idNeedle, '"state":"firing"']);
      return lastFiring ? [newest, lastFiring] : [newest];
    }),
  );
  return reduceAlertStates(perAlert.flat());
}

/** Record a state change. Never throws; returns false on failure (caller reports it). */
export async function recordAlertState(
  alertId: string,
  state: AlertStateKind,
  nowMs: number,
  extra: { okRuns?: number; sinceMs?: number; firingRuns?: number } = {},
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
    markWriteConfirmed(alertId);
    return true;
  } catch (err) {
    markWriteFailed(alertId);
    console.error('[alert-state] failed to record state (next run ignores stale state and may re-send):', err);
    return false;
  }
}
