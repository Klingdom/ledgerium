import { describe, it, expect } from 'vitest';
import type { SavedView } from '@/lib/dashboard-columns/index.js';
import {
  createSyncState,
  adoptServerList,
  recordPreloadToggle,
  recordPreloadPack,
  replayPreloadColumns,
  queueSave,
  payloadSavedViews,
  settleSuccess,
  settleFailure,
  dueSave,
  takeQueued,
  settleTimeout,
  reconcileAdopt,
  reconcileFailed,
  PREFERENCES_PUT_TIMEOUT_MS,
} from './savedViewsSync.js';

/** A sync state whose initial GET has already succeeded (#384). */
const loadedState = (confirmed: readonly SavedView[] = []) =>
  adoptServerList(createSyncState(), confirmed);

const view = (id: string): SavedView =>
  ({ id, name: id, visibleColumns: [], columnOrder: [], filters: [], createdAt: '2026-01-01T00:00:00.000Z' }) as unknown as SavedView;


describe('savedViewsSync baseline (#384)', () => {
  const colsA = ['workflow_title'] as unknown as import('@/lib/dashboard-columns/index.js').ColumnKey[];

  it('a fresh state has an unknown baseline', () => {
    expect(createSyncState().baselineLoaded).toBe(false);
  });

  it('dueSave sends nothing before the baseline, whatever is queued', () => {
    const s = queueSave(createSyncState(), [view('early')], colsA);
    const due = dueSave(s);
    expect(due.send).toBeNull();
    expect(due.state.inFlight).toBe(false);
    // The queued change is kept, not dropped.
    expect(due.state.columns).toBe(colsA);
  });

  it('takeQueued cannot send before the baseline even if dirty', () => {
    const s = { ...queueSave(createSyncState(), undefined, colsA), dirty: true };
    expect(takeQueued(s).send).toBeNull();
  });

  it('adopting the baseline releases a queued column change (no saved views)', () => {
    const stored = [view('alpha'), view('beta')];
    let s = dueSave(queueSave(createSyncState(), undefined, colsA)).state;
    s = adoptServerList(s, stored);
    expect(s.baselineLoaded).toBe(true);
    expect(s.confirmed).toBe(stored);
    const next = takeQueued(s);
    expect(next.send?.visibleColumns).toBe(colsA);
    // savedViews omitted: the server keeps the list it stored.
    expect(next.send?.savedViews).toBeUndefined();
  });

  it('adopting the baseline with nothing queued releases nothing', () => {
    const s = adoptServerList(createSyncState(), [view('alpha')]);
    expect(s.dirty).toBe(false);
    expect(takeQueued(s).send).toBeNull();
    expect(dueSave(s).send).toBeNull(); // no columns queued either
  });

  it('a failed GET keeps the baseline unknown: nothing can be sent', () => {
    // A failed GET means adoptServerList is never called.
    let s = queueSave(createSyncState(), undefined, colsA);
    s = dueSave(s).state;
    expect(s.baselineLoaded).toBe(false);
    expect(dueSave(s).send).toBeNull();
  });

  it('retry success adopts the list and then sends normally', () => {
    let s = dueSave(queueSave(createSyncState(), undefined, colsA)).state; // pre-load edit, GET failed
    expect(dueSave(s).send).toBeNull();
    const stored = [view('alpha')];
    s = adoptServerList(s, stored); // retry succeeded
    const first = takeQueued(s);
    expect(first.send).not.toBeNull();
    const settled = settleSuccess(first.state, first.send?.savedViews);
    // Later edits send as usual, carrying the new list.
    const next = [...stored, view('gamma')];
    const due = dueSave(queueSave(settled, next, colsA));
    expect(due.send?.savedViews).toBe(next);
  });
});

