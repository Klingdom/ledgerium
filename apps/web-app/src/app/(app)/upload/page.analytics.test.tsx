/**
 * Row #295 follow-up: one source per fact. The server (/api/upload) records
 * workflow_uploaded and server-reported upload_failed; the browser may record
 * only what the server cannot see (a network error).
 *
 * No DOM is available in this package, so React hooks are stubbed and the
 * file-input onChange handler is pulled out of the rendered element tree.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ track: vi.fn(), trackActivation: vi.fn() }));

vi.mock('react', async (orig) => {
  const actual = await orig<typeof import('react')>();
  return {
    ...actual,
    default: actual,
    useState: (v: unknown) => [v, vi.fn()],
    useCallback: (fn: unknown) => fn,
    useEffect: vi.fn(),
  };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('lucide-react', () => {
  const I = () => null;
  return { Upload: I, CheckCircle: I, XCircle: I, FileJson: I, Loader2: I, Zap: I, Lock: I, HelpCircle: I };
});
vi.mock('@/lib/analytics', () => ({ track: h.track, trackActivation: h.trackActivation }));
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => ({ account: null }) }));

import * as ReactNS from 'react';
(globalThis as unknown as { React: unknown }).React = ReactNS; // page.tsx uses the classic JSX runtime

import UploadPage from './page';

type Node = { props?: { onChange?: (e: unknown) => unknown; children?: unknown } } | null | undefined;
function findOnChange(node: unknown): ((e: unknown) => unknown) | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const c of node) { const f = findOnChange(c); if (f) return f; }
    return undefined;
  }
  const p = (node as Node)?.props;
  if (p?.onChange) return p.onChange;
  return findOnChange(p?.children);
}
async function upload() {
  const onChange = findOnChange(UploadPage());
  expect(onChange).toBeTypeOf('function');
  const file = new File(['{}'], 'b.json', { type: 'application/json' });
  onChange!({ target: { files: [file] } }); // handler is fire-and-forget
  await new Promise((r) => setTimeout(r, 0));
}
const names = () => h.track.mock.calls.map((c) => c[0].event);

describe('upload page analytics (one source per fact)', () => {
  beforeEach(() => { h.track.mockClear(); vi.unstubAllGlobals(); });

  it('successful upload: client emits NO workflow_uploaded (server records it)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ stepCount: 3, toolsUsed: ['a'] }) })));
    await upload();
    expect(names()).not.toContain('workflow_uploaded');
  });

  it('server-reported failure: client emits NO upload_failed (server records it)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'bad bundle' }) })));
    await upload();
    expect(names()).not.toContain('upload_failed');
  });

  it('network error: client still emits upload_failed (server never saw it)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await upload();
    expect(h.track).toHaveBeenCalledWith({ event: 'upload_failed', error: 'Network error' });
  });
});
