#!/usr/bin/env node
/**
 * IMPROVEMENT_BACKLOG.md integrity checks.
 *
 * Why this exists: the backlog is maintained by ad-hoc scripts, and three
 * separate times that has silently corrupted it in ways no test caught.
 *
 *   - MR-030: nine rows were closed in the iteration narrative and never
 *     struck, so finished work kept ranking as outstanding.
 *   - Loop 44: nine *struck* rows still carried `open` in their status cell,
 *     because a closure script appended cells instead of replacing them.
 *   - Loop 47: re-scoring two rows by cell position corrupted one of them,
 *     overwriting its score and birth-iter cells, because different rows have
 *     different cell counts. Caught by hand, seconds after doing it.
 *
 * Each failure had the same shape: a script assumed a row layout, the
 * assumption was wrong for some rows, and nothing checked afterwards. This
 * checks afterwards.
 *
 * Specified in docs/meta/MR_031_META_REVIEW.md section 3.1. Deliberately NOT a
 * vitest test: vitest.config.ts only includes packages/&#42;/src and apps/&#42;/src, so a
 * root-level test file would silently never run.
 *
 * Usage:  node scripts/validate-backlog.mjs [--ratchet]
 *   exit 0 = clean, exit 1 = violations found.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = join(ROOT, 'IMPROVEMENT_BACKLOG.md');
const ITERATION_LOG = join(ROOT, 'ITERATION_LOG.md');

/**
 * V2 ratchet. Rows whose cell count is wrong because their prose contains an
 * unescaped `|` (typically a TypeScript union type). Pre-existing; the check
 * fails only if the count GROWS, so the debt cannot deepen while it is paid
 * down. Update this number downward as rows are fixed — never upward.
 */
const MALFORMED_ROW_BUDGET = 19;

/**
 * V3 ratchets. The backlog spans several eras of row format: older rows record
 * the score as a bare number rather than `**N**`, and a number of rows have an
 * arithmetic mismatch between their dimensions and their recorded score that
 * predates this script. Both are budgets, not assertions — they fail only if
 * the count GROWS, which is what catches a fresh corruption without demanding a
 * 90-row cleanup first. Lower these as rows are fixed; never raise them.
 */
const LEGACY_SCORELESS_BUDGET = 62;
const SCORE_MISMATCH_BUDGET = 13;

/** The historical table at the end has different columns and is not parsed. */
const END_MARKER = '### Completed (historical)';

/** A backlog row: `| 123 | ... |`, struck or not. */
const ROW_RE = /^\|\s*(~~)?\s*(\d+)\s*(~~)?\s*\|/;
/** Exact-match only. A substring test matches "sidebar is open". */
const OPEN_STATUS_RE = /^\*{0,2}\s*(open|new|proposed)\s*\*{0,2}$/i;
const CANONICAL_CELL_COUNT = 15; // '' + 13 cells + ''

function parseRows(fullText) {
  const cut = fullText.indexOf(END_MARKER);
  const text = cut === -1 ? fullText : fullText.slice(0, cut);
  const rows = [];
  text.split('\n').forEach((line, i) => {
    const m = ROW_RE.exec(line);
    if (!m) return;
    const cells = line.split('|');
    rows.push({
      lineNo: i + 1,
      id: Number(m[2]),
      struck: Boolean(m[1]),
      cells,
      // Status is the last non-empty cell, wherever cell drift has left it.
      status: [...cells].reverse().find((c) => c.trim() !== '')?.trim() ?? '',
    });
  });
  return rows;
}

const violations = [];
const backlog = readFileSync(BACKLOG, 'utf8');
const rows = parseRows(backlog);

if (rows.length === 0) {
  console.error('validate-backlog: parsed 0 rows — the format changed, or this script is broken.');
  process.exit(1);
}

// ── V1: a struck row must not still read as open ─────────────────────────────
for (const r of rows) {
  if (r.struck && OPEN_STATUS_RE.test(r.status)) {
    violations.push(
      `V1  line ${r.lineNo}  #${r.id} is struck but its status cell reads "${r.status}". ` +
        `A sweep reading status would count finished work as outstanding.`,
    );
  }
}

