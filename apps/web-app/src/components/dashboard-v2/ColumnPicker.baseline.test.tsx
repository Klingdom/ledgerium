// @vitest-environment jsdom
/**
 * Backlog #384 - until the initial preferences GET has succeeded, the drawer's
 * saved-view controls are off, the section never says "No saved views yet.",
 * a failed load shows an error + Retry, and Retry keeps focus / hands it to
 * "Save current view" on success.
 */
import React, { useRef, useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import ColumnPicker, { type SavedViewsStatus } from './ColumnPicker.js';
import type { SavedView } from '@/lib/dashboard-columns/persistence.js';

const SAVE_TRIGGER = 'Save current column configuration as a named view';
const ERROR_TEXT = "Couldn't load your saved views.";

function Harness(props: {
  initial: SavedViewsStatus;
  onRetry: () => void;
  onChange?: (v: readonly SavedView[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<SavedViewsStatus>(props.initial);
  return (
    <div>
      <button ref={triggerRef}>trigger</button>
      <button data-testid="to-loading" onClick={() => setStatus('loading')} />
      <button data-testid="to-error" onClick={() => setStatus('error')} />
      <button data-testid="to-ready" onClick={() => setStatus('ready')} />
      <ColumnPicker
        isOpen
        onClose={vi.fn()}
        visibleColumns={['workflow_title', 'health_score']}
        onToggleColumn={vi.fn()}
        saveStatus="idle"
        triggerRef={triggerRef}
        savedViews={[]}
        onSavedViewsChange={props.onChange ?? vi.fn()}
        onApplySavedView={vi.fn()}
        savedViewsStatus={status}
        onRetrySavedViews={props.onRetry}
      />
    </div>
  );
}

afterEach(cleanup);

describe('ColumnPicker saved views before the baseline is known (#384)', () => {
  it('error: message + Retry, Save disabled, no "No saved views yet."', () => {
    render(<Harness initial="error" onRetry={vi.fn()} />);
    expect(screen.getByText(ERROR_TEXT)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect((screen.getByLabelText(SAVE_TRIGGER) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('No saved views yet.')).toBeNull();
  });

  it('loading: neutral — no error text, no empty-state line, Save disabled', () => {
    render(<Harness initial="loading" onRetry={vi.fn()} />);
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByText('No saved views yet.')).toBeNull();
    expect((screen.getByLabelText(SAVE_TRIGGER) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ready: controls enabled, empty-state line shown, no Retry', () => {
    render(<Harness initial="ready" onRetry={vi.fn()} />);
    expect((screen.getByLabelText(SAVE_TRIGGER) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('No saved views yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('Retry calls onRetry and keeps focus while loading; a second failure stays on Retry', () => {
    const onRetry = vi.fn();
    render(<Harness initial="error" onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    retry.focus();
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('to-loading')); // GET in flight
    const retryWhileLoading = screen.getByRole('button', { name: 'Retry' });
    expect(retryWhileLoading.getAttribute('aria-disabled')).toBe('true');
    retryWhileLoading.focus();
    fireEvent.click(retryWhileLoading); // ignored while in flight
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('to-error')); // failed again
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }));
  });

  it('Retry success enables the controls and focuses Save current view', () => {
    render(<Harness initial="error" onRetry={vi.fn()} />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    retry.focus();
    fireEvent.click(retry);
    fireEvent.click(screen.getByTestId('to-loading'));
    fireEvent.click(screen.getByTestId('to-ready'));
    const save = screen.getByLabelText(SAVE_TRIGGER) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    expect(document.activeElement).toBe(save);
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
