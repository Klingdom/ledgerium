import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import {
  resolvePurgeAfterDays,
  selectPurgeEligible,
  purgeExpiredWorkflows,
  auditRef,
  type PurgeCandidate,
  type RetentionDb,
} from './workflow-retention';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 2, 12, 0, 0);
const row = (id: string, status: string, ageMs: number, extra: Partial<PurgeCandidate> = {}): PurgeCandidate => ({
  id,
  status,
  updatedAt: new Date(NOW - ageMs),
  ...extra,
});

describe('#319 resolvePurgeAfterDays', () => {
  it('defaults to 30 when unset or blank', () => {
    expect(resolvePurgeAfterDays(undefined)).toEqual({ ok: true, days: 30 });
    expect(resolvePurgeAfterDays('')).toEqual({ ok: true, days: 30 });
    expect(resolvePurgeAfterDays('  ')).toEqual({ ok: true, days: 30 });
  });
  it('accepts integers 1..365', () => {
    expect(resolvePurgeAfterDays('1')).toEqual({ ok: true, days: 1 });
    expect(resolvePurgeAfterDays('90')).toEqual({ ok: true, days: 90 });
    expect(resolvePurgeAfterDays('365')).toEqual({ ok: true, days: 365 });
  });
  it.each(['0', '366', '-5', '3.5', '30d', 'abc', '1e2', '0x10', '+30', '1000'])('rejects %j (never silently defaults)', (v) => {
    expect(resolvePurgeAfterDays(v)).toEqual({ ok: false });
  });
});

describe('#319 selectPurgeEligible boundaries', () => {
  it('29 days is kept, 30 days exactly is eligible, 31 days is eligible', () => {
    const rows = [row('d29', 'deleted', 29 * DAY), row('d30', 'deleted', 30 * DAY), row('d31', 'deleted', 31 * DAY)];
    expect(selectPurgeEligible(rows, NOW, 30).map((r) => r.id)).toEqual(['d31', 'd30']);
  });
  it('one millisecond short of 30 days is not eligible', () => {
    expect(selectPurgeEligible([row('x', 'deleted', 30 * DAY - 1)], NOW, 30)).toEqual([]);
  });
  it('never selects a non-deleted workflow, however old', () => {
    const rows = [row('a', 'active', 400 * DAY), row('b', 'archived', 400 * DAY), row('c', 'weird', 400 * DAY)];
    expect(selectPurgeEligible(rows, NOW, 30)).toEqual([]);
  });
  it('honours the configured retention', () => {
    const rows = [row('d10', 'deleted', 10 * DAY)];
    expect(selectPurgeEligible(rows, NOW, 7)).toHaveLength(1);
    expect(selectPurgeEligible(rows, NOW, 11)).toHaveLength(0);
  });
  it('is deterministic (oldest first, id tiebreak) and bounded by the limit', () => {
    const rows = [row('b', 'deleted', 40 * DAY), row('a', 'deleted', 40 * DAY), row('c', 'deleted', 50 * DAY)];
    expect(selectPurgeEligible(rows, NOW, 30).map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(selectPurgeEligible(rows, NOW, 30, 2).map((r) => r.id)).toEqual(['c', 'a']);
    expect(selectPurgeEligible(rows, NOW, 30, 0)).toEqual([]);
  });
});

/* ───────── purge routine against an in-memory fake with rollback ───────── */

interface FakeState {
  workflows: Array<PurgeCandidate>;
  uploads: Array<{ id: string; rawJsonPath: string; uploadedAt?: Date }>;
  definitions: Array<{ id: string }>;
}

function makeFake(state: FakeState, opts: { failDefinitionDelete?: boolean } = {}) {
  const matches = (w: PurgeCandidate, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => {
      const val = (w as unknown as Record<string, unknown>)[k];
      if (v && typeof v === 'object' && 'lte' in (v as object)) return (val as Date).getTime() <= ((v as { lte: Date }).lte).getTime();
      return val === v;
    });
  const workflow = {
    findMany: vi.fn(async (args: { where: { status: string; updatedAt: { lte: Date } }; take: number }) =>
      state.workflows.filter((w) => matches(w, args.where)).slice(0, args.take),
    ),
    count: vi.fn(async (args: { where: Record<string, unknown> }) => state.workflows.filter((w) => matches(w, args.where)).length),
    deleteMany: vi.fn(async (args: { where: Record<string, unknown> }) => {
      const before = state.workflows.length;
      state.workflows = state.workflows.filter((w) => !matches(w, args.where));
      return { count: before - state.workflows.length };
    }),
  };
  const processDefinition = {
    deleteMany: vi.fn(async (args: { where: { id: string } }) => {
      if (opts.failDefinitionDelete) throw new Error('boom: secret title');
      const before = state.definitions.length;
      state.definitions = state.definitions.filter((d) => d.id !== args.where.id);
      return { count: before - state.definitions.length };
    }),
  };
  const upload = {
    findUnique: vi.fn(async (args: { where: { id: string } }) => state.uploads.find((u) => u.id === args.where.id) ?? null),
    count: vi.fn(async (args: { where: { uploadedAt: { lte: Date } } }) =>
      state.uploads
        .filter((u) => !state.workflows.some((w) => w.sourceUploadId === u.id))
        .filter((u) => (u.uploadedAt ?? new Date(0)).getTime() <= args.where.uploadedAt.lte.getTime()).length,
    ),
    findMany: vi.fn(async (args: { where: { uploadedAt: { lte: Date } }; take: number }) =>
      state.uploads
        .filter((u) => !state.workflows.some((w) => w.sourceUploadId === u.id))
        .filter((u) => (u.uploadedAt ?? new Date(0)).getTime() <= args.where.uploadedAt.lte.getTime())
        .slice(0, args.take),
    ),
    deleteMany: vi.fn(async (args: { where: { id: string } }) => {
      const before = state.uploads.length;
      state.uploads = state.uploads.filter((u) => u.id !== args.where.id);
      return { count: before - state.uploads.length };
    }),
  };
  const db = {
    workflow,
    upload,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const snap = { w: [...state.workflows], d: [...state.definitions], u: [...state.uploads] };
      try {
        return await fn({ workflow, processDefinition, upload });
      } catch (e) {
        state.workflows = snap.w;
        state.definitions = snap.d;
        state.uploads = snap.u;
        throw e;
      }
    }),
  };
  return { db: db as unknown as RetentionDb, workflow, processDefinition, upload };
}

