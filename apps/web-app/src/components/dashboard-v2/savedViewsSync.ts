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
 *
 * #386: before the baseline the client does not know the user's stored library
 * pack either (the visible pack is only the default), so a pre-load column edit
 * is NOT stored as a whole pack. A toggle is recorded as a delta (`preload`:
 * key on/off, last write per key wins) and replayed onto the adopted server
 * pack; a whole-pack choice (preset / view apply) is recorded as `base` and
 * later toggles replay on top of it. `adoptServerList` resolves the result into
 * `columns`.
 *
 * #387: `edits` counts every local change that would be sent (`queueSave`, a
 * pre-load toggle or pack choice). A reconcile GET records it before the
 * request and adopts the server's state only if it is unchanged: a change made
 * while the GET was out may already be confirmed (so no flag shows it) and the
 * GET's answer predates it.
 *
 * #403 (row #103): the user's default time range rides the same machinery.
 * `range` is the latest range the USER chose that the server has not confirmed
 * (undefined = nothing to send: a range that came from the URL or from the
 * server is never sent back). A range choice counts as an edit (#387), is held
 * until the baseline is known (#384), is sent in the whole-document PUT (always
 * with the library columns; the route requires them), and is cleared when that
 * PUT succeeds unless a newer choice arrived meanwhile. A reconcile adopts the
 * server's range only when the user has chosen one this session (`rangeTouched`)
 * so a URL override is not replaced by a stored value the user never touched.
 *
 * #381: save on leave. `confirmedColumns` is the library pack the server is
 * known to hold (adopted from the GET, or the columns of the last PUT that
 * succeeded). `planLeaveFlush` decides, from PERSISTED state only (`columns` is
 * already `columnsToPersist`, so a lens-only change never differs), whether
 * anything is unsent, and builds the whole-document body for a keepalive PUT.
 */

import type { ColumnKey, SavedView, TimeRange } from '@/lib/dashboard-columns/index.js';

/** #374: a PUT unanswered this long is aborted client-side (same value as CONFIRM_REQUEST_TIMEOUT_MS). */
export const PREFERENCES_PUT_TIMEOUT_MS = 15_000;

/** #386: one pre-load column toggle. */
export interface ColumnDelta {
  readonly key: ColumnKey;
  readonly on: boolean;
}

/** #386: library-lens column edits made before the baseline is known. */
export interface PreloadColumnEdit {
  /** A whole-pack choice (preset / saved-view apply); undefined = start from the server pack. */
  readonly base: readonly ColumnKey[] | undefined;
  readonly deltas: readonly ColumnDelta[];
}

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
  /** #386: column edits made before the baseline; resolved into `columns` on adoption. */
  readonly preload: PreloadColumnEdit | undefined;
  /** #387: local edit counter; bumped by every change that would be sent. */
  readonly edits: number;
  /** #403: latest user-chosen default range not yet confirmed by the server. */
  readonly range: TimeRange | undefined;
  /** #403: the user has chosen a range this session (gates adopting the server's on reconcile). */
  readonly rangeTouched: boolean;
  /** #381: the library pack the server is known to hold; undefined = unknown. */
  readonly confirmedColumns: readonly ColumnKey[] | undefined;
}

/** What to put on the wire for one PUT. */
export interface SendPayload {
  readonly visibleColumns: readonly ColumnKey[];
  /** undefined = omit the field (server keeps its stored list). */
  readonly savedViews: readonly SavedView[] | undefined;
  /** #403: undefined = omit the field (server keeps its stored range). */
  readonly defaultTimeRange: TimeRange | undefined;
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
    preload: undefined,
    edits: 0,
    range: undefined,
    rangeTouched: false,
    confirmedColumns: undefined,
  };
}

/**
 * #403: the user chose a default time range before the baseline is known.
 * Nothing is sent; the choice is held and released after adoption (the user's
 * choice wins over the server's stored range, which they never saw applied).
 */
export function recordPreloadRange(state: SavedViewsSyncState, range: TimeRange): SavedViewsSyncState {
  return { ...state, range, rangeTouched: true, edits: state.edits + 1 };
}

/** #386: record a column toggle made before the baseline (a delta, not a pack). */
export function recordPreloadToggle(
  state: SavedViewsSyncState,
  key: ColumnKey,
  on: boolean,
): SavedViewsSyncState {
  const prev = state.preload ?? { base: undefined, deltas: [] };
  const deltas = [...prev.deltas.filter((d) => d.key !== key), { key, on }];
  return { ...state, preload: { base: prev.base, deltas }, edits: state.edits + 1 };
}