describe('savedViewsSync (#369)', () => {
  it('a column-only save after a pending saved-views change keeps the pending list', () => {
    const v = [view('a')];
    let s = queueSave(loadedState(), v);
    s = queueSave(s, undefined); // column toggle inside the debounce window
    expect(payloadSavedViews(s)).toBe(v);
  });

  it('with nothing pending, a column-only save omits savedViews', () => {
    expect(payloadSavedViews(queueSave(loadedState([view('x')]), undefined))).toBeUndefined();
  });

  it('successive saved-view changes keep the latest', () => {
    const v1 = [view('a')];
    const v2 = [view('a'), view('b')];
    let s = queueSave(loadedState(), v1);
    s = queueSave(s, v2);
    s = queueSave(s, undefined);
    expect(payloadSavedViews(s)).toBe(v2);
  });

  it('success confirms the sent list and clears pending', () => {
    const v = [view('a')];
    const s = settleSuccess(queueSave(loadedState(), v), v);
    expect(s.pending).toBeUndefined();
    expect(s.confirmed).toBe(v);
  });

  it('success keeps a newer list queued while the PUT was in flight', () => {
    const v1 = [view('a')];
    const v2 = [view('b')];
    const s = settleSuccess(queueSave(queueSave(loadedState(), v1), v2), v1);
    expect(s.pending).toBe(v2);
    expect(s.confirmed).toBe(v1);
  });

  it('failure rolls back to the last server-confirmed list and clears pending', () => {
    const confirmed = [view('old')];
    const v = [view('new')];
    const s0 = queueSave(adoptServerList(loadedState(), confirmed), v);
    const { state, rollbackTo } = settleFailure(s0, v);
    expect(rollbackTo).toBe(confirmed);
    expect(state.pending).toBeUndefined();
    expect(state.confirmed).toBe(confirmed);
  });

  it('failure of a column-only save (nothing sent) does not roll back the list', () => {
    const { rollbackTo } = settleFailure(loadedState([view('x')]), undefined);
    expect(rollbackTo).toBeNull();
  });

  it('failure does not roll back when a newer list is already queued', () => {
    const v1 = [view('a')];
    const v2 = [view('b')];
    const s0 = queueSave(queueSave(loadedState(), v1), v2);
    const { state, rollbackTo } = settleFailure(s0, v1);
    expect(rollbackTo).toBeNull();
    expect(state.pending).toBe(v2);
  });

  // ── #372: single flight + coalesce ──
  const cols = (...k: string[]) => k as unknown as import('@/lib/dashboard-columns/index.js').ColumnKey[];

  it('first due save sends immediately and marks in flight', () => {
    const v = [view('a')];
    const s = queueSave(loadedState(), v, cols('x'));
    const { state, send } = dueSave(s);
    expect(send).toEqual({ visibleColumns: cols('x'), savedViews: v });
    expect(state.inFlight).toBe(true);
  });

  it('a second save due while one is in flight waits (no send, dirty)', () => {
    let s = queueSave(loadedState(), [view('a')], cols('x'));
    s = dueSave(s).state;
    s = queueSave(s, [view('a'), view('b')], cols('x'));
    const due = dueSave(s);
    expect(due.send).toBeNull();
    expect(due.state.dirty).toBe(true);
  });

  it('two saves queued behind one in-flight PUT coalesce into one with the latest state', () => {
    const v1 = [view('a')];
    const v2 = [view('a'), view('b')];
    const v3 = [view('a'), view('b'), view('c')];
    let s = dueSave(queueSave(loadedState(), v1, cols('x'))).state;
    s = dueSave(queueSave(s, v2, cols('x', 'y'))).state;
    s = dueSave(queueSave(s, v3, cols('x', 'y', 'z'))).state;
    s = settleSuccess(s, v1);
    const next = takeQueued(s);
    expect(next.send).toEqual({ visibleColumns: cols('x', 'y', 'z'), savedViews: v3 });
    // nothing further queued after that one is taken
    expect(takeQueued(next.state).send).toBeNull();
    expect(next.state.inFlight).toBe(true);
  });

  it('success then queued: the second PUT carries the latest columns even for a column-only change', () => {
    const v1 = [view('a')];
    let s = dueSave(queueSave(loadedState(), v1, cols('x'))).state;
    s = dueSave(queueSave(s, undefined, cols('x', 'y'))).state;
    s = settleSuccess(s, v1);
    const next = takeQueued(s);
    expect(next.send).toEqual({ visibleColumns: cols('x', 'y'), savedViews: undefined });
  });

  it('failure then queued success: no rollback, queued PUT resends the list, UI list == confirmed', () => {
    const server = [view('old')];
    const v1 = [view('a')];
    const v2 = [view('a'), view('b')];
    let s = adoptServerList(loadedState(), server);
    s = dueSave(queueSave(s, v1, cols('x'))).state; // PUT #1 in flight
    s = dueSave(queueSave(s, v2, cols('x'))).state; // deferred
    const failed = settleFailure(s, v1);
    expect(failed.rollbackTo).toBeNull(); // UI keeps v2
    const next = takeQueued(failed.state);
    expect(next.send?.savedViews).toBe(v2);
    const done = settleSuccess(next.state, next.send!.savedViews);
    expect(done.confirmed).toBe(v2); // == UI list
    expect(done.pending).toBeUndefined();
    expect(done.inFlight).toBe(false);
  });

  it('failure with a deferred same-list column save does not roll back (the retry carries the list)', () => {
    const server = [view('old')];
    const v1 = [view('a')];
    let s = adoptServerList(loadedState(), server);
    s = dueSave(queueSave(s, v1, cols('x'))).state;
    s = dueSave(queueSave(s, undefined, cols('x', 'y'))).state; // deferred, pending still v1
    const failed = settleFailure(s, v1);
    expect(failed.rollbackTo).toBeNull();
    expect(failed.state.pending).toBe(v1);
    expect(takeQueued(failed.state).send?.savedViews).toBe(v1);
  });

  it('failure then queued failure rolls back to the confirmed list', () => {
    const server = [view('old')];
    const v1 = [view('a')];
    let s = adoptServerList(loadedState(), server);
    s = dueSave(queueSave(s, v1, cols('x'))).state;
    s = dueSave(queueSave(s, undefined, cols('x', 'y'))).state;
    const f1 = settleFailure(s, v1);
    const next = takeQueued(f1.state);
    const f2 = settleFailure(next.state, next.send!.savedViews);
    expect(f2.rollbackTo).toBe(server);
    expect(f2.state.pending).toBeUndefined();
  });

  it('after settle with nothing queued, the next due save sends again', () => {
    const v = [view('a')];
    let s = dueSave(queueSave(loadedState(), v, cols('x'))).state;
    s = settleSuccess(s, v);
    expect(takeQueued(s).send).toBeNull();
    s = queueSave(s, undefined, cols('y'));
    expect(dueSave(s).send).toEqual({ visibleColumns: cols('y'), savedViews: undefined });
  });
});

