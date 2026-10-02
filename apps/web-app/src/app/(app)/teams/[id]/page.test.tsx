// @vitest-environment jsdom
/**
 * #321: the invite picker offers "Viewer", a role that today has the same access as
 * Member (#316: nothing distinguishes them). The picker must say so, without changing
 * what is sent to the invite API.
 */
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 't1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

// The page relies on Next's automatic JSX runtime; vitest here uses the classic one.
(globalThis as unknown as { React: typeof React }).React = React;

import TeamDetailPage from './page';

const json = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/teams') return json({ teams: [{ id: 't1', name: 'Acme', role: 'owner' }] });
    if (url.endsWith('/members')) return json({ members: [] });
    return json({ invites: [] });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openInvite() {
  render(<TeamDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: /invite/i }));
  return screen.getByRole('combobox') as HTMLSelectElement;
}

describe('#321 invite role picker', () => {
  it('shows no hint for Member (the default)', async () => {
    await openInvite();
    expect(screen.queryByText(/same access as Member/i)).toBeNull();
  });
  it('says Viewer has the same access as Member when Viewer is selected', async () => {
    const select = await openInvite();
    fireEvent.change(select, { target: { value: 'viewer' } });
    expect(screen.getByText('Viewer has the same access as Member today.')).toBeTruthy();
  });
  it('still offers Viewer and sends role=viewer to the invite API (behaviour unchanged)', async () => {
    const select = await openInvite();
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['member', 'viewer']);
    fireEvent.change(select, { target: { value: 'viewer' } });
    fireEvent.change(screen.getByPlaceholderText(/colleague/i), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      const post = fetchMock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse((post![1] as RequestInit).body as string).role).toBe('viewer');
    });
  });
});