const UP = path.resolve('/data/uploads');
const realpath = async (p: string) => p;
const file = (n: string) => path.join(UP, 'u1', `${n}.json`);

describe('#319 purgeExpiredWorkflows', () => {
  const base = (): FakeState => ({
    workflows: [
      row('old', 'deleted', 31 * DAY, { sourceUploadId: 'up-old', processDefinitionId: 'pd-1' }),
      row('edge', 'deleted', 30 * DAY, { sourceUploadId: 'up-edge', processDefinitionId: 'pd-2' }),
      row('young', 'deleted', 29 * DAY, { sourceUploadId: 'up-young' }),
      row('live', 'active', 400 * DAY, { sourceUploadId: 'up-live', processDefinitionId: 'pd-1' }),
    ],
    uploads: [
      { id: 'up-old', rawJsonPath: file('old') },
      { id: 'up-edge', rawJsonPath: file('edge') },
      { id: 'up-young', rawJsonPath: file('young') },
      { id: 'up-live', rawJsonPath: file('live') },
    ],
    definitions: [{ id: 'pd-1' }, { id: 'pd-2' }],
  });

  it('removes eligible workflows with their upload file and row, and an orphaned definition only', async () => {
    const st = base();
    const { db } = makeFake(st);
    const unlinkFile = vi.fn(async (_p: string) => {});
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: UP, realpath });
    expect(s).toMatchObject({ dryRun: false, eligible: 2, purged: 2, skipped: 0, failed: 0, filesRemoved: 2, uploadsRemoved: 2, fileFailures: 0, hasMore: false });
    expect(st.workflows.map((w) => w.id).sort()).toEqual(['live', 'young']);
    expect(st.uploads.map((u) => u.id).sort()).toEqual(['up-live', 'up-young']);
    // pd-1 still has the live workflow linked -> kept; pd-2 orphaned -> removed.
    expect(st.definitions.map((d) => d.id)).toEqual(['pd-1']);
    expect(s.definitionsRemoved).toBe(1);
    expect(unlinkFile.mock.calls.map((c) => c[0] as string).sort()).toEqual([file('edge'), file('old')].sort());
  });

  it('dry run reports counts and deletes nothing', async () => {
    const st = base();
    const before = JSON.stringify(st);
    const { db, workflow, upload, processDefinition } = makeFake(st);
    const unlinkFile = vi.fn(async () => {});
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30, dryRun: true }, { unlinkFile, uploadDir: UP, realpath });
    expect(s).toMatchObject({ dryRun: true, eligible: 2, purged: 0 });
    expect(JSON.stringify(st)).toBe(before);
    expect(workflow.deleteMany).not.toHaveBeenCalled();
    expect(upload.deleteMany).not.toHaveBeenCalled();
    expect(processDefinition.deleteMany).not.toHaveBeenCalled();
    expect(unlinkFile).not.toHaveBeenCalled();
  });

  it('dry run counts ALL eligible rows (beyond the batch limit) and orphan candidates, deleting nothing', async () => {
    const st = base();
    for (let i = 0; i < 7; i++) st.workflows.push(row(`bulk${i}`, 'deleted', 40 * DAY));
    st.uploads.push({ id: 'orph-1', rawJsonPath: file('o1'), uploadedAt: new Date(NOW - 60 * DAY) });
    st.uploads.push({ id: 'orph-new', rawJsonPath: file('o2'), uploadedAt: new Date(NOW - 1 * DAY) });
    const before = JSON.stringify(st);
    const { db, workflow, upload } = makeFake(st);
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30, batchLimit: 3, dryRun: true }, { uploadDir: UP, realpath });
    expect(s).toMatchObject({ dryRun: true, eligibleTotal: 9, eligible: 3, hasMore: true, orphanCandidates: 1, purged: 0 });
    expect(JSON.stringify(st)).toBe(before);
    expect(workflow.deleteMany).not.toHaveBeenCalled();
    expect(upload.deleteMany).not.toHaveBeenCalled();
    expect(JSON.stringify(s)).not.toMatch(/bulk|orph-/);
  });

  it('is idempotent: a second run finds nothing', async () => {
    const st = base();
    const { db } = makeFake(st);
    const deps = { unlinkFile: vi.fn(async () => {}), uploadDir: UP, realpath };
    await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, deps);
    const again = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, deps);
    expect(again).toMatchObject({ eligible: 0, purged: 0, failed: 0 });
  });

  it('is bounded: batchLimit caps a run and reports hasMore', async () => {
    const st = base();
    const { db } = makeFake(st);
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30, batchLimit: 1 }, { unlinkFile: async () => {}, uploadDir: UP, realpath });
    expect(s).toMatchObject({ eligible: 1, purged: 1, hasMore: true });
    expect(st.workflows.map((w) => w.id)).toContain('edge'); // newest-deleted of the eligible waits
  });

  it('leaves a workflow restored between select and delete (re-check inside the transaction)', async () => {
    const st = base();
    const { db } = makeFake(st);
    const realTx = db.$transaction.bind(db);
    // The user restores 'old' after it was selected but before its transaction runs.
    db.$transaction = (async (fn: Parameters<RetentionDb['$transaction']>[0]) => {
      const w = st.workflows.find((x) => x.id === 'old');
      if (w) w.status = 'active';
      return realTx(fn);
    }) as RetentionDb['$transaction'];
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile: async () => {}, uploadDir: UP, realpath });
    expect(s.skipped).toBe(1);
    expect(st.workflows.some((w) => w.id === 'old')).toBe(true);
    expect(st.uploads.some((u) => u.id === 'up-old')).toBe(true);
  });

  it('keeps the upload when another workflow still came from it', async () => {
    const st = base();
    st.workflows.push(row('sibling', 'active', 5 * DAY, { sourceUploadId: 'up-old' }));
    const { db } = makeFake(st);
    const unlinkFile = vi.fn(async () => {});
    await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: UP, realpath });
    expect(st.uploads.some((u) => u.id === 'up-old')).toBe(true);
    expect(unlinkFile).not.toHaveBeenCalledWith(file('old'));
  });

  it('a failing workflow rolls back, is counted, and does not stop the batch or leak the error', async () => {
    const st = base();
    const { db } = makeFake(st, { failDefinitionDelete: true });
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile: async () => {}, uploadDir: UP, realpath });
    logs.mockRestore();
    // 'old' (pd-1 still has 'live') succeeds; 'edge' (pd-2 orphan) throws and rolls back.
    expect(s).toMatchObject({ purged: 1, failed: 1 });
    expect(st.workflows.some((w) => w.id === 'edge')).toBe(true);
    expect(JSON.stringify(s)).not.toMatch(/boom|secret/);
  });

  it('a file that cannot be removed rolls the workflow purge back: workflow + Upload row kept, failure reported', async () => {
    const st = base();
    const { db } = makeFake(st);
    const unlinkFile = vi.fn(async () => {
      throw new Error('EACCES');
    });
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: UP, realpath });
    expect(s.failed).toBe(2);
    expect(s.purged).toBe(0);
    expect(st.workflows.some((w) => w.id === 'old')).toBe(true);
    expect(st.uploads.some((u) => u.id === 'up-old')).toBe(true);
  });

  it('refuses to unlink a path outside the upload directory', async () => {
    const st = base();
    st.uploads[0]!.rawJsonPath = path.resolve('/etc/passwd');
    const { db } = makeFake(st);
    const unlinkFile = vi.fn(async () => {});
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: UP, realpath });
    expect(s.failed).toBe(1);
    expect(unlinkFile).not.toHaveBeenCalledWith(path.resolve('/etc/passwd'));
  });

  it('refuses a sibling directory that merely shares the prefix, and a symlink that resolves outside', async () => {
    const st = base();
    st.uploads[0]!.rawJsonPath = path.resolve('/data/uploads-evil/old.json');
    st.uploads[1]!.rawJsonPath = file('edge');
    const unlinkFile = vi.fn(async () => {});
    // edge's real path resolves outside the upload dir (symlink)
    const rp = async (p: string) => (p === file('edge') ? path.resolve('/etc/shadow') : p);
    const { db } = makeFake(st);
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: UP, realpath: rp });
    expect(s.failed).toBe(2);
    expect(unlinkFile).not.toHaveBeenCalled();
  });

  it('real symlink out of the upload dir is refused (default realpath)', async () => {
    const os = await import('os');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ret-'));
    const up = path.join(root, 'uploads');
    const outside = path.join(root, 'outside');
    fs.mkdirSync(up);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'x.json'), '{}');
    try {
      fs.symlinkSync(outside, path.join(up, 'link'), 'junction');
    } catch {
      return; // platform cannot symlink
    }
    const st = base();
    st.uploads[0]!.rawJsonPath = path.join(up, 'link', 'x.json');
    const unlinkFile = vi.fn(async () => {});
    const { db } = makeFake(st);
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: up });
    expect(unlinkFile).not.toHaveBeenCalledWith(path.join(up, 'link', 'x.json'));
    expect(s.failed).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(outside, 'x.json'))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('orphan sweep: an orphan left by an unlink failure is cleaned on the next run; a recent orphan is untouched', async () => {
    const st: FakeState = {
      workflows: [],
      uploads: [
        { id: 'orph', rawJsonPath: file('orph'), uploadedAt: new Date(NOW - 45 * DAY) },
        { id: 'fresh', rawJsonPath: file('fresh'), uploadedAt: new Date(NOW - 1 * DAY) },
      ],
      definitions: [],
    };
    const { db } = makeFake(st);
    let fail = true;
    const unlinkFile = vi.fn(async (_p: string) => {
      if (fail) throw new Error('EACCES');
    });
    const deps = { unlinkFile, uploadDir: UP, realpath };
    const r1 = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, deps);
    expect(r1.fileFailures).toBe(1);
    expect(r1.orphansRemoved).toBe(0);
    expect(st.uploads.map((u) => u.id).sort()).toEqual(['fresh', 'orph']); // kept for retry
    fail = false;
    const r2 = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, deps);
    expect(r2).toMatchObject({ orphansRemoved: 1, filesRemoved: 1, fileFailures: 0 });
    expect(st.uploads.map((u) => u.id)).toEqual(['fresh']); // in-flight (recent) never touched
    expect(unlinkFile).not.toHaveBeenCalledWith(file('fresh'));
  });

  it('orphan sweep never touches an upload a workflow still references', async () => {
    const st = base();
    st.uploads.forEach((u) => (u.uploadedAt = new Date(NOW - 90 * DAY)));
    const { db } = makeFake(st);
    const unlinkFile = vi.fn(async () => {});
    await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, { unlinkFile, uploadDir: UP, realpath });
    expect(unlinkFile).not.toHaveBeenCalledWith(file('live'));
    expect(unlinkFile).not.toHaveBeenCalledWith(file('young'));
  });
});

