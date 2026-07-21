/**
 * Unit tests for the backup-status module.
 *
 * Environment: Vitest (node) — no React, no DOM, no fs mocking. The pure
 * functions (parse / derive / combine / build) are tested with fixed
 * inputs. `readBackupStatusFile` is tested against real temp files on
 * disk (absent / malformed / valid) rather than mocked, since it is a
 * thin I/O wrapper and this repo has no existing `fs` mocking convention.
 *
 * Coverage per task requirement: every one of the 5 UI-visible states
 * (never-run, failing, stale, local-only, durable), plus the defensive
 * paths (absent file, malformed JSON, unrecognized schemaVersion), plus
 * the explicit "local-only is not healthy" non-collapse assertion.
 *
 * @module admin-operations/backup-status.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseBackupStatusFile,
  readBackupStatusFile,
  deriveComponentState,
  combineOverallState,
  deriveDbBackupSummary,
  deriveEvidenceBackupSummary,
  buildBackupStatusSummary,
  BACKUP_STATUS_SCHEMA_VERSION,
  EXPECTED_BACKUP_CADENCE_MS,
  STALE_THRESHOLD_MS,
  FAILING_ATTEMPT_GAP_MS,
  type BackupAttemptStatus,
  type DbBackupStatusFile,
  type EvidenceBackupStatusFile,
  type BackupStatusFile,
} from './backup-status.js';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const NOW = Date.parse('2026-07-20T12:00:00Z');

function attempt(overrides: Partial<BackupAttemptStatus> = {}): BackupAttemptStatus {
  return {
    lastAttemptAt: '2026-07-20T11:00:00Z',
    lastSuccessAt: '2026-07-20T11:00:00Z',
    durable: false,
    lastError: null,
    ...overrides,
  };
}

function dbFile(overrides: Partial<DbBackupStatusFile> = {}): DbBackupStatusFile {
  return { ...attempt(), sizeBytes: 1234567, ...overrides };
}

function evidenceFile(overrides: Partial<EvidenceBackupStatusFile> = {}): EvidenceBackupStatusFile {
  return { ...attempt(), archiveCount: 12, ...overrides };
}

function statusFile(overrides: Partial<BackupStatusFile> = {}): BackupStatusFile {
  return {
    schemaVersion: BACKUP_STATUS_SCHEMA_VERSION,
    lastRunAt: '2026-07-20T11:00:00Z',
    offHostConfigured: false,
    db: dbFile(),
    evidence: evidenceFile(),
    ...overrides,
  };
}

// ── parseBackupStatusFile ────────────────────────────────────────────────────

describe('parseBackupStatusFile', () => {
  it('parses a valid file', () => {
    const raw = JSON.stringify(statusFile());
    const result = parseBackupStatusFile(raw);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.file.schemaVersion).toBe(1);
      expect(result.file.db.sizeBytes).toBe(1234567);
      expect(result.file.evidence.archiveCount).toBe(12);
    }
  });

  it('reports malformed JSON distinctly', () => {
    const result = parseBackupStatusFile('{ this is not json');
    expect(result).toEqual({ kind: 'invalid', reason: 'malformed-json' });
  });

  it('reports missing schemaVersion distinctly', () => {
    const raw = JSON.stringify({ foo: 'bar' });
    const result = parseBackupStatusFile(raw);
    expect(result).toEqual({
      kind: 'invalid',
      reason: 'missing-or-invalid-schema-version',
    });
  });

  it('reports an unrecognized schemaVersion distinctly, naming the version seen', () => {
    const raw = JSON.stringify({ ...statusFile(), schemaVersion: 99 });
    const result = parseBackupStatusFile(raw);
    expect(result).toEqual({
      kind: 'invalid',
      reason: 'unrecognized-schema-version:99',
    });
  });

  it('reports a structurally invalid v1 file (wrong field types) as schema-mismatch', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      lastRunAt: null,
      offHostConfigured: false,
      db: { lastAttemptAt: null, lastSuccessAt: null, durable: 'nope', lastError: null, sizeBytes: 0 },
      evidence: evidenceFile(),
    });
    const result = parseBackupStatusFile(raw);
    expect(result).toEqual({ kind: 'invalid', reason: 'schema-mismatch' });
  });

  it('reports a file missing the evidence section as schema-mismatch', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      lastRunAt: null,
      offHostConfigured: false,
      db: dbFile(),
    });
    const result = parseBackupStatusFile(raw);
    expect(result).toEqual({ kind: 'invalid', reason: 'schema-mismatch' });
  });

  it('tolerates unknown extra top-level fields (forward-compatible probe)', () => {
    const raw = JSON.stringify({ ...statusFile(), extraField: 'ignored' });
    const result = parseBackupStatusFile(raw);
    // Zod object() without .passthrough() strips unknown keys by default but
    // still succeeds — the point under test is that it does not reject.
    expect(result.kind).toBe('ok');
  });
});

// ── readBackupStatusFile (real temp files, no fs mocking) ──────────────────────

describe('readBackupStatusFile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'ledgerium-backup-status-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns absent when the file does not exist', async () => {
    const filePath = path.join(dir, '.backup-status.json');
    const result = await readBackupStatusFile(filePath);
    expect(result).toEqual({ kind: 'absent' });
  });

  it('returns ok for a valid file', async () => {
    const filePath = path.join(dir, '.backup-status.json');
    await writeFile(filePath, JSON.stringify(statusFile()), 'utf-8');
    const result = await readBackupStatusFile(filePath);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.file.offHostConfigured).toBe(false);
    }
  });

  it('returns invalid for malformed JSON on disk', async () => {
    const filePath = path.join(dir, '.backup-status.json');
    await writeFile(filePath, 'not json at all', 'utf-8');
    const result = await readBackupStatusFile(filePath);
    expect(result).toEqual({ kind: 'invalid', reason: 'malformed-json' });
  });

  it('returns unreadable when the path is a directory, not a file', async () => {
    // Reading a directory with fs.readFile fails (EISDIR on POSIX; Node
    // normalizes to a non-ENOENT error code on Windows too) — a real
    // "exists but cannot be read as a file" case distinct from ENOENT.
    // Error code is platform-dependent, so only the outcome kind + a
    // non-empty reason are asserted here.
    const result = await readBackupStatusFile(dir);
    expect(result.kind).toBe('unreadable');
    if (result.kind === 'unreadable') {
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('defaults to BACKUP_STATUS_FILE_PATH when called with no argument', async () => {
    // Smoke test only — asserts it resolves without throwing against
    // whatever DATA_DIR happens to be in this test environment. The
    // absent/ok/invalid behavior itself is covered above via explicit paths.
    await expect(readBackupStatusFile()).resolves.toBeDefined();
  });
});

// ── deriveComponentState ─────────────────────────────────────────────────────

describe('deriveComponentState', () => {
  it('never-run: lastAttemptAt is null', () => {
    const state = deriveComponentState(
      attempt({ lastAttemptAt: null, lastSuccessAt: null }),
      NOW,
    );
    expect(state).toBe('never-run');
  });

  it('never-run takes priority even if lastSuccessAt is somehow set without an attempt', () => {
    const state = deriveComponentState(
      attempt({ lastAttemptAt: null, lastSuccessAt: '2026-07-20T11:00:00Z' }),
      NOW,
    );
    expect(state).toBe('never-run');
  });

  it('failing: lastError is set', () => {
    const state = deriveComponentState(
      attempt({
        lastAttemptAt: '2026-07-20T11:55:00Z',
        lastSuccessAt: '2026-07-20T10:00:00Z',
        lastError: 'aws s3 cp exited 1',
      }),
      NOW,
    );
    expect(state).toBe('failing');
  });

  it('failing: attempted but never succeeded (lastSuccessAt null, no error reported)', () => {
    const state = deriveComponentState(
      attempt({ lastAttemptAt: '2026-07-20T11:55:00Z', lastSuccessAt: null }),
      NOW,
    );
    expect(state).toBe('failing');
  });

  it('failing: unparseable lastAttemptAt timestamp', () => {
    const state = deriveComponentState(
      attempt({ lastAttemptAt: 'not-a-date', lastSuccessAt: '2026-07-20T11:00:00Z' }),
      NOW,
    );
    expect(state).toBe('failing');
  });

  it('failing: unparseable lastSuccessAt timestamp', () => {
    const state = deriveComponentState(
      attempt({ lastAttemptAt: '2026-07-20T11:00:00Z', lastSuccessAt: 'not-a-date' }),
      NOW,
    );
    expect(state).toBe('failing');
  });

  it('failing: recent attempts materially newer than last success, no lastError reported', () => {
    // Attempt 1h05m after the last recorded success, with no lastError —
    // recent runs are not landing as successes.
    const state = deriveComponentState(
      attempt({
        lastAttemptAt: '2026-07-20T11:55:00Z',
        lastSuccessAt: '2026-07-20T10:50:00Z',
        lastError: null,
      }),
      NOW,
    );
    expect(state).toBe('failing');
  });

  it('does NOT flag failing when attempt and success are the same run (sidecar simply stopped) — falls through to stale check', () => {
    const staleNow = NOW; // success 13h behind "now" (2026-07-20T12:00 - 2026-07-19T23:00)
    const state = deriveComponentState(
      attempt({
        lastAttemptAt: '2026-07-19T23:00:00Z',
        lastSuccessAt: '2026-07-19T23:00:00Z',
        lastError: null,
      }),
      staleNow,
    );
    expect(state).toBe('stale');
  });

  it('stale: last success older than 2x cadence relative to now', () => {
    const state = deriveComponentState(
      attempt({
        lastAttemptAt: '2026-07-20T09:00:00Z',
        lastSuccessAt: '2026-07-20T09:00:00Z',
        lastError: null,
      }),
      NOW, // 3 hours later
    );
    expect(state).toBe('stale');
  });

  it('is NOT stale exactly at the 2x cadence boundary', () => {
    const boundaryNow = NOW;
    const successAt = new Date(NOW - STALE_THRESHOLD_MS).toISOString();
    const state = deriveComponentState(
      attempt({ lastAttemptAt: successAt, lastSuccessAt: successAt, lastError: null }),
      boundaryNow,
    );
    expect(state).not.toBe('stale');
  });

  it('is stale 1ms past the 2x cadence boundary', () => {
    const boundaryNow = NOW;
    const successAt = new Date(NOW - STALE_THRESHOLD_MS - 1).toISOString();
    const state = deriveComponentState(
      attempt({ lastAttemptAt: successAt, lastSuccessAt: successAt, lastError: null }),
      boundaryNow,
    );
    expect(state).toBe('stale');
  });

  it('local-only: recent success, durable is false — the state that must NOT read as healthy', () => {
    const state = deriveComponentState(
      attempt({
        lastAttemptAt: '2026-07-20T11:00:00Z',
        lastSuccessAt: '2026-07-20T11:00:00Z',
        durable: false,
        lastError: null,
      }),
      NOW,
    );
    expect(state).toBe('local-only');
    // Explicit non-collapse assertion — local-only is never reported as durable.
    expect(state).not.toBe('durable');
  });

  it('durable: recent success, durable is true', () => {
    const state = deriveComponentState(
      attempt({
        lastAttemptAt: '2026-07-20T11:00:00Z',
        lastSuccessAt: '2026-07-20T11:00:00Z',
        durable: true,
        lastError: null,
      }),
      NOW,
    );
    expect(state).toBe('durable');
  });

  it('sanity: EXPECTED_BACKUP_CADENCE_MS / STALE_THRESHOLD_MS / FAILING_ATTEMPT_GAP_MS are hourly-derived constants', () => {
    expect(EXPECTED_BACKUP_CADENCE_MS).toBe(60 * 60 * 1000);
    expect(STALE_THRESHOLD_MS).toBe(EXPECTED_BACKUP_CADENCE_MS * 2);
    expect(FAILING_ATTEMPT_GAP_MS).toBe(EXPECTED_BACKUP_CADENCE_MS);
  });
});

// ── combineOverallState ──────────────────────────────────────────────────────

describe('combineOverallState', () => {
  it('never-run beats every other state', () => {
    expect(combineOverallState('never-run', 'durable')).toBe('never-run');
    expect(combineOverallState('durable', 'never-run')).toBe('never-run');
  });

  it('failing beats stale, local-only, and durable', () => {
    expect(combineOverallState('failing', 'durable')).toBe('failing');
    expect(combineOverallState('local-only', 'failing')).toBe('failing');
  });

  it('stale beats local-only and durable', () => {
    expect(combineOverallState('stale', 'durable')).toBe('stale');
    expect(combineOverallState('local-only', 'stale')).toBe('stale');
  });

  it('local-only beats durable', () => {
    expect(combineOverallState('local-only', 'durable')).toBe('local-only');
    expect(combineOverallState('durable', 'local-only')).toBe('local-only');
  });

  it('durable + durable is durable', () => {
    expect(combineOverallState('durable', 'durable')).toBe('durable');
  });

  it('is symmetric for equal inputs', () => {
    expect(combineOverallState('failing', 'failing')).toBe('failing');
  });
});

// ── deriveDbBackupSummary / deriveEvidenceBackupSummary ──────────────────────

describe('deriveDbBackupSummary', () => {
  it('carries sizeBytes through alongside the derived state', () => {
    const derived = deriveDbBackupSummary(dbFile({ sizeBytes: 42 }), NOW);
    expect(derived.sizeBytes).toBe(42);
    expect(derived.state).toBe('local-only');
  });
});

describe('deriveEvidenceBackupSummary', () => {
  it('carries archiveCount through alongside the derived state', () => {
    const derived = deriveEvidenceBackupSummary(evidenceFile({ archiveCount: 7 }), NOW);
    expect(derived.archiveCount).toBe(7);
    expect(derived.state).toBe('local-only');
  });
});

// ── buildBackupStatusSummary — the top-level orchestration ─────────────────────

describe('buildBackupStatusSummary', () => {
  it('never-run: file absent — db and evidence are null, not defaulted to zeroed objects', () => {
    const summary = buildBackupStatusSummary({ kind: 'absent' }, NOW);
    expect(summary.overallState).toBe('never-run');
    expect(summary.db).toBeNull();
    expect(summary.evidence).toBeNull();
    expect(summary.offHostConfigured).toBeNull();
  });

  it('unknown: file unreadable — distinct from never-run, carries the reason', () => {
    const summary = buildBackupStatusSummary(
      { kind: 'unreadable', reason: 'EACCES' },
      NOW,
    );
    expect(summary.overallState).toBe('unknown');
    expect(summary.unknownReason).toBe('EACCES');
    expect(summary.db).toBeNull();
    expect(summary.overallState).not.toBe('never-run');
  });

  it('unknown: file invalid (bad schema) — distinct from never-run, carries the reason', () => {
    const summary = buildBackupStatusSummary(
      { kind: 'invalid', reason: 'unrecognized-schema-version:99' },
      NOW,
    );
    expect(summary.overallState).toBe('unknown');
    expect(summary.unknownReason).toBe('unrecognized-schema-version:99');
    expect(summary.overallState).not.toBe('never-run');
  });

  it('absent (never-run) is distinguishable from a file reporting a failing backup', () => {
    const absentSummary = buildBackupStatusSummary({ kind: 'absent' }, NOW);
    const failingSummary = buildBackupStatusSummary(
      {
        kind: 'ok',
        file: statusFile({
          db: dbFile({ lastError: 'exited 1' }),
        }),
      },
      NOW,
    );
    expect(absentSummary.overallState).toBe('never-run');
    expect(failingSummary.overallState).toBe('failing');
    expect(absentSummary.overallState).not.toBe(failingSummary.overallState);
  });

  it('ok: derives db and evidence independently — they can legitimately diverge', () => {
    const summary = buildBackupStatusSummary(
      {
        kind: 'ok',
        file: statusFile({
          db: dbFile({ durable: true }), // db durable
          evidence: evidenceFile({ durable: false }), // evidence local-only
        }),
      },
      NOW,
    );
    expect(summary.db?.state).toBe('durable');
    expect(summary.evidence?.state).toBe('local-only');
    // overall reflects the worse of the two
    expect(summary.overallState).toBe('local-only');
  });

  it('ok: local-only overall is not conflated with durable when both components succeed locally', () => {
    const summary = buildBackupStatusSummary(
      { kind: 'ok', file: statusFile({ db: dbFile({ durable: false }), evidence: evidenceFile({ durable: false }) }) },
      NOW,
    );
    expect(summary.overallState).toBe('local-only');
    expect(summary.overallState).not.toBe('durable');
    expect(summary.offHostConfigured).toBe(false);
  });

  it('ok: fully durable end-to-end', () => {
    const summary = buildBackupStatusSummary(
      {
        kind: 'ok',
        file: statusFile({
          offHostConfigured: true,
          db: dbFile({ durable: true }),
          evidence: evidenceFile({ durable: true }),
        }),
      },
      NOW,
    );
    expect(summary.overallState).toBe('durable');
    expect(summary.offHostConfigured).toBe(true);
  });

  it('ok: one component never-run while the other is durable — overall reflects the gap, not the good half', () => {
    const summary = buildBackupStatusSummary(
      {
        kind: 'ok',
        file: statusFile({
          db: dbFile({ lastAttemptAt: null, lastSuccessAt: null }),
          evidence: evidenceFile({ durable: true }),
        }),
      },
      NOW,
    );
    expect(summary.db?.state).toBe('never-run');
    expect(summary.evidence?.state).toBe('durable');
    expect(summary.overallState).toBe('never-run');
  });

  it('ok: last success timestamps for db and evidence are surfaced separately for relative-time display', () => {
    const summary = buildBackupStatusSummary(
      {
        kind: 'ok',
        file: statusFile({
          db: dbFile({ lastSuccessAt: '2026-07-20T11:46:00Z' }),
          evidence: evidenceFile({ lastSuccessAt: '2026-07-20T11:00:00Z' }),
        }),
      },
      NOW,
    );
    expect(summary.db?.lastSuccessAt).toBe('2026-07-20T11:46:00Z');
    expect(summary.evidence?.lastSuccessAt).toBe('2026-07-20T11:00:00Z');
    expect(summary.db?.lastSuccessAt).not.toBe(summary.evidence?.lastSuccessAt);
  });
});
