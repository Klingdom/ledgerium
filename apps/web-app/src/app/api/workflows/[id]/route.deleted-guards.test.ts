/**
 * Row #319: Workflow.updatedAt is the retention clock for deleted workflows, so
 * nothing may write to a deleted row except a restore. Behavioural pins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  tagDeleteMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/lib/feature-gating', () => ({ effectivePlanFor: vi.fn(async () => 'free') }));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    workflow: { findFirst: m.findFirst, update: m.update },
    workflowTag: { deleteMany: m.tagDeleteMany, createMany: vi.fn(), upsert: vi.fn() },
    tag: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
  },
}));

import { PATCH, DELETE } from './route';

const ctx = { params: { id: 'w1' } };
const patch = (body: unknown) =>
  new NextRequest('http://localhost/api/workflows/w1', { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const del = () => new NextRequest('http://localhost/api/workflows/w1', { method: 'DELETE' });

describe('#319 writes to a deleted workflow must not move updatedAt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.update.mockResolvedValue({ id: 'w1', shareToken: null });
  });

  it('DELETE of an active workflow soft-deletes it', async () => {
    m.findFirst.mockResolvedValue({ id: 'w1', status: 'active' });
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(200);
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'w1' }, data: { status: 'deleted' } });
  });

  it('DELETE of an already-deleted workflow is idempotent and writes nothing', async () => {
    m.findFirst.mockResolvedValue({ id: 'w1', status: 'deleted' });
    const res = await DELETE(del(), ctx);
    expect(res.status).toBe(200);
    expect(m.update).not.toHaveBeenCalled();
  });

  it('PATCH of a deleted workflow (rename, favourite, share, re-delete) is refused with 409 and writes nothing', async () => {
    m.findFirst.mockResolvedValue({ id: 'w1', status: 'deleted', shareToken: null });
    for (const body of [{ title: 'x' }, { isFavorite: true }, { enableSharing: true }, { status: 'deleted' }, { tagIds: [] }]) {
      const res = await PATCH(patch(body), ctx);
      expect(res.status, JSON.stringify(body)).toBe(409);
    }
    expect(m.update).not.toHaveBeenCalled();
    expect(m.tagDeleteMany).not.toHaveBeenCalled();
  });

  it('PATCH can still restore a deleted workflow (status active or archived)', async () => {
    m.findFirst.mockResolvedValue({ id: 'w1', status: 'deleted', shareToken: null });
    expect((await PATCH(patch({ status: 'active' }), ctx)).status).toBe(200);
    expect((await PATCH(patch({ status: 'archived' }), ctx)).status).toBe(200);
    expect(m.update).toHaveBeenCalledTimes(2);
  });

  it('PATCH of an active workflow is unchanged', async () => {
    m.findFirst.mockResolvedValue({ id: 'w1', status: 'active', shareToken: null });
    expect((await PATCH(patch({ title: 'x' }), ctx)).status).toBe(200);
    expect(m.update).toHaveBeenCalledTimes(1);
  });
});
