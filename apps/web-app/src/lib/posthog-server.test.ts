/**
 * #388 — posthog-node has no before_send. captureServerEvent must run the
 * shared sanitizer, and a share token must not appear in the /batch/ body.
 * Fake fetch only; no network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gunzipSync } from 'node:zlib';

const TOKEN = 'shrTOKEN9f8e7d6c5b4a';

describe('captureServerEvent (#388)', () => {
  const bodies: string[] = [];
  const pending: Promise<void>[] = [];
  // posthog-node may gzip the body into a Blob: decode to text either way.
  async function decode(b: unknown): Promise<string> {
    if (typeof b === 'string') return b;
    if (b && typeof (b as Blob).arrayBuffer === 'function') {
      const buf = Buffer.from(await (b as Blob).arrayBuffer());
      try { return gunzipSync(buf).toString('utf8'); } catch { return buf.toString('utf8'); }
    }
    return String(b ?? '');
  }
  const flushed = async () => { await Promise.all(pending); return bodies.join(' '); };

  beforeEach(() => {
    bodies.length = 0;
    pending.length = 0;
    vi.resetModules();
    vi.stubEnv('POSTHOG_API_KEY', 'phc_fake');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://fake.invalid');
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init?: { body?: unknown }) => {
      pending.push(decode(init?.body).then((t) => { bodies.push(t); }));
      return new Response('{"status":1}', { status: 200 });
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('templates URL/path-valued properties before they reach the batch body', async () => {
    const { captureServerEvent, shutdownPostHog } = await import('./posthog-server');
    captureServerEvent('some_event', 'u1', {
      workflowId: 'wf_1',
      pageUrl: `https://app.example/share/${TOKEN}?x=1`,
      path: `/share/${TOKEN}`,
    });
    await shutdownPostHog();
    const all = bodies.join('\n');
    expect(all).toContain('some_event');
    expect(all).toContain('wf_1');
    expect(all).not.toContain(TOKEN);
    expect(all).toContain('/share/[token]');
  });

  it('shared_workflow_viewed as actually emitted carries no token in the batch body', async () => {
    const { captureServerEvent, shutdownPostHog } = await import('./posthog-server');
    captureServerEvent('shared_workflow_viewed', 'owner_1', { workflowId: 'wf_1', ownerId: 'owner_1' });
    await shutdownPostHog();
    const all = bodies.join('\n');
    expect(all).toContain('shared_workflow_viewed');
    expect(all).not.toContain(TOKEN);
    expect(all).not.toContain('"token"');
  });
});
