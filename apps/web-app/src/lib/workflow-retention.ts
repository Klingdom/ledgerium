/**
 * Row #319 - retention for deleted workflows.
 *
 * POLICY: a workflow the user deleted (Workflow.status = 'deleted', set by
 * DELETE /api/workflows/[id]) is permanently removed, with everything derived
 * from it, once it has been deleted for WORKFLOW_PURGE_AFTER_DAYS (default 30).
 *
 * THE CLOCK. There is no `deletedAt` column (adding one is a migration, and
 * production applies migrations through a step that fails quietly, row #12).
 * `Workflow.updatedAt` (@updatedAt) is stamped by the delete itself and is the
 * deletion time ONLY IF nothing writes to a deleted row afterwards. Every
 * writer was audited and made to leave deleted rows alone:
 *   - DELETE            idempotent: an already-deleted row is not rewritten
 *   - PATCH             a deleted row accepts only a restore (status active/archived)
 *   - GET (view count)  skipped for deleted rows
 *   - share/[token]     already filters status 'active'
 *   - intelligence.ts   already filters status 'active'
 * `workflow-retention.test.ts` pins the three route guards by source scan.
 * Rows deleted BEFORE this shipped may have been touched after deletion (a
 * view bumped updatedAt), so their purge can fall later than 30 days from the
 * real deletion; that is a one-time tail, not a steady state.
 *
 * WHAT IS REMOVED. Prisma `onDelete: Cascade` removes artifacts (events, steps,
 * SOP and report JSON), shares, tags, portfolio links, baselines, insights and
 * process graphs. Not cascaded, so removed explicitly here:
 *   - the raw uploaded recording file on disk and its Upload row (only when no
 *     other workflow still came from that upload)
 *   - the ProcessDefinition (only when no workflow is left linked to it)
 * `workflow-retention.test.ts` parses schema.prisma and FAILS if a model that
 * points at Workflow loses its cascade, so a future table cannot silently keep
 * a purged workflow's data.
 *
 * Logs counts only: never titles, owners or content.
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export const DEFAULT_PURGE_AFTER_DAYS = 30;
export const MIN_PURGE_AFTER_DAYS = 1;
export const MAX_PURGE_AFTER_DAYS = 365;
export const DEFAULT_PURGE_BATCH_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionDaysResult = { ok: true; days: number } | { ok: false };

/**
 * Unset or blank -> 30. Otherwise a strict decimal integer 1..365. Anything else
 * is NOT silently defaulted: a typo that shortened retention would destroy data
 * early, one that lengthened it would break the public promise. The caller
 * refuses to run.
 */
export function resolvePurgeAfterDays(raw: string | undefined): RetentionDaysResult {
  if (raw === undefined || raw.trim() === '') return { ok: true, days: DEFAULT_PURGE_AFTER_DAYS };
  const s = raw.trim();
  if (!/^\d{1,3}$/.test(s)) return { ok: false };
  const n = Number(s);
  if (n < MIN_PURGE_AFTER_DAYS || n > MAX_PURGE_AFTER_DAYS) return { ok: false };
  return { ok: true, days: n };
}

export interface PurgeCandidate {
  id: string;
  status: string;
  updatedAt: Date;
  sourceUploadId?: string | null;
  processDefinitionId?: string | null;
}

/** The instant at or before which a deleted workflow is eligible. */
export function purgeCutoffMs(nowMs: number, retentionDays: number): number {
  return nowMs - retentionDays * DAY_MS;
}

/**
 * Pure. Eligible = status 'deleted' AND deleted for at least `retentionDays`
 * (age >= N days: exactly N is eligible, N days minus 1 ms is not). Oldest
 * first, id as tiebreak, so a bounded run is deterministic.
 */
export function selectPurgeEligible<T extends PurgeCandidate>(
  rows: readonly T[],
  nowMs: number,
  retentionDays: number,
  limit: number = DEFAULT_PURGE_BATCH_LIMIT,
): T[] {
  const cutoff = purgeCutoffMs(nowMs, retentionDays);
  return rows
    .filter((r) => r.status === 'deleted' && r.updatedAt.getTime() <= cutoff)
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, Math.max(0, limit));
}

/* ───────── DB surface (structural, so a fake can stand in for Prisma) ───────── */