describe('#319 audit trail (hashed ids, server log only)', () => {
  const sha = (id: string) => createHash('sha256').update(id).digest('hex');
  const mk = (): FakeState => ({
    workflows: [
      row('wf-secret-1', 'deleted', 31 * DAY, { sourceUploadId: 'up-1' }),
      row('wf-secret-2', 'deleted', 40 * DAY),
      row('wf-young', 'deleted', 5 * DAY),
    ],
    uploads: [
      { id: 'up-1', rawJsonPath: file('one') },
      { id: 'up-orphan', rawJsonPath: file('orph'), uploadedAt: new Date(NOW - 90 * DAY) },
    ],
    definitions: [],
  });
  const deps = () => ({ unlinkFile: async () => {}, uploadDir: UP, realpath });
  const auditLines = (log: { mock: { calls: unknown[][] } }) =>
    log.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('audit'));

  it('logs the hash of each purged id plus the updatedAt clock, and of each swept orphan upload', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { db } = makeFake(mk());
    await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, deps());
    const lines = auditLines(log);
    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    const payload = JSON.parse(line.slice(line.indexOf('{')));
    expect(payload.purged).toEqual([
      { ref: sha('wf-secret-2'), deletedAt: new Date(NOW - 40 * DAY).toISOString() },
      { ref: sha('wf-secret-1'), deletedAt: new Date(NOW - 31 * DAY).toISOString() },
    ]);
    expect(payload.orphanUploads).toEqual([sha('up-orphan')]);
    expect(auditRef('wf-secret-1')).toBe(sha('wf-secret-1'));
    expect(line).not.toMatch(/wf-secret|up-orphan|up-1|\.json|uploads/);
    log.mockRestore();
  });

  it('the returned summary (the HTTP body) contains no workflow ids, raw or hashed', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { db } = makeFake(mk());
    const s = await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30 }, deps());
    const body = JSON.stringify(s);
    for (const id of ['wf-secret-1', 'wf-secret-2', 'up-1', 'up-orphan']) {
      expect(body).not.toContain(id);
      expect(body).not.toContain(sha(id));
    }
    log.mockRestore();
  });

  it('a dry run logs nothing as deleted', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { db } = makeFake(mk());
    await purgeExpiredWorkflows(db, { nowMs: NOW, retentionDays: 30, dryRun: true }, deps());
    expect(auditLines(log)).toEqual([]);
    log.mockRestore();
  });
});

