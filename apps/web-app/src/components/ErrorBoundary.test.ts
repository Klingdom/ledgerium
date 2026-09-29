/**
 * ErrorBoundary — what gets reported when a surface fails.
 *
 * Environment: Vitest (node) — web-app has no jsdom and no React Testing
 * Library, so the render behaviour cannot be exercised here. The reporting
 * DECISION is therefore extracted into `describeBoundaryError`, which is pure,
 * and that is what these tests attack. Wiring is asserted at source level, the
 * same convention `dashboard-instrumentation.test.ts` uses.
 *
 * The load-bearing property: a crash report must never carry the error's
 * message. Messages in this codebase interpolate what broke, and what broke is
 * a workflow title, a step label, or a field name captured from a user's
 * screen — so a crash report is the obvious path for recorded content to reach
 * analytics.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describeBoundaryError } from './ErrorBoundary.js';
import type { AnalyticsEvent } from '../lib/analytics.js';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

describe('describeBoundaryError: reports a name, never a message', () => {
  it('takes the constructor name from a real Error', () => {
    expect(describeBoundaryError(new TypeError('boom'), 'workflow_row')).toEqual({
      surface: 'workflow_row',
      errorName: 'TypeError',
    });
  });

  it('never includes the message, even when it names a workflow', () => {
    // The realistic leak: an error interpolating captured content.
    const err = new Error('Cannot read runs of workflow "Q3 Payroll Reconciliation"');
    const report = describeBoundaryError(err, 'workflow_row');
    expect(JSON.stringify(report)).not.toMatch(/Payroll|Cannot read|workflow "/);
    expect(report.errorName).toBe('Error');
  });

  it('never includes a stack', () => {
    const err = new Error('boom');
    expect(JSON.stringify(describeBoundaryError(err, 'dashboard_shell'))).not.toMatch(/at \w+|\.tsx/);
  });

  it('carries exactly two keys, so nothing can ride along', () => {
    expect(Object.keys(describeBoundaryError(new Error('x'), 'workflow_row')).sort()).toEqual([
      'errorName',
      'surface',
    ]);
  });
});

describe('describeBoundaryError: survives anything thrown', () => {
  it('handles a thrown string without coercing it into the payload', () => {
    // `throw 'some message'` is legal. Coercing it is exactly how a message
    // ends up in analytics, so it must become UnknownError rather than itself.
    const report = describeBoundaryError('Workflow "Payroll" exploded', 'workflow_row');
    expect(report.errorName).toBe('UnknownError');
    expect(JSON.stringify(report)).not.toMatch(/Payroll|exploded/);
  });

  it('handles null, undefined, numbers and plain objects', () => {
    for (const thrown of [null, undefined, 42, {}, [], true]) {
      expect(describeBoundaryError(thrown, 'dashboard_shell').errorName).toBe('UnknownError');
    }
  });

  it('rejects a name that is really a message wearing one', () => {
    // An Error whose `name` has been overwritten with prose. Reject rather than
    // truncate — a truncated message is still a message.
    const err = new Error('x');
    err.name = 'Failed to load workflow "Q3 Payroll" from the server';
    const report = describeBoundaryError(err, 'workflow_row');
    expect(report.errorName).toBe('UnknownError');
    expect(JSON.stringify(report)).not.toMatch(/Payroll/);
  });

  it('rejects an absurdly long name even without whitespace', () => {
    const err = new Error('x');
    err.name = 'A'.repeat(200);
    expect(describeBoundaryError(err, 'workflow_row').errorName).toBe('UnknownError');
  });

  it('accepts ordinary custom error names', () => {
    const err = new Error('x');
    err.name = 'QuotaExceededError';
    expect(describeBoundaryError(err, 'dashboard_shell').errorName).toBe('QuotaExceededError');
  });

  it('trims but otherwise preserves a padded name', () => {
    const err = new Error('x');
    err.name = '  RangeError  ';
    expect(describeBoundaryError(err, 'workflow_row').errorName).toBe('RangeError');
  });

  it('is deterministic', () => {
    const err = new TypeError('boom');
    const out = new Set(
      Array.from({ length: 5 }, () => JSON.stringify(describeBoundaryError(err, 'workflow_row'))),
    );
    expect(out.size).toBe(1);
  });
});

describe('the analytics event accepts the report and nothing more', () => {
  it('type-checks as a valid event', () => {
    const ev: AnalyticsEvent = {
      event: 'ui_error_boundary_triggered',
      ...describeBoundaryError(new TypeError('x'), 'workflow_row'),
    };
    expect(ev.event).toBe('ui_error_boundary_triggered');
  });

  it('rejects a message field at the type level', () => {
    const ev: AnalyticsEvent = {
      event: 'ui_error_boundary_triggered',
      surface: 'dashboard_shell',
      errorName: 'Error',
      // @ts-expect-error a message must not be attachable to this event
      message: 'Cannot read runs of workflow "Q3 Payroll"',
    };
    expect(ev.event).toBe('ui_error_boundary_triggered');
  });

  it('rejects a surface outside the closed union', () => {
    const ev: AnalyticsEvent = {
      event: 'ui_error_boundary_triggered',
      // @ts-expect-error surface is a closed union, so it cannot drift into prose
      surface: 'somewhere else',
      errorName: 'Error',
    };
    expect(ev.event).toBe('ui_error_boundary_triggered');
  });
});

describe('both boundaries are wired at their real call sites', () => {
  const shell = read('./dashboard-v2/DashboardV2Shell.tsx');
  const list = read('./dashboard-v2/WorkflowList.tsx');
  const boundary = read('./ErrorBoundary.tsx');

  it('the shell boundary wraps the component from OUTSIDE its own render', () => {
    // A boundary cannot catch an error thrown by itself, so wrapping the shell
    // from within its own return would catch nothing.
    expect(shell).toMatch(/function DashboardV2ShellInner\(\)/);
    expect(shell).toMatch(/<ErrorBoundary[\s\S]*?surface="dashboard_shell"[\s\S]*?<DashboardV2ShellInner \/>/);
  });

  it('each row is wrapped individually, not the list as a whole', () => {
    // Wrapping the list would defeat the purpose: one bad row would still blank
    // every other row. The boundary has to be inside the map.
    expect(list).toMatch(/sortedWorkflows\.map\([\s\S]{0,900}?<ErrorBoundary/);
    expect(list).toMatch(/surface="workflow_row"/);
  });

  it("the row fallback is a table row, so it cannot break the table", () => {
    expect(list).toMatch(/surface="workflow_row"[\s\S]{0,400}?<tr/);
    expect(list).toMatch(/<td colSpan=\{totalColCount\}/);
  });

  it('the boundary reports via componentDidCatch and logs detail server-side', () => {
    expect(boundary).toMatch(/componentDidCatch/);
    expect(boundary).toMatch(/track\(\{ event: 'ui_error_boundary_triggered'/);
    expect(boundary).toMatch(/console\.error/);
  });

  it('the boundary never passes the error object to track()', () => {
    // The one line that would undo the whole privacy argument. Asserted
    // positively — the exact call — rather than by a negative regex: my first
    // attempt banned /track\([^)]*error/ and matched the EVENT NAME, which
    // contains "error". A negative pattern that can be tripped by a legitimate
    // identifier proves nothing.
    expect(boundary).toMatch(
      /track\(\{ event: 'ui_error_boundary_triggered', \.\.\.report \}\)/,
    );
    // `.message` must not appear anywhere in the module at all.
    expect(boundary).not.toMatch(/\.message/);
  });
});
