/**
 * FirstRunTutorial — copy-pin + honesty assertions (atglance-review #14).
 *
 * Environment: Vitest (node) — no jsdom render. Pins the growth-drafted
 * first-run copy + the 3-step record→measure→act path, and asserts the HONESTY
 * guardrails (observed-only; no fabricated stats / benchmarks / social proof;
 * CTAs reflect real product paths). Mirrors the established copy-pin convention
 * in WorkflowList.test.tsx.
 */

import { describe, it, expect, vi } from 'vitest';

// next/link + analytics are imported by the component module; stub them so the
// exported copy constants can be imported in the node test environment.
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

import {
  FIRST_RUN_STEPS,
  FIRST_RUN_HEADING,
  FIRST_RUN_LEAD,
  FIRST_RUN_PRIMARY_CTA,
  FIRST_RUN_SECONDARY_CTA,
} from './FirstRunTutorial.js';

describe('FirstRunTutorial: 3-step record→measure→act path (growth verbatim)', () => {
  it('has exactly the 3 steps: Record → Measure → Act', () => {
    expect(FIRST_RUN_STEPS).toHaveLength(3);
    expect(FIRST_RUN_STEPS.map((s) => s.title)).toEqual(['Record', 'Measure', 'Act']);
    expect(FIRST_RUN_STEPS.map((s) => s.n)).toEqual([1, 2, 3]);
  });

  it('each step body maps to a real product capability (verbatim growth copy)', () => {
    expect(FIRST_RUN_STEPS[0]!.body).toBe(
      'Install the extension and capture any digital process once.',
    );
    expect(FIRST_RUN_STEPS[1]!.body).toBe(
      'We time it, find the steps, and flag variation automatically.',
    );
    expect(FIRST_RUN_STEPS[2]!.body).toBe('See where to standardize or automate.');
  });
});

describe('FirstRunTutorial: orientation + CTA copy', () => {
  it('the heading orients the newcomer to "how Ledgerium works"', () => {
    expect(FIRST_RUN_HEADING.toLowerCase()).toContain('how ledgerium works');
  });

  it('the lead is the honest one-line purpose statement', () => {
    const lc = FIRST_RUN_LEAD.toLowerCase();
    expect(lc).toContain('record');
    expect(lc).toContain('cycle time');
    expect(lc).toContain('variation');
  });

  it('the primary CTA points at the real first action (install)', () => {
    expect(FIRST_RUN_PRIMARY_CTA.toLowerCase()).toContain('install the extension');
  });

  it('the secondary CTA preserves the real upload path', () => {
    expect(FIRST_RUN_SECONDARY_CTA.toLowerCase()).toContain('upload a recording');
  });
});

describe('FirstRunTutorial: HONESTY guardrails (no fabricated content)', () => {
  it('no copy fabricates stats, benchmarks, social proof, or LSS theater', () => {
    const allCopy = [
      FIRST_RUN_HEADING,
      FIRST_RUN_LEAD,
      FIRST_RUN_PRIMARY_CTA,
      FIRST_RUN_SECONDARY_CTA,
      ...FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`),
    ]
      .join(' ')
      .toLowerCase();
    for (const forbidden of [
      'benchmark',
      'sigma',
      'dpmo',
      'industry average',
      'trusted by',
      'thousands of',
      'roi',
      'guaranteed',
      'save %',
      'best-in-class',
    ]) {
      expect(allCopy).not.toContain(forbidden);
    }
  });

  it('contains no numeric stat / percentage claim (observed-only, no numbers fabricated)', () => {
    const body = [
      FIRST_RUN_HEADING,
      FIRST_RUN_LEAD,
      ...FIRST_RUN_STEPS.map((s) => s.body),
    ].join(' ');
    // No "42%", "10x", "1,000+" style fabricated figures anywhere in the body.
    expect(body).not.toMatch(/\d+\s*%/);
    expect(body).not.toMatch(/\d+\s*x\b/i);
  });
});
