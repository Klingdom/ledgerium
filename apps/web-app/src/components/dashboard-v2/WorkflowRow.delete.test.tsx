// @vitest-environment jsdom
/**
 * Backlog #328 - the default (v2) dashboard offers Delete, with a truthful
 * 30-day confirmation; Archive is unchanged.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import WorkflowRow, { type WorkflowRowData } from './WorkflowRow.js';

function makeWorkflow(): WorkflowRowData {
  return {
    id: 'wf-1',
    title: 'Approve Expense',
    toolsUsed: ['Chrome'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastViewedAt: null,
    processDefinitionUpdatedAt: null,
    metricsV2: {
      runs: 3,
      avgTimeMs: 60_000,
      variationScore: 0.3,
      variationLabel: 'low',
      bottleneckLabel: null,
      healthScore: {
        overall: 65, speed: 18, consistency: 21, dataQuality: 14, standardization: 12, isGated: false,
      },
      opportunityTag: 'healthy',
      aiOpportunityScore: 40,
      confidence: 0.75,
    },
  } as unknown as WorkflowRowData;
}

function setup() {
  const onDelete = vi.fn();
  const onArchive = vi.fn();
  render(
    <table>
      <tbody>
        <WorkflowRow workflow={makeWorkflow()} onDelete={onDelete} onArchive={onArchive} />
      </tbody>
    </table>,
  );
  return { onDelete, onArchive };
}

function openMenu() {
  fireEvent.click(screen.getByLabelText(/actions for|more actions|menu/i, { selector: 'button' }));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('#328 v2 row menu: Delete', () => {
  it('shows Delete alongside Archive in the row menu', () => {
    setup();
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeTruthy();
  });

  it('confirmation states the 30-day consequence; nothing is called yet', () => {
    setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByText(/permanently removed after 30 days/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('confirm calls DELETE /api/workflows/[id] and notifies the parent', async () => {
    const { onDelete } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete for/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('wf-1'));
    expect(fetchMock).toHaveBeenCalledWith('/api/workflows/wf-1', { method: 'DELETE' });
  });

  it('failure shows an error and does not remove the row', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { onDelete } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete for/i }));
    await screen.findByRole('alert');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Cancel does nothing', () => {
    const { onDelete } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/permanently removed after 30 days/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Escape cancels and does nothing', () => {
    const { onDelete } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/permanently removed after 30 days/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Archive is unchanged: PATCH status archived, says it is not deleted', async () => {
    const { onArchive, onDelete } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(screen.getByText(/not deleted/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /confirm archive for/i }));
    await waitFor(() => expect(onArchive).toHaveBeenCalledWith('wf-1'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workflows/wf-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'archived' }) }),
    );
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('#334 Escape while a request is in flight', () => {
  function deferred() {
    let resolve!: (v: unknown) => void;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
  }

  it('Delete: Escape is ignored while pending; row result matches the server', async () => {
    const d = deferred();
    fetchMock.mockReturnValueOnce(d.promise);
    const { onDelete } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete for/i }));
    expect(screen.getByText('Deleting…')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    // Still visible: the user is not led to believe the delete was cancelled.
    expect(screen.getByText(/permanently removed after 30 days/i)).toBeTruthy();
    expect(screen.getByText('Deleting…')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
    d.resolve({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('wf-1'));
  });

  it('Delete: after a failed request settles, Escape cancels normally', async () => {
    const d = deferred();
    fetchMock.mockReturnValueOnce(d.promise);
    setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete for/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    d.resolve({ ok: false, json: async () => ({}) });
    await screen.findByRole('alert');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/permanently removed after 30 days/i)).toBeNull();
  });

  it('Archive: Escape is ignored while pending; settles to the server result', async () => {
    const d = deferred();
    fetchMock.mockReturnValueOnce(d.promise);
    const { onArchive } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm archive for/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Archiving…')).toBeTruthy();
    expect(screen.getByText(/not deleted/i)).toBeTruthy();
    d.resolve({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(onArchive).toHaveBeenCalledWith('wf-1'));
  });

  it('Archive: Escape when idle still cancels', () => {
    setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/not deleted/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
