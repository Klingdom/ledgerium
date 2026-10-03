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
 */

import type { ColumnKey, SavedView } from '@/lib/dashboard-columns/index.js';

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
}

/** What to put on the wire for one PUT. */
export interface SendPayload {
  readonly visibleColumns: readonly ColumnKey[];
  /** undefined = omit the field (server keeps its stored list). */
  readonly savedViews: readonly SavedView[] | undefined;
}

export function createSyncState(confirmed: readonly SavedView[] = []): SavedViewsSyncState {
  return { pending: undefined, confirmed, inFlight: false, dirty: false, columns: undefined };
}

/** The server returned its list (initial GET): that is the confirmed baseline. */
export function adoptServerList(
  state: SavedViewsSyncState,
  list: readonly SavedView[],
): SavedViewsSyncState {
  return { ...state, confirmed: list };
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
  if (sent === undefined) return { ...state, inFlight: false };
  return {
    ...state,
    inFlight: false,
    confirmed: sent,
    // A newer list queued while this PUT was in flight stays pending.
    pending: state.pending === sent ? undefined : state.pending,
  };
}

/**
 * PUT failed for `sent`. Returns the next state plus the list the UI should
 * show again (null = leave the UI list alone: nothing was sent, a newer list
 * is queued, or a deferred save is waiting and will carry the current list —
 * rolling back then would show the old list while the server receives the new).
 */
export function settleFailure(
  state: SavedViewsSyncState,
  sent: readonly SavedView[] | undefined,
): { state: SavedViewsSyncState; rollbackTo: readonly SavedView[] | null } {
  const settled = { ...state, inFlight: false };
  if (sent === undefined || state.pending !== sent || state.dirty) {
    return { state: settled, rollbackTo: null };
  }
  return {
    state: { ...settled, pending: undefined },
    rollbackTo: state.confirmed,
  };
}
