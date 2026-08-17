import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * SOP_BUILDER_REVIEW_001 B-3 regression suite for
 * GET /api/workflows/[id] — the lazy template backfill.
 *
 * Covers the two remaining pieces of the B-3 fix not exercised by
 * `@/lib/artifacts.test.ts` (deterministic read) or
 * `export-markdown/route.test.ts` (deterministic read at the query layer):
 *
 *   1. The check-then-write backfill is atomic: two invocations that both
 *      observe a stale "no templates yet" snapshot (the exact interleaving
 *      the pre-fix race produced) must still only write one set of template
 *      rows, because the write path re-checks *inside* the transaction
 *      against live state rather than trusting the stale outer snapshot.
 *   2. Newly-created template rows are stamped with the real engine version
 *      (PROCESS_ENGINE_VERSION), not the hardcoded '1.0.0' literal (B-16).
 *
 * Mocking strategy mirrors `../route.test.ts` (list route) and
 * `apps/web-app/src/app/api/teams/route.test.ts` (vi.hoisted stateful mock).
 * `db.workflow.findFirst` branches on whether `userId` is present in `where`
 * to distinguish the route's two call sites:
 *   - the per-request ownership + initial-artifacts read (`{ id, userId }`)
 *     returns a FROZEN snapshot captured once at test setup — this is what
 *     lets the test model N "concurrent" requests that all observed the same
 *     pre-race DB state, without depending on real Promise-scheduling
 *     interleaving (which would make the test flaky/implementation-specific).
 *   - the post-backfill refetch (`{ id }` only, no `userId`) always reads the
 *     live store, exactly like a real re-SELECT would.
 */

import { PROCESS_ENGINE_VERSION } from '@ledgerium/process-engine';

// ── Hoisted mocks / fixture store ───────────────────────────────────────────

interface FixtureRow {
  id: string;
  workflowId: string;
  artifactType: string;
  schemaVersion: string | null;
  contentJson: string | null;
  createdAt: Date;
}

const store = vi.hoisted(() => ({
  /** Live backing store — mutated by createMany, read by the transaction's
   *  re-check and by the post-backfill refetch. */
  artifacts: [] as FixtureRow[],
  /** Frozen pre-race snapshot returned by every "initial" per-request read. */
  initialSnapshot: [] as FixtureRow[],
  nextArtifactId: 0,
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockWorkflowUpdate = vi.hoisted(() => vi.fn());
const mockCreateMany = vi.hoisted(() => vi.fn());
const mockRenderAllTemplates = vi.hoisted(() => vi.fn());

function pushArtifact(row: {
  workflowId: string;
  artifactType: string;
  schemaVersion: string | null;
  contentJson: string | null;
}): FixtureRow {
  const full: FixtureRow = {
    id: `art-${store.nextArtifactId++}`,
    createdAt: new Date(),
    ...row,
  };
  store.artifacts.push(full);
  return full;
}

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/plans', () => ({
  toPlanType: vi.fn(() => 'free'),
  // Free tier — the healthScore branch is skipped entirely, so
  // `@/lib/health-scores` never needs to be mocked.
  hasFeature: vi.fn(() => false),
}));

vi.mock('@/lib/ingestion', () => ({
  renderAllTemplates: mockRenderAllTemplates,
}));

