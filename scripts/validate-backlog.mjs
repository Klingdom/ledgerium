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
 *     different cell counts. One of the two was caught by hand; the other —
 *     #107 — shipped to HEAD in the same commit as this validator, which
 *     reported the file clean. See docs/meta/MR_032_META_REVIEW.md §1 / §3.
 *
 * Each failure had the same shape: a script assumed a row layout, the
 * assumption was wrong for some rows, and nothing checked afterwards. This
 * checks afterwards — but "checks afterwards" is not the same as "catches
 * everything afterwards." In particular: V4 below can only see a row that
 * ITERATION_LOG.md actually names as closed. The MR-030 mechanism — work
 * shipped by some loop that never mentioned the row number at all — leaves
 * nothing in the log to parse, and no check in this file can detect it. That
 * class is only caught by periodic auditing of the pool against the shipped
 * code, not by this script.
 *
 * Specified in docs/meta/MR_031_META_REVIEW.md section 3.1; the V3 and V1
 * gaps described above were closed per docs/meta/MR_032_META_REVIEW.md §3.
 * Deliberately NOT a vitest test: vitest.config.ts only includes
 * packages/&#42;/src and apps/&#42;/src, so a root-level test file would
 * silently never run.
 *
 * Usage:  node scripts/validate-backlog.mjs
 *   exit 0 = clean, exit 1 = violations found.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Path overrides exist only so scripts/validate-backlog.test.mjs can run this
// script against fixtures. CI and the coordinator never set them.
const BACKLOG = process.env.VALIDATE_BACKLOG_FILE ?? join(ROOT, 'IMPROVEMENT_BACKLOG.md');
const ITERATION_LOG = process.env.VALIDATE_ITERATION_LOG_FILE ?? join(ROOT, 'ITERATION_LOG.md');

/**
 * V2 baseline (#312). Rows whose cell count is wrong because their prose
 * contains an unescaped `|` (typically a TypeScript union type). Pre-existing.
 * This is a SET OF ROW IDS, not a count: a count let one malformed row be
 * swapped for another and still pass. A malformed row not listed here fails.
 * A listed row that is no longer malformed ALSO fails (stale baseline) — a
 * warning was what the old `--ratchet` note was, and the budget sat at 19
 * unmoved; failing forces the one-line removal into the same commit as the fix.
 * Remove ids as rows are fixed — never add.
 */
const MALFORMED_ROW_BASELINE = [45, 75, 102, 110, 117, 120, 126, 127, 152, 154, 157, 223, 224];

/**
 * V4 baseline (#312). Ids ITERATION_LOG.md says were closed but the backlog
 * does not show struck, at the time V4 was repaired. Reported-but-budgeted: a
 * new mismatch fails, a listed id that is now struck (or gone) fails as stale.
 * Each is a real finding for the owner to resolve, not a verdict that the log
 * is right. Remove ids as resolved — never add.
 */
const V4_MISMATCH_BASELINE = [];

// Test seam only: lets the test file supply its own baselines for fixtures.
const baselineOverride = process.env.VALIDATE_BACKLOG_BASELINE_JSON
  ? JSON.parse(process.env.VALIDATE_BACKLOG_BASELINE_JSON)
  : null;
const MALFORMED_BASELINE = new Set(baselineOverride?.malformed ?? MALFORMED_ROW_BASELINE);
const V4_BASELINE = new Set(baselineOverride?.v4 ?? V4_MISMATCH_BASELINE);

/**
 * V3 ratchets. The backlog spans several eras of row format: older rows record
 * the score as a bare number, or as a struck-through `~~**N**~~` rather than a
 * plain `**N**`, and a number of rows have an arithmetic mismatch between their
 * dimensions and their recorded score that predates this script. Both are
 * budgets, not assertions — they fail only if the count GROWS, which is what
 * catches a fresh corruption without demanding a 90-row cleanup first. Lower
 * these as rows are fixed; never raise them.
 *
 * These budgets do not cover V3a below: a canonical row whose score cell is
 * not at the fixed column it belongs at is reported directly, with no budget,
 * because there is no legitimate row shape that produces it — it is exactly
 * the cell-displacement corruption that shipped as row #107.
 */
const LEGACY_SCORELESS_BUDGET = 58;
const SCORE_MISMATCH_BUDGET = 13;

/** The historical table at the end has different columns and is not parsed. */
const END_MARKER = '### Completed (historical)';

