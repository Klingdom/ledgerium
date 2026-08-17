/**
 * BackupStatusSection — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React render, no DOM (this app has no
 * jsdom / @testing-library/react installed — see SOP_BUILDER_REVIEW_001
 * B-6). Only the exported pure label/tone/copy derivation functions are
 * tested here, matching the state-derivation pattern established across
 * this directory (MemoryGauge.test.ts, AdminOperationsDashboard.test.ts).
 *
 * The state-machine logic itself (which state a given file produces) is
 * tested exhaustively in lib/admin-operations/backup-status.test.ts; this
 * file only covers the presentation layer built on top of it.
 *
 * @module admin-operations/BackupStatusSection.test
 */

import { describe, it, expect } from 'vitest';
import {
  deriveStateBadgeMeta,
  deriveStateDescription,
  derivePanelMessage,
} from './BackupStatusSection.js';
import type { BackupStatusOverallState, BackupComponentState } from '@/lib/admin-operations/backup-status.js';

// ── deriveStateBadgeMeta ─────────────────────────────────────────────────────

describe('deriveStateBadgeMeta', () => {
  const ALL_STATES: BackupStatusOverallState[] = [
    'never-run',
    'failing',
    'stale',
    'local-only',
    'durable',
    'unknown',
  ];

  it('returns a label and toneClass for every overall state', () => {
    for (const state of ALL_STATES) {
      const meta = deriveStateBadgeMeta(state);
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.toneClass).toBe('string');
      expect(meta.toneClass.length).toBeGreaterThan(0);
    }
  });

  it('gives every state a distinct label', () => {
    const labels = ALL_STATES.map((s) => deriveStateBadgeMeta(s).label);
    expect(new Set(labels).size).toBe(ALL_STATES.length);
  });

  it('local-only and durable never share a tone — the core non-collapse requirement', () => {
    const localOnly = deriveStateBadgeMeta('local-only');
    const durable = deriveStateBadgeMeta('durable');
    expect(localOnly.toneClass).not.toBe(durable.toneClass);
    expect(localOnly.label).not.toBe(durable.label);
  });

  it('never-run and failing share the same alarm tone (both red) but have distinct labels', () => {
    const neverRun = deriveStateBadgeMeta('never-run');
    const failing = deriveStateBadgeMeta('failing');
    expect(neverRun.toneClass).toBe(failing.toneClass);
    expect(neverRun.label).not.toBe(failing.label);
  });

  it('unknown uses a neutral tone distinct from both the failure tones and the healthy tone', () => {
    const unknown = deriveStateBadgeMeta('unknown');
    const failing = deriveStateBadgeMeta('failing');
    const durable = deriveStateBadgeMeta('durable');
    expect(unknown.toneClass).not.toBe(failing.toneClass);
    expect(unknown.toneClass).not.toBe(durable.toneClass);
  });

  it('stale uses a distinct tone from local-only', () => {
    const stale = deriveStateBadgeMeta('stale');
    const localOnly = deriveStateBadgeMeta('local-only');
    expect(stale.toneClass).not.toBe(localOnly.toneClass);
  });

  it('labels are human copy, not raw state identifiers', () => {
    expect(deriveStateBadgeMeta('never-run').label).toBe('Never run');
    expect(deriveStateBadgeMeta('local-only').label).toBe('Local only');
    expect(deriveStateBadgeMeta('unknown').label).toBe('Status unknown');
  });
});

// ── deriveStateDescription ───────────────────────────────────────────────────

describe('deriveStateDescription', () => {
  const ALL_COMPONENT_STATES: BackupComponentState[] = [
    'never-run',
    'failing',
    'stale',
    'local-only',
    'durable',
  ];

  it('returns non-empty copy for every component state, for both artifact nouns', () => {
    for (const state of ALL_COMPONENT_STATES) {
      expect(deriveStateDescription('database', state).length).toBeGreaterThan(0);
      expect(deriveStateDescription('evidence', state).length).toBeGreaterThan(0);
    }
  });

  it('mentions the artifact noun so db vs evidence copy is distinguishable', () => {
    expect(deriveStateDescription('database', 'never-run')).toMatch(/database/i);
    expect(deriveStateDescription('evidence', 'never-run')).toMatch(/evidence/i);
  });

  it('local-only copy names the real risk without alarmist language', () => {
    const copy = deriveStateDescription('database', 'local-only');
    // Must communicate the actual exposure...
    expect(copy).toMatch(/off-host storage|server-level incident/i);
    // ...and must not claim things are fine.
    expect(copy.toLowerCase()).not.toMatch(/healthy|safe\b|protected|all good/i);
    // ...and must not be written as an alarm (no shouting).
    expect(copy).not.toMatch(/!/);
    expect(copy).not.toMatch(/critical|danger|urgent/i);
  });

  it('local-only copy is distinct from durable copy for the same artifact', () => {
    const localOnly = deriveStateDescription('database', 'local-only');
    const durable = deriveStateDescription('database', 'durable');
    expect(localOnly).not.toBe(durable);
  });

  it('durable copy states the backup reached off-host storage', () => {
    expect(deriveStateDescription('database', 'durable')).toMatch(/stored off this server/i);
  });

  it('never-run and failing produce distinct copy', () => {
    const neverRun = deriveStateDescription('database', 'never-run');
    const failing = deriveStateDescription('database', 'failing');
    expect(neverRun).not.toBe(failing);
  });
});

// ── derivePanelMessage ────────────────────────────────────────────────────────

describe('derivePanelMessage', () => {
  it('never-run: states plainly that nothing has ever been recorded', () => {
    const panel = derivePanelMessage('never-run', null);
    expect(panel.title).toMatch(/no backup has ever run/i);
    expect(panel.body).toMatch(/no recovery copy/i);
  });

  it('unknown: explicitly does not claim backups are broken', () => {
    const panel = derivePanelMessage('unknown', 'malformed-json');
    expect(panel.title).toMatch(/unknown/i);
    expect(panel.body).toMatch(/does not mean backups are failing/i);
  });

  it('unknown: includes the reason code when provided', () => {
    const panel = derivePanelMessage('unknown', 'unrecognized-schema-version:99');
    expect(panel.body).toContain('unrecognized-schema-version:99');
  });

  it('unknown: degrades gracefully when no reason is provided', () => {
    const panel = derivePanelMessage('unknown', null);
    expect(panel.body.length).toBeGreaterThan(0);
    expect(panel.body).not.toContain('null');
  });

  it('never-run and unknown produce distinct titles — absent is distinguishable from failed/unverifiable', () => {
    const neverRun = derivePanelMessage('never-run', null);
    const unknown = derivePanelMessage('unknown', 'EACCES');
    expect(neverRun.title).not.toBe(unknown.title);
    expect(neverRun.body).not.toBe(unknown.body);
  });
});