vi.mock('@/db', () => {
  const applyOrderBy = (rows: FixtureRow[]): FixtureRow[] =>
    [...rows].sort((a, b) => {
      const dt = b.createdAt.getTime() - a.createdAt.getTime();
      if (dt !== 0) return dt;
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    });

  return {
    db: {
      user: { findUnique: mockUserFindUnique },
      workflow: {
        findFirst: vi.fn(async ({ where }: { where: { id: string; userId?: string } }) => {
          const source = 'userId' in where ? store.initialSnapshot : store.artifacts;
          const artifacts = applyOrderBy(
            source.filter((a) => a.workflowId === where.id),
          );
          return {
            id: where.id,
            userId: 'user-1',
            title: 'Test Workflow',
            description: null,
            status: 'active',
            stepCount: 5,
            confidence: 0.8,
            durationMs: 60_000,
            phaseCount: 2,
            toolsUsed: null,
            isFavorite: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            lastViewedAt: null,
            viewCount: 0,
            artifacts,
            processDefinition: null,
          };
        }),
        update: mockWorkflowUpdate.mockResolvedValue({}),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          workflowArtifact: {
            findFirst: vi.fn(
              async ({
                where,
              }: {
                where: { workflowId: string; artifactType: string };
              }) =>
                store.artifacts.find(
                  (a) =>
                    a.workflowId === where.workflowId &&
                    a.artifactType === where.artifactType,
                ) ?? null,
            ),
            createMany: vi.fn(
              async ({
                data,
              }: {
                data: Array<{
                  workflowId: string;
                  artifactType: string;
                  schemaVersion: string;
                  contentJson: string;
                }>;
              }) => {
                mockCreateMany(data);
                for (const d of data) pushArtifact(d);
                return { count: data.length };
              },
            ),
          },
        };
        return fn(tx);
      }),
    },
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/workflows/${id}`);
}

async function callGET(id: string) {
  const { GET } = await import('./route');
  return GET(makeRequest(id), { params: { id } });
}

// ── Test setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.clearAllMocks();
  store.artifacts.length = 0;
  store.initialSnapshot.length = 0;
  store.nextArtifactId = 0;

  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockResolvedValue({
    user: { id: 'user-1', email: 'test@test.com' },
  } as unknown as Awaited<ReturnType<typeof auth>>);

  mockUserFindUnique.mockResolvedValue({ plan: 'free' });

  mockRenderAllTemplates.mockReturnValue([
    { artifactType: 'template_selection', contentJson: JSON.stringify({ selected: 'enterprise' }) },
    { artifactType: 'template_sop_enterprise', contentJson: JSON.stringify({ steps: [] }) },
  ]);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/workflows/[id] — B-3 idempotent template backfill', () => {
  it('writes templates exactly once when two invocations both observe a stale "no templates" snapshot', async () => {
    const source = pushArtifact({
      workflowId: 'wf-1',
      artifactType: 'process_output',
      schemaVersion: '1.0.0',
      contentJson: JSON.stringify({ ok: true }),
    });
    // Freeze the pre-race snapshot: process_output present, no templates.
    // Both "concurrent" GETs below read this exact snapshot for their
    // outer existence check — reproducing the interleaving that used to
    // let two concurrent GETs both pass the `hasTemplates` check.
    store.initialSnapshot.push(source);

    await callGET('wf-1');
    await callGET('wf-1');

    // createMany must have executed exactly once across both invocations —
    // the second invocation's transaction-scoped re-check must have seen
    // the first invocation's already-committed write and skipped writing.
    expect(mockCreateMany).toHaveBeenCalledTimes(1);

    const templateRows = store.artifacts.filter((a) =>
      a.artifactType.startsWith('template_'),
    );
    // Exactly one full set (2 rows from the mocked renderAllTemplates
    // output), not a duplicated set (4 rows) from a double-write.
    expect(templateRows).toHaveLength(2);
    expect(
      templateRows.filter((a) => a.artifactType === 'template_selection'),
    ).toHaveLength(1);
    expect(
      templateRows.filter((a) => a.artifactType === 'template_sop_enterprise'),
    ).toHaveLength(1);
  });

  it('stamps newly-created template rows with PROCESS_ENGINE_VERSION, not a hardcoded literal (B-16)', async () => {
    const source = pushArtifact({
      workflowId: 'wf-1',
      artifactType: 'process_output',
      schemaVersion: '1.0.0',
      contentJson: JSON.stringify({ ok: true }),
    });
    store.initialSnapshot.push(source);

    await callGET('wf-1');

    const templateRows = store.artifacts.filter((a) =>
      a.artifactType.startsWith('template_'),
    );
    expect(templateRows.length).toBeGreaterThan(0);
    for (const row of templateRows) {
      expect(row.schemaVersion).toBe(PROCESS_ENGINE_VERSION);
      expect(row.schemaVersion).not.toBe('1.0.0');
    }
  });

  it('does not write templates when they already exist', async () => {
    const processOutput = pushArtifact({
      workflowId: 'wf-1',
      artifactType: 'process_output',
      schemaVersion: '1.0.0',
      contentJson: JSON.stringify({ ok: true }),
    });
    const existingSelection = pushArtifact({
      workflowId: 'wf-1',
      artifactType: 'template_selection',
      schemaVersion: PROCESS_ENGINE_VERSION,
      contentJson: JSON.stringify({ selected: 'enterprise' }),
    });
    store.initialSnapshot.push(processOutput, existingSelection);

    await callGET('wf-1');

    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('response body includes the newly-backfilled template artifacts', async () => {
    const source = pushArtifact({
      workflowId: 'wf-1',
      artifactType: 'process_output',
      schemaVersion: '1.0.0',
      contentJson: JSON.stringify({ ok: true }),
    });
    store.initialSnapshot.push(source);

    const res = await callGET('wf-1');
    const body = (await res.json()) as { artifacts: Array<{ artifactType: string }> };

    const types = body.artifacts.map((a) => a.artifactType);
    expect(types).toContain('template_selection');
    expect(types).toContain('template_sop_enterprise');
  });
});