// ── V3: exactly one score cell, and it equals I+A+L+C-E-R ────────────────────
// This is the check that would have caught the loop-47 corruption: rewriting
// cells by position put the score in the birth-iter column, leaving a row whose
// arithmetic no longer added up.
const scoreless = [];
const mismatched = [];
for (const r of rows) {
  const scoreIdx = r.cells
    .map((c, i) => (/^\s*\*\*\d{1,2}\*\*\s*$/.test(c) ? i : -1))
    .filter((i) => i !== -1);
  if (scoreIdx.length === 0) {
    scoreless.push(`#${r.id}`); // legacy era: bare number, not **N**
    continue;
  }
  if (scoreIdx.length > 1) {
    violations.push(
      `V3  line ${r.lineNo}  #${r.id} has ${scoreIdx.length} score cells (expected exactly 1). ` +
        `Usually means a cell was overwritten by position.`,
    );
    continue;
  }
  const s = scoreIdx[0];
  const dims = r.cells.slice(s - 6, s).map((c) => c.trim());
  if (dims.length !== 6 || !dims.every((d) => /^\d$/.test(d))) continue; // legacy shape
  const [I, A, L, C, E, R] = dims.map(Number);
  const expected = I + A + L + C - E - R;
  const actual = Number(r.cells[s].replace(/[^\d]/g, ''));
  if (expected !== actual) {
    mismatched.push(
      `#${r.id} (line ${r.lineNo}): ${actual} vs ${I}+${A}+${L}+${C}-${E}-${R}=${expected}`,
    );
  }
}
if (scoreless.length > LEGACY_SCORELESS_BUDGET) {
  violations.push(
    `V3  ${scoreless.length} rows have no bold score cell, over the budget of ` +
      `${LEGACY_SCORELESS_BUDGET}: ${scoreless.join(', ')}`,
  );
}
if (mismatched.length > SCORE_MISMATCH_BUDGET) {
  violations.push(
    `V3  ${mismatched.length} rows have a score that does not match their dimensions, over the ` +
      `budget of ${SCORE_MISMATCH_BUDGET}:\n      ${mismatched.join('\n      ')}`,
  );
}

// ── V4: a row named as closed in ITERATION_LOG.md must be struck ─────────────
// This is the MR-030 mechanism: closed in the narrative, never struck here.
const log = readFileSync(ITERATION_LOG, 'utf8');
const struckIds = new Set(rows.filter((r) => r.struck).map((r) => r.id));
const knownIds = new Set(rows.map((r) => r.id));
const claimedClosed = new Set();
for (const m of log.matchAll(/(?:row\s+)?#(\d+)\s+(?:is\s+)?(?:CLOSED|closed)\b/g)) {
  claimedClosed.add(Number(m[1]));
}
for (const id of [...claimedClosed].sort((a, b) => a - b)) {
  if (!knownIds.has(id)) continue; // renumbered or never existed
  if (!struckIds.has(id)) {
    violations.push(
      `V4  #${id} is described as closed in ITERATION_LOG.md but is not struck in the backlog.`,
    );
  }
}

// ── V2 (ratchet): rows whose cell count is off ───────────────────────────────
const malformed = rows.filter((r) => r.cells.length !== CANONICAL_CELL_COUNT);
if (malformed.length > MALFORMED_ROW_BUDGET) {
  violations.push(
    `V2  ${malformed.length} rows have a non-canonical cell count, over the budget of ` +
      `${MALFORMED_ROW_BUDGET}. New offenders: ${malformed.map((r) => `#${r.id}`).join(', ')}. ` +
      `Escape literal "|" in prose as "\\|".`,
  );
}

// ── Report ───────────────────────────────────────────────────────────────────
const summary =
  `validate-backlog: ${rows.length} rows, ${struckIds.size} struck, ` +
  `${malformed.length}/${MALFORMED_ROW_BUDGET} malformed-row budget used`;

if (violations.length > 0) {
  console.error(`${summary}\n`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(`\n${violations.length} violation(s).`);
  process.exit(1);
}

console.log(`${summary} — clean`);
if (process.argv.includes('--ratchet') && malformed.length < MALFORMED_ROW_BUDGET) {
  console.log(
    `note: malformed rows are down to ${malformed.length}; lower MALFORMED_ROW_BUDGET to match.`,
  );
}