/** A backlog row: `| 123 | ... |`, struck or not. */
const ROW_RE = /^\|\s*(~~)?\s*(\d+)\s*(~~)?\s*\|/;
/** Exact-match only. A substring test matches "sidebar is open". */
const OPEN_STATUS_RE = /^\*{0,2}\s*(open|new|proposed)\s*\*{0,2}$/i;
const CANONICAL_CELL_COUNT = 15; // '' + 13 cells + ''
/** Index of each canonical column within the 15-cell split (see above). */
const COL = { I: 5, A: 6, L: 7, C: 8, E: 9, R: 10, SCORE: 11, BIRTH_ITER: 12 };

function parseRows(fullText) {
  const cut = fullText.indexOf(END_MARKER);
  const text = cut === -1 ? fullText : fullText.slice(0, cut);
  const rows = [];
  text.split('\n').forEach((line, i) => {
    const m = ROW_RE.exec(line);
    if (!m) return;
    // Split on UNESCAPED pipes only, then unescape, so the advice in the V2
    // message ("escape a literal | as \\|") is true. (#312)
    const cells = line.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|'));
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

// ── V1a: an unstruck row must not have a struck-through description ─────────
// Mirror image of V1. Row #62 (and, live on this file, #69) has its
// description wrapped in `~~...~~` — the row's own text was struck when the
// work shipped — but the ID cell was never struck, so a sweep of the ID
// column ranks it as open forever, and its status cell carries whatever the
// closing edit happened to leave there rather than a clean verdict. A
// keyword scan of status/description prose for "closed"/"done"/"shipped" was
// tried and rejected: on the current file it flags 14 rows that are
// legitimately open and merely narrate a *different* row's closure, or their
// own partial completion (e.g. "partially done ... 2/3 leaks closed"). The
// struck-description signal has none of those false positives here, because
// prose incidentally contains those words far more often than it incidentally
// opens with a literal `~~`.
const STRUCK_DESC_RE = /^~~/;
for (const r of rows) {
  if (r.struck) continue;
  const desc = (r.cells[2] ?? '').trim();
  if (STRUCK_DESC_RE.test(desc)) {
    violations.push(
      `V1a line ${r.lineNo}  #${r.id} is not struck but its description cell begins struck-through ` +
        `("${desc.slice(0, 60)}..."). A sweep of the ID column would count finished work as outstanding.`,
    );
  }
}

// ── V3 / V3a: score-cell placement and arithmetic ────────────────────────────
// V3a anchors by absolute column, not by wherever a `**N**`-shaped cell is
// found. The pre-V3a check searched the whole row for that shape and then
// read "dimensions" *relative to* whatever position it found — `slice(s-6,
// s)`. Loop 47's corruption left the bold cell at index 12 (the birth-iter
// column) instead of the canonical index 11, so the scan found it there,
// sliced dimensions from indices 6-11 (reading a 7th, displaced cell as one
// of the six real dimensions), and the resulting arithmetic happened to add
// up: the check validated the corruption against itself, and #107 shipped.
//
// Anchoring to the fixed column instead means: for any row with the
// canonical 15-cell count, the score MUST be at index 11 (COL.SCORE) — a
// `**N**` cell found anywhere else on such a row is reported directly, no
// budget, because that is exactly the displacement shape. Rows with a
// different cell count are V2's problem, not V3a's, and fall back to the
// pre-V3a relative scan so existing detections on that shape are not lost.
const scoreless = [];
const mismatched = [];
for (const r of rows) {
  const scoreIdx = r.cells
    .map((c, i) => (/^\s*\*\*\d{1,2}\*\*\s*$/.test(c) ? i : -1))
    .filter((i) => i !== -1);

  if (scoreIdx.length === 0) {
    scoreless.push(`#${r.id}`); // legacy era: bare number, or `~~**N**~~`, not `**N**`
    continue;
  }
  if (scoreIdx.length > 1) {
    violations.push(
      `V3  line ${r.lineNo}  #${r.id} has ${scoreIdx.length} score cells (expected exactly 1). ` +
        `Usually means a cell was overwritten by position.`,
    );
    continue;
  }

  const isCanonical = r.cells.length === CANONICAL_CELL_COUNT;

  if (isCanonical && scoreIdx[0] !== COL.SCORE) {
    violations.push(
      `V3a line ${r.lineNo}  #${r.id} has its score cell at index ${scoreIdx[0]}, not the canonical ` +
        `index ${COL.SCORE}. The row still has ${CANONICAL_CELL_COUNT} cells, so V2 does not see this, ` +
        `but a cell has been displaced by position — the #107 shape.`,
    );
    continue;
  }

  const s = scoreIdx[0];
  const dims = (isCanonical ? r.cells.slice(COL.I, COL.SCORE) : r.cells.slice(s - 6, s)).map((c) =>
    c.trim(),
  );
  if (dims.length !== 6 || !dims.every((d) => /^\d$/.test(d))) continue; // legacy / struck shape

  if (isCanonical) {
    const birthIter = r.cells[COL.BIRTH_ITER].trim();
    if (birthIter === '') {
      violations.push(
        `V3a line ${r.lineNo}  #${r.id} has clean dimension and score cells but an empty birth-iter ` +
          `cell (index ${COL.BIRTH_ITER}).`,
      );
    }
  }

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
// This is the loop-41 mechanism: a row IS named as closed in the narrative
// (e.g. "#102 is CLOSED"), using the word this regex looks for, but the
// strike never landed on it here. It is NOT the MR-030 mechanism: MR-030's
// nine rows were found by auditing shipped code against row text, and the
// log never named any of them as closed — there was nothing for a log parser
// to find. Tested directly against the log as it stood before MR-030 struck
// those nine rows: this regex matches 0 of the 9. A row closed silently,
// with no mention in ITERATION_LOG.md at all, is invisible to this check and
// to every other check in this file — that class can only be caught by
// periodically auditing the open pool against the code, not by parsing logs.
const log = readFileSync(ITERATION_LOG, 'utf8');
const struckIds = new Set(rows.filter((r) => r.struck).map((r) => r.id));
const knownIds = new Set(rows.map((r) => r.id));
const logWithoutRetractions = log.replace(/~~[\s\S]*?~~/g, '');
// V4 parser (#322). Canonical Follow-ups line format, enforced:
//   <list marker> [**]Follow-ups:[**] ... <N> closed (#a, #b) ...
// marker is "-" or "*"; bold is optional (loop 133 found non-bold lines silently
// skipped); N is digits or a number word ("two closed"). A Follow-ups line that
// says "closed" with N > 0 but gives no "(#id ...)" list is NON-CANONICAL and is
// reported rather than silently skipped.
const NUMBER_WORDS = { zero: 0, no: 0, none: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const FOLLOWUP_LINE = /^\s*[-*]\s*(?:\*\*)?Follow-ups:?(?:\*\*)?:?/i;
const toCount = (t) => (/^\d+$/.test(t) ? Number(t) : NUMBER_WORDS[t.toLowerCase()]);
function parseClaims(text) {
  const claimed = new Set();
  const nonCanonical = [];
  if (process.env.VALIDATE_BACKLOG_V4_SABOTAGE === '1') return { claimed, nonCanonical }; // test seam: simulates a broken parser
  // Form 1 (prose): "#102 is CLOSED", "row #102 closed".
  for (const m of text.matchAll(/(?:row\s+)?#(\d+)(?:\*\*)?\s+(?:is\s+)?(?:CLOSED|closed)\b/g)) claimed.add(Number(m[1]));
  // Form 2 (#312): "Follow-ups: 1 created (#314), two closed (#305, #34)." Ids sit in the
  // parenthesis AFTER "N closed"; N = 0 names a row that did NOT close.
  for (const line of text.split('\n')) {
    if (!FOLLOWUP_LINE.test(line)) continue;
    const m = /\b(\d+|zero|no|none|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+closed\b\s*(?:\(([^)]*)\))?/i.exec(line);
    if (!m) continue;
    if (toCount(m[1]) === 0) continue;
    const ids = [...(m[2] ?? '').matchAll(/#(\d+)/g)];
    // "#228 closed" or "**#228 closed**" on the same line is already read by Form 1.
    if (!ids.length && !/#\d+(?:\*\*)?\s+closed\b/i.test(line)) { nonCanonical.push(line.trim().slice(0, 120)); continue; }
    for (const id of ids) claimed.add(Number(id[1]));
  }
  return { claimed, nonCanonical };
}
// Canary (#322, MR-056/MR-057): V4 has twice matched nothing for months unnoticed.
// Before trusting it on the real log it must detect known fixture claims in each
// supported spelling; otherwise the validator fails.
{
  const fixture = [
    '- **Follow-ups:** 1 created (#9901), 2 closed (#9902, #9903).',
    '- Follow-ups: one closed (#9904).',
    '- **Follow-ups:** 0 closed (#9905 blocked).',
  ].join('\n');
  const got = parseClaims(fixture).claimed;
  if (!(got.has(9902) && got.has(9903) && got.has(9904)) || got.has(9905) || got.has(9901)) {
    violations.push('V4  canary failed: V4 matched nothing (or wrong ids) on a known fixture claim — parser broken.');
  }
}
const { claimed: claimedClosed, nonCanonical: v4NonCanonical } = parseClaims(logWithoutRetractions);
// Grandfathered (#322): one historical line claims "1 closed" with no id and cannot be
// attributed retroactively. Matched by exact prefix; any NEW such line still fails.
const V4_NONCANONICAL_GRANDFATHERED = ['- **Follow-ups:** 7 created, 1 closed. That ratio is terrible'];
for (const l of v4NonCanonical.filter((x) => !V4_NONCANONICAL_GRANDFATHERED.some((g) => x.startsWith(g)))) violations.push(`V4  non-canonical Follow-ups line (says "closed" with no "(#id, ...)" list): ${l}`);
console.log(`V4: parsed ${claimedClosed.size} closure claim(s) from ITERATION_LOG.md.`);
const v4Mismatches = [];
for (const id of [...claimedClosed].sort((a, b) => a - b)) {
  if (!knownIds.has(id)) continue; // renumbered or never existed
  if (!struckIds.has(id)) v4Mismatches.push(id);
}
for (const id of v4Mismatches) {
  if (!V4_BASELINE.has(id)) {
    violations.push(
      `V4  #${id} is described as closed in ITERATION_LOG.md but is not struck in the backlog.`,
    );
  }
}
for (const id of V4_BASELINE) {
  if (!v4Mismatches.includes(id)) {
    violations.push(
      `V4  #${id} is in V4_MISMATCH_BASELINE but no longer mismatches (now struck, unclaimed, or gone). Remove it from the baseline.`,
    );
  }
}

// ── V2 (ratchet): rows whose cell count is off ───────────────────────────────
const malformed = rows.filter((r) => r.cells.length !== CANONICAL_CELL_COUNT);
const newOffenders = malformed.filter((r) => !MALFORMED_BASELINE.has(r.id));
if (newOffenders.length > 0) {
  violations.push(
    `V2  ${newOffenders.length} row(s) have a non-canonical cell count and are not in the baseline. ` +
      `New offenders: ${newOffenders.map((r) => `#${r.id}`).join(', ')}. ` +
      `Escape literal "|" in prose as "\\|".`,
  );
}
const malformedIds = new Set(malformed.map((r) => r.id));
const staleBaseline = [...MALFORMED_BASELINE].filter((id) => !malformedIds.has(id));
if (staleBaseline.length > 0) {
  violations.push(
    `V2  ${staleBaseline.length} baselined row(s) are no longer malformed (or are gone): ` +
      `${staleBaseline.map((id) => `#${id}`).join(', ')}. Remove them from MALFORMED_ROW_BASELINE.`,
  );
}

// ── Pool line (MR-037 → MR-040; applied at MR-040 after four deferrals) ───────
// Replaces the follow-up ratio as the reported health measure. The ratio passed
// in every window since adoption while the pool did not move and the oldest
// rows aged one loop per loop, and both of its terms are written by the agent
// it grades. These three numbers are read from the backlog itself:
//
//   open    — unstruck rows above END_MARKER. (Three reviews measured this by
//             hand over the whole file and were 19 rows high every time,
//             because the historical table sits below the marker.)
//   oldest  — the lowest-numbered unstruck row whose status is not blocked or
//             awaiting a CEO decision. Row numbers are assigned in order, so
//             lowest = oldest, which works for every era of birth-iter format.
//   median  — age at close over the last 10 closures that can be dated: the
//             closing loop from "CLOSED loop N" in the struck row, the birth
//             loop from an "L<N>" birth cell. Rows in older formats are not
//             guessed at; how many were skipped is printed.
const BLOCKED_RE = /blocked|awaiting\s+CEO/i;
const openRows = rows.filter((r) => !r.struck);
const oldest = openRows
  .filter((r) => !BLOCKED_RE.test(r.status))
  .sort((a, b) => a.id - b.id)[0];
/**
 * A row's birth loop, or null if it cannot be dated. Two formats exist:
 * `… L<N>` in the birth cell (loop-era rows), and `iter NNN` in the birth or
 * status cell (iteration-era rows, e.g. `new (iter 001)`). MR-042 §2.2: MR-039's
 * "iter N ≈ loop N" was false — iterations ran to 098 before loop numbering
 * restarted at 1 (ITERATION_LOG.md, 2026-06-26 → 2026-09-14), so iter N is
 * read as loop N − 99. Approximate: the two eras did not run at one cadence. MR-041 §2.2: skipping the second format dropped the two
 * oldest rows ever closed, so the median read YOUNGER in the very window that
 * closed them — a measure flattering itself by what it could not parse.
 */
const ITERATION_ERA_OFFSET = 99;

function birthLoop(r) {
  const cell = r.cells[COL.BIRTH_ITER] ?? '';
  const l = /\bL(\d+)\b/.exec(cell);
  if (l) return Number(l[1]);
  // Birth cell: any `iter N` there is a birth. Status cell: ONLY the two forms
  // that state a birth — `new (iter N` and `(born iter N`. Most status-cell
  // iters are a CLOSING or PLANNED iteration (`done (iter 087 …`, `open
  // (ADM-002 … iter 106`), and reading those as births misdated rows
  // (MR-042 §2.2, left unfixed until MR-043).
  const it = /\biter\s*0*(\d+)\b/i.exec(cell)
    ?? /(?:^\W*new\s*\(\s*|\(born\s+)iter\s*0*(\d+)/i.exec(r.status);
  return it ? Number(it[1]) - ITERATION_ERA_OFFSET : null;
}

let latestClose = 0;
const dated = [];
let undatable = 0;
for (const r of rows.filter((x) => x.struck)) {
  // The LAST "CLOSED loop N" in the row: closure notes are appended, so a row
  // that was closed, reopened and closed again (#256: "[was: CLOSED loop 82",
  // then "RE-CLOSED loop 85") carries its current closure last. Taking the
  // first match aged #256 from its retracted closure — MR-041 §2.2 asked
  // whether multi-loop rows parsed correctly, and this one did not.
  const closures = [...r.cells.join('|').matchAll(/CLOSED\s+(?:at\s+)?loop\s+(\d+)/gi)];
  const closed = closures.length ? closures[closures.length - 1] : null;
  if (!closed) continue;
  const born = birthLoop(r);
  latestClose = Math.max(latestClose, Number(closed[1]));
  if (born === null) { undatable++; continue; }
  dated.push({ id: r.id, close: Number(closed[1]), age: Number(closed[1]) - born });
}
// The latest loop the backlog itself records a closure in. Used only to age the
// oldest OPEN row; stated in the output so it is not mistaken for a clock.
// From every closure, dated or not: an undatable birth says nothing about
// when the row CLOSED (loop 88 closed #9, whose birth is unrecorded, and the
// line read "measured to loop 87").
const latestLoop = latestClose;
const maxAge = dated.length ? Math.max(...dated.map((d) => d.age)) : null;
const lastTen = dated.sort((a, b) => b.close - a.close || b.id - a.id).slice(0, 10).map((d) => d.age).sort((a, b) => a - b);
const median = lastTen.length === 0 ? null
  : lastTen.length % 2 ? lastTen[(lastTen.length - 1) / 2]
  : (lastTen[lastTen.length / 2 - 1] + lastTen[lastTen.length / 2]) / 2;
const poolLine =
  `                  open ${openRows.length}` +
  ` | oldest open non-blocked: ${oldest ? `#${oldest.id} (${/^[\s—-]*$/.test(oldest.cells[COL.BIRTH_ITER] ?? '') ? oldest.status : `birth: ${oldest.cells[COL.BIRTH_ITER].trim()}`})` : 'none'}` +
  (oldest ? (birthLoop(oldest) !== null && latestLoop ? `, ~${latestLoop - birthLoop(oldest)} loops old` : ', age not datable') : '') +
  ` | median age-at-close, last ${lastTen.length}: ${median === null ? 'n/a' : `${median} loops`}` +
  ` (max ${lastTen.length ? Math.max(...lastTen) : 'n/a'}; all-time max ${maxAge ?? 'n/a'})` +
  (undatable ? ` | ${undatable} closures not datable` : '') +
  (latestLoop ? ` | ages measured to loop ${latestLoop}, the latest closure recorded` : '') +
  // MR-043 §6.2(7): the "loops" above mix iteration-era and loop-era cycles.
  ` | iteration-era births read as loop N-${ITERATION_ERA_OFFSET}, approximate`;

// ── Report ───────────────────────────────────────────────────────────────────
const summary =
  `validate-backlog: ${rows.length} rows, ${struckIds.size} struck, ` +
  `${malformed.length}/${MALFORMED_BASELINE.size} baselined malformed rows`;

if (violations.length > 0) {
  console.error(`${summary}\n`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(`\n${violations.length} violation(s).`);
  process.exit(1);
}

console.log(`${summary} — clean
${poolLine}`);
