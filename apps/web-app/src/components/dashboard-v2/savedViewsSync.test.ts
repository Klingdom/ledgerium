import { describe, it, expect } from 'vitest';
import type { SavedView } from '@/lib/dashboard-columns/index.js';
import {
  createSyncState,
  adoptServerList,
  queueSave,
  payloadSavedViews,
  settleSuccess,
  settleFailure,
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
});