interface Tx {
  workflow: {
    deleteMany(args: { where: { id: string; status: string; updatedAt: { lte: Date } } }): Promise<{ count: number }>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  processDefinition: { deleteMany(args: { where: { id: string } }): Promise<{ count: number }> };
  upload: {
    findUnique(args: { where: { id: string }; select: { rawJsonPath: true } }): Promise<{ rawJsonPath: string } | null>;
    deleteMany(args: { where: { id: string } }): Promise<{ count: number }>;
  };
}
export interface RetentionDb {
  workflow: {
    findMany(args: {
      where: { status: string; updatedAt: { lte: Date } };
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      take: number;
      select: Record<string, true>;
    }): Promise<PurgeCandidate[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  upload: {
    count(args: { where: { uploadedAt: { lte: Date }; workflows: { none: Record<string, never> } } }): Promise<number>;
    findMany(args: {
      where: { uploadedAt: { lte: Date }; workflows: { none: Record<string, never> } };
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      take: number;
      select: { id: true; rawJsonPath: true };
    }): Promise<Array<{ id: string; rawJsonPath: string }>>;
    deleteMany(args: { where: { id: string } }): Promise<{ count: number }>;
  };
  $transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
}

export interface PurgeDeps {
  /** Resolves when removed or already absent; rejects otherwise. */
  unlinkFile?: (absolutePath: string) => Promise<void>;
  uploadDir?: string;
  /** Test seam; defaults to fs.promises.realpath. */
  realpath?: (p: string) => Promise<string>;
}

export interface PurgeSummary {
  dryRun: boolean;
  retentionDays: number;
  /** Eligible in THIS batch (<= batchLimit). In a dry run: what the next real run removes, min(total, batchLimit). */
  eligible: number;
  /** DRY RUN ONLY (null on a real run): ALL eligible workflows, not capped by the batch limit. */
  eligibleTotal: number | null;
  /** DRY RUN ONLY (null on a real run): orphan uploads the sweep would consider (uncapped count). */
  orphanCandidates: number | null;
  purged: number;
  /** Raced with a restore/touch between select and delete; left alone. */
  skipped: number;
  failed: number;
  uploadsRemoved: number;
  filesRemoved: number;
  fileFailures: number;
  definitionsRemoved: number;
  /** Orphan uploads (no workflow references them) removed by the sweep. */
  orphansRemoved: number;
  /** More eligible rows exist than the batch limit; the next run continues. */
  hasMore: boolean;
}

/** Hex SHA-256 of an id: lets a specific id be verified on request without the log listing ids. */
export function auditRef(id: string): string {
  return createHash('sha256').update(id).digest('hex');
}

async function defaultUnlink(p: string): Promise<void> {
  try {
    await fs.promises.unlink(p);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
}

/**
 * Containment on REAL paths: symlinks are resolved (the parent directory when
 * the file is already gone) and the prefix is separator-terminated, so a sibling
 * like /uploads-evil or a symlink pointing out of the upload dir is refused.
 * If containment cannot be proven the answer is no.
 */
async function isInside(dir: string, target: string, realpath: (p: string) => Promise<string>): Promise<boolean> {
  try {
    const d = await realpath(path.resolve(dir));
    const t = path.resolve(target);
    let realT: string;
    try {
      realT = await realpath(t);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') return false;
      realT = path.join(await realpath(path.dirname(t)), path.basename(t));
    }
    const prefix = d.endsWith(path.sep) ? d : d + path.sep;
    return realT.startsWith(prefix);
  } catch {
    return false;
  }
}

export async function purgeExpiredWorkflows(
  db: RetentionDb,
  opts: { nowMs: number; retentionDays: number; batchLimit?: number; dryRun?: boolean },
  deps: PurgeDeps = {},
): Promise<PurgeSummary> {
  const limit = opts.batchLimit ?? DEFAULT_PURGE_BATCH_LIMIT;
  const cutoff = new Date(purgeCutoffMs(opts.nowMs, opts.retentionDays));
  const dryRun = opts.dryRun === true;
  const unlinkFile = deps.unlinkFile ?? defaultUnlink;
  const uploadDir = deps.uploadDir;
  const realpath = deps.realpath ?? ((p: string) => fs.promises.realpath(p));

  const summary: PurgeSummary = {
    dryRun,
    retentionDays: opts.retentionDays,
    eligible: 0,
    eligibleTotal: null,
    orphanCandidates: null,
    purged: 0,
    skipped: 0,
    failed: 0,
    uploadsRemoved: 0,
    filesRemoved: 0,
    fileFailures: 0,
    definitionsRemoved: 0,
    orphansRemoved: 0,
    hasMore: false,
  };

  if (dryRun) {
    // PREVIEW = exactly what a real run would do, via COUNT queries so nothing is
    // capped at the batch limit: every eligible workflow, what the next run removes
    // (min(total, batch)), and the orphan-sweep candidates. Same predicates as the
    // real path (status + cutoff; upload age + no workflow). Counts only; no ids.
    const total = await db.workflow.count({ where: { status: 'deleted', updatedAt: { lte: cutoff } } });
    summary.eligibleTotal = total;
    summary.eligible = Math.min(total, Math.max(0, limit));
    summary.hasMore = total > limit;
    summary.orphanCandidates = await db.upload.count({ where: { uploadedAt: { lte: cutoff }, workflows: { none: {} } } });
    return summary;
  }

  // The query pre-filters; selectPurgeEligible is the authority on the rule.
  const candidates = await db.workflow.findMany({
    where: { status: 'deleted', updatedAt: { lte: cutoff } },
    orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    select: { id: true, status: true, updatedAt: true, sourceUploadId: true, processDefinitionId: true },
  });
  const all = selectPurgeEligible(candidates, opts.nowMs, opts.retentionDays, Number.MAX_SAFE_INTEGER);
  summary.hasMore = all.length > limit;
  const batch = all.slice(0, limit);
  summary.eligible = batch.length;

  /** Contained unlink. Throws if refused or failed (callers keep the row for retry). */
  const unlinkContained = async (rawJsonPath: string): Promise<void> => {
    if (!uploadDir || !(await isInside(uploadDir, rawJsonPath, realpath))) {
      throw new Error('upload path outside upload dir');
    }
    await unlinkFile(path.resolve(rawJsonPath));
  };

  // AUDIT TRAIL (server log only, never the HTTP body): hashed ids + the
  // updatedAt used as the deletion clock. No titles, owners, emails or paths.
  const auditPurged: Array<{ ref: string; deletedAt: string }> = [];
  const auditOrphans: string[] = [];

  for (const w of batch) {
    try {
      const outcome = await db.$transaction(async (tx) => {
        // Re-check inside the transaction: a restore (PATCH status) or any write
        // since the select moves status/updatedAt out of the predicate -> count 0.
        const del = await tx.workflow.deleteMany({
          where: { id: w.id, status: 'deleted', updatedAt: { lte: cutoff } },
        });
        if (del.count === 0) return { purged: false, definitionRemoved: false, uploadRemoved: false, fileRemoved: false };
        let definitionRemoved = false;
        if (w.processDefinitionId) {
          const left = await tx.workflow.count({ where: { processDefinitionId: w.processDefinitionId } });
          if (left === 0) {
            const r = await tx.processDefinition.deleteMany({ where: { id: w.processDefinitionId } });
            definitionRemoved = r.count > 0;
          }
        }
        // Raw recording: when this was the last workflow from the upload, the
        // reference count, the file unlink and the Upload row delete all happen
        // INSIDE this transaction, file first. If the unlink is refused or fails
        // the whole workflow purge rolls back (workflow + Upload row stay, the
        // failure is reported, the next run retries); the row is only deleted
        // once the file is gone, so no file can be orphaned from its pointer.
        let uploadRemoved = false;
        let fileRemoved = false;
        if (w.sourceUploadId) {
          const remaining = await tx.workflow.count({ where: { sourceUploadId: w.sourceUploadId } });
          if (remaining === 0) {
            const up = await tx.upload.findUnique({ where: { id: w.sourceUploadId }, select: { rawJsonPath: true } });
            if (up) {
              await unlinkContained(up.rawJsonPath);
              fileRemoved = true;
              const r = await tx.upload.deleteMany({ where: { id: w.sourceUploadId } });
              uploadRemoved = r.count > 0;
            }
          }
        }
        return { purged: true, definitionRemoved, uploadRemoved, fileRemoved };
      });
      if (!outcome.purged) {
        summary.skipped += 1;
        continue;
      }
      summary.purged += 1;
      auditPurged.push({ ref: auditRef(w.id), deletedAt: w.updatedAt.toISOString() });
      if (outcome.definitionRemoved) summary.definitionsRemoved += 1;

      if (outcome.uploadRemoved) summary.uploadsRemoved += 1;
      if (outcome.fileRemoved) summary.filesRemoved += 1;
    } catch {
      summary.failed += 1; // counts only; never the error text or workflow content
    }
  }

  // ORPHAN-UPLOAD SWEEP. Upload rows no workflow references (a purge that died
  // mid-way, a failed processing run, or rows from before this shipped) get their
  // file unlinked (contained) and the row deleted. Failures keep the row, so the
  // next run retries, and are counted. AGE GUARD: only uploads at least
  // retentionDays old (the same cutoff), because a brand-new Upload row has no
  // workflow until processing finishes; sweeping it would delete an in-flight
  // upload. Retention days vastly exceeds any processing window.
  const orphans = await db.upload.findMany({
    where: { uploadedAt: { lte: cutoff }, workflows: { none: {} } },
    orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
    take: limit,
    select: { id: true, rawJsonPath: true },
  });
  for (const o of orphans) {
    try {
      await unlinkContained(o.rawJsonPath);
    } catch {
      summary.fileFailures += 1;
      continue;
    }
    summary.filesRemoved += 1;
    try {
      const r = await db.upload.deleteMany({ where: { id: o.id } });
      if (r.count > 0) {
        summary.orphansRemoved += 1;
        auditOrphans.push(auditRef(o.id));
        summary.uploadsRemoved += 1;
      }
    } catch {
      summary.failed += 1;
    }
  }
  if (auditPurged.length > 0 || auditOrphans.length > 0) {
    console.log(
      `[admin/retention/purge] audit ${JSON.stringify({ retentionDays: opts.retentionDays, purged: auditPurged, orphanUploads: auditOrphans })}`,
    );
  }
  return summary;
}
