// @vitest-environment jsdom
/**
 * #389: the real component sends no system name in dashboard_v2_filter_applied;
 * enum filters still send their closed-set value.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const track = vi.fn();
vi.mock('@/lib/analytics.js', () => ({ track: (p: unknown) => track(p) }));

import WorkflowListFilterBar from './WorkflowListFilterBar.js';

import type { FilterState } from './WorkflowListFilterBar.js';
const EMPTY: FilterState = { systems: [], opportunity: null, healthStatus: null, needsAttention: false };

describe('WorkflowListFilterBar analytics payloads (#389)', () => {
  beforeEach(() => track.mockClear());
  afterEach(cleanup);

  it('systems filter: sends added/removed, never the system name', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <WorkflowListFilterBar availableSystems={['secret-crm.acme-corp.com']} filters={{ ...EMPTY }} onFiltersChange={onChange} />,
    );
    fireEvent.click(screen.getAllByText('secret-crm.acme-corp.com')[0]!); // the pill renders first
    expect(track).toHaveBeenLastCalledWith({ event: 'dashboard_v2_filter_applied', filterType: 'systems', filterValue: 'added' });
    rerender(
      <WorkflowListFilterBar availableSystems={['secret-crm.acme-corp.com']} filters={{ ...EMPTY, systems: ['secret-crm.acme-corp.com'] }} onFiltersChange={onChange} />,
    );
    fireEvent.click(screen.getAllByText('secret-crm.acme-corp.com')[0]!); // the pill renders first
    expect(track).toHaveBeenLastCalledWith({ event: 'dashboard_v2_filter_applied', filterType: 'systems', filterValue: 'removed' });
    expect(JSON.stringify(track.mock.calls)).not.toContain('acme-corp');
  });

  it('opportunity and health filters still send their closed-set value', () => {
    render(<WorkflowListFilterBar availableSystems={[]} filters={{ ...EMPTY }} onFiltersChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Filter by opportunity'), { target: { value: 'automate' } });
    expect(track).toHaveBeenLastCalledWith({ event: 'dashboard_v2_filter_applied', filterType: 'opportunity', filterValue: 'automate' });
    fireEvent.change(screen.getByLabelText('Filter by opportunity'), { target: { value: '' } });
    expect(track).toHaveBeenLastCalledWith({ event: 'dashboard_v2_filter_applied', filterType: 'opportunity', filterValue: 'cleared' });
  });
});
