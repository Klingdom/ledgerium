// @vitest-environment jsdom
/**
 * Backlog #349 - unknown outcomes (502/503/504, rejected fetch) are not reported as definite
 * failures; archive tolerates non-JSON error bodies; focus survives the settle; one row's
 * settle does not clear another row's live-region message.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import WorkflowRow, { CONFIRM_REQUEST_TIMEOUT_MS, type WorkflowRowData } from './WorkflowRow.js';

function makeWorkflow(id = 'wf-1', title = 'Approve Expense'): WorkflowRowData {
  return {
    id,
    title,
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
      healthScore: { overall: 65, speed: 18, consistency: 21, dataQuality: 14, standardization: 12, isGated: false },
      opportunityTag: 'healthy',
      aiOpportunityScore: 40,
      confidence: 0.75,
    },
  } as unknown as WorkflowRowData;
}

function renderRows(rows: Array<[string, string]> = [['wf-1', 'Approve Expense']]) {
  render(
    <table>
      <tbody>
        {rows.map(([id, title]) => (
          <WorkflowRow key={id} workflow={makeWorkflow(id, title)} onDelete={vi.fn()} onArchive={vi.fn()} />
        ))}
      </tbody>
    </table>,
  );
}

function startAction(rowTitle: string | null, item: 'Delete' | 'Archive') {
  const triggers = screen.getAllByLabelText(/actions for|more actions|menu/i, { selector: 'button' });
  const trigger = rowTitle
    ? triggers.find((b) => (b.getAttribute('aria-label') ?? '').includes(rowTitle))!
    : triggers[0]!;
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('menuitem', { name: item }));
  const label = item === 'Delete' ? /confirm delete for/i : /confirm archive for/i;
  const name = rowTitle ? new RegExp(`${label.source} ${rowTitle}`, 'i') : label;
  fireEvent.click(screen.getByRole('button', { name }));
}

const liveRegion = () => document.getElementById('workflow-row-status-region');
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  liveRegion()?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('#349 (1) unknown vs definite outcomes', () => {
  it.each([502, 503, 504])('Delete %i settles as unknown, not "not deleted"', async (status) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });
    renderRows();
    startAction(null, 'Delete');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Delete status unknown — refresh the page to check.');
    expect(screen.queryByText(/not deleted/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0); // timeout timer cleared
  });

  it.each([502, 503, 504])('Archive %i settles as unknown, not "not archived"', async (status) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: 'gateway' }) });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Archive status unknown — refresh the page to check.');
    expect(screen.queryByText('gateway')).toBeNull();
  });

  it('a rejected fetch settles as unknown for delete and archive', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderRows();
    startAction(null, 'Delete');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Delete status unknown — refresh the page to check.');
    cleanup();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Archive status unknown — refresh the page to check.');
    expect(screen.queryByText(/network error/i)).toBeNull();
  });

  it.each([400, 401, 403, 404, 409, 500])('Delete %i stays a definite failure with the existing copy', async (status) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });
    renderRows();
    startAction(null, 'Delete');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Delete failed — workflow not deleted.');
    expect(screen.queryByText(/status unknown/i)).toBeNull();
    expect(screen.getByRole('button', { name: /cancel — do not delete/i })).toBeTruthy();
  });

  it('Archive 4xx with a JSON error keeps the server message', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'Already archived.' }) });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Already archived.');
  });
});

describe('#349 (2) archive error-body parsing', () => {
  it('a non-JSON 4xx body falls back to the definite failure copy, never "Network error"', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Archive failed — workflow not archived.');
    expect(screen.queryByText(/network error/i)).toBeNull();
  });

  it('a non-JSON 500 body is also a definite failure, and a non-string error field is ignored', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new SyntaxError('bad'); },
    });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Archive failed — workflow not archived.');
    cleanup();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { code: 1 } }) });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(screen.getByRole('alert').textContent).toBe('Archive failed — workflow not archived.');
  });
});

describe('#349 (3) focus after settle', () => {
  it('Delete: focus lands on Close after the timeout', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    renderRows();
    startAction(null, 'Delete');
    await act(async () => { await vi.advanceTimersByTimeAsync(CONFIRM_REQUEST_TIMEOUT_MS); });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('Archive: focus lands on Close after the timeout and after an unknown failure', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    renderRows();
    startAction(null, 'Archive');
    await act(async () => { await vi.advanceTimersByTimeAsync(CONFIRM_REQUEST_TIMEOUT_MS); });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    cleanup();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('Delete: focus lands on Close after a 502 and on Cancel after a definite failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
    renderRows();
    startAction(null, 'Delete');
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    cleanup();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    renderRows();
    startAction(null, 'Delete');
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /cancel — do not delete/i }));
  });

  it('Archive: focus lands on Cancel after a definite failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Nope.' }) });
    renderRows();
    startAction(null, 'Archive');
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /cancel — do not archive/i }));
  });
});

describe('#349 (4) shared status region', () => {
  it('a row that did not set the current message cannot clear it (A busy last, B times out)', async () => {
    fetchMock
      .mockReturnValueOnce(new Promise(() => {})) // B delete: hangs, times out first
      .mockReturnValueOnce(new Promise(() => {})); // A archive: starts after B, still busy
    renderRows([['wf-a', 'Alpha'], ['wf-b', 'Beta']]);
    startAction('Beta', 'Delete');
    await act(async () => { await vi.advanceTimersByTimeAsync(CONFIRM_REQUEST_TIMEOUT_MS - 1000); });
    startAction('Alpha', 'Archive');
    expect(liveRegion()!.textContent).toBe('Archiving workflow…');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); // B times out now
    expect(screen.getByText('Delete status unknown — refresh the page to check.')).toBeTruthy();
    expect(liveRegion()!.textContent).toBe('Archiving workflow…'); // A's busy message survives
  });

  it('success announcement of one row is not cleared by another row\'s later failure', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'Nope.' }) });
    renderRows([['wf-a', 'Alpha'], ['wf-b', 'Beta']]);
    startAction('Beta', 'Archive');
    startAction('Alpha', 'Archive');
    await flush();
    // Alpha (second request) failed definitively; Beta succeeded first and its message
    // belongs to Beta, so Alpha's clear must leave 'Workflow archived.' alone.
    expect(screen.getByText('Nope.')).toBeTruthy();
    expect(liveRegion()!.textContent).toBe('Workflow archived.');
  });
});
