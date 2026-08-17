/**
 * Backup status — read + parse + derive state from the backup sidecar's
 * status file.
 *
 * WHY THIS EXISTS (SOP_BUILDER_REVIEW_001 B-4 / DATABASE_BACKUP_RESTORE.md):
 * the original failure was not "no backup code" — db-backup.sh and
 * evidence-backup.sh existed for a long time but were never deployed, and
 * nobody could see that. The backup sidecar now runs, but off-host storage
 * is not yet provisioned, so today's real state is "backing up locally,
 * not durable." A backup surface that renders that as green/healthy would
 * repeat the exact mistake this module exists to prevent. See
 * `buildBackupStatusSummary` and the `local-only` state below.
 *
 * The sidecar (scripts/db-backup.sh + scripts/evidence-backup.sh, driven by
 * scripts/backup-cron-entrypoint.sh, hourly cron) writes a status file to
 * `${DATA_DIR}/.backup-status.json` on every cycle. This module never
 * writes that file — it only reads and interprets it. All state derivation
 * is expressed as pure functions of (parsed file | read outcome, nowMs) so
 * it is testable without touching the filesystem or mocking `fs`; only
 * `readBackupStatusFile` itself performs I/O.
 *
 * Absent vs failed (the core requirement of this module): a missing status
 * file means backups have never run — surfaced as `'never-run'`. A present
 * file reporting a recent `lastError` means the most recent attempt broke
 * — surfaced as `'failing'`. These are different emergencies and must never
 * collapse into the same UI state.
 *
 * @module admin-operations/backup-status
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { DATA_DIR } from '@/lib/storage';

// ── Constants ──────────────────────────────────────────────────────────────────

/** Current recognized shape of the status file. Bump when the sidecar's contract changes. */
export const BACKUP_STATUS_SCHEMA_VERSION = 1;

/** Absolute path to the status file written by the backup sidecar (DATA_DIR is /app/data in prod). */
export const BACKUP_STATUS_FILE_PATH = path.join(DATA_DIR, '.backup-status.json');

/** The sidecar runs hourly (scripts/backup-cron-entrypoint.sh: `0 * * * *`). */
export const EXPECTED_BACKUP_CADENCE_MS = 60 * 60 * 1000;

/**
 * "Stale" threshold: last success older than ~2x the expected cadence.
 * One missed cycle can be a transient blip; two in a row is worth flagging.
 */
export const STALE_THRESHOLD_MS = EXPECTED_BACKUP_CADENCE_MS * 2;

/**
 * "Failing" gap threshold: how far a `lastAttemptAt` can run ahead of
 * `lastSuccessAt` (with no `lastError` reported) before we treat recent
 * attempts as not actually succeeding, rather than just "old but fine."
 * Distinguishes "the sidecar stopped running entirely" (caught by the
 * staleness check below, since attempt and success ages move together)
 * from "the sidecar is running on schedule but not succeeding."
 */
export const FAILING_ATTEMPT_GAP_MS = EXPECTED_BACKUP_CADENCE_MS;

// ── File contract (matches the sidecar's .backup-status.json) ──────────────────

export interface BackupAttemptStatus {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  /** Whether the most recent successful artifact reached off-host storage. */
  durable: boolean;
  lastError: string | null;
}

export interface DbBackupStatusFile extends BackupAttemptStatus {
  sizeBytes: number;
}

export interface EvidenceBackupStatusFile extends BackupAttemptStatus {
  archiveCount: number;
}

export interface BackupStatusFile {
  schemaVersion: number;
  lastRunAt: string | null;
  offHostConfigured: boolean;
  db: DbBackupStatusFile;
  evidence: EvidenceBackupStatusFile;
}

// ── Zod schema (validates the parsed JSON before we trust its shape) ───────────

const attemptStatusSchema = z.object({
  lastAttemptAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  durable: z.boolean(),
  lastError: z.string().nullable(),
});

const backupStatusFileSchema = z.object({
  schemaVersion: z.number(),
  lastRunAt: z.string().nullable(),
  offHostConfigured: z.boolean(),
  db: attemptStatusSchema.extend({ sizeBytes: z.number() }),
  evidence: attemptStatusSchema.extend({ archiveCount: z.number() }),
});

/** Loose probe used to report a version mismatch distinctly from a full shape mismatch. */
const schemaVersionProbeSchema = z.object({ schemaVersion: z.number() }).passthrough();

