// @vitest-environment jsdom
/**
 * Backlog #376 (SAVED_VIEWS_DESIGN section 4): rule F0 (focus is never left on
 * BODY inside the open drawer), the Save-form Cancel button, and the two
 * persistent live regions (role=status / role=alert).
 */
import React, { useRef, useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import ColumnPicker, { type SavedViewsStatus } from './ColumnPicker.js';
import type { SavedView } from '@/lib/dashboard-columns/persistence.js';

const SAVE = 'Save current column configuration as a named view';

function makeView(id: string, name: string): SavedView {
  return {
    id,
    name,
    visibleColumns: ['workflow_title', 'health_score'],
    columnOrder: ['workflow_title', 'health_score'],
    filters: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  } as unknown as SavedView;
}

interface HarnessApi {
  setViews: (v: readonly SavedView[]) => void;
}

function Harness(props: {
  initialViews: readonly SavedView[];
  api?: HarnessApi;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string | null;
  onApply?: (v: SavedView) => void;
  status?: SavedViewsStatus;
  onRetry?: () => void;
  onChangeSpy?: (v: readonly SavedView[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [views, setViews] = useState<readonly SavedView[]>(props.initialViews);
  if (props.api) props.api.setViews = setViews;
  return (
    <div>
      <button ref={triggerRef}>trigger</button>
      <ColumnPicker
        isOpen
        onClose={vi.fn()}
        visibleColumns={['workflow_title', 'health_score']}
        onToggleColumn={vi.fn()}
        saveStatus={props.saveStatus ?? 'idle'}
        saveError={props.saveError ?? null}
        triggerRef={triggerRef}
        savedViews={views}
        onSavedViewsChange={(v) => {
          props.onChangeSpy?.(v);
          setViews(v);
        }}
        onApplySavedView={props.onApply ?? vi.fn()}
        savedViewsStatus={props.status ?? 'ready'}
        onRetrySavedViews={props.onRetry ?? vi.fn()}
      />
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });

describe('F0 focus fallback (#376)', () => {
  it('rolled-back create: focus on the new Apply is lost, so it lands on Save current view', () => {
    const api: HarnessApi = { setViews: () => {} };
    render(<Harness initialViews={[makeView('a', 'Alpha')]} api={api} />);
    fireEvent.click(screen.getByLabelText(SAVE));
    const input = screen.getByLabelText('Name for saved view');
    fireEvent.change(input, { target: { value: 'Doomed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const doomedApply = screen.getByLabelText('Apply saved view: Doomed');
    expect(document.activeElement).toBe(doomedApply);

    // PUT failed: shell rolls the list back.
    act(() => api.setViews([makeView('a', 'Alpha')]));
    expect(screen.queryByLabelText('Apply saved view: Doomed')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText(SAVE));
  });

  it('rolled-back create at the 10-view limit: focus lands on the first row Apply', () => {
    const nine = Array.from({ length: 9 }, (_, i) => makeView(`v${i}`, `View ${i}`));
    const api: HarnessApi = { setViews: () => {} };
    render(<Harness initialViews={nine} api={api} />);
    fireEvent.click(screen.getByLabelText(SAVE));
    const input = screen.getByLabelText('Name for saved view');
    fireEvent.change(input, { target: { value: 'Tenth' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByLabelText('Apply saved view: Tenth'));
    expect(screen.queryByLabelText(SAVE)).toBeNull(); // at the limit

    // Rollback to 10 views minus the new one is 9 again, so Save returns: simulate a
    // reconcile that leaves 10 views while the focused row vanished instead.
    const ten = [...nine, makeView('x', 'Other')];
    act(() => api.setViews(ten));
    expect(document.activeElement).toBe(screen.getByLabelText('Apply saved view: View 0'));
  });

  it('delete whose neighbour is mid-confirm: focus lands on Save current view, not BODY', () => {
    render(<Harness initialViews={[makeView('a', 'Alpha'), makeView('b', 'Beta')]} />);
    // Beta enters its delete confirmation, so its Apply button is not rendered.
    fireEvent.click(screen.getByLabelText('Delete saved view: Beta'));
    expect(screen.queryByLabelText('Apply saved view: Beta')).toBeNull();
    // Alpha (the neighbour of Beta, previous row) is deleted.
    fireEvent.click(screen.getByLabelText('Delete saved view: Alpha'));
    const confirm = screen
      .getAllByRole('button')
      .filter((b) => /confirm delete/i.test(b.getAttribute('aria-label') ?? ''));
    expect(confirm.length).toBeGreaterThan(0);
    fireEvent.click(confirm[0]!);
    expect(document.activeElement).toBe(screen.getByLabelText(SAVE));
  });

  it('does not move focus that is still on a live element', () => {
    const api: HarnessApi = { setViews: () => {} };
    render(<Harness initialViews={[makeView('a', 'Alpha')]} api={api} />);
    const apply = screen.getByLabelText('Apply saved view: Alpha');
    apply.focus();
    act(() => api.setViews([makeView('a', 'Alpha'), makeView('b', 'Beta')]));
    expect(document.activeElement).toBe(apply);
  });

  it('last resort: nothing focusable in the section at all falls to the drawer', () => {
    // Not ready (loading): Save is disabled and there are no rows.
    const api: HarnessApi = { setViews: () => {} };
    render(<Harness initialViews={[]} api={api} status="loading" />);
    const dialog = screen.getByRole('dialog');
    (document.activeElement as HTMLElement | null)?.blur();
    act(() => api.setViews([]));
    expect(dialog.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(dialog);
  });
});

describe('Save form Cancel button (#376)', () => {
  it('returns focus to Save current view', () => {
    render(<Harness initialViews={[]} />);
    fireEvent.click(screen.getByLabelText(SAVE));
    fireEvent.change(screen.getByLabelText('Name for saved view'), { target: { value: 'x' } });
    fireEvent.click(screen.getByLabelText('Cancel save'));
    expect(screen.queryByLabelText('Name for saved view')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText(SAVE));
  });
});

describe('persistent live regions (#376)', () => {
  it('status and alert regions are mounted while empty, and "Saving…" is not inside either', async () => {
    render(<Harness initialViews={[]} saveStatus="saving" />);
    await tick();
    const status = screen.getByRole('status');
    const alert = screen.getByRole('alert');
    expect(status.textContent).toBe('');
    expect(alert.textContent).toBe('');
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(status.textContent).not.toContain('Saving');
    expect(alert.textContent).not.toContain('Saving');
  });

  it('"Saved" appears in the status region by changing text, same node', async () => {
    const { rerender } = render(<Harness initialViews={[]} saveStatus="saving" />);
    await tick();
    const status = screen.getByRole('status');
    rerender(<Harness initialViews={[]} saveStatus="saved" />);
    await tick();
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('Saved');
  });

  it('a save error goes to the alert region; an error pending at open is set after mount', async () => {
    render(<Harness initialViews={[]} saveStatus="error" saveError="Couldn't save your changes. Please try again." />);
    // First tick: region exists but text is withheld.
    expect(screen.getByRole('alert').textContent).toBe('');
    await tick();
    expect(screen.getByRole('alert').textContent).toBe("Couldn't save your changes. Please try again.");
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('apply announces "Applied view: {name}" in the status region, screen-reader only, and keeps focus', async () => {
    const onApply = vi.fn();
    render(<Harness initialViews={[makeView('a', 'Alpha')]} onApply={onApply} />);
    await tick();
    const apply = screen.getByLabelText('Apply saved view: Alpha');
    apply.focus();
    fireEvent.click(apply);
    expect(onApply).toHaveBeenCalledTimes(1);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Applied view: Alpha');
    expect(status.querySelector('.sr-only')).not.toBeNull();
    expect(document.activeElement).toBe(apply);
    // A second apply of the same view changes the text so it is read again.
    fireEvent.click(apply);
    expect(status.textContent?.trim()).toBe('Applied view: Alpha');
    expect(status.textContent).not.toBe('Applied view: Alpha');
  });

  it('Retry outcome: success announces in status, a second failure in alert', async () => {
    const Wrapper = () => {
      const [st, setSt] = useState<SavedViewsStatus>('error');
      return (
        <div>
          <button data-testid="loading" onClick={() => setSt('loading')} />
          <button data-testid="error" onClick={() => setSt('error')} />
          <button data-testid="ready" onClick={() => setSt('ready')} />
          <Harness initialViews={[]} status={st} onRetry={vi.fn()} />
        </div>
      );
    };
    render(<Wrapper />);
    await tick();
    expect(screen.getByRole('alert').textContent).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByTestId('loading'));
    fireEvent.click(screen.getByTestId('error'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe("Couldn't load your saved views."),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByTestId('loading'));
    fireEvent.click(screen.getByTestId('ready'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved views loaded.'));
    expect(screen.getByRole('alert').textContent).toBe('');
  });
});
