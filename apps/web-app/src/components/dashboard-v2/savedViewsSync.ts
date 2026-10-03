/**
 * savedViewsSync.ts  (backlog #369)
 *
 * Pure bookkeeping for the debounced preferences PUT in DashboardV2Shell.
 *
 * The server treats an absent `savedViews` field as "keep the stored list".
 * The shell debounces every PUT and cancels the pending one, so a column-only
 * save that lands inside the window used to REPLACE a pending saved-views
 * change and the view was never sent. This module keeps the latest un-sent
 * saved-views list (`pending`) so every later save carries it, and remembers
 * the last list the server confirmed (`confirmed`) so a failed PUT can roll
 * the UI back instead of showing a list the server does not have.
 *
 * #372: at most ONE PUT is in flight. A save that comes due while one is
 * unanswered only marks the state `dirty`; when the in-flight PUT settles, ONE
 * follow-up PUT carries the latest columns + latest pending list. Without this
 * two PUTs race and the route (which replaces the whole list) keeps whichever
 * arrives last, which can be the older one.
 *
 * #384: until the initial preferences GET has succeeded (`baselineLoaded`) the
 * client does not know what the server holds, so NOTHING is sent: a whole-list
 * replace built on an unknown list would erase the stored views and library
 * pack. A column edit made before then stays queued (`columns`); adopting the
 * baseline marks it `dirty` so the caller releases it with `takeQueued`.
 */

import type { ColumnKey, SavedView } from '@/lib/dashboard-columns/index.js';

/** #374: a PUT unanswered this long is aborted client-side (same value as CONFIRM_REQUEST_TIMEOUT_MS). */
export const PREFERENCES_PUT_TIMEOUT_MS = 15_000;

export interface SavedViewsSyncState {
  /** Latest saved-views list not yet confirmed by the server; undefined = none. */
  readonly pending: readonly SavedView[] | undefined;
  /** Last list the server is known to hold. */
  readonly confirmed: readonly SavedView[];
  /** A PUT has been sent and not yet settled. */
  readonly inFlight: boolean;
  /** A save came due while a PUT was in flight; send the latest after it settles. */
  readonly dirty: boolean;
  /** Latest visible-columns list requested by the UI. */
  readonly columns: readonly ColumnKey[] | undefined;
  /** #374: the last PUT timed out (outcome unknown); the next send is the one reconcile attempt. */
  readonly reconciling: boolean;
  /** #384: the initial GET succeeded; until true no PUT may be built. */
  readonly baselineLoaded: boolean;
}

/** What to put on the wire for one PUT. */
export interface SendPayload {
  readonly visibleColumns: readonly ColumnKey[];
  /** undefined = omit the field (server keeps its stored list). */
  readonly savedViews: readonly SavedView[] | undefined;
}

export function createSyncState(confirmed: readonly SavedView[] = []): SavedViewsSyncState {
  return {
    pending: undefined,
    confirmed,
    inFlight: false,
    dirty: false,
    columns: undefined,
    reconciling: false,
    baselineLoaded: false,
  };
}

/**
 * The server returned its list (initial GET, or a later reconcile): that is
 * the confirmed baseline. The first adoption also releases a column change
 * queued before the baseline was known (dirty -> takeQueued sends it).
 */
export function adoptServerList(
  state: SavedViewsSyncState,
  list: readonly SavedView[],
): SavedViewsSyncState {
  const releasesQueued = !state.baselineLoaded && state.columns !== undefined;
  return {
    ...state,
    confirmed: list,
    baselineLoaded: true,
    dirty: state.dirty || releasesQueued,
  };
}

/**
 * A save was scheduled. `incoming` is the caller's saved-views change, or
 * undefined for a column-only change — which must NOT drop a pending list.
 */
export function queueSave(
  state: SavedViewsSyncState,
  incoming: readonly SavedView[] | undefined,
  columns?: readonly ColumnKey[],
): SavedViewsSyncState {
  const withColumns = columns === undefined ? state : { ...state, columns };
  return incoming === undefined ? withColumns : { ...withColumns, pending: incoming };
}

/**
 * The debounce fired. If a PUT is in flight, defer (mark dirty, send nothing);
 * otherwise start one with the latest state.
 */
export function dueSave(
  state: SavedViewsSyncState,
): { state: SavedViewsSyncState; send: SendPayload | null } {
  if (state.inFlight) return { state: { ...state, dirty: true }, send: null };
  return startSend(state);
}

/**
 * Called after a PUT settles (success or failure): if a save was deferred,
 * start ONE PUT carrying the latest state, otherwise null.
 */
export function takeQueued(
  state: SavedViewsSyncState,
): { state: SavedViewsSyncState; send: SendPayload | null } {
  if (!state.dirty) return { state, send: null };
  return startSend(state);
}

function startSend(
  state: SavedViewsSyncState,
): { state: SavedViewsSyncState; send: SendPayload | null } {
  // #384: baseline unknown — send nothing; the queued columns stay queued.
  if (!state.baselineLoaded) return { state, send: null };
  if (state.columns === undefined) return { state: { ...state, dirty: false }, send: null };
  return {
    state: { ...state, inFlight: true, dirty: false },
    send: { visibleColumns: state.columns, savedViews: state.pending },
  };
}

