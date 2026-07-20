import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * SOP_BUILDER_REVIEW_001 B-3 regression suite for
 * GET /api/workflows/[id]/export-markdown.
 *
 * This is the route the defect was named after: "the export silently picks
 * whichever the engine returns first." These tests exercise the route's
 * mocked `db.workflowArtifact.findFirst` call through a fixture-store mock
 * that actually *applies* whatever `orderBy` clause the route passes (rather
 * than hand-simulating "the fix" independently of the production code path),
 * so a regression that drops the `orderBy` argument — or reorders its
 * clauses — is caught here, not just in the pure-function unit tests in
 * `@/lib/artifacts.test.ts`.
 */

// ── Hoisted mocks ────────────────────────────────────────────────────────────

interface FixtureRow {
  id: string;
  workflowId: string;
  artifactType: string;
  contentJson: string | null;
  createdAt: Date;
}

const fixtureArtifacts = vi.hoisted(() => [] as FixtureRow[]);

/** Generic Prisma-`orderBy`-array applier — sorts on whatever clauses are passed. */
function applyOrderBy(
  rows: FixtureRow[],
  orderBy: Array<Record<string, 'asc' | 'desc'>> | undefined,
): FixtureRow[] {
  if (!orderBy || orderBy.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const clause of orderBy) {
      const [field, dir] = Object.entries(clause)[0] as [keyof FixtureRow, 'asc' | 'desc'];
      const av = a[field];
      const bv = b[field];
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) {
        cmp = av.getTime() - bv.getTime();
      } else if (av !== undefined && bv !== undefined && av !== null && bv !== null) {
        if (av < bv) cmp = -1;
        else if (av > bv) cmp = 1;
      }
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

const mockWorkflowFindFirst = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockArtifactFindFirst = vi.hoisted(() =>
  vi.fn(
    async ({
      where,
      orderBy,
    }: {
      where: { workflowId: string; artifactType: string };
      orderBy?: Array<Record<string, 'asc' | 'desc'>>;
    }) => {
      const matches = fixtureArtifacts.filter(
        (a) => a.workflowId === where.workflowId && a.artifactType === where.artifactType,
      );
      const ordered = applyOrderBy(matches, orderBy);
      return ordered[0] ?? null;
    },
  ),
);

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/plans', () => ({
  toPlanType: vi.fn(() => 'starter'),
  hasFeature: vi.fn(() => true), // clean export — no watermark noise in assertions
}));

vi.mock('@ledgerium/process-engine', () => ({
  // Echo the content back so the test can identify which row was rendered.
  renderSOPMarkdown: vi.fn((content: { marker: string }) => `# SOP\n\nmarker: ${content.marker}`),
  renderProcessMapMarkdown: vi.fn((content: { marker: string }) => `# Map\n\nmarker: ${content.marker}`),
}));

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
    workflow: { findFirst: mockWorkflowFindFirst },
    workflowArtifact: { findFirst: mockArtifactFindFirst },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(id: string, artifactType: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/workflows/${id}/export-markdown?artifactType=${artifactType}`,
  );
}

async function callGET(id: string, artifactType: string) {
  const { GET } = await import('./route');
  return GET(makeRequest(id, artifactType), { params: { id } });
}

function row(id: string, createdAt: string, marker: string): FixtureRow {
  return {
    id,
    workflowId: 'wf-1',
    artifactType: 'template_sop_enterprise',
    contentJson: JSON.stringify({ marker }),
    createdAt: new Date(createdAt),
  };
}

// ── Test setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.clearAllMocks();
  fixtureArtifacts.length = 0;

  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockResolvedValue({
    user: { id: 'user-1', email: 'test@test.com' },
  } as unknown as Awaited<ReturnType<typeof auth>>);

  mockUserFindUnique.mockResolvedValue({ plan: 'starter' });
  mockWorkflowFindFirst.mockResolvedValue({ id: 'wf-1', title: 'Test Workflow' });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/workflows/[id]/export-markdown — B-3 deterministic read', () => {
  it('picks the newest row by createdAt when duplicate template rows exist', async () => {
    fixtureArtifacts.push(
      row('r-old', '2026-01-01T00:00:00.000Z', 'v1-stale'),
      row('r-new', '2026-01-02T00:00:00.000Z', 'v2-current'),
    );

    const res = await callGET('wf-1', 'template_sop_enterprise');
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(body).toContain('v2-current');
    expect(body).not.toContain('v1-stale');
  });

  it('returns the same exported document across repeated calls (byte-identical)', async () => {
    fixtureArtifacts.push(
      row('r-1', '2026-01-01T00:00:00.000Z', 'first'),
      row('r-2', '2026-01-03T00:00:00.000Z', 'second'),
      row('r-3', '2026-01-02T00:00:00.000Z', 'third'),
    );

    const first = await (await callGET('wf-1', 'template_sop_enterprise')).text();
    const second = await (await callGET('wf-1', 'template_sop_enterprise')).text();
    const third = await (await callGET('wf-1', 'template_sop_enterprise')).text();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(first).toContain('second');
  });

  it('engages the id tiebreak when createdAt values collide', async () => {
    const sameInstant = '2026-01-01T00:00:00.000Z';
    fixtureArtifacts.push(
      row('11111111-aaaa', sameInstant, 'row-eleven'),
      row('99999999-zzzz', sameInstant, 'row-ninety-nine'),
      row('55555555-mmmm', sameInstant, 'row-fifty-five'),
    );

    const body = await (await callGET('wf-1', 'template_sop_enterprise')).text();

    // { id: 'desc' } — the lexicographically greatest id wins.
    expect(body).toContain('row-ninety-nine');
  });

  it('a single row (the common case) still exports correctly', async () => {
    fixtureArtifacts.push(row('r-only', '2026-01-01T00:00:00.000Z', 'only-version'));

    const body = await (await callGET('wf-1', 'template_sop_enterprise')).text();

    expect(body).toContain('only-version');
  });

  it('404s when no artifact of the requested type exists', async () => {
    const res = await callGET('wf-1', 'template_sop_enterprise');
    expect(res.status).toBe(404);
  });
});
