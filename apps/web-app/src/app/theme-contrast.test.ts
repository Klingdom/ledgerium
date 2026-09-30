/**
 * Contrast guard for the theme tokens, in both themes.
 *
 * ## Why this exists, and why the axe ratchets are not enough
 *
 * Loop 64 fixed a focus ring measuring 2.18:1 in light theme across 68
 * elements, then shipped light-theme axe coverage and described it as the check
 * that would notice a regression. MR-036 disputed that, and it was right. I
 * verified it the only way worth trusting: I reverted `--focus-ring` in the
 * light theme back to the broken value and ran the suite. **All 8 SOP tests
 * passed, including both light-theme scans.**
 *
 * The reason is structural, not a gap in the fixtures. axe-core's
 * `color-contrast` rule evaluates *text* against its background. SC 1.4.11
 * focus appearance is a manual-review item with no automated axe rule, so no
 * amount of axe coverage in any theme will ever catch a focus ring that is
 * technically present and perceptually absent.
 *
 * So the guard has to be arithmetic, and it has to read the same file the
 * browser reads. This parses `globals.css` rather than restating the hex values
 * here — a test that hardcodes the colours it is checking passes forever and
 * proves nothing, which is the same class of mistake one level down.
 *
 * ## What it does not cover
 *
 * That a token is actually *used*. `assertTokenizedFocusRings` below covers the
 * focus ring specifically, because that is the one where a stray literal is
 * invisible to every other check we have.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(join(__dirname, 'globals.css'), 'utf8');

// ─── WCAG relative luminance ────────────────────────────────────────────────

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return (
    0.2126 * channel(parseInt(full.slice(0, 2), 16)) +
    0.7152 * channel(parseInt(full.slice(2, 4), 16)) +
    0.0722 * channel(parseInt(full.slice(4, 6), 16))
  );
}

/** WCAG 2.x contrast ratio. Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// ─── Reading the real stylesheet ────────────────────────────────────────────

/**
 * Extract a token's value from a given block of `globals.css`.
 *
 * Deliberately strict: an absent token throws rather than returning a default,
 * because a silently-missing token is exactly how `--status-info` would have
 * shipped without its print-block entry.
 */
function token(block: 'root' | 'light', name: string): string {
  const start = CSS.indexOf(block === 'root' ? ':root {' : '.light {');
  expect(start, `could not find the ${block} block in globals.css`).toBeGreaterThan(-1);
  const end = CSS.indexOf('\n}', start);
  const body = CSS.slice(start, end);
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(body);
  expect(m, `--${name} is not defined in the ${block} block of globals.css`).not.toBeNull();
  return m![1]!;
}

const SURFACES = ['surface-primary', 'surface-secondary', 'surface-elevated'] as const;

/** Worst-case ratio of a foreground against every surface in its own theme. */
function worstAgainstSurfaces(block: 'root' | 'light', fg: string): number {
  return Math.min(...SURFACES.map((s) => contrastRatio(fg, token(block, s))));
}

// ─── The guards ─────────────────────────────────────────────────────────────

