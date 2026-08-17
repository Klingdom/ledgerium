import { describe, it, expect } from 'vitest';
import { parseBackupStatusFile } from './backup-status';

/**
 * CONTRACT TEST — the writer and this parser are separate artifacts in
 * separate languages that must agree on one JSON shape. If they drift, the
 * admin tile silently shows nothing, which is the exact invisible-failure
 * mode this whole surface exists to prevent.
 *
 * RAW below is byte-for-byte output captured from a real
 * scripts/backup-status-write.sh sandbox run (db failure carrying a prior
 * success forward, plus a durable evidence success). Regenerate it from a
 * real run if the writer's format ever changes.
 */
const RAW = `{  "schemaVersion": 1,  "lastRunAt": "2026-07-21T10:05:00Z",  "offHostConfigured": false,  "db": {    "lastAttemptAt": "2026-07-21T10:00:00Z",    "lastSuccessAt": "2026-07-21T09:00:00Z",    "durable": false,    "lastError": "disk full",    "sizeBytes": 1234567  },  "evidence": {    "lastAttemptAt": "2026-07-21T10:05:00Z",    "lastSuccessAt": "2026-07-21T10:05:00Z",    "durable": true,    "lastError": null,    "archiveCount": 12  }}`;

describe('CONTRACT: backup-status-write.sh output parses here', () => {
  it('parses real writer output as ok', () => {
    const r = parseBackupStatusFile(RAW);
    expect(r.kind).toBe('ok');
  });

  it('preserves the fields the dashboard depends on', () => {
    const r = parseBackupStatusFile(RAW);
    if (r.kind !== 'ok') throw new Error('expected ok, got ' + r.reason);
    expect(r.file.db.lastSuccessAt).toBe('2026-07-21T09:00:00Z');
    expect(r.file.db.lastError).toBe('disk full');
    expect(r.file.evidence.durable).toBe(true);
    expect(r.file.offHostConfigured).toBe(false);
  });
});