describe('savedViewsSync timeout (#374)', () => {
  const cols = ['workflow_title'] as never;

  it('uses the 15 s bound', () => {
    expect(PREFERENCES_PUT_TIMEOUT_MS).toBe(15_000);
  });

  it('a timed-out flight releases the queue and re-sends the latest state, without rolling back', () => {
    const a = [view('a')];
    const ab = [view('a'), view('b')];
    let s = queueSave(loadedState(), a, cols);
    s = dueSave(s).state; // PUT #1 (a) in flight
    s = queueSave(s, ab, cols);
    s = dueSave(s).state; // deferred: dirty
    const t = settleTimeout(s, a);
    expect(t.state.inFlight).toBe(false);
    expect(t.rollbackTo).toBeNull();
    const next = takeQueued(t.state);
    expect(next.send?.savedViews).toBe(ab);
  });

  it('a timeout with nothing queued re-sends the current state once (no rollback)', () => {
    const a = [view('a')];
    let s = dueSave(queueSave(loadedState(), a, cols)).state;
    const t = settleTimeout(s, a);
    expect(t.rollbackTo).toBeNull();
    const next = takeQueued(t.state);
    expect(next.send?.savedViews).toBe(a);
    expect(next.state.inFlight).toBe(true);
  });

  it('a second timeout on the reconcile send is an unknown outcome: no rollback, reconcile with a GET (#380)', () => {
    const base = [view('x')];
    const a = [view('a')];
    let s = dueSave(queueSave(loadedState(base), a, cols)).state;
    s = takeQueued(settleTimeout(s, a).state).state; // reconcile send in flight
    const t = settleTimeout(s, a);
    expect(t.rollbackTo).toBeNull();
    expect(t.reconcile).toBe(true);
    expect(takeQueued(t.state).send).toBeNull();
  });

  it('a successful reconcile clears the reconciling flag', () => {
    const a = [view('a')];
    let s = dueSave(queueSave(loadedState(), a, cols)).state;
    s = takeQueued(settleTimeout(s, a).state).state;
    s = settleSuccess(s, a);
    expect(s.reconciling).toBe(false);
    expect(s.confirmed).toBe(a);
  });
});

