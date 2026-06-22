/**
 * reportMeta — pure, deterministic, hydration-safe derivations for the R-D
 * stakeholder-deliverable layer (print/PDF header + footer + grouped section nav).
 *
 * Determinism + hydration-safety contract (identical to reportVerdict /
 * reportScorecard / reportEvidence):
 *   - NO Date.now(), NO Math.random(), NO now-relative `new Date()`, NO LLM,
 *     NO network, NO env reads.
 *   - Same input → byte-identical output (SSR === client).
 *   - The footer/header date is derived from a REAL recorded timestamp
 *     (workflow.createdAt), UTC-pinned via `timeZone: 'UTC'` so server and client
 *     render the same string. It is a SINGLE recorded date — never a fabricated
 *     first→last range (per ARCH_RD_DECISIONS §4.2: the report has no per-run
 *     start/end timestamps in props, so a multi-run range cannot be honestly
 *     sourced in R-D; that is deferred to the R-E contract-unify pass).
 *
 * Honesty contract (per GROWTH_RD_COPY §3 + §6c):
 *   - Single-run variant must NOT use cross-run language.
 *   - If the timestamp is null/empty, render "—" — never a guessed date.
 */

import { SECTION_IDS } from './reportSections.js';

/**
 * Format a recorded ISO date string to "Jun 14, 2026", UTC-pinned so SSR === CSR.
 * Returns "—" for any null/empty/unparseable input (honesty: never guess a date).
 *
 * Mirrors the proven hydration-safe idiom (ReportTab.tsx) — value-driven, no
 * clock dependency, fixed timeZone.
 */
export function formatRecordedDate(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || iso.trim().length === 0) return '—';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export interface ReportMetaInput {
  /** intelligence?.metrics?.runCount ?? 1 — same value used throughout the report. */
  runCount: number;
  /** workflow.createdAt — the single recorded date (deterministic, server-set). */
  createdAt: string | null | undefined;
}

export interface ReportMeta {
  /** runCount, floored to ≥1 (a report always reflects ≥1 recorded run). */
  runCount: number;
  /** True when ≥2 recorded runs — gates cross-run language. */
  isMultiRun: boolean;
  /** Single recorded date, UTC-pinned ("Jun 14, 2026") or "—". */
  recordedDate: string;
  /** Print/PDF footer line 1 (run count + date + Ledgerium AI). */
  footerLine1: string;
  /** Print/PDF footer line 2 (honesty disclosure; single-run vs multi-run). */
  footerLine2: string;
  /** Screen footer text (single line). */
  screenFooter: string;
  /** Report sub-header line below the title (run count · Evidence-linked · date). */
  subHeader: string;
}

/**
 * Build the deterministic, honest report metadata strings (exact GROWTH copy).
 *
 * Single-run vs multi-run variants differ ONLY in wording — the date is always a
 * single recorded date, never a fabricated range. Cross-run language ("record
 * again to enable cross-run analysis") appears only in the single-run variant per
 * the honesty invariant.
 */
export function buildReportMeta(input: ReportMetaInput): ReportMeta {
  const rawCount =
    typeof input.runCount === 'number' && Number.isFinite(input.runCount)
      ? Math.floor(input.runCount)
      : 1;
  const runCount = rawCount >= 1 ? rawCount : 1;
  const isMultiRun = runCount >= 2;
  const recordedDate = formatRecordedDate(input.createdAt);

  // ── Print/PDF footer — exact GROWTH §3 strings ───────────────────────────────
  const footerLine1 = isMultiRun
    ? `Generated from ${runCount} recorded runs · ${recordedDate} · Ledgerium AI`
    : `Generated from 1 recorded run · ${recordedDate} · Ledgerium AI`;
  const footerLine2 = isMultiRun
    ? 'All figures derived from observed behavior — no benchmarks, no modeled estimations.'
    : 'All figures reflect a single observed session — record again to enable cross-run analysis.';

  // ── Screen footer — exact GROWTH §5e string ──────────────────────────────────
  const screenFooter = `Generated from ${runCount} recorded run${
    runCount === 1 ? '' : 's'
  } · All figures derived from observed behavior · Ledgerium AI`;

  // ── Report sub-header — exact GROWTH §4 strings (single recorded date) ────────
  const subHeader = isMultiRun
    ? `Based on ${runCount} recorded runs · Evidence-linked · ${recordedDate}`
    : `Based on 1 recorded run · Evidence-linked · ${recordedDate}`;

  return {
    runCount,
    isMultiRun,
    recordedDate,
    footerLine1,
    footerLine2,
    screenFooter,
    subHeader,
  };
}

// ── Grouped section nav (UX_RD_PRINT_SPEC §4.2 / §4.5) ───────────────────────────

export interface SectionGroup {
  label: string;
  ids: readonly string[];
}

/**
 * Canonical grouping of the report's section IDs into the four reader-facing
 * categories (Summary / Health & Spread / Evidence / Actions). Drives BOTH the
 * right-rail navigator and the mobile TOC. A group renders only when at least one
 * of its IDs is present in `visibleSections` (the source of truth for visibility).
 *
 * INVARIANT (covered by a unit test): every id in SECTION_IDS appears in exactly
 * one group — no orphans, no duplicates — so the grouped nav never silently drops
 * a visible section.
 */
export const SECTION_GROUPS: readonly SectionGroup[] = [
  // Wave 1 lead-first: the "Start Here" action callout (rpt-lead) renders directly
  // under the verdict, before the scorecard — nav order matches the new DOM order.
  { label: 'Summary', ids: ['rpt-verdict', 'rpt-lead', 'rpt-scorecard', 'rpt-hero'] },
  {
    label: 'Health & Spread',
    ids: ['rpt-distribution', 'rpt-consistency', 'rpt-variance', 'rpt-drift'],
  },
  {
    label: 'Evidence',
    ids: [
      'rpt-insight-cards',
      'rpt-bottlenecks',
      'rpt-timestudy',
      'rpt-insights',
      'rpt-steps',
      'rpt-structure',
      'rpt-rework',
      'rpt-scores',
      'rpt-phases',
      'rpt-metrics',
    ],
  },
  {
    label: 'Actions',
    ids: ['rpt-automation', 'rpt-roi', 'rpt-agents', 'rpt-skills', 'rpt-integrations', 'rpt-roadmap'],
  },
] as const;

/**
 * Given the visible section IDs (the report's source of truth), return the groups
 * that have ≥1 visible entry, each carrying only its visible IDs in canonical
 * order. Empty groups are omitted entirely (no label, no separator).
 */
export function groupVisibleSections(
  visibleSections: readonly string[],
): Array<{ label: string; ids: string[] }> {
  const visible = new Set(visibleSections);
  const out: Array<{ label: string; ids: string[] }> = [];
  for (const group of SECTION_GROUPS) {
    const ids = group.ids.filter((id) => visible.has(id));
    if (ids.length > 0) out.push({ label: group.label, ids: [...ids] });
  }
  return out;
}

/** Re-export so callers (and the coverage test) reference one source of truth. */
export { SECTION_IDS };
