/**
 * Tests for SOP document identity (B-1 fix — see
 * docs/meta/SOP_BUILDER_REVIEW_001.md B-1 and §7 step 2a).
 *
 * `buildSOP` is exercised directly (not via `processSession`) so these
 * tests are anchored to the exact contract described in the task: version
 * composite format, approvalStatus honesty, and full-document determinism
 * including the new identity fields.
 */

import { describe, it, expect } from 'vitest';
import { buildSOP } from './sopBuilder.js';
import { PROCESS_ENGINE_VERSION } from './types.js';
import type { ProcessEngineInput } from './types.js';

// ─── Fixture ─────────────────────────────────────────────────────────────────

const SESSION_ID = 'sopbuilder-test-session';
const NOW_MS = 1_700_000_000_000;

function makeInput(overrides?: {
  startedAt?: string;
  clickLabel?: string;
}): ProcessEngineInput {
  const clickLabel = overrides?.clickLabel ?? 'Save';

  const events: ProcessEngineInput['normalizedEvents'] = [
    {
      event_id: 'evt-1',
      session_id: SESSION_ID,
      t_ms: NOW_MS,
      t_wall: new Date(NOW_MS).toISOString(),
      event_type: 'interaction.click',
      actor_type: 'human',
      page_context: {
        url: 'https://app.netsuite.com/page',
        urlNormalized: 'https://app.netsuite.com/page',
        domain: 'app.netsuite.com',
        routeTemplate: '/page',
        pageTitle: 'Dashboard',
        applicationLabel: 'NetSuite',
      },
      target_summary: {
        label: clickLabel,
        role: 'button',
        isSensitive: false,
      },
      normalization_meta: {
        sourceEventId: 'evt-1',
        sourceEventType: 'interaction.click',
        normalizationRuleVersion: '1.0.0',
        redactionApplied: false,
      },
    },
    {
      event_id: 'evt-2',
      session_id: SESSION_ID,
      t_ms: NOW_MS + 100,
      t_wall: new Date(NOW_MS + 100).toISOString(),
      event_type: 'navigation.open_page',
      actor_type: 'human',
      page_context: {
        url: 'https://app.netsuite.com/invoices',
        urlNormalized: 'https://app.netsuite.com/invoices',
        domain: 'app.netsuite.com',
        routeTemplate: '/invoices',
        pageTitle: 'Invoice List',
        applicationLabel: 'NetSuite',
      },
      target_summary: {
        label: 'Invoice List',
        role: 'link',
        isSensitive: false,
      },
      normalization_meta: {
        sourceEventId: 'evt-2',
        sourceEventType: 'navigation.open_page',
        normalizationRuleVersion: '1.0.0',
        redactionApplied: false,
      },
    },
  ];

  const derivedSteps: ProcessEngineInput['derivedSteps'] = [
    {
      step_id: `${SESSION_ID}-step-1`,
      session_id: SESSION_ID,
      ordinal: 1,
      title: 'Click then navigate',
      status: 'finalized',
      boundary_reason: 'navigation_changed',
      grouping_reason: 'click_then_navigate',
      confidence: 0.85,
      source_event_ids: ['evt-1', 'evt-2'],
      start_t_ms: NOW_MS,
      end_t_ms: NOW_MS + 100,
      duration_ms: 100,
      page_context: {
        domain: 'app.netsuite.com',
        applicationLabel: 'NetSuite',
        routeTemplate: '/invoices',
      },
    },
  ];

  return {
    sessionJson: {
      sessionId: SESSION_ID,
      activityName: 'Create Invoice',
      startedAt: overrides?.startedAt ?? new Date(NOW_MS).toISOString(),
      endedAt: new Date(NOW_MS + 6000).toISOString(),
    },
    normalizedEvents: events,
    derivedSteps,
  };
}

// ─── version composite format ────────────────────────────────────────────────

describe('SOP.version composite format', () => {
  it('is `${engineVersion}+${contentHash.slice(0, 8)}`', () => {
    const sop = buildSOP(makeInput());
    expect(sop.version).toBe(`${PROCESS_ENGINE_VERSION}+${sop.contentHash.slice(0, 8)}`);
  });

  it('engineVersion equals PROCESS_ENGINE_VERSION', () => {
    const sop = buildSOP(makeInput());
    expect(sop.engineVersion).toBe(PROCESS_ENGINE_VERSION);
  });

  it('contentHash is a 16-hex-char string and version embeds its first 8 chars', () => {
    const sop = buildSOP(makeInput());
    expect(sop.contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(sop.version.endsWith(sop.contentHash.slice(0, 8))).toBe(true);
  });
});

// ─── approvalStatus honesty ──────────────────────────────────────────────────

describe('SOP.approvalStatus', () => {
  it('is always \'unapproved\' — there is no approval workflow yet', () => {
    const sop = buildSOP(makeInput());
    expect(sop.approvalStatus).toBe('unapproved');
  });

  it('is \'unapproved\' regardless of input content', () => {
    const sop = buildSOP(makeInput({ clickLabel: 'Submit' }));
    expect(sop.approvalStatus).toBe('unapproved');
  });
});

// ─── generatedAt vs. contentHash independence ────────────────────────────────

describe('generatedAt does not affect content identity', () => {
  it('changing sessionJson.startedAt changes generatedAt but NOT the contentHash/version', () => {
    const sopA = buildSOP(makeInput({ startedAt: '2026-01-01T00:00:00.000Z' }));
    const sopB = buildSOP(makeInput({ startedAt: '2026-06-15T12:30:00.000Z' }));

    expect(sopA.generatedAt).not.toBe(sopB.generatedAt);
    expect(sopA.contentHash).toBe(sopB.contentHash);
    expect(sopA.version).toBe(sopB.version);
  });

  it('generatedAt is sourced from sessionJson.startedAt, not the wall clock', () => {
    const startedAt = '2026-03-14T09:26:53.000Z';
    const sop = buildSOP(makeInput({ startedAt }));
    expect(sop.generatedAt).toBe(startedAt);
  });
});

// ─── content sensitivity (integration-level) ─────────────────────────────────

describe('contentHash / version change with observed content', () => {
  it('differs when the underlying evidence (click label) differs', () => {
    const sopA = buildSOP(makeInput({ clickLabel: 'Save' }));
    const sopB = buildSOP(makeInput({ clickLabel: 'Submit' }));

    expect(sopA.contentHash).not.toBe(sopB.contentHash);
    expect(sopA.version).not.toBe(sopB.version);
  });
});

// ─── full buildSOP determinism ───────────────────────────────────────────────

describe('buildSOP determinism', () => {
  it('two runs over the same fixture produce byte-identical output, including identity fields', () => {
    const input = makeInput();
    const sopA = buildSOP(input);
    const sopB = buildSOP(input);

    expect(JSON.stringify(sopA)).toBe(JSON.stringify(sopB));
    expect(sopA.version).toBe(sopB.version);
    expect(sopA.contentHash).toBe(sopB.contentHash);
    expect(sopA.engineVersion).toBe(sopB.engineVersion);
    expect(sopA.approvalStatus).toBe(sopB.approvalStatus);
  });

  it('two independently-constructed-but-equal inputs also produce byte-identical output', () => {
    const sopA = buildSOP(makeInput());
    const sopB = buildSOP(makeInput());

    expect(JSON.stringify(sopA)).toBe(JSON.stringify(sopB));
  });
});