describe('savedViewsSync unknown outcome (#380)', () => {
  const cols = ['workflow_title'] as never;
  const serverCols = ['workflow_title', 'run_count'] as never;

  /** timeout, then the re-send is in flight (reconciling). */
  const reconcilingState = (base: SavedView[], a: SavedView[]) => {
    let s = dueSave(queueSave(loadedState(base), a, cols)).state;
    s = takeQueued(settleTimeout(s, a).state).state;
    return s;
  };

  it('timeout -> re-send -> HTTP 500 reconciles instead of rolling back', () => {
    const a = [view('a')];
    const s = reconcilingState([view('x')], a);
    const f = settleFailure(s, a);
    expect(f.rollbackTo).toBeNull();
    expect(f.reconcile).toBe(true);
    expect(f.state.inFlight).toBe(false);
    expect(takeQueued(f.state).send).toBeNull();
  });

  it('a definite failure NOT after a timeout still rolls back and does not reconcile', () => {
    const base = [view('x')];
    const a = [view('a')];
    const s = dueSave(queueSave(loadedState(base), a, cols)).state;
    const f = settleFailure(s, a);
    expect(f.rollbackTo).toBe(base);
    expect(f.reconcile).toBe(false);
  });

  it('reconcile GET success adopts the server list and columns and clears reconciling', () => {
    const server = [view('a')];
    const a = [view('a'), view('b')];
    const f = settleFailure(reconcilingState([view('x')], a), a);
    const r = reconcileAdopt(f.state, server, f.state.edits, false, serverCols);
    expect(r.adopt).toBe(true);
    expect(r.state.confirmed).toBe(server);
    expect(r.state.pending).toBeUndefined();
    expect(r.state.columns).toBe(serverCols);
    expect(r.state.reconciling).toBe(false);
    expect(r.state.baselineLoaded).toBe(true);
  });

  it('a newer pending list is not adopted over and still sends', () => {
    const a = [view('a')];
    const newer = [view('a'), view('n')];
    let s = reconcilingState([view('x')], a);
    const f = settleFailure(s, a);
    const editsAtStart = f.state.edits; // read before the GET is sent
    s = queueSave(f.state, newer, cols); // user edits while the GET is in flight
    const r = reconcileAdopt(s, [view('srv')], editsAtStart, true, serverCols);
    expect(r.adopt).toBe(false);
    expect(r.state.confirmed).toEqual([view('srv')]);
    expect(r.state.pending).toBe(newer);
    expect(r.state.columns).toBe(cols);
    const due = dueSave(r.state);
    expect(due.send?.savedViews).toBe(newer);
  });

  it('a newer change queued behind the failed flight skips the GET and the queued PUT sends', () => {
    const a = [view('a')];
    const ab = [view('a'), view('b')];
    let s = reconcilingState([view('x')], a);
    s = queueSave(s, ab, cols);
    s = dueSave(s).state; // deferred: dirty
    const f = settleFailure(s, a);
    expect(f.reconcile).toBe(false);
    expect(f.rollbackTo).toBeNull();
    expect(takeQueued(f.state).send?.savedViews).toBe(ab);
  });

  it('an armed debounce timer or an in-flight PUT blocks adoption', () => {
    const a = [view('a')];
    const f = settleFailure(reconcilingState([], a), a);
    expect(reconcileAdopt(f.state, [], f.state.edits, true).adopt).toBe(false);
    const inFlight = { ...f.state, inFlight: true };
    expect(reconcileAdopt(inFlight, [], f.state.edits, false).adopt).toBe(false);
  });

  it('reconcile GET failure: no rollback, no adoption, baseline stays loaded, pending kept', () => {
    const base = [view('x')];
    const a = [view('a')];
    const f = settleFailure(reconcilingState(base, a), a);
    const s = reconcileFailed(f.state);
    expect(s.baselineLoaded).toBe(true);
    expect(s.reconciling).toBe(false);
    expect(s.pending).toBe(a);
    expect(s.confirmed).toBe(base);
  });

  it('S6: a column-only reconcile success clears reconciling', () => {
    // timeout on a column-only PUT (nothing sent), re-send, success
    let s = queueSave(loadedState([view('x')]), undefined, cols);
    s = dueSave(s).state;
    const t = settleTimeout(s, undefined);
    expect(t.state.reconciling).toBe(true);
    s = takeQueued(t.state).state;
    expect(s.reconciling).toBe(true);
    s = settleSuccess(s, undefined);
    expect(s.reconciling).toBe(false);
    expect(s.inFlight).toBe(false);
  });
});

