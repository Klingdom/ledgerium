// @vitest-environment jsdom
/**
 * Row #94 (second half) - the plan reaches analytics events on every
 * authenticated page, not only the dashboard.
 *
 * Uses the real `useAccount` (mocked network only) and the real `track()`, so
 * what is asserted is the enriched event, not a restatement of the logic.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

(globalThis as unknown as { React: typeof React }).React = React;

import { useAnalyticsPlan } from './useAnalyticsPlan';
import { useAccount, __resetAccountCacheForTests } from './useAccount';
import { track } from '@/lib/analytics';

type Win = Window & { __ledgerium_events?: Array<Record<string, unknown>>; __ledgerium_userPlan?: unknown };
const win = window as unknown as Win;

function PlanSync() {
  useAnalyticsPlan();
  return null;
}
/** Stands in for TrialStatusChip / RecordingQuotaChip, which share the request. */
function OtherAccountConsumer() {
  useAccount();
  return null;
}

function accountResponse(plan: string): Response {
  return new Response(JSON.stringify({ data: { user: { id: 'u1', email: 'a@b.c', name: 'A', plan } } }), {
    status: 200,
  });
}

function lastEvent(): Record<string, unknown> {
  const events = win.__ledgerium_events ?? [];
  return events[events.length - 1] as Record<string, unknown>;
}

const sopViewed = () =>
  track({
    event: 'sop_viewed',
    workflowId: 'wf',
    stepCount: 1,
    runCount: 1,
    hasAlignmentData: false,
    hasDriftData: false,
    averageConfidence: 1,
    frictionCount: 0,
    sopMode: 'execution',
  });
const uploadFailed = () => track({ event: 'upload_failed', error: 'x' });

let fetchMock: { mock: { calls: unknown[][] } };
const accountCalls = () => fetchMock.mock.calls.filter((c) => c[0] === '/api/account').length;

beforeEach(() => {
  __resetAccountCacheForTests();
  win.__ledgerium_events = [];
  delete win.__ledgerium_userPlan;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useAnalyticsPlan', () => {
  it('events are "unknown" before the account resolves and carry the plan after, on two non-dashboard events', async () => {
    let resolve!: (r: Response) => void;
    fetchMock = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal('fetch', fetchMock);

    render(<PlanSync />);

    sopViewed();
    expect(lastEvent().userPlan).toBe('unknown');
    uploadFailed();
    expect(lastEvent().userPlan).toBe('unknown');
    // Events were recorded immediately, not queued behind the plan.
    expect(win.__ledgerium_events).toHaveLength(2);

    await act(async () => {
      resolve(accountResponse('team'));
    });
    await waitFor(() => expect(win.__ledgerium_userPlan).toBe('team'));

    sopViewed();
    expect(lastEvent().userPlan).toBe('team');
    uploadFailed();
    expect(lastEvent().userPlan).toBe('team');
  });

  it('publishes only the plan string - no PII reaches the side-channel', async () => {
    fetchMock = vi.fn(async () => accountResponse('starter'));
    vi.stubGlobal('fetch', fetchMock);
    render(<PlanSync />);
    await waitFor(() => expect(win.__ledgerium_userPlan).toBe('starter'));
    uploadFailed();
    expect(JSON.stringify(lastEvent())).not.toContain('a@b.c');
  });

  it('fetches /api/account once per mount even alongside other account consumers', async () => {
    fetchMock = vi.fn(async () => accountResponse('growth'));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <>
        <PlanSync />
        <OtherAccountConsumer />
        <OtherAccountConsumer />
      </>,
    );
    await waitFor(() => expect(win.__ledgerium_userPlan).toBe('growth'));
    expect(accountCalls()).toBe(1);
  });

  it('a failed fetch leaves events "unknown", does not throw, and does not retry', async () => {
    fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(() => render(<PlanSync />)).not.toThrow();
    await waitFor(() => expect(accountCalls()).toBe(1));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(accountCalls()).toBe(1);
    expect(win.__ledgerium_userPlan).toBeUndefined();
    uploadFailed();
    expect(lastEvent().userPlan).toBe('unknown');
  });

  it('a network error is also swallowed', async () => {
    fetchMock = vi.fn(async () => {
      throw new TypeError('offline');
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<PlanSync />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    uploadFailed();
    expect(lastEvent().userPlan).toBe('unknown');
  });

  it('unmounting mid-fetch sets nothing and does not throw', async () => {
    let resolve!: (r: Response) => void;
    fetchMock = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal('fetch', fetchMock);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(<PlanSync />);
    unmount();
    await act(async () => {
      resolve(accountResponse('enterprise'));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(win.__ledgerium_userPlan).toBeUndefined();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('clears the plan on unmount so it does not outlive the authenticated shell', async () => {
    fetchMock = vi.fn(async () => accountResponse('team'));
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = render(<PlanSync />);
    await waitFor(() => expect(win.__ledgerium_userPlan).toBe('team'));
    unmount();
    uploadFailed();
    expect(lastEvent().userPlan).toBe('unknown');
  });

  it('ignores an empty plan string rather than publishing it', async () => {
    fetchMock = vi.fn(async () => accountResponse(''));
    vi.stubGlobal('fetch', fetchMock);
    render(<PlanSync />);
    await waitFor(() => expect(accountCalls()).toBe(1));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    uploadFailed();
    expect(lastEvent().userPlan).toBe('unknown');
  });
});

describe('wiring', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

  it('AppShell mounts the hook', () => {
    expect(read('../components/AppShell.tsx')).toMatch(/useAnalyticsPlan\(\);/);
  });

  it('DashboardV2Shell no longer writes the plan side-channel (single writer)', () => {
    const src = read('../components/dashboard-v2/DashboardV2Shell.tsx');
    expect(src).not.toMatch(/setUserPlanForAnalytics\(/);
  });
});
