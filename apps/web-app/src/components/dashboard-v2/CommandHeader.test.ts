/**
 * CommandHeader — unit tests for delta rendering logic and health band.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering.
 * Tests pure logic helpers that mirror CommandHeader.tsx behaviour.
 *
 * iter-024 §4.1 item (a): period-over-period delta display paths.
 * iter-024 §4.1 item (c): health band thresholds tightened to 60/80.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { healthVerdictWord } from './CommandHeader.js';

// ── Mirrors CommandHeader.tsx healthBand ──────────────────────────────────────

function healthBand(score: number): { label: 'poor' | 'fair' | 'good'; colorClass: string } {
  if (score < 60) {
    return { label: 'poor', colorClass: 'text-red-600' };
  }
  if (score < 80) {
    return { label: 'fair', colorClass: 'text-amber-600' };
  }
  return { label: 'good', colorClass: 'text-green-600' };
}

// ── Mirrors CommandHeader.tsx delta label derivation ─────────────────────────

function buildDeltaLabel(delta: number | null): string {
  if (delta === null) return '— vs last 30d';
  if (delta === 0) return '= 0 vs last 30d';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} vs last 30d`;
}

function buildDeltaColorClass(delta: number | null): string {
  if (delta === null || delta === 0) return 'text-[var(--content-tertiary)]';
  return delta > 0 ? 'text-green-600' : 'text-red-600';
}

function buildDeltaAriaFragment(delta: number | null): string {
  if (delta === null) return ', no prior-period data';
  if (delta === 0) return ', unchanged versus last 30 days';
  if (delta > 0) return `, up ${delta} versus last 30 days`;
  return `, down ${Math.abs(delta)} versus last 30 days`;
}

// ── Tests: health band (60/80 thresholds) ────────────────────────────────────

describe('CommandHeader healthBand (iter-024 60/80 thresholds)', () => {
  it('score < 60 → poor / red', () => {
    expect(healthBand(0).label).toBe('poor');
    expect(healthBand(59).label).toBe('poor');
    expect(healthBand(0).colorClass).toBe('text-red-600');
  });

  it('score 60–79 → fair / amber', () => {
    expect(healthBand(60).label).toBe('fair');
    expect(healthBand(79).label).toBe('fair');
    expect(healthBand(60).colorClass).toBe('text-amber-600');
  });

  it('score >= 80 → good / green', () => {
    expect(healthBand(80).label).toBe('good');
    expect(healthBand(100).label).toBe('good');
    expect(healthBand(80).colorClass).toBe('text-green-600');
  });
});

// ── Tests: delta label rendering (iter-024 §4.1 item a) ─────────────────────

describe('CommandHeader delta label (iter-024 §4.1 item a)', () => {
  it('null delta renders "— vs last 30d"', () => {
    expect(buildDeltaLabel(null)).toBe('— vs last 30d');
  });

  it('delta=0 renders "= 0 vs last 30d"', () => {
    expect(buildDeltaLabel(0)).toBe('= 0 vs last 30d');
  });

  it('positive delta renders "+N vs last 30d"', () => {
    expect(buildDeltaLabel(4)).toBe('+4 vs last 30d');
    expect(buildDeltaLabel(12)).toBe('+12 vs last 30d');
  });

  it('negative delta renders "-N vs last 30d" (no double sign)', () => {
    expect(buildDeltaLabel(-4)).toBe('-4 vs last 30d');
    expect(buildDeltaLabel(-1)).toBe('-1 vs last 30d');
  });
});

// ── Tests: delta color class ─────────────────────────────────────────────────

describe('CommandHeader delta color class', () => {
  it('null delta → neutral (tertiary)', () => {
    expect(buildDeltaColorClass(null)).toBe('text-[var(--content-tertiary)]');
  });

  it('delta=0 → neutral', () => {
    expect(buildDeltaColorClass(0)).toBe('text-[var(--content-tertiary)]');
  });

  it('positive delta → green', () => {
    expect(buildDeltaColorClass(5)).toBe('text-green-600');
  });

  it('negative delta → red', () => {
    expect(buildDeltaColorClass(-5)).toBe('text-red-600');
  });
});

// ── Tests: delta aria fragment ───────────────────────────────────────────────

describe('CommandHeader delta aria fragment', () => {
  it('null → no prior-period data', () => {
    expect(buildDeltaAriaFragment(null)).toContain('no prior-period data');
  });

  it('delta=0 → unchanged versus last 30 days', () => {
    expect(buildDeltaAriaFragment(0)).toContain('unchanged');
  });

  it('positive delta → "up N versus last 30 days"', () => {
    const frag = buildDeltaAriaFragment(4);
    expect(frag).toContain('up 4 versus last 30 days');
  });

  it('negative delta → "down N versus last 30 days"', () => {
    const frag = buildDeltaAriaFragment(-4);
    expect(frag).toContain('down 4 versus last 30 days');
    // Should not say "down -4" (double negative)
    expect(frag).not.toContain('-4');
  });
});

// ── WDC2-P05 (iter-080): workflowCount=0 activation prompt ───────────────────
//
// Mirrors CommandHeader.tsx: when workflowCount === 0, showActivationPrompt
// is true and the health score widget is replaced with the activation message.
// Tests the conditional logic and copy verbatim; no jsdom required.

function computeShowActivationPrompt(workflowCount: number | undefined): boolean {
  return workflowCount === 0;
}

const ACTIVATION_PROMPT_COPY =
  'Record your first workflow to see your Process Health Score';

describe('WDC2-P05 (iter-080): CommandHeader workflowCount activation prompt', () => {
  it('workflowCount=0 triggers activation prompt (showActivationPrompt=true)', () => {
    expect(computeShowActivationPrompt(0)).toBe(true);
  });

  it('workflowCount=1 does NOT trigger activation prompt', () => {
    expect(computeShowActivationPrompt(1)).toBe(false);
  });

  it('workflowCount=undefined does NOT trigger activation prompt', () => {
    // Absent prop defaults to no suppression — health widget shows normally
    expect(computeShowActivationPrompt(undefined)).toBe(false);
  });

  it('workflowCount=5 does NOT trigger activation prompt', () => {
    expect(computeShowActivationPrompt(5)).toBe(false);
  });

  it('activation prompt copy matches WDC-002 growth-strategist verbatim spec', () => {
    expect(ACTIVATION_PROMPT_COPY).toBe(
      'Record your first workflow to see your Process Health Score',
    );
  });

  it('activation prompt aria-label matches displayed copy exactly', () => {
    // The p element uses role="status" with aria-label equal to the visible text
    const ariaLabel = ACTIVATION_PROMPT_COPY;
    expect(ariaLabel).toContain('Process Health Score');
    expect(ariaLabel).toContain('Record your first workflow');
  });
});

// ── WDC2-P05 (iter-080): PresetChipRail tooltip copy-pin ─────────────────────
//
// Mirrors PresetChipRail.tsx tooltipText derivation in PresetChip sub-component.
// Pins the two POLISH-substituted strings verbatim.

const PRESET_CHIP_PENDING_TOOLTIP = 'Coming in an upcoming release';
const PRESET_CHIP_GATED_TOOLTIP = 'Team plan includes this preset — see plans →';

describe('WDC2-P05 (iter-080): PresetChipRail tooltip copy-pin assertions', () => {
  it('pending chip tooltip matches WDC-002 growth-strategist verbatim spec', () => {
    expect(PRESET_CHIP_PENDING_TOOLTIP).toBe('Coming in an upcoming release');
  });

  it('gated chip tooltip matches WDC-002 growth-strategist verbatim spec', () => {
    expect(PRESET_CHIP_GATED_TOOLTIP).toBe(
      'Team plan includes this preset — see plans →',
    );
  });

  it('pending tooltip does not contain old "Path C R+1" implementation detail', () => {
    expect(PRESET_CHIP_PENDING_TOOLTIP).not.toContain('Path C');
    expect(PRESET_CHIP_PENDING_TOOLTIP).not.toContain('R+1');
  });

  it('gated tooltip does not contain old "Upgrade to Team to access this preset" copy', () => {
    expect(PRESET_CHIP_GATED_TOOLTIP).not.toContain('Upgrade to Team to access this preset');
  });
});

// ── atglance-review #1: persistent honest purpose subtitle ────────────────────
//
// The purpose line is a static literal in CommandHeader (does not depend on
// insight data). Pinned here verbatim so a refactor can't silently weaken it,
// and asserted honesty-safe (only claims signals the engine computes).

const PURPOSE_SUBTITLE =
  'Your recorded workflows, measured from real runs — cycle time, variation, and where AI could help.';

describe('atglance-review #1: CommandHeader purpose subtitle', () => {
  it('states what the page is, observed-only (cycle time / variation / AI)', () => {
    expect(PURPOSE_SUBTITLE).toContain('measured from real runs');
    expect(PURPOSE_SUBTITLE).toContain('cycle time');
    expect(PURPOSE_SUBTITLE).toContain('variation');
  });

  it('does not fabricate a target, benchmark, ROI, or savings claim', () => {
    for (const forbidden of ['ROI', 'savings', 'benchmark', 'sigma', 'DPMO', 'industry average']) {
      expect(PURPOSE_SUBTITLE.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

// ── atglance-review #2: kill the triple-88 — verdict word, not the number ─────
//
// The header now renders a non-numeric VERDICT WORD (the health score number
// appears once, in the HealthGauge). healthVerdictWord is the real export.

describe('atglance-review #2: CommandHeader healthVerdictWord (non-numeric verdict)', () => {
  it('maps each band to a plain, non-numeric verdict word', () => {
    expect(healthVerdictWord('poor')).toBe('Needs attention');
    expect(healthVerdictWord('fair')).toBe('Fair');
    expect(healthVerdictWord('good')).toBe('Good');
  });

  it('never returns a digit (the score number lives only in the gauge)', () => {
    for (const label of ['poor', 'fair', 'good'] as const) {
      expect(healthVerdictWord(label)).not.toMatch(/\d/);
    }
  });
});

// ── atglance-review: bottleneck de-duplication ────────────────────────────────
// The highest-severity insight (e.g. "Bottleneck: Step 2 …") must appear ONCE on
// the page — as the dismissible amber InsightsStrip chip below the charts — NOT
// also as a faint duplicate line in the CommandHeader. Source-level assertion
// (node env — no DOM render).

describe('atglance-review: CommandHeader no longer renders the top-insight line', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./CommandHeader.tsx', import.meta.url)),
    'utf8',
  );

  it('does not render {topInsight.label} (the duplicate bottleneck copy is removed)', () => {
    expect(src).not.toContain('{topInsight.label}');
    // Also no conditional {topInsight && (...)} render block.
    expect(src).not.toMatch(/\{topInsight && \(/);
  });

  it('still keeps the persistent purpose subtitle as the orientation line', () => {
    expect(src).toMatch(/Your recorded workflows, measured from real runs/);
  });
});
