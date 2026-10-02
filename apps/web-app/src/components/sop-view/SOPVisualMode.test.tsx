// @vitest-environment jsdom
/**
 * Row #231 — Flow View per-step detail must be reachable by keyboard, touch and
 * pointer (WCAG 2.1 SC 1.4.13 / 2.1.1), and the scrollbar must use theme tokens.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { SOPVisualMode } from './SOPVisualMode';
import type { SOPViewModel } from './types';

afterEach(cleanup);

function makeVm(n = 4): SOPViewModel {
  const steps = Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`, ordinal: i + 1, title: `Title ${i + 1}`, shortTitle: `Short ${i + 1}`,
    system: i === 0 ? 'Salesforce' : '', durationLabel: i === 0 ? '12s' : '',
    frictionIndicators: [], hasHighFriction: false, phaseId: 'p1', confidence: 0.9,
    accentColor: '#000', isDecisionPoint: false,
  }));
  return {
    workflowDNA: {
      stepDots: steps.map(s => ({ ordinal: s.ordinal, category: 'x', color: '#10b981', isDecision: false, isError: false })),
      phaseBreaks: [], systemCount: 1, totalSteps: n,
    },
    phases: [{ id: 'p1', label: 'P', color: '#000', stepCount: n, hasFriction: false }],
    steps,
    recommendations: [],
    enterprise: { rolesAndResponsibilities: [] },
    metadata: { confidence: null, stepCount: n, systems: [], roles: [], frictionCount: 0, objective: 'o', purpose: 'p', sourceNote: '' },
  } as unknown as SOPViewModel;
}

const renderIt = () => render(<SOPVisualMode viewModel={makeVm()} expandedSteps={new Set()} onToggleStep={() => {}} />);
const dots = () => screen.getAllByRole('button', { name: /^Step \d+: Short/ });

describe('SOPVisualMode flow strip (row #231)', () => {
  it('gives every step an accessible name', () => {
    renderIt();
    expect(dots().map(d => d.getAttribute('aria-label'))).toEqual(['Step 1: Short 1', 'Step 2: Short 2', 'Step 3: Short 3', 'Step 4: Short 4']);
  });

  it('uses a roving tabindex: exactly one step is a tab stop', () => {
    renderIt();
    expect(dots().map(d => d.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('shows the step detail on keyboard focus, linked via aria-describedby', () => {
    renderIt();
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => dots()[0]!.focus());
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toContain('Step 1: Short 1');
    expect(tip.textContent).toContain('Salesforce');
    expect(dots()[0]!.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('arrow keys, Home and End move focus and the roving tab stop', () => {
    renderIt();
    act(() => dots()[0]!.focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dots()[1]);
    expect(dots().map(d => d.tabIndex)).toEqual([-1, 0, -1, -1]);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(dots()[3]);
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(dots()[0]);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(dots()[0]);
  });

  it('Escape dismisses the detail while focus stays put', () => {
    renderIt();
    act(() => dots()[1]!.focus());
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(document.activeElement).toBe(dots()[1]);
  });

  it('hover shows the detail and it persists when the pointer moves onto it', () => {
    renderIt();
    fireEvent.mouseEnter(dots()[2]!);
    expect(screen.getByRole('tooltip').textContent).toContain('Step 3');
    // moving within the wrapper (onto the detail) does not dismiss it
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.mouseLeave(screen.getByRole('group', { name: /process flow/i }).parentElement!);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('tap (click without hover or focus) shows the detail; tapping again hides it', () => {
    renderIt();
    fireEvent.click(dots()[1]!);
    expect(screen.getByRole('tooltip').textContent).toContain('Step 2');
    fireEvent.click(dots()[1]!);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('scrollbar uses theme tokens, not a hardcoded colour', () => {
    renderIt();
    const strip = screen.getByRole('group', { name: /process flow/i });
    expect(strip.getAttribute('style')).toContain('var(--content-tertiary)');
    expect(strip.getAttribute('style')).not.toMatch(/#e2e8f0/i);
  });
});