// ── Parse ──────────────────────────────────────────────────────────────────────

export type BackupStatusParseResult =
  | { kind: 'invalid'; reason: string }
  | { kind: 'ok'; file: BackupStatusFile };

/**
 * Parse and validate the raw contents of the status file.
 *
 * Pure — no I/O. Every failure path returns a specific `reason` instead of
 * throwing, so a corrupt or version-skewed file degrades to an honest
 * "unknown" state rather than crashing the request.
 */
export function parseBackupStatusFile(raw: string): BackupStatusParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'malformed-json' };
  }

  const probe = schemaVersionProbeSchema.safeParse(json);
  if (!probe.success) {
    return { kind: 'invalid', reason: 'missing-or-invalid-schema-version' };
  }
  if (probe.data.schemaVersion !== BACKUP_STATUS_SCHEMA_VERSION) {
    return {
      kind: 'invalid',
      reason: `unrecognized-schema-version:${probe.data.schemaVersion}`,
    };
  }

  const parsed = backupStatusFileSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: 'invalid', reason: 'schema-mismatch' };
  }

  return { kind: 'ok', file: parsed.data };
}

// ── Read (the only I/O in this module) ──────────────────────────────────────────

export type BackupStatusReadOutcome =
  | { kind: 'absent' }
  | { kind: 'unreadable'; reason: string }
  | { kind: 'invalid'; reason: string }
  | { kind: 'ok'; file: BackupStatusFile };

/**
 * Read and parse the status file from disk.
 *
 * Distinguishes "file does not exist" (`'absent'` — backups have never
 * run, or the sidecar has never completed a cycle) from "file exists but
 * could not be read" (`'unreadable'` — permissions/I-O error; we cannot
 * vouch for backup health either way) and from "file exists, was read,
 * but did not parse" (`'invalid'`). Never throws.
 */
export async function readBackupStatusFile(
  filePath: string = BACKUP_STATUS_FILE_PATH,
): Promise<BackupStatusReadOutcome> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') {
      return { kind: 'absent' };
    }
    return { kind: 'unreadable', reason: code ?? 'unknown-read-error' };
  }

  const parsed = parseBackupStatusFile(raw);
  if (parsed.kind === 'invalid') {
    return { kind: 'invalid', reason: parsed.reason };
  }
  return { kind: 'ok', file: parsed.file };
}

// ── Derived state ──────────────────────────────────────────────────────────────

/**
 * Per-artifact (db or evidence) state, ordered worst → best. Used both for
 * display and — via `combineOverallState` — to pick the single worst state
 * across db + evidence for the panel-level summary.
 */
export type BackupComponentState =
  | 'never-run'
  | 'failing'
  | 'stale'
  | 'local-only'
  | 'durable';

const COMPONENT_STATE_SEVERITY: readonly BackupComponentState[] = [
  'never-run',
  'failing',
  'stale',
  'local-only',
  'durable',
];

/**
 * Derive a single artifact's state from its status-file fields.
 *
 * Pure — takes `nowMs` explicitly rather than calling `Date.now()`, so it
 * is fully deterministic under test.
 *
 * Priority order (first match wins):
 *   1. never attempted            → 'never-run'
 *   2. most recent attempt errored → 'failing'
 *   3. attempted, never succeeded  → 'failing'
 *   4. unparseable timestamps      → 'failing' (cannot vouch for freshness)
 *   5. recent attempts not landing as successes → 'failing'
 *      (lastAttemptAt is materially newer than lastSuccessAt, i.e. the
 *      sidecar is running on schedule but its last several runs have not
 *      produced a new success — distinct from case 6, where an old
 *      success and an equally-old attempt just mean nothing has run in a
 *      while)
 *   6. last success older than ~2x cadence → 'stale'
 *   7. otherwise                    → 'durable' | 'local-only' (per the
 *      file's own `durable` flag)
 */
export function deriveComponentState(
  component: BackupAttemptStatus,
  nowMs: number,
): BackupComponentState {
  if (component.lastAttemptAt == null) return 'never-run';
  if (component.lastError != null) return 'failing';
  if (component.lastSuccessAt == null) return 'failing';

  const attemptMs = Date.parse(component.lastAttemptAt);
  const successMs = Date.parse(component.lastSuccessAt);
  if (Number.isNaN(attemptMs) || Number.isNaN(successMs)) return 'failing';

  if (attemptMs - successMs > FAILING_ATTEMPT_GAP_MS) return 'failing';
  if (nowMs - successMs > STALE_THRESHOLD_MS) return 'stale';

  return component.durable ? 'durable' : 'local-only';
}

