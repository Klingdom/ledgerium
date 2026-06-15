import { describe, it, expect } from 'vitest';
import {
  formatRecordedDate,
  buildReportMeta,
  SECTION_GROUPS,
  groupVisibleSections,
  SECTION_IDS,
} from './reportMeta';

// ── formatRecordedDate — deterministic, UTC-pinned, honest ─────────────────────

describe('formatRecordedDate', () => {
  it('formats an ISO date as a single UTC-pinned recorded date', () => {
    // 2026-06-14 UTC midnight → "Jun 14, 2026" regardless of the host timezone.
    expect(formatRecordedDate('2026-06-14T00:00:00.000Z')).toBe('Jun 14, 2026');
  });

  it('is UTC-pinned: a late-UTC timestamp does not roll into the next/prev day', () => {
    // 23:30 UTC must still read Jun 14 (no local-timezone shift to Jun 13/15).
    expect(formatRecordedDate('2026-06-14T23:30:00.000Z')).toBe('Jun 14, 2026');
    expect(formatRecordedDate('2026-06-14T00:30:00.000Z')).toBe('Jun 14, 2026');
  });

  it('is deterministic — same input yields byte-identical output', () => {
    const a = formatRecordedDate('2026-03-14T12:00:00.000Z');
    const b = formatRecordedDate('2026-03-14T12:00:00.000Z');
    expect(a).toBe(b);
    expect(a).toBe('Mar 14, 2026');
  });

  it('returns "—" for null / empty / unparseable input (never a guessed date)', () => {
    expect(formatRecordedDate(null)).toBe('—');
    expect(formatRecordedDate(undefined)).toBe('—');
    expect(formatRecordedDate('')).toBe('—');
    expect(formatRecordedDate('   ')).toBe('—');
    expect(formatRecordedDate('not-a-date')).toBe('—');
  });
});

// ── buildReportMeta — single-run vs multi-run honesty + exact GROWTH copy ───────

describe('buildReportMeta', () => {
  const createdAt = '2026-06-14T08:00:00.000Z';

  it('single-run: uses a single recorded date and NO cross-run language', () => {
    const meta = buildReportMeta({ runCount: 1, createdAt });
    expect(meta.isMultiRun).toBe(false);
    expect(meta.runCount).toBe(1);
    expect(meta.recordedDate).toBe('Jun 14, 2026');
    expect(meta.footerLine1).toBe(
      'Generated from 1 recorded run · Jun 14, 2026 · Ledgerium AI',
    );
    expect(meta.footerLine2).toBe(
      'All figures reflect a single observed session — record again to enable cross-run analysis.',
    );
    expect(meta.subHeader).toBe('Based on 1 recorded run · Evidence-linked · Jun 14, 2026');
    expect(meta.screenFooter).toBe(
      'Generated from 1 recorded run · All figures derived from observed behavior · Ledgerium AI',
    );
    // Honesty: single-run footer/sub-header must never imply a cross-run range.
    expect(meta.footerLine1).not.toContain('runs');
    expect(meta.footerLine1).not.toMatch(/–|—.*\d{4}.*–/); // no date range
  });

  it('multi-run: pluralizes runs, uses the observed-behavior disclosure, single date', () => {
    const meta = buildReportMeta({ runCount: 16, createdAt });
    expect(meta.isMultiRun).toBe(true);
    expect(meta.runCount).toBe(16);
    expect(meta.footerLine1).toBe(
      'Generated from 16 recorded runs · Jun 14, 2026 · Ledgerium AI',
    );
    expect(meta.footerLine2).toBe(
      'All figures derived from observed behavior — no benchmarks, no modeled estimations.',
    );
    expect(meta.subHeader).toBe('Based on 16 recorded runs · Evidence-linked · Jun 14, 2026');
    expect(meta.screenFooter).toBe(
      'Generated from 16 recorded runs · All figures derived from observed behavior · Ledgerium AI',
    );
    // It is a SINGLE recorded date — never a fabricated first→last range.
    expect(meta.footerLine1).not.toContain('–');
    expect(meta.footerLine1.match(/\d{4}/g)?.length).toBe(1);
  });

  it('floors non-finite / sub-1 run counts to 1 (single-run wording)', () => {
    expect(buildReportMeta({ runCount: 0, createdAt }).runCount).toBe(1);
    expect(buildReportMeta({ runCount: NaN, createdAt }).runCount).toBe(1);
    expect(buildReportMeta({ runCount: -3, createdAt }).runCount).toBe(1);
    expect(buildReportMeta({ runCount: 0, createdAt }).isMultiRun).toBe(false);
  });

  it('renders "—" for a missing recorded date without fabricating one', () => {
    const meta = buildReportMeta({ runCount: 4, createdAt: null });
    expect(meta.recordedDate).toBe('—');
    expect(meta.footerLine1).toBe('Generated from 4 recorded runs · — · Ledgerium AI');
  });

  it('is deterministic — same input → byte-identical meta', () => {
    const a = buildReportMeta({ runCount: 7, createdAt });
    const b = buildReportMeta({ runCount: 7, createdAt });
    expect(a).toEqual(b);
  });
});

// ── SECTION_GROUPS coverage — every SECTION_ID is grouped exactly once ──────────

describe('SECTION_GROUPS coverage', () => {
  it('covers every SECTION_ID exactly once (no orphans, no duplicates)', () => {
    const grouped = SECTION_GROUPS.flatMap((g) => g.ids);
    // No duplicates across groups.
    expect(new Set(grouped).size).toBe(grouped.length);
    // Every SECTION_ID appears.
    for (const id of SECTION_IDS) {
      expect(grouped).toContain(id);
    }
    // No group references an unknown id.
    const known = new Set<string>(SECTION_IDS);
    for (const id of grouped) {
      expect(known.has(id)).toBe(true);
    }
    // Exact bijection: grouped set === SECTION_IDS set.
    expect(new Set(grouped)).toEqual(new Set(SECTION_IDS));
  });

  it('uses the four canonical reader-facing group labels in order', () => {
    expect(SECTION_GROUPS.map((g) => g.label)).toEqual([
      'Summary',
      'Health & Spread',
      'Evidence',
      'Actions',
    ]);
  });
});

describe('groupVisibleSections', () => {
  it('returns only groups with ≥1 visible id, in canonical id order', () => {
    const groups = groupVisibleSections(['rpt-scorecard', 'rpt-verdict', 'rpt-bottlenecks']);
    expect(groups.map((g) => g.label)).toEqual(['Summary', 'Evidence']);
    // Summary keeps canonical order (verdict before scorecard) regardless of input order.
    expect(groups[0]!.ids).toEqual(['rpt-verdict', 'rpt-scorecard']);
    expect(groups[1]!.ids).toEqual(['rpt-bottlenecks']);
  });

  it('omits empty groups entirely', () => {
    const groups = groupVisibleSections(['rpt-verdict']);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe('Summary');
  });

  it('returns [] when nothing is visible', () => {
    expect(groupVisibleSections([])).toEqual([]);
  });

  it('ignores unknown ids without throwing', () => {
    const groups = groupVisibleSections(['rpt-verdict', 'rpt-nonexistent']);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.ids).toEqual(['rpt-verdict']);
  });
});