describe('theme tokens meet WCAG contrast in BOTH themes', () => {
  // SC 1.4.11. The ring is drawn against whatever surface sits behind the
  // focused control, so the worst surface in the theme is the honest bound.
  describe('--focus-ring (SC 1.4.11, >= 3:1) — row #230', () => {
    for (const block of ['root', 'light'] as const) {
      it(`passes on every surface in the ${block === 'root' ? 'dark' : 'light'} theme`, () => {
        const ratio = worstAgainstSurfaces(block, token(block, 'focus-ring'));
        expect(
          ratio,
          `--focus-ring in the ${block} block is ${ratio.toFixed(2)}:1 against its worst surface. ` +
            'SC 1.4.11 requires 3:1 for focus indicators. This is the check that loop 64 wrongly ' +
            'believed the light-theme axe pass provided: axe has no focus-contrast rule, so if this ' +
            'test does not catch it, nothing does.',
        ).toBeGreaterThanOrEqual(3);
      });
    }
  });

  // SC 1.4.3. These carry figures and status text, so they answer to 4.5:1.
  describe('status + brand text tokens (SC 1.4.3, >= 4.5:1) — rows #206, #222, #229', () => {
    for (const name of ['status-danger', 'status-warning', 'status-success', 'status-info', 'brand-text']) {
      for (const block of ['root', 'light'] as const) {
        it(`--${name} passes on every surface in the ${block === 'root' ? 'dark' : 'light'} theme`, () => {
          const ratio = worstAgainstSurfaces(block, token(block, name));
          expect(
            ratio,
            `--${name} in the ${block} block is ${ratio.toFixed(2)}:1 against its worst surface, under the 4.5:1 floor.`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });

  // The SOP print block resets these to light values so a dark-mode user does
  // not print white-on-white. A token added to :root and .light but forgotten
  // here prints invisibly — nearly happened twice, at #229 and #230.
  describe('the SOP print block resets every theme-dependent token it needs to', () => {
    const printStart = CSS.indexOf('.sop-print-root {');
    const printBody = CSS.slice(printStart, CSS.indexOf('\n    }', printStart));

    for (const name of ['focus-ring', 'status-info', 'status-danger', 'status-warning', 'status-success', 'brand-text']) {
      it(`--${name} is reset for print`, () => {
        expect(
          printBody.includes(`--${name}:`),
          `--${name} is defined per-theme but not reset in .sop-print-root, so printing from dark mode ` +
            'would use the dark value on white paper.',
        ).toBe(true);
      });
    }
  });
});

// ─── Every focus ring is a token, or an explicitly measured exception ────────

/**
 * Walk the source tree for focus-ring colour utilities.
 *
 * This is the guard for the defect the contrast tests above cannot see: a
 * single element opting out of the token. MR-036 found exactly one such site
 * surviving loop 64's sweep (`LensSwitcher.tsx:125`), and the reason it
 * survived is the interesting part — it read
 * `focus-visible:ring-[var(--accent,#16a34a)]`, and loop 64 measured the
 * fallback `#16a34a` at 3.15:1 and let it through. But `--accent` **is**
 * defined, at `globals.css:52`, as `#20f2a6`. The fallback was dead code. The
 * ring actually rendered at 1.40:1 — the worst in the application — inside the
 * loop whose whole subject was that ring.
 *
 * So this resolves `var()` against `globals.css` rather than trusting the
 * fallback written beside it, because the fallback is what the author believed
 * and the definition is what the browser uses.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (/\.(tsx|css)$/.test(name) && !name.endsWith('.test.tsx')) acc.push(p);
  }
  return acc;
}

/**
 * Focus-ring literals measured and deliberately allowed, with their worst
 * light-theme ratio. Light is the binding theme for all of these; each clears
 * the 3:1 floor. Adding to this list should require measuring, which is why the
 * number is part of the entry rather than a comment beside it.
 */
const ALLOWED_LITERALS: Record<string, number> = {
  'red-500': 3.6,     // #EF4444 on #F8FAFC — destructive actions, a deliberate signal
  'brand-600': 3.6,   // #059669
  'blue-500': 3.52,   // #3B82F6
};

describe('focus rings use the token, or a measured exception — row #230 / MR-036 S-2', () => {
  const ROOT = join(__dirname, '..');
  const RING = /focus(?:-visible)?:ring-(\[[^\]]*\]|[a-z]+-\d{2,3})/g;

  const found: Array<{ file: string; raw: string }> = [];
  for (const file of sourceFiles(ROOT)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(RING)) found.push({ file: file.slice(ROOT.length + 1), raw: m[1]! });
  }

  it('finds focus rings at all (guards against the regex silently matching nothing)', () => {
    // Without this, a refactor of the class syntax would turn every assertion
    // below into a vacuous pass over an empty list — the failure mode that cost
    // this repo a whole loop at 57.
    expect(found.length).toBeGreaterThan(20);
  });

  it('no focus ring resolves to an undefined or overridden CSS variable', () => {
    const offenders: string[] = [];
    for (const { file, raw } of found) {
      const v = /^\[var\(\s*(--[a-z-]+)\s*(?:,\s*([^)]+))?\)\]$/.exec(raw);
      if (!v) continue;
      const name = v[1]!.slice(2);
      const fallback = v[2]?.trim();
      const defined = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).test(CSS);
      if (!defined) {
        offenders.push(`${file}: var(--${name}) is never defined in globals.css; the ring silently uses its fallback ${fallback ?? '(none)'}`);
      } else if (fallback) {
        offenders.push(`${file}: var(--${name}, ${fallback}) — the variable IS defined, so the fallback is dead code and misleads anyone measuring it. Drop the fallback.`);
      }
    }
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('every focus ring is the token or an explicitly measured literal', () => {
    const offenders = found
      .filter(({ raw }) => raw !== '[var(--focus-ring)]' && !(raw in ALLOWED_LITERALS))
      .map(({ file, raw }) => `${file}: focus ring "${raw}" is neither var(--focus-ring) nor a measured exception`);
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });
});

// ─── No var() anywhere lies about what it resolves to ────────────────────────

/**
 * Row #233. The focus-ring guard above catches this for one property; this
 * catches it everywhere, because the same trap bit twice in three loops.
 *
 * Two distinct defects, both of which make a colour read as one thing and
 * render as another:
 *
 * **A dead fallback.** `var(--accent, #16a34a)` where `--accent` *is* defined,
 * as `#20f2a6`. The fallback never applies, so the literal beside it is
 * decoration — and worse than decoration, because loop 64 measured one of these
 * fallbacks, concluded the colour passed, and shipped a focus ring at 1.40:1.
 * Every one of these is a lie waiting to mislead the next person who measures
 * by reading.
 *
 * **A phantom token.** `var(--opp-automate, #2563eb)` where `--opp-automate` is
 * defined nowhere. This *works*, which is what makes it worse: it looks like a
 * design-system token participating in theming, and it is a hardcoded literal
 * that can never change per theme. `band-colors.ts` states the intent in a
 * docstring — "resolves to the design-system token when defined and to a
 * sensible literal fallback otherwise" — and the tokens were never defined, so
 * the entire palette has always been the fallbacks.
 *
 * Both are fixed by making the code say what it does: drop the dead fallback,
 * or inline the literal. Neither changes a rendered pixel.
 */
describe('no var() misrepresents what it resolves to — row #233', () => {
  const ROOT = join(__dirname, '..');
  // `var(--name` optionally followed by `, fallback`. Nested var() fallbacks are
  // matched loosely on purpose; the assertions only need the name and whether a
  // fallback is present.
  // The name must be followed by `,` or `)`. Without that anchor this also
  // matched prose in a doc comment — `var(--surface-*)` — and reported three
  // phantom tokens that were never code. Caught by reading the failure output
  // rather than by trusting the count, which is the whole habit here.
  const VAR = /var\(\s*(--[a-z][a-z0-9-]*)\s*(?:(,)|\))/g;

  function isDefined(name: string): boolean {
    return new RegExp(`\\${name}\\s*:`).test(CSS);
  }

  const uses: Array<{ file: string; name: string; hasFallback: boolean }> = [];
  for (const file of sourceFiles(ROOT)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(VAR)) {
      uses.push({ file: file.slice(ROOT.length + 1), name: m[1]!, hasFallback: m[2] === ',' });
    }
  }

  it('finds var() uses at all', () => {
    // Guards against the regex silently matching nothing and turning every
    // assertion below into a vacuous pass.
    expect(uses.length).toBeGreaterThan(50);
  });

  it('no defined token is used with a fallback (the fallback is dead code)', () => {
    const offenders = uses
      .filter((u) => u.hasFallback && isDefined(u.name))
      .map((u) => `${u.file}: var(${u.name}, …) — ${u.name} IS defined in globals.css, so the fallback never applies. Drop it; it only misleads anyone who measures by reading.`);
    expect([...new Set(offenders)], `\n${[...new Set(offenders)].join('\n')}\n`).toEqual([]);
  });

  it('no undefined token is used at all (a fallback makes a literal look like a token)', () => {
    const offenders = uses
      .filter((u) => !isDefined(u.name))
      .map((u) => `${u.file}: var(${u.name}${u.hasFallback ? ', …' : ''}) — ${u.name} is defined nowhere. ${u.hasFallback ? 'This renders the fallback, permanently, in both themes, while looking like a theme token. Inline the literal or define the token.' : 'This renders nothing at all.'}`);
    expect([...new Set(offenders)], `\n${[...new Set(offenders)].join('\n')}\n`).toEqual([]);
  });
});