/* ───────── the data map is guarded, not just described ───────── */

describe('#319 data map guards', () => {
  const schema = fs.readFileSync(path.resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
  const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map((m) => ({ name: m[1]!, body: m[2]! }));

  it('every model that points (transitively) at Workflow cascades, so a purge leaves none of its data', () => {
    const reached = new Set<string>(['Workflow']);
    const found: string[] = [];
    let grew = true;
    while (grew) {
      grew = false;
      for (const m of models) {
        if (reached.has(m.name)) continue;
        for (const line of m.body.split('\n')) {
          const fk = line.match(/^\s*\w+\s+(\w+)\??\s+@relation\([^)]*fields:\s*\[/);
          if (fk && reached.has(fk[1]!)) {
            expect(line, `${m.name} points at ${fk[1]} without onDelete: Cascade - a purged workflow's data would survive. Add the cascade or delete it explicitly in lib/workflow-retention.ts.`).toMatch(/onDelete:\s*Cascade/);
            reached.add(m.name);
            found.push(m.name);
            grew = true;
          }
        }
      }
    }
    expect(found).toEqual(expect.arrayContaining(['WorkflowTag', 'WorkflowPortfolio', 'WorkflowArtifact', 'ProcessInsight', 'WorkflowShare', 'WorkflowBaseline', 'ProcessGraph']));
  });

  it('the non-cascading links the purge handles explicitly are exactly Upload and ProcessDefinition', () => {
    const wf = models.find((m) => m.name === 'Workflow')!.body;
    expect(wf).toMatch(/upload\s+Upload\?\s+@relation\(fields: \[sourceUploadId\], references: \[id\]\)/);
    expect(wf).toMatch(/processDefinition\s+ProcessDefinition\?[^\n]*onDelete: SetNull/);
  });

  it('there is no deletedAt column: updatedAt is the clock, so every writer of a deleted row is guarded', () => {
    expect(models.find((m) => m.name === 'Workflow')!.body).not.toMatch(/deletedAt/);
    const route = fs.readFileSync(path.resolve(__dirname, '../app/api/workflows/[id]/route.ts'), 'utf8');
    expect(route).toMatch(/if \(workflow\.status !== 'deleted'\) \{\s*db\.workflow\.update/); // view count
    expect(route).toMatch(/workflow\.status === 'deleted' && \(body\.status === undefined \|\| body\.status === 'deleted'\)/); // PATCH
    expect(route).toMatch(/if \(workflow\.status === 'deleted'\) \{\s*return NextResponse\.json\(\{ ok: true \}\)/); // DELETE idempotent
    const share = fs.readFileSync(path.resolve(__dirname, '../app/api/share/[token]/route.ts'), 'utf8');
    expect(share).toMatch(/status: 'active'/);
    const intel = fs.readFileSync(path.resolve(__dirname, './intelligence.ts'), 'utf8');
    expect(intel).toMatch(/status: 'active'/);
  });
});
