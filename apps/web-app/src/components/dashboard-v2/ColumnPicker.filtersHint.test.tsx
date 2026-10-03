// @vitest-environment jsdom
/**
 * #368: the save form shows the hint only while an inexpressible filter is
 * active, connects it to the name input via aria-describedby, and stores the
 * captured FilterSet in the new view.
 */
import React, { useRef } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import ColumnPicker from './ColumnPicker.js';
import type { SavedView } from '@/lib/dashboard-columns/persistence.js';
import type { FilterSet } from '@/lib/dashboard-columns/filters.js';

const SAVE = 'Save current column configuration as a named view';
const HINT = "Your search and some filters won't be saved with this view.";
const captured: FilterSet = [
  { columnKey: 'opportunity_tag', value: { kind: 'multi', operator: 'in', values: ['automate'] } },
];

function H(props: { partial: boolean; onChange?: (v: readonly SavedView[]) => void }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <button ref={triggerRef}>t</button>
      <ColumnPicker
        isOpen
        onClose={vi.fn()}
        visibleColumns={['workflow_title', 'health_score']}
        onToggleColumn={vi.fn()}
        saveStatus="idle"
        triggerRef={triggerRef}
        savedViews={[]}
        currentFilters={captured}
        filtersPartiallyCaptured={props.partial}
        onSavedViewsChange={props.onChange ?? vi.fn()}
        onApplySavedView={vi.fn()}
        savedViewsStatus="ready"
      />
    </div>
  );
}

afterEach(cleanup);

describe('#368 save-form hint', () => {
  it('is hidden when everything active is captured', () => {
    render(<H partial={false} />);
    fireEvent.click(screen.getByLabelText(SAVE));
    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.getByLabelText('Name for saved view').getAttribute('aria-describedby')).toBeNull();
  });

  it('is shown and described-by the name input when a filter cannot be saved', () => {
    render(<H partial />);
    fireEvent.click(screen.getByLabelText(SAVE));
    const hint = screen.getByText(HINT);
    const input = screen.getByLabelText('Name for saved view');
    expect(hint.id).not.toBe('');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('stores the captured FilterSet in the new view', () => {
    const onChange = vi.fn();
    render(<H partial={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(SAVE));
    const input = screen.getByLabelText('Name for saved view');
    fireEvent.change(input, { target: { value: 'Auto' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const saved = onChange.mock.calls[0]![0] as SavedView[];
    expect(saved[0]!.filters).toEqual(captured);
  });
});