/** Combine two component states into the worse (more severe) of the two. */
export function combineOverallState(
  a: BackupComponentState,
  b: BackupComponentState,
): BackupComponentState {
  const rankA = COMPONENT_STATE_SEVERITY.indexOf(a);
  const rankB = COMPONENT_STATE_SEVERITY.indexOf(b);
  return rankA <= rankB ? a : b;
}

export interface DbBackupDerived {
  state: BackupComponentState;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  durable: boolean;
  sizeBytes: number;
}

export interface EvidenceBackupDerived {
  state: BackupComponentState;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  durable: boolean;
  archiveCount: number;
}

export function deriveDbBackupSummary(file: DbBackupStatusFile, nowMs: number): DbBackupDerived {
  return {
    state: deriveComponentState(file, nowMs),
    lastAttemptAt: file.lastAttemptAt,
    lastSuccessAt: file.lastSuccessAt,
    lastError: file.lastError,
    durable: file.durable,
    sizeBytes: file.sizeBytes,
  };
}

export function deriveEvidenceBackupSummary(
  file: EvidenceBackupStatusFile,
  nowMs: number,
): EvidenceBackupDerived {
  return {
    state: deriveComponentState(file, nowMs),
    lastAttemptAt: file.lastAttemptAt,
    lastSuccessAt: file.lastSuccessAt,
    lastError: file.lastError,
    durable: file.durable,
    archiveCount: file.archiveCount,
  };
}

/**
 * Panel-level state. Adds `'unknown'` to the component-state vocabulary for
 * the case where the file could not be read or parsed at all — genuinely
 * different from `'never-run'` (we know backups have never run) because
 * here we cannot tell whether backups are running or not; the dashboard
 * just cannot currently verify them.
 */
export type BackupStatusOverallState = BackupComponentState | 'unknown';

export interface BackupStatusSummary {
  overallState: BackupStatusOverallState;
  /** Set only when overallState === 'unknown'; machine-readable reason code. */
  unknownReason: string | null;
  offHostConfigured: boolean | null;
  lastRunAt: string | null;
  db: DbBackupDerived | null;
  evidence: EvidenceBackupDerived | null;
}

/**
 * Build the full panel summary from a read outcome. Pure — the only
 * dependency on "now" is the explicit `nowMs` parameter.
 *
 * `'absent'` → `'never-run'` (db/evidence null: there is no data to show
 * per-artifact, only the fact that nothing has ever been recorded).
 * `'unreadable'` / `'invalid'` → `'unknown'` (db/evidence null: we cannot
 * vouch for backup health either way).
 * `'ok'` → per-artifact states derived and combined via the worse-of-two
 * rule; db/evidence populated so the UI can show them — and their
 * potentially-diverging last-success times — separately.
 */
export function buildBackupStatusSummary(
  outcome: BackupStatusReadOutcome,
  nowMs: number,
): BackupStatusSummary {
  if (outcome.kind === 'absent') {
    return {
      overallState: 'never-run',
      unknownReason: null,
      offHostConfigured: null,
      lastRunAt: null,
      db: null,
      evidence: null,
    };
  }

  if (outcome.kind === 'unreadable' || outcome.kind === 'invalid') {
    return {
      overallState: 'unknown',
      unknownReason: outcome.reason,
      offHostConfigured: null,
      lastRunAt: null,
      db: null,
      evidence: null,
    };
  }

  const db = deriveDbBackupSummary(outcome.file.db, nowMs);
  const evidence = deriveEvidenceBackupSummary(outcome.file.evidence, nowMs);

  return {
    overallState: combineOverallState(db.state, evidence.state),
    unknownReason: null,
    offHostConfigured: outcome.file.offHostConfigured,
    lastRunAt: outcome.file.lastRunAt,
    db,
    evidence,
  };
}

// ── API envelope ───────────────────────────────────────────────────────────────

export interface BackupStatusApiResponse {
  data: BackupStatusSummary | null;
  error: { code: string; message: string } | null;
  meta: {
    generatedAt: string;
    queryDurationMs: number;
  };
}