describe('savedViewsSync edit counter (#387)', () => {
  const cols = ['workflow_title'] as never;
  const serverCols = ['workflow_title', 'run_count'] as never;
  const colsB = ['workflow_title', 'health_score'] as never;

  /** column-only PUT timed out, its re-send failed with 500: a reconcile GET is due. */
  const readyToReconcile = (base: SavedView[]) => {
    let s = dueSave(queueSave(loadedState(base), undefined, cols)).state;
    s = takeQueued(settleTimeout(s, undefined).state).state;
    const f = settleFailure(s, undefined);
    expect(f.reconcile).toBe(true);
    return f.state;
  };

  it('every queued change bumps the counter; a state with none does not', () => {
    const s0 = loadedState([]);
    expect(s0.edits).toBe(0);
    expect(queueSave(s0, undefined, cols).edits).toBe(1);
    expect(queueSave(s0, [view('a')], cols).edits).toBe(1);
    expect(queueSave(queueSave(s0, undefined, cols), undefined, colsB).edits).toBe(2);
    expect(dueSave(queueSave(s0, undefined, cols)).state.edits).toBe(1); // sending is not an edit
  });

  it('pre-load toggles and pack choices count as edits', () => {
    const s0 = createSyncState();
    const t = recordPreloadToggle(s0, 'run_count' as never, true);
    expect(t.edits).toBe(1);
    expect(recordPreloadPack(t, cols).edits).toBe(2);
  });

  it('no edit during the GET: the server state is adopted', () => {
    const state = readyToReconcile([view('x')]);
    const r = reconcileAdopt(state, [view('srv')], state.edits, false, serverCols);
    expect(r.adopt).toBe(true);
    expect(r.state.confirmed).toEqual([view('srv')]);
    expect(r.state.columns).toBe(serverCols);
  });

  it('a saved-views edit that was sent and CONFIRMED while the GET was out blocks adoption (C3-view)', () => {
    const state = readyToReconcile([view('a'), view('b')]);
    const editsAtStart = state.edits;
    const withNew = [view('a'), view('b'), view('new')];
    let s = queueSave(state, withNew, cols); // user creates 'New' while the GET is out
    const due = dueSave(s);
    s = settleSuccess(due.state, due.send?.savedViews); // PUT 200 before the GET returns
    // every flag is clear: only the counter shows the newer change
    expect(s.dirty || s.inFlight || s.pending !== undefined).toBe(false);
    const r = reconcileAdopt(s, [view('a'), view('b')], editsAtStart, false, serverCols);
    expect(r.adopt).toBe(false);
    expect(r.state.confirmed).toBe(withNew); // the stale GET does not overwrite it
    expect(r.state.columns).toBe(cols); // the stale server columns are not taken
    expect(r.state.reconciling).toBe(false);
  });

  it('a column edit that was sent and confirmed while the GET was out blocks adoption (C3c)', () => {
    const state = readyToReconcile([view('a')]);
    const editsAtStart = state.edits;
    let s = queueSave(state, undefined, colsB);
    const due = dueSave(s);
    s = settleSuccess(due.state, due.send?.savedViews);
    const r = reconcileAdopt(s, [view('a')], editsAtStart, false, serverCols);
    expect(r.adopt).toBe(false);
    expect(r.state.columns).toBe(colsB);
  });

  it('an edit still queued when the GET returns: not adopted, confirmed refreshed, the latest state still sends', () => {
    const state = readyToReconcile([view('x')]);
    const editsAtStart = state.edits;
    const newer = [view('n')];
    const s = queueSave(state, newer, colsB);
    const r = reconcileAdopt(s, [view('srv')], editsAtStart, true, serverCols);
    expect(r.adopt).toBe(false);
    expect(r.state.confirmed).toEqual([view('srv')]);
    const due = dueSave(r.state);
    expect(due.send).toEqual({ visibleColumns: colsB, savedViews: newer });
  });

  it('M10: after an unknown outcome with a newer PUT queued, that PUT failing does not roll back or restore', () => {
    const a = [view('a')];
    const ab = [view('a'), view('b')];
    const base = [view('x')];
    // PUT(a) times out, its re-send is in flight (reconciling)
    let s = dueSave(queueSave(loadedState(base), a, cols)).state;
    s = takeQueued(settleTimeout(s, a).state).state;
    // the user queues 'ab' behind the re-send; the re-send fails: unknown, newer queued
    s = dueSave(queueSave(s, ab, cols)).state; // deferred: dirty
    const f1 = settleFailure(s, a);
    expect(f1.reconcile).toBe(false);
    expect(f1.state.reconciling).toBe(true); // still unknown: the next failure must not roll back
    const next = takeQueued(f1.state);
    expect(next.send?.savedViews).toBe(ab);
    const f2 = settleFailure(next.state, ab); // the newer PUT fails too
    expect(f2.rollbackTo).toBeNull();
    expect(f2.reconcile).toBe(true);
    expect(f2.state.confirmed).toBe(base);
  });
});