/** #386: record a whole-pack choice made before the baseline; earlier deltas are superseded. */
export function recordPreloadPack(
  state: SavedViewsSyncState,
  pack: readonly ColumnKey[],
): SavedViewsSyncState {
  return { ...state, preload: { base: pack, deltas: [] }, edits: state.edits + 1 };
}

/** #386: the pack a pre-load edit resolves to over the server's pack. Pure. */
export function replayPreloadColumns(
  edit: PreloadColumnEdit,
  serverPack: readonly ColumnKey[],
): readonly ColumnKey[] {
  let pack: readonly ColumnKey[] = edit.base ?? serverPack;
  for (const { key, on } of edit.deltas) {
    const has = pack.includes(key);
    if (on && !has) pack = [...pack, key];
    else if (!on && has) pack = pack.filter((k) => k !== key);
  }
  return pack;
}

/**
 * The server returned its list (initial GET, or a later reconcile): that is
 * the confirmed baseline. The first adoption also releases a column change
 * queued before the baseline was known (dirty -> takeQueued sends it).
 * #386: a pre-load edit (`preload`) is replayed onto `serverPack` (the stored
 * pack, or the default when none is stored) and becomes `columns`. The caller
 * must not call this for a late answer once `baselineLoaded` (shell guard).
 */
