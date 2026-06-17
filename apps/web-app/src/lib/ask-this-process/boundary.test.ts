/**
 * boundary tests — enforce the determinism boundary at the source-file level
 * (ADR-001 rules 1 + 2).
 *
 *  - ZERO LLM / provider / network imports anywhere in the ask-this-process dir.
 *  - ZERO `Date.now()` / `Math.random()` / `new Date()`-of-now tokens in the
 *    grounding modules (the one allowed `new Date(<fixed epoch>)` in the builder
 *    operates on a stored value, never `now()` — asserted explicitly).
 *
 * This is the static counterpart to the platform-vision rule
 * "ask-context-builder has zero ai-provider-adapter import".
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname);

/** All non-test, non-fixture source files in the module dir. */
function sourceFiles(): string[] {
  const entries = readdirSync(DIR, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
      files.push(join(DIR, e.name));
    }
  }
  return files;
}

/**
 * Strip line + block comments so token scans match CODE, not prose. (The modules
 * legitimately MENTION `new Date()` / `Date.now()` in doc-comments explaining
 * that they must NOT be used.) Conservative — good enough for these scans.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // line comments (avoid `://` in urls)
}

/** Forbidden import substrings — any LLM / provider / network module. */
const FORBIDDEN_IMPORT_TOKENS = [
  'ai-provider-adapter',
  'anthropic',
  '@anthropic-ai',
  'openai',
  '@ai-sdk',
  'node:http',
  'node:https',
  'node:net',
  'undici',
  'node-fetch',
];

describe('determinism boundary — no LLM / provider / network imports', () => {
  it('source files exist to scan', () => {
    expect(sourceFiles().length).toBeGreaterThan(0);
  });

  it('no source file imports any LLM / provider / network module', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const src = readFileSync(file, 'utf8');
      // Scan only import/require lines to avoid false positives in comments/strings.
      const importLines = src
        .split('\n')
        .filter((l) => /^\s*(import|export)\s.+from\s|require\(/.test(l));
      const joined = importLines.join('\n').toLowerCase();
      for (const token of FORBIDDEN_IMPORT_TOKENS) {
        if (joined.includes(token)) {
          offenders.push(`${file}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not call fetch / XMLHttpRequest anywhere (no network egress)', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const src = stripComments(readFileSync(file, 'utf8'));
      if (/\bfetch\s*\(/.test(src) || /XMLHttpRequest/.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('determinism boundary — no wall-clock / randomness', () => {
  it('no source file calls Date.now() or Math.random()', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const src = stripComments(readFileSync(file, 'utf8'));
      if (/Date\.now\s*\(/.test(src)) offenders.push(`${file}: Date.now()`);
      if (/Math\.random\s*\(/.test(src)) offenders.push(`${file}: Math.random()`);
    }
    expect(offenders).toEqual([]);
  });

  it('no source file constructs `new Date()` with no argument (now)', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const src = stripComments(readFileSync(file, 'utf8'));
      // `new Date()` with empty parens === wall clock. `new Date(<expr>)` is OK
      // (it operates on a stored value/epoch).
      if (/new\s+Date\s*\(\s*\)/.test(src)) offenders.push(`${file}: new Date()`);
    }
    expect(offenders).toEqual([]);
  });
});