describe('savedViewsSync pre-load column edits (#386)', () => {
  type CK = import('@/lib/dashboard-columns/index.js').ColumnKey;
  const k = (s: string) => s as unknown as CK;
  const stored = [k('workflow_title'), k('health_score'), k('run_count')];

  it('a toggle on replays onto the stored pack, not the default', () => {
    let s = recordPreloadToggle(createSyncState(), k('systems'), true);
    s = adoptServerList(s, [view('a')], stored);
    expect(s.columns).toEqual([...stored, k('systems')]);
    expect(s.dirty).toBe(true);
    expect(s.preload).toBeUndefined();
    const next = takeQueued(s);
    expect(next.send?.visibleColumns).toEqual([...stored, k('systems')]);
    expect(next.send?.savedViews).toBeUndefined();
  });

  it('a toggle off removes only that column from the stored pack', () => {
    let s = recordPreloadToggle(createSyncState(), k('health_score'), false);
    s = adoptServerList(s, [], stored);
    expect(s.columns).toEqual([k('workflow_title'), k('run_count')]);
  });

  it('the last toggle per key wins; toggling an already-present column on is a no-op', () => {
    let s = createSyncState();
    s = recordPreloadToggle(s, k('systems'), true);
    s = recordPreloadToggle(s, k('systems'), false);
    s = recordPreloadToggle(s, k('run_count'), true);
    s = adoptServerList(s, [], stored);
    expect(s.columns).toEqual(stored);
  });

  it('a whole-pack choice is the base; later toggles replay on top of it', () => {
    const preset = [k('workflow_title'), k('last_run_at')];
    let s = recordPreloadToggle(createSyncState(), k('systems'), true);
    s = recordPreloadPack(s, preset); // supersedes the earlier delta
    s = recordPreloadToggle(s, k('run_count'), true);
    s = adoptServerList(s, [], stored);
    expect(s.columns).toEqual([...preset, k('run_count')]);
  });

  it('replayPreloadColumns is pure and does not mutate its inputs', () => {
    const edit = { base: undefined, deltas: [{ key: k('systems'), on: true }] };
    const out = replayPreloadColumns(edit, stored);
    expect(out).toEqual([...stored, k('systems')]);
    expect(stored).toEqual([k('workflow_title'), k('health_score'), k('run_count')]);
    expect(replayPreloadColumns(edit, stored)).toEqual(out);
  });

  it('nothing is sent before adoption; no edit means nothing is released', () => {
    const s = recordPreloadToggle(createSyncState(), k('systems'), true);
    expect(dueSave(s).send).toBeNull();
    expect(takeQueued({ ...s, dirty: true }).send).toBeNull();
    const clean = adoptServerList(createSyncState(), [view('a')], stored);
    expect(clean.dirty).toBe(false);
    expect(clean.columns).toBeUndefined();
  });

  it('a failed GET keeps the edit; the Retry adoption replays it', () => {
    let s = recordPreloadToggle(createSyncState(), k('systems'), true);
    expect(s.baselineLoaded).toBe(false); // GET failed: adoptServerList never ran
    s = recordPreloadToggle(s, k('run_count'), false); // edit made in the error state
    s = adoptServerList(s, [], stored);
    expect(s.columns).toEqual([k('workflow_title'), k('health_score'), k('systems')]);
  });
});