export function adoptServerList(
  state: SavedViewsSyncState,
  list: readonly SavedView[],
  serverPack?: readonly ColumnKey[],
): SavedViewsSyncState {
  const first = !state.baselineLoaded;
  const resolved =
    first && state.preload !== undefined ? replayPreloadColumns(state.preload, serverPack ?? []) : undefined;
  const releasesQueued = first && (resolved !== undefined || state.columns !== undefined);
  return {
    ...state,
    confirmed: list,
    baselineLoaded: true,
    confirmedColumns: serverPack ?? state.confirmedColumns,
    preload: undefined,
    columns: resolved ?? state.columns,
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
  range?: TimeRange,
): SavedViewsSyncState {
  const counted =
    range === undefined
      ? { ...state, edits: state.edits + 1 }
      : { ...state, edits: state.edits + 1, range, rangeTouched: true };
  const withColumns = columns === undefined ? counted : { ...counted, columns };
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
    send: { visibleColumns: state.columns, savedViews: state.pending, defaultTimeRange: state.range },
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
  sentRange?: TimeRange,
  sentColumns?: readonly ColumnKey[],
): SavedViewsSyncState {
  // #403: the confirmed range is cleared; a newer choice made in flight stays.
  const range = sentRange !== undefined && state.range === sentRange ? undefined : state.range;
  // #381: the server now holds the columns that were sent.
  const confirmedColumns = sentColumns ?? state.confirmedColumns;
  if (sent === undefined) return { ...state, range, confirmedColumns, inFlight: false, reconciling: false };
  return {
    ...state,
    range,
    confirmedColumns,
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
 * stored). `editsAtStart` is `state.edits` read BEFORE the GET was sent. The
 * server's state is adopted (`adopt: true`; the caller shows the server's list
 * and columns) only if no local edit happened since (counter unchanged) and
 * nothing is in flight, deferred (`dirty`) or armed (`hasArmedTimer`).
 * Otherwise nothing is adopted: the latest local state still sends and carries
 * the whole state. `confirmed` is refreshed from the GET only while a send is
 * still due (its settle overwrites it on success; on failure the GET is the
 * best baseline); when everything has settled `confirmed` is already current
 * from `settleSuccess`, and the older GET answer must not replace it.
 * (`pending !== sent` is no longer tested: any such list was queued after the
 * GET started, which the counter shows; a reconcile never starts with one.)
 */
export function reconcileAdopt(
  state: SavedViewsSyncState,
  serverList: readonly SavedView[],
  editsAtStart: number,
  hasArmedTimer: boolean,
  serverColumns?: readonly ColumnKey[],
): { state: SavedViewsSyncState; adopt: boolean } {
  // (#403: the caller adopts the server's range itself, only when adopt && rangeTouched.)
  const busy = state.dirty || state.inFlight || hasArmedTimer;
  if (state.edits !== editsAtStart || busy) {
    return {
      state: { ...state, confirmed: busy ? serverList : state.confirmed, reconciling: false },
      adopt: false,
    };
  }
  return {
    state: {
      ...state,
      confirmed: serverList,
      pending: undefined,
      columns: serverColumns ?? state.columns,
      confirmedColumns: serverColumns ?? state.confirmedColumns,
      range: undefined,
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

/** #381: keepalive bodies share a ~64 KiB in-flight quota; stay clear of it. */
export const LEAVE_FLUSH_MAX_BYTES = 60 * 1024;

function sameColumns(a: readonly ColumnKey[], b: readonly ColumnKey[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/** #381: the persisted library columns differ from what the server holds (status: "unsaved columns"). */
export function hasUnconfirmedColumns(state: SavedViewsSyncState): boolean {
  return (
    state.columns !== undefined &&
    (state.confirmedColumns === undefined || !sameColumns(state.columns, state.confirmedColumns))
  );
}

/**
 * #381: is anything unsent? Only after the baseline is known. True when a save
 * is armed or deferred, a saved-views list or a range choice is unconfirmed, or
 * the persisted columns differ from the confirmed ones. Visible lens packs are
 * not consulted: `columns` only ever holds `columnsToPersist` output.
 */
export function hasUnsent(state: SavedViewsSyncState, hasArmedTimer: boolean): boolean {
  if (!state.baselineLoaded) return false;
  return (
    hasArmedTimer ||
    state.dirty ||
    state.pending !== undefined ||
    state.range !== undefined ||
    hasUnconfirmedColumns(state)
  );
}

/** The whole-document PUT body for a payload (shared by the normal PUT and the leave flush). */
export function buildPreferencesBody(payload: SendPayload): string {
  return JSON.stringify({
    visibleColumns: payload.visibleColumns,
    // columnOrder tracks the same order as visibleColumns for now;
    // drag-and-drop reorder is deferred to a future iteration.
    columnOrder: payload.visibleColumns,
    ...(payload.savedViews !== undefined ? { savedViews: payload.savedViews } : {}),
    // #103: only a range the user chose and the server has not confirmed.
    ...(payload.defaultTimeRange !== undefined ? { defaultTimeRange: payload.defaultTimeRange } : {}),
  });
}

export type LeaveFlushPlan =
  | { readonly action: 'send'; readonly payload: SendPayload; readonly body: string; readonly state: SavedViewsSyncState }
  | { readonly action: 'skip'; readonly reason: 'pre-baseline' | 'nothing-unsent' | 'too-large' };

/**
 * #381: decide the leave flush. A send carries the latest whole-document state
 * even if a PUT is in flight (the leave flush is the intent), and bumps `edits`
 * so a reconcile GET that answers later cannot overwrite it (#387). The caller
 * does NOT mark anything sent here: only a 2xx settles (`settleLeaveSuccess`);
 * a rejected keepalive (quota / TypeError) leaves the state dirty.
 */
export function planLeaveFlush(state: SavedViewsSyncState, hasArmedTimer: boolean): LeaveFlushPlan {
  if (!state.baselineLoaded) return { action: 'skip', reason: 'pre-baseline' };
  if (!hasUnsent(state, hasArmedTimer)) return { action: 'skip', reason: 'nothing-unsent' };
  if (state.columns === undefined) return { action: 'skip', reason: 'nothing-unsent' };
  const payload: SendPayload = {
    visibleColumns: state.columns,
    savedViews: state.pending,
    defaultTimeRange: state.range,
  };
  const body = buildPreferencesBody(payload);
  if (new TextEncoder().encode(body).length > LEAVE_FLUSH_MAX_BYTES) {
    return { action: 'skip', reason: 'too-large' };
  }
  return { action: 'send', payload, body, state: { ...state, edits: state.edits + 1 } };
}

/**
 * #381: the leave PUT came back 2xx. Confirms what it carried; a newer pending
 * list, range or column set stays unsent. Does not touch `inFlight` (the leave
 * flush is outside the single-flight queue).
 */
export function settleLeaveSuccess(state: SavedViewsSyncState, payload: SendPayload): SavedViewsSyncState {
  return {
    ...state,
    confirmedColumns: payload.visibleColumns,
    confirmed: payload.savedViews ?? state.confirmed,
    pending: payload.savedViews !== undefined && state.pending === payload.savedViews ? undefined : state.pending,
    range: payload.defaultTimeRange !== undefined && state.range === payload.defaultTimeRange ? undefined : state.range,
  };
}
