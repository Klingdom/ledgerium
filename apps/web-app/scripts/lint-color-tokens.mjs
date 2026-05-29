#!/usr/bin/env node
/**
 * lint-color-tokens.mjs — guard against raw Tailwind color utilities in
 * theme-sensitive surfaces.
 *
 * Background: the app is dark-mode-first. Hardcoded utilities like
 * `bg-emerald-50` / `text-amber-700` / `bg-white` produce unreadable
 * contrast in dark mode because the body text inherits `--content-primary`
 * (near-white) over light-tinted backgrounds. See EXPORT_TEMPLATE_REVIEW_001.
 *
 * Enforcement: scan SOP-view + (future) dashboard-v2 + admin-operations
 * directories. Exit 1 on any forbidden pattern. Per-line suppression via
 * `// lint-color-tokens: ok — <reason>` comment.
 *
 * CI gate: runs in `.github/workflows/deploy.yml` quality-gate job ahead of
 * the test suite so violations surface as compile-style errors.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_APP_ROOT = join(fileURLToPath(import.meta.url), '..', '..');

// Theme-sensitive directories (must use semantic tokens). Add more as the
// migration progresses; today scope is sop-view per Iteration B.
const ENFORCED_DIRS = [
  'src/components/sop-view',
];

// Forbidden Tailwind color utility shape:
//   <state-prefix?>(bg|text|border|ring|placeholder|decoration|from|to|via)-<palette>-<shade>
// Includes shadowed states (hover:, focus:, active:, group-hover:, dark:, etc.).
// Excludes the intentional `brand-*` palette (defined as theme-aware in
// tailwind.config.ts) and `accent` CSS var.
const FORBIDDEN = /\b(?:hover:|focus:|focus-visible:|active:|group-hover:|group-focus:|dark:|peer-checked:)?(?:bg|text|border|ring|placeholder|decoration|from|to|via)-(emerald|amber|red|blue|violet|gray|green|yellow|orange|slate|zinc|stone|neutral|sky|indigo|purple|pink|rose|teal|cyan|lime|fuchsia)-\d{2,3}\b/g;

// Plain-color utilities (no shade) also forbidden when used as semantic surfaces.
const FORBIDDEN_PLAIN = /\b(?:hover:|focus:|focus-visible:|active:|group-hover:|group-focus:|dark:)?(?:bg|text|border|ring|placeholder|decoration)-(white|black)\b/g;

// Allow-list: per-line opt-out. Use sparingly with a stated reason.
// Matches both `// lint-color-tokens: ok` (JS/TS line comments) and
// `{/* lint-color-tokens: ok */}` (JSX block comments).
const SUPPRESS_MARKER = /(?:\/\/|\/\*)\s*lint-color-tokens:\s*ok/;

let violationCount = 0;
const violationsByFile = new Map();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      checkFile(path);
    }
  }
}

function checkFile(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SUPPRESS_MARKER.test(line)) continue;

    const shadeMatches = line.match(FORBIDDEN) ?? [];
    const plainMatches = line.match(FORBIDDEN_PLAIN) ?? [];
    const allMatches = [...shadeMatches, ...plainMatches];
    if (allMatches.length > 0) {
      violationCount += allMatches.length;
      const rel = relative(WEB_APP_ROOT, path).replace(/\\/g, '/');
      if (!violationsByFile.has(rel)) violationsByFile.set(rel, []);
      violationsByFile.get(rel).push({ line: i + 1, classes: allMatches, context: line.trim().slice(0, 100) });
    }
  }
}

for (const dir of ENFORCED_DIRS) {
  const fullPath = join(WEB_APP_ROOT, dir);
  try {
    walk(fullPath);
  } catch (err) {
    console.error(`[lint-color-tokens] failed to walk ${dir}:`, err.message);
    process.exit(2);
  }
}

if (violationCount === 0) {
  console.log('[lint-color-tokens] ok — no forbidden Tailwind color utilities in enforced surfaces.');
  process.exit(0);
}

console.error(`[lint-color-tokens] ${violationCount} forbidden Tailwind color utility occurrence(s) found:\n`);
for (const [file, hits] of violationsByFile) {
  console.error(`  ${file}`);
  for (const h of hits) {
    console.error(`    L${h.line}: ${h.classes.join(', ')}`);
    console.error(`           ${h.context}`);
  }
}
console.error('\nFix: replace with semantic tokens (bg-surface-success / text-content-on-warning / etc.).');
console.error('See apps/web-app/src/app/globals.css for the full token list,');
console.error('or docs/meta/EXPORT_TEMPLATE_REVIEW_001.md §3 for the mapping table.');
console.error('Per-line opt-out (intentional brand icons only): // lint-color-tokens: ok — <reason>');
process.exit(1);
