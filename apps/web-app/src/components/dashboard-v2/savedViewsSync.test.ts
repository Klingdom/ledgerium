import { describe, it, expect } from 'vitest';
import type { SavedView } from '@/lib/dashboard-columns/index.js';
import {
  createSyncState,
  adoptServerList,
  queueSave,
  payloadSavedViews,
  settleSuccess,
  settleFailure,
  dueSave,
  takeQueued,
  settleTimeout,
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

  it('a second timeout on the reconcile send is a plain failure: rollback to confirmed', () => {
    const base = [view('x')];
    const a = [view('a')];
    let s = dueSave(queueSave(loadedState(base), a, cols)).state;
    s = takeQueued(settleTimeout(s, a).state).state; // reconcile send in flight
    const t = settleTimeout(s, a);
    expect(t.rollbackTo).toBe(base);
    expect(takeQueued(t.state).send).toBeNull();
    expect(t.state.reconciling).toBe(false);
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
