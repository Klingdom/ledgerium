// @vitest-environment jsdom
/**
 * Backlog #370 - Escape inside the saved-view editors (rename input, new-view
 * name input, delete confirmation) cancels only that editor; the drawer stays
 * open and focus returns to the editor's trigger. A further Escape (no editor
 * open) closes the drawer as before.
 */
import React, { useRef, useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import ColumnPicker from './ColumnPicker.js';
import type { SavedView } from '@/lib/dashboard-columns/persistence.js';

const VIEW = {
  id: 'sv-1',
  name: 'Weekly review',
  visibleColumns: ['workflow_title', 'health_score'],
  columnOrder: ['workflow_title', 'health_score'],
  filters: [],
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as SavedView;

function Harness(props: { onClose: () => void; onSavedViewsChange: (v: readonly SavedView[]) => void }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <button ref={triggerRef}>Customize columns trigger</button>
      <ColumnPicker
        isOpen
        onClose={props.onClose}
        visibleColumns={['workflow_title', 'health_score']}
        onToggleColumn={vi.fn()}
        saveStatus="idle"
        triggerRef={triggerRef}
        savedViews={[VIEW]}
        onSavedViewsChange={props.onSavedViewsChange}
        onApplySavedView={vi.fn()}
      />
    </div>
  );
}

function setup() {
  const onClose = vi.fn();
  const onSavedViewsChange = vi.fn();
  render(<Harness onClose={onClose} onSavedViewsChange={onSavedViewsChange} />);
  return { onClose, onSavedViewsChange };
}

const pressEscape = (el: Element) => fireEvent.keyDown(el, { key: 'Escape' });

afterEach(cleanup);

describe('ColumnPicker Escape handling in saved-view editors (#370)', () => {
  it('rename: Escape cancels the edit, keeps the drawer open, does not commit, focuses the rename trigger', () => {
    const { onClose, onSavedViewsChange } = setup();
    fireEvent.click(screen.getByLabelText('Rename saved view: Weekly review'));
    const input = screen.getByLabelText('Rename saved view');
    fireEvent.change(input, { target: { value: 'Edited' } });
    input.focus();
    pressEscape(input);

    expect(screen.queryByLabelText('Rename saved view')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSavedViewsChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Customize columns' })).toBeTruthy();
    expect(screen.getByText('Weekly review')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Rename saved view: Weekly review'));

    pressEscape(document.activeElement as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('new view: Escape cancels the form, keeps the drawer open, focuses the Save current view trigger', () => {
    const { onClose, onSavedViewsChange } = setup();
    fireEvent.click(screen.getByLabelText('Save current column configuration as a named view'));
    const input = screen.getByLabelText('Name for saved view');
    fireEvent.change(input, { target: { value: 'Draft' } });
    input.focus();
    pressEscape(input);

    expect(screen.queryByLabelText('Name for saved view')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSavedViewsChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Customize columns' })).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText('Save current column configuration as a named view'),
    );

    pressEscape(document.activeElement as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('delete confirmation: Escape cancels it, keeps the drawer open, focuses the delete trigger', () => {
    const { onClose, onSavedViewsChange } = setup();
    fireEvent.click(screen.getByLabelText('Delete saved view: Weekly review'));
    const confirm = screen.getByLabelText('Confirm delete — Weekly review');
    expect(document.activeElement).toBe(confirm);
    pressEscape(confirm);

    expect(screen.queryByLabelText('Confirm delete — Weekly review')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSavedViewsChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Customize columns' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Delete saved view: Weekly review'));

    pressEscape(document.activeElement as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── #373: commit paths keep focus inside the dialog ──────────────────────────

const mk = (id: string, name: string) => ({ ...VIEW, id, name }) as SavedView;

/** Stateful harness: the parent applies savedViews changes like the real shell. */
function StatefulHarness({ initial }: { initial: SavedView[] }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [views, setViews] = useState<readonly SavedView[]>(initial);
  return (
    <div>
      <button ref={triggerRef}>Customize columns trigger</button>
      <ColumnPicker
        isOpen
        onClose={vi.fn()}
        visibleColumns={['workflow_title', 'health_score']}
        onToggleColumn={vi.fn()}
        saveStatus="idle"
        triggerRef={triggerRef}
        savedViews={views}
        onSavedViewsChange={setViews}
        onApplySavedView={vi.fn()}
      />
    </div>
  );
}

const insideDialog = () =>
  !!document.activeElement?.closest('[role="dialog"]');

describe('ColumnPicker focus after saved-view commit paths (#373)', () => {
  it('rename committed with Enter focuses the row rename trigger', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha')]} />);
    fireEvent.click(screen.getByLabelText('Rename saved view: Alpha'));
    const input = screen.getByLabelText('Rename saved view');
    input.focus();
    fireEvent.change(input, { target: { value: 'Alpha 2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByLabelText('Rename saved view: Alpha 2'));
    expect(insideDialog()).toBe(true);
  });

  it('rename committed by blur does not steal focus back', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha')]} />);
    fireEvent.click(screen.getByLabelText('Rename saved view: Alpha'));
    const input = screen.getByLabelText('Rename saved view');
    input.focus();
    fireEvent.change(input, { target: { value: 'Alpha 2' } });
    const elsewhere = screen.getByLabelText('Save current column configuration as a named view');
    elsewhere.focus();
    fireEvent.blur(input); // React onBlur -> commit (jsdom focus() alone does not dispatch focusout)
    expect(screen.getByText('Alpha 2')).toBeTruthy();
    expect(document.activeElement).toBe(elsewhere);
  });

  it('Enter during IME composition neither commits nor cancels the rename', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha')]} />);
    fireEvent.click(screen.getByLabelText('Rename saved view: Alpha'));
    const input = screen.getByLabelText('Rename saved view');
    input.focus();
    fireEvent.change(input, { target: { value: 'Al' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    expect(screen.getByLabelText('Rename saved view')).toBe(input);
  });

  it('delete of a middle row focuses the next row Apply button', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha'), mk('b', 'Beta'), mk('c', 'Gamma')]} />);
    fireEvent.click(screen.getByLabelText('Delete saved view: Beta'));
    fireEvent.click(screen.getByLabelText('Confirm delete — Beta'));
    expect(screen.queryByText('Beta')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Apply saved view: Gamma'));
    expect(insideDialog()).toBe(true);
  });

  it('delete of the last row focuses the previous row Apply button', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha'), mk('b', 'Beta')]} />);
    fireEvent.click(screen.getByLabelText('Delete saved view: Beta'));
    fireEvent.click(screen.getByLabelText('Confirm delete — Beta'));
    expect(document.activeElement).toBe(screen.getByLabelText('Apply saved view: Alpha'));
  });

  it('delete of the only view focuses the Save current view button', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha')]} />);
    fireEvent.click(screen.getByLabelText('Delete saved view: Alpha'));
    fireEvent.click(screen.getByLabelText('Confirm delete — Alpha'));
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByLabelText('Save current column configuration as a named view'),
    );
    expect(insideDialog()).toBe(true);
  });

  it('save with Enter focuses the new view Apply button', () => {
    render(<StatefulHarness initial={[mk('a', 'Alpha')]} />);
    fireEvent.click(screen.getByLabelText('Save current column configuration as a named view'));
    const input = screen.getByLabelText('Name for saved view');
    fireEvent.change(input, { target: { value: 'Fresh' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByLabelText('Name for saved view')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Apply saved view: Fresh'));
    expect(insideDialog()).toBe(true);
  });
});
