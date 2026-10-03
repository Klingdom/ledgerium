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
 */

import type { SavedView } from '@/lib/dashboard-columns/index.js';

export interface SavedViewsSyncState {
  /** Latest saved-views list not yet confirmed by the server; undefined = none. */
  readonly pending: readonly SavedView[] | undefined;
  /** Last list the server is known to hold. */
  readonly confirmed: readonly SavedView[];
}

export function createSyncState(confirmed: readonly SavedView[] = []): SavedViewsSyncState {
  return { pending: undefined, confirmed };
}

/** The server returned its list (initial GET): that is the confirmed baseline. */
export function adoptServerList(
  state: SavedViewsSyncState,
  list: readonly SavedView[],
): SavedViewsSyncState {
  return { pending: state.pending, confirmed: list };
}

/**
 * A save was scheduled. `incoming` is the caller's saved-views change, or
 * undefined for a column-only change — which must NOT drop a pending list.
 */
export function queueSave(
  state: SavedViewsSyncState,
  incoming: readonly SavedView[] | undefined,
): SavedViewsSyncState {
  return incoming === undefined ? state : { ...state, pending: incoming };
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
  if (sent === undefined) return state;
  return {
    confirmed: sent,
    // A newer list queued while this PUT was in flight stays pending.
    pending: state.pending === sent ? undefined : state.pending,
  };
}

/**
 * PUT failed for `sent`. Returns the next state plus the list the UI should
 * show again (null = leave the UI list alone: nothing was sent, or a newer
 * change is queued and will be retried by its own save).
 */
export function settleFailure(
  state: SavedViewsSyncState,
  sent: readonly SavedView[] | undefined,
): { state: SavedViewsSyncState; rollbackTo: readonly SavedView[] | null } {
  if (sent === undefined || state.pending !== sent) {
    return { state, rollbackTo: null };
  }
  return {
    state: { pending: undefined, confirmed: state.confirmed },
    rollbackTo: state.confirmed,
  };
}