/** The savedViews value to put on the wire (undefined = omit the field). */
export function payloadSavedViews(state: SavedViewsSyncState): readonly SavedView[] | undefined {
  return state.pending;
}

/** PUT succeeded for `sent`. */
export function settleSuccess(
  state: SavedViewsSyncState,
  sent: readonly SavedView[] | undefined,
): SavedViewsSyncState {
  if (sent === undefined) return { ...state, inFlight: false, reconciling: false };
  return {
    ...state,
    inFlight: false,
    reconciling: false,
    confirmed: sent,
    // A newer list queued while this PUT was in flight stays pending.
    pending: state.pending === sent ? undefined : state.pending,
  };
}

/** Result of a failed/aborted PUT. `reconcile` = outcome unknown: GET the server's state (#380). */
export interface SettleFailureResult {
  readonly state: SavedViewsSyncState;
  readonly rollbackTo: readonly SavedView[] | null;
  readonly reconcile: boolean;
}

/**
 * PUT failed for `sent`. Returns the next state plus the list the UI should
 * show again (null = leave the UI list alone: nothing was sent, a newer list
 * is queued, or a deferred save is waiting and will carry the current list —
 * rolling back then would show the old list while the server receives the new).
 *
 * #380: a failure while `reconciling` (the re-send after a timeout) has an
 * UNKNOWN outcome — the first PUT may have been applied — so it never rolls
 * back; see `settleUnknown`. A plain definite failure is unchanged.
 */
export function settleFailure(
  state: SavedViewsSyncState,
  sent: readonly SavedView[] | undefined,
): SettleFailureResult {
  if (state.reconciling) return settleUnknown(state, sent);
  const settled = { ...state, inFlight: false, reconciling: false };
  if (sent === undefined || state.pending !== sent || state.dirty) {
    return { state: settled, rollbackTo: null, reconcile: false };
  }
  return {
    state: { ...settled, pending: undefined },
    rollbackTo: state.confirmed,
    reconcile: false,
  };
}

/**
 * #380: the outcome of the last PUT is unknown (the re-send after a timeout
 * also failed or aborted). Never roll back. If nothing newer is queued the
 * caller must GET the server's state (`reconcile: true`) and then call
 * `reconcileAdopt` / `reconcileFailed`. If a newer change is queued (`dirty`
 * or a newer pending list) that PUT carries the latest whole state;
 * `reconciling` stays set so its failure is also treated as unknown.
 */
function settleUnknown(
  state: SavedViewsSyncState,
  sent: readonly SavedView[] | undefined,
): SettleFailureResult {
  const newer = state.dirty || state.pending !== sent;
  return {
    state: { ...state, inFlight: false, reconciling: true },
    rollbackTo: null,
    reconcile: !newer,
  };
}

/**
 * The reconcile GET succeeded with the server's list (and library columns, if
 * stored). Unless a newer local change exists (`dirty`, a flight, an armed
 * debounce timer, or a pending list other than `sent`) the server's state is
 * adopted (`adopt: true`; the caller shows the server's list and columns).
 * With a newer change nothing is adopted: that change still sends, carrying the
 * whole latest state; only the confirmed baseline is refreshed.
 */
export function reconcileAdopt(
  state: SavedViewsSyncState,
  serverList: readonly SavedView[],
  sent: readonly SavedView[] | undefined,
  hasArmedTimer: boolean,
  serverColumns?: readonly ColumnKey[],
): { state: SavedViewsSyncState; adopt: boolean } {
  const newer = state.dirty || state.inFlight || hasArmedTimer || state.pending !== sent;
  if (newer) {
    return { state: { ...state, confirmed: serverList, reconciling: false }, adopt: false };
  }
  return {
    state: {
      ...state,
      confirmed: serverList,
      pending: undefined,
      columns: serverColumns ?? state.columns,
      reconciling: false,
    },
    adopt: true,
  };
}

/** The reconcile GET failed: keep the UI and pending list; the baseline stays loaded (stale). */
export function reconcileFailed(state: SavedViewsSyncState): SavedViewsSyncState {
  return { ...state, reconciling: false };
}

/**
 * #374: the PUT was aborted by the client timeout. Unlike a definite failure
 * (HTTP error) the server MAY have applied it, so rolling back to `confirmed`
 * could show a list older than the server's. The route replaces the whole
 * list, so re-sending the latest state is idempotent and converges server and
 * UI: mark dirty (the caller then runs takeQueued) and do not roll back. This
 * is allowed ONCE (`reconciling`); #380: if the reconcile PUT also fails or
 * times out the outcome is unknown and the caller reconciles with a GET.
 */
export function settleTimeout(
  state: SavedViewsSyncState,
  sent: readonly SavedView[] | undefined,
): SettleFailureResult {
  if (state.reconciling) return settleUnknown(state, sent);
  return {
    state: { ...state, inFlight: false, dirty: true, reconciling: true },
    rollbackTo: null,
    reconcile: false,
  };
}
