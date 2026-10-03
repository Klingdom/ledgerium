// @vitest-environment jsdom
/**
 * Backlog #336 - a hung delete/archive request settles as "status unknown" after a client
 * timeout (Escape works again), and busy/settled states are exposed to assistive tech.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import WorkflowRow, { CONFIRM_REQUEST_TIMEOUT_MS, type WorkflowRowData } from './WorkflowRow.js';

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
      healthScore: { overall: 65, speed: 18, consistency: 21, dataQuality: 14, standardization: 12, isGated: false },
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

function startDelete() {
  openMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  fireEvent.click(screen.getByRole('button', { name: /confirm delete for/i }));
}

function startArchive() {
  openMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
  fireEvent.click(screen.getByRole('button', { name: /confirm archive for/i }));
}

const liveRegion = () => document.getElementById('workflow-row-status-region');

async function pastTimeout() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(CONFIRM_REQUEST_TIMEOUT_MS);
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: { mockRestore: () => void } & ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as unknown as typeof errorSpy;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe('#336 timeout: hung request settles as unknown', () => {
  it('Delete: after the timeout shows the unknown status, aborts, and Escape dismisses again', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {})); // never settles
    const { onDelete } = setup();
    startDelete();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Deleting…')).toBeTruthy(); // still swallowed before the timeout

    await pastTimeout();
    const signal = (fetchMock.mock.calls[0]![1] as RequestInit).signal as AbortSignal;
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('Delete status unknown — refresh the page to check.');
    expect(screen.queryByText('Deleting…')).toBeNull();
    expect(liveRegion()!.textContent).toBe(''); // busy announcement cleared; alert is the only message
    expect(onDelete).not.toHaveBeenCalled(); // no optimistic removal

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/permanently removed after 30 days/i)).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Delete: unknown state can be dismissed with the Close button; confirm is not retryable', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    setup();
    startDelete();
    await pastTimeout();
    expect((screen.getByRole('button', { name: /confirm delete for/i }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(/permanently removed after 30 days/i)).toBeNull();
  });

  it('Archive: after the timeout shows the unknown status and Escape dismisses again', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    const { onArchive } = setup();
    startArchive();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Archiving…')).toBeTruthy();

    await pastTimeout();
    expect(screen.getByRole('alert').textContent).toBe('Archive status unknown — refresh the page to check.');
    expect(liveRegion()!.textContent).toBe('');
    expect(onArchive).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/not deleted/i)).toBeNull();
  });

  it('a response that arrives after the timeout is ignored (status stays unknown)', async () => {
    let resolveLate!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((r) => { resolveLate = r; })); // ignores abort
    const { onDelete } = setup();
    startDelete();
    await pastTimeout();
    await act(async () => {
      resolveLate({ ok: true, json: async () => ({}) });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Delete status unknown — refresh the page to check.');
    expect(liveRegion()!.textContent).toBe(''); // late success announces nothing
  });

  it('a late failure response after the timeout also announces nothing', async () => {
    let resolveLate!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((r) => { resolveLate = r; }));
    setup();
    startArchive();
    await pastTimeout();
    await act(async () => {
      resolveLate({ ok: false, json: async () => ({ error: 'late boom' }) });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(liveRegion()!.textContent).toBe('');
    expect(screen.queryByText('late boom')).toBeNull();
  });

  it('a fast success before the timeout behaves as before: no unknown message, timer cleared, no warnings', async () => {
    const { onDelete } = setup();
    startDelete();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onDelete).toHaveBeenCalledWith('wf-1');
    expect(vi.getTimerCount()).toBe(0);
    await pastTimeout();
    expect(screen.queryByText(/status unknown/i)).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('a fast archive success clears its timer too', async () => {
    const { onArchive } = setup();
    startArchive();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onArchive).toHaveBeenCalledWith('wf-1');
    expect(vi.getTimerCount()).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('#336 accessibility of busy and settled states', () => {
  it('busy text is not overridden by an aria-label and the region is aria-busy', () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    setup();
    startDelete();
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeTruthy();
    expect(screen.getByRole('region', { name: /confirm delete for/i }).getAttribute('aria-busy')).toBe('true');
  });

  it('busy state is announced via a polite live region (delete and archive)', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    setup();
    startDelete();
    const region = liveRegion()!;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Deleting workflow…');
    cleanup();
    setup();
    startArchive();
    expect(liveRegion()!.textContent).toBe('Archiving workflow…');
  });

  it('success is announced (delete and archive)', async () => {
    setup();
    startDelete();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(liveRegion()!.textContent).toBe('Workflow deleted.');
    cleanup();
    setup();
    startArchive();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(liveRegion()!.textContent).toBe('Workflow archived.');
  });

  it('failure is announced through the role=alert error, and the busy label returns', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    setup();
    startDelete();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole('alert').textContent).toBe('Delete failed — workflow not deleted.');
    expect(screen.getByRole('button', { name: /confirm delete for/i })).toBeTruthy();
    expect(liveRegion()!.textContent).toBe(''); // busy announcement cleared on failure
  });

  it('archive failure and network error also clear the busy announcement', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Nope.' }) });
    setup();
    startArchive();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole('alert').textContent).toBe('Nope.');
    expect(liveRegion()!.textContent).toBe('');
    cleanup();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    setup();
    startDelete();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    // #349: a rejected fetch is an unknown outcome, not a definite "network error".
    expect(screen.getByRole('alert').textContent).toBe('Delete status unknown — refresh the page to check.');
    expect(liveRegion()!.textContent).toBe('');
  });

  it('the Close button in the unknown state has no contradicting aria-label (delete and archive)', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    setup();
    startDelete();
    await pastTimeout();
    expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-label')).toBeNull();
    cleanup();
    setup();
    startArchive();
    await pastTimeout();
    expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-label')).toBeNull();
  });

  it('unknown status is announced through a role=alert', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    setup();
    startArchive();
    await pastTimeout();
    expect(screen.getByRole('alert').textContent).toBe('Archive status unknown — refresh the page to check.');
  });
});
