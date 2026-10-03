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
} from './savedViewsSync.js';

const view = (id: string): SavedView =>
  ({ id, name: id, visibleColumns: [], columnOrder: [], filters: [], createdAt: '2026-01-01T00:00:00.000Z' }) as unknown as SavedView;

describe('savedViewsSync (#369)', () => {
  it('a column-only save after a pending saved-views change keeps the pending list', () => {
    const v = [view('a')];
    let s = queueSave(createSyncState(), v);
    s = queueSave(s, undefined); // column toggle inside the debounce window
    expect(payloadSavedViews(s)).toBe(v);
  });

  it('with nothing pending, a column-only save omits savedViews', () => {
    expect(payloadSavedViews(queueSave(createSyncState([view('x')]), undefined))).toBeUndefined();
  });

  it('successive saved-view changes keep the latest', () => {
    const v1 = [view('a')];
    const v2 = [view('a'), view('b')];
    let s = queueSave(createSyncState(), v1);
    s = queueSave(s, v2);
    s = queueSave(s, undefined);
    expect(payloadSavedViews(s)).toBe(v2);
  });

  it('success confirms the sent list and clears pending', () => {
    const v = [view('a')];
    const s = settleSuccess(queueSave(createSyncState(), v), v);
    expect(s.pending).toBeUndefined();
    expect(s.confirmed).toBe(v);
  });

  it('success keeps a newer list queued while the PUT was in flight', () => {
    const v1 = [view('a')];
    const v2 = [view('b')];
    const s = settleSuccess(queueSave(queueSave(createSyncState(), v1), v2), v1);
    expect(s.pending).toBe(v2);
    expect(s.confirmed).toBe(v1);
  });

  it('failure rolls back to the last server-confirmed list and clears pending', () => {
    const confirmed = [view('old')];
    const v = [view('new')];
    const s0 = queueSave(adoptServerList(createSyncState(), confirmed), v);
    const { state, rollbackTo } = settleFailure(s0, v);
    expect(rollbackTo).toBe(confirmed);
    expect(state.pending).toBeUndefined();
    expect(state.confirmed).toBe(confirmed);
  });

  it('failure of a column-only save (nothing sent) does not roll back the list', () => {
    const { rollbackTo } = settleFailure(createSyncState([view('x')]), undefined);
    expect(rollbackTo).toBeNull();
  });

  it('failure does not roll back when a newer list is already queued', () => {
    const v1 = [view('a')];
    const v2 = [view('b')];
    const s0 = queueSave(queueSave(createSyncState(), v1), v2);
    const { state, rollbackTo } = settleFailure(s0, v1);
    expect(rollbackTo).toBeNull();
    expect(state.pending).toBe(v2);
  });

  // ── #372: single flight + coalesce ──
  const cols = (...k: string[]) => k as unknown as import('@/lib/dashboard-columns/index.js').ColumnKey[];

  it('first due save sends immediately and marks in flight', () => {
    const v = [view('a')];
    const s = queueSave(createSyncState(), v, cols('x'));
    const { state, send } = dueSave(s);
    expect(send).toEqual({ visibleColumns: cols('x'), savedViews: v });
    expect(state.inFlight).toBe(true);
  });

  it('a second save due while one is in flight waits (no send, dirty)', () => {
    let s = queueSave(createSyncState(), [view('a')], cols('x'));
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
    let s = dueSave(queueSave(createSyncState(), v1, cols('x'))).state;
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
    let s = dueSave(queueSave(createSyncState(), v1, cols('x'))).state;
    s = dueSave(queueSave(s, undefined, cols('x', 'y'))).state;
    s = settleSuccess(s, v1);
    const next = takeQueued(s);
    expect(next.send).toEqual({ visibleColumns: cols('x', 'y'), savedViews: undefined });
  });

  it('failure then queued success: no rollback, queued PUT resends the list, UI list == confirmed', () => {
    const server = [view('old')];
    const v1 = [view('a')];
    const v2 = [view('a'), view('b')];
    let s = adoptServerList(createSyncState(), server);
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
    let s = adoptServerList(createSyncState(), server);
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
    let s = adoptServerList(createSyncState(), server);
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
    let s = dueSave(queueSave(createSyncState(), v, cols('x'))).state;
    s = settleSuccess(s, v);
    expect(takeQueued(s).send).toBeNull();
    s = queueSave(s, undefined, cols('y'));
    expect(dueSave(s).send).toEqual({ visibleColumns: cols('y'), savedViews: undefined });
  });
});
