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
import { join, sep } from 'node:path';
import { CATEGORY_STYLES } from '../components/workflow-view/constants';
import {
  CANVAS_BG, EDGE_COLOR, HAPPY_COLOR, EDGE_MIN_OPACITY,
  PERF_FAST_COLOR, PERF_MEDIUM_COLOR, PERF_SLOW_COLOR, PERF_NEUTRAL_COLOR,
  TERMINAL_START, TERMINAL_END, TERMINAL_TEXT, BADGE, readableTextOn,
} from '../components/workflow-view/mapColors';

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

  /*
    Row #236. A tinted badge is a foreground/background pair, so it is asserted
    as a pair rather than as two independent colours against the page.

    This is the case that proves the point: in light theme --status-danger is
    4.62:1 on plain white, so it clears the floor on a surface and fails on any
    red tint. A per-colour check would have called it fine. The pair is the
    unit that can be right or wrong.
  */
  describe('tinted status badges meet 4.5:1 as a PAIR — row #236', () => {
    for (const name of ['danger', 'warning', 'success']) {
      for (const block of ['root', 'light'] as const) {
        it(`--status-${name}-on-tint on --status-${name}-tint, ${block === 'root' ? 'dark' : 'light'} theme`, () => {
          const fg = token(block, `status-${name}-on-tint`);
          const bg = token(block, `status-${name}-tint`);
          const ratio = contrastRatio(fg, bg);
          expect(
            ratio,
            `--status-${name}-on-tint (${fg}) on --status-${name}-tint (${bg}) is ${ratio.toFixed(2)}:1 ` +
              'in the ' + (block === 'root' ? 'dark' : 'light') + ' theme, under the 4.5:1 floor.',
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    // Row #245: the same pair in the brand palette. `text-brand-400` on
    // `bg-brand-600/10` was 1.63:1 in light — the brand foreground too close
    // to its own hue, so no alpha saves it. Opaque tint, own foreground.
    for (const block of ['root', 'light'] as const) {
      it(`--brand-on-tint on --brand-tint, ${block === 'root' ? 'dark' : 'light'} theme`, () => {
        const fg = token(block, 'brand-on-tint');
        const bg = token(block, 'brand-tint');
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `--brand-on-tint (${fg}) on --brand-tint (${bg}) is ${ratio.toFixed(2)}:1 in the ` +
            (block === 'root' ? 'dark' : 'light') + ' theme, under the 4.5:1 floor.',
        ).toBeGreaterThanOrEqual(4.5);
      });
    }

    it('the light danger foreground is NOT the same as the on-surface one', () => {
      // Guards the finding rather than just its consequence. If someone
      // "simplifies" these to one token, light-theme danger badges silently
      // drop to ~4.1:1 and every pair test above still passes, because the
      // tint would be recomputed to suit.
      expect(token('light', 'status-danger-on-tint')).not.toBe(token('light', 'status-danger'));
    });
  });

  // The SOP print block resets these to light values so a dark-mode user does
  // not print white-on-white. A token added to :root and .light but forgotten
  // here prints invisibly — nearly happened twice, at #229 and #230.
  describe('the SOP print block resets every theme-dependent token it needs to', () => {
    const printStart = CSS.indexOf('.sop-print-root {');
    const printEnd = CSS.indexOf('\n    }', printStart);
    const printBody = CSS.slice(printStart, printEnd);

    // MR-037: these two slice bounds are whitespace-dependent. If the block's
    // indentation changed, `printEnd` would land far away — or at -1, slicing
    // to the end of the file — and every assertion below would pass against the
    // wrong body while looking entirely healthy. That is the one way this
    // describe can go vacuous, so the bounds are asserted rather than assumed.
    it('the print block is located and bounded sanely', () => {
      expect(printStart, 'could not find .sop-print-root in globals.css').toBeGreaterThan(-1);
      expect(printEnd, 'could not find the end of the .sop-print-root block').toBeGreaterThan(printStart);
      expect(printBody.length, 'the print block sliced implausibly large — check its indentation').toBeLessThan(4000);
    });

    for (const name of ['focus-ring', 'status-info', 'status-danger', 'status-warning', 'status-success', 'brand-text',
                        'status-danger-tint', 'status-danger-on-tint', 'status-warning-tint',
                        'status-warning-on-tint', 'status-success-tint', 'status-success-on-tint',
                        'brand-tint', 'brand-on-tint']) {
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
    // `.ts` was missing until MR-037 pointed out that the guard could not see
    // `band-colors.ts` — the file loop 68 used as its own headline example.
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

/**
 * Focus-ring literals measured and deliberately allowed, with their worst
 * light-theme ratio. Light is the binding theme for all of these; each clears
 * the 3:1 floor. Adding to this list should require measuring, which is why the
 * number is part of the entry rather than a comment beside it.
 */
const ALLOWED_LITERALS: Record<string, { hex: string; measured: number }> = {
  'red-500': { hex: '#EF4444', measured: 3.6 },   // destructive actions, a deliberate signal
  'brand-600': { hex: '#059669', measured: 3.6 },
  'blue-500': { hex: '#3B82F6', measured: 3.52 },
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

  it('the allowlist entries still measure what they claim', () => {
    // MR-037: the numbers in ALLOWED_LITERALS were never read by anything, so
    // the docstring's claim that recording them "requires measuring" had
    // exactly the force of a comment — in a file whose entire thesis is that
    // unchecked claims are the problem. They are recomputed now. All three were
    // correct, which is not the point; the point is that nothing said so.
    for (const [name, { hex, measured }] of Object.entries(ALLOWED_LITERALS)) {
      const worst = Math.min(...(['surface-primary', 'surface-secondary'] as const).map((s) => contrastRatio(hex, token('light', s))));
      expect(
        Math.abs(worst - measured),
        `ALLOWED_LITERALS["${name}"] claims ${measured}:1 but ${hex} measures ${worst.toFixed(2)}:1 on the light theme's worst surface.`,
      ).toBeLessThan(0.05);
      expect(worst, `${name} is allowlisted but measures ${worst.toFixed(2)}:1, under the 3:1 floor`).toBeGreaterThanOrEqual(3);
    }
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
    // Comments stripped for the same reason as the semantic guard below: a
    // docstring describing the pattern is prose, not code, and matching it
    // reports a defect in an explanation.
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
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

// ─── Tokens actually meet their floor where they are USED ───────────────────

/**
 * Row #239 / MR-037 S-1.
 *
 * Everything above this point checks *syntax*: that a `var()` tells the truth
 * about which token it resolves to. That is not the same question as whether
 * the resolved colour is readable, and the gap between the two is not academic.
 * `--accent` is `#20f2a6`, defined in `:root` with no `.light` override, and
 * measures **1.40:1** on the light surface — loop 65 called it "the worst value
 * in the application". Loop 68 then ran a 73-site colour audit, edited three
 * lines carrying it, and measured none of them, because its instrument asked
 * the syntactic question. One of those three is the admin dashboard's MRR
 * figure.
 *
 * So this resolves each token and checks the floor at the point of use.
 *
 * ## What this cannot see, stated because the last five guards did not
 *
 * It assumes the element sits on a theme surface. That assumption is wrong
 * wherever a hardcoded chip supplies the background — `text-amber-700` on
 * `bg-amber-50` is fine and this would call it a failure. Loop 67 established
 * that contrast is a property of a *pair* which only exists at render time, so
 * no static check can settle those; axe on a rendered page is the instrument
 * for them. Hence `SITS_ON_OWN_BACKGROUND` below: an explicit, reviewable list
 * of uses whose background is not the theme surface, with the reason. It is a
 * statement of this guard's blind spot, not a waiver.
 */
describe('tokens meet their contrast floor where they are used — row #239', () => {
  const ROOT = join(__dirname, '..');

  /**
   * Uses whose background is NOT a theme surface, so the surface-based floor
   * below does not apply. Each needs a reason; "it was failing" is not one.
   */
  const SITS_ON_OWN_BACKGROUND: Record<string, string> = {
    // LensSwitcher's active tab sets its own hardcoded rgba tint alongside the
    // border, so the border's neighbour is that tint, not the page.
    'components/dashboard-v2/LensSwitcher.tsx:--accent:bg': 'active tab supplies its own rgba(22,163,74,0.08) fill',

    // Inverted buttons: `bg-[var(--content-primary)] text-[var(--surface-primary)]`.
    // The foreground is the surface colour ON the content colour, which is the
    // theme's maximum-contrast pair, not a 1:1 failure. Verified by reading each
    // class string, which is why these are listed rather than inferred.
    'components/dashboard-v2/FirstRunTutorial.tsx:--surface-primary:bg': 'inverted CTA on bg-[var(--content-primary)]',
    'components/dashboard-v2/WorkflowList.tsx:--surface-primary:bg': 'inverted CTA on bg-[var(--content-primary)]',
    'components/dashboard-v2/WorkflowListFilterBar.tsx:--surface-primary:bg': 'inverted active chip on bg-[var(--content-primary)]',

    // `ring-1` hairlines around the ACTIVE pill in a mode switcher. Not focus
    // indicators — focus is handled separately — and the active state is
    // already carried by background, shadow and text colour, so the ring is
    // supplementary rather than the thing that identifies the state.
    'components/sop-view/SOPModeSwitcher.tsx:--border-default:bg': 'decorative hairline on the active pill; state carried by bg + shadow + text',
    'components/workflow-view/WorkflowModeSwitcher.tsx:--border-default:bg': 'decorative hairline on the active pill; state carried by bg + shadow + text',
    'components/workflow-view/WorkflowVariantsMap.tsx:--border-default:bg': 'decorative hairline on the selected card; state carried by bg + shadow',

    // Two `|` separator glyphs. Genuinely decorative: they divide metadata and
    // carry no information a reader needs.
    //
    // This entry used to also cover the unfilled favourite star, which was NOT
    // decorative — row #240, fixed at loop 74. That is the argument for the
    // count below.
    'app/(app)/dashboard/page.tsx:--border-default:bg': 'two | separator glyphs between metadata fields',
  };

  /**
   * How many exempt uses each allowlist entry covers.
   *
   * Without this the exemption is file-wide, so a *new* misuse of the same
   * token in the same file inherits someone else's reason and is never
   * reported. That is not hypothetical: this file's entry legitimately covered
   * two decorative separators while also silently covering a favourite-star
   * affordance sitting at 1.18:1 on mobile with no hover to reveal it.
   *
   * An allowlist that grows silently is not an allowlist.
   */
  const ALLOWED_OCCURRENCES: Record<string, number> = {
    'app/(app)/dashboard/page.tsx:--border-default:bg': 2,
  };

  /**
   * Utility prefix -> the SC floor that applies to it.
   *
   * Only `text` and `ring` are checked, and the omissions are deliberate.
   *
   * `border` was included in a first draft and reported hundreds of hits, all
   * of them hairline card dividers at around 1.1:1. That is not a defect: SC
   * 1.4.11 governs visual information *required to identify* a component or its
   * state, and a decorative border on a card that is already identifiable by
   * its background is not that. Whether a given border carries state cannot be
   * decided from a class string, so asserting on all of them would train people
   * to ignore this file — the precise failure the axe ratchet's moded policy
   * exists to avoid.
   *
   * `fill` is omitted for the same reason: most filled icons here are
   * decorative and sit beside a text label that carries the meaning.
   *
   * Active-tab borders and meaningful icons therefore remain the province of
   * axe on a rendered page, and of review. This guard covers the two cases that
   * are unambiguous from source alone.
   */
  const FLOORS: Array<{ prefix: string; floor: number; sc: string }> = [
    { prefix: 'text', floor: 4.5, sc: 'SC 1.4.3 (text)' },
    { prefix: 'ring', floor: 3, sc: 'SC 1.4.11 (focus indicator)' },
  ];

  /**
   * A token's value in a theme.
   *
   * Returns the `:root` value when `.light` has no override, because that is
   * what the browser does — and it is the case that matters most. `--accent` is
   * `:root`-only, so it is the *same* colour in both themes, which is precisely
   * why it measures 1.40:1 in one of them. An earlier draft of this guard
   * skipped tokens missing from `.light`, and so silently excluded the exact
   * class of defect it was written to find.
   */
  function valueIn(block: 'root' | 'light', name: string): string | null {
    try {
      return token(block, name);
    } catch {
      if (block === 'light') {
        try {
          return token('root', name);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  const offenders: string[] = [];
  const exemptSeen = new Map<string, number>();
  let checked = 0;

  for (const file of sourceFiles(ROOT)) {
    const rel = file.slice(ROOT.length + 1).split(sep).join('/');
    // Block comments are stripped before scanning. A comment explaining why a
    // site was moved off a token necessarily quotes the old class, and without
    // this the guard matches its own explanation and reports the site it just
    // fixed. The `var()` guard above learned the same thing about doc prose.
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    for (const { prefix, floor, sc } of FLOORS) {
      // Built with String.raw so the escapes survive being written to disk —
      // two attempts at this line lost their backslashes in transit and the
      // file failed to parse, which at least failed loudly.
      const re = new RegExp(String.raw`${prefix}-\[var\(\s*(--[a-z][a-z0-9-]*)\s*\)\]`, 'g');
      for (const m of text.matchAll(re)) {
        const name = m[1]!.slice(2);
        const exemption = `${rel}:--${name}:bg`;
        if (SITS_ON_OWN_BACKGROUND[exemption]) {
          exemptSeen.set(exemption, (exemptSeen.get(exemption) ?? 0) + 1);
          continue;
        }

        // Measured against the theme surfaces, NOT against a nearby `bg-`
        // utility. A draft of this tried to detect the foreground/background
        // pair by scanning a character window around the match, and it produced
        // confident, precise-looking nonsense — pairing a label with a
        // background belonging to a different element several lines away.
        // Class strings are not parsed here and a proximity heuristic is not a
        // parser. Genuine inverted-on-accent cases are listed above with
        // reasons instead: a short allowlist a reviewer can check beats an
        // inference nobody can.
        checked++;

        for (const block of ['root', 'light'] as const) {
          const fg = valueIn(block, name);
          if (fg === null) continue; // not a hex token; other tests cover existence
          const themeName = block === 'root' ? 'dark' : 'light';
          const worst = worstAgainstSurfaces(block, fg);

          if (worst < floor) {
            offenders.push(
              `${rel}: ${prefix}-[var(--${name})] is ${worst.toFixed(2)}:1 in the ${themeName} theme ` +
                `against its worst theme surface — ${sc} requires ${floor}:1. --${name} is ${fg} there.`,
            );
          }
        }
      }
    }
  }

  it('checks a meaningful number of uses', () => {
    // Anti-vacuity. A regex that stops matching would otherwise turn the
    // assertion below into a permanent pass over an empty list.
    expect(checked).toBeGreaterThan(20);
  });

  it('no allowlist entry has quietly grown to cover more than it was granted', () => {
    const drift: string[] = [];
    for (const [key, declared] of Object.entries(ALLOWED_OCCURRENCES)) {
      const actual = exemptSeen.get(key) ?? 0;
      if (actual !== declared) {
        drift.push(
          `${key}: allowlisted for ${declared} use(s), found ${actual}. ` +
            (actual > declared
              ? 'A new use has inherited an exemption written for something else. Judge it on its own terms.'
              : 'A use has gone; reduce the count so the exemption cannot silently re-expand.'),
        );
      }
    }
    expect(drift, drift.join('; ')).toEqual([]);
  });

  it('every token used as text, border, ring or fill meets its floor in BOTH themes', () => {
    const unique = [...new Set(offenders)];
    expect(unique, `\n${unique.join('\n')}\n`).toEqual([]);
  });
});

// ─── brand-500 as a text/icon colour is gone, and stays gone ─────────────────

/*
  Rows #245 / #257. `text-brand-500` is 2.42:1 on light surfaces — below the
  4.5:1 text floor and the 3:1 non-text floor alike. Loop 81 fixed the uses
  axe could see on screen and left 21 it could not (closed dropdowns, app-only
  pages); loop 84 converted the rest to `--brand-text`, or to the
  `--brand-tint` / `--brand-on-tint` pair where it sat on a brand tint.
  A scanner sees rendered nodes only, so the class is held at zero here, over
  source, where hidden states cannot hide it.
*/
describe('no text-brand-500 in source — rows #245 / #257', () => {
  const ROOT = join(__dirname, '..');
  const files = sourceFiles(ROOT).filter((f) => /\.tsx?$/.test(f));

  it('scans the source tree (a guard over zero files passes vacuously)', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('has no text-brand-500 colour utility, in any variant', () => {
    const hits: string[] = [];
    for (const file of files) {
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/(^|[\s"'`:])text-brand-500\b/.test(line)) hits.push(`${file.slice(ROOT.length + 1)}:${i + 1}`);
      });
    }
    expect(hits, 'text-brand-500 is 2.42:1 in light. Use var(--brand-text), or the --brand-tint/--brand-on-tint pair on a brand tint.').toEqual([]);
  });
});

/*
  Row #259. The 400 shade, held at zero the same way. text-brand-400 #34D399
  is 1.84:1 on --surface-primary in light (1.92:1 on white) and 1.82:1 on
  brand-50 in EITHER theme (ds-tag-brand is not themed) - a hover state at
  that ratio is fainter than the resting colour it replaces.
  Allowlist, exact and reasoned: dark:text-brand-400 in RealProductDemo's
  "Sample data" badge. dark: applies only under html.dark, and that badge's
  dark background is brand-900 @30% over a dark surface (#0D1117..#1C2128),
  which measures 7.39:1 to 8.55:1 - a dark-only pair, the light pair being
  brand-700 on brand-100. Anything else is a failure.
*/
describe('no text-brand-400 in source - row #259', () => {
  const ROOT = join(__dirname, '..');
  const files = sourceFiles(ROOT).filter((f) => /\.tsx?$/.test(f));
  const ALLOWED: Record<string, string> = {
    'components/demo/RealProductDemo.tsx': 'dark:text-brand-400',
  };

  it('has no text-brand-400 colour utility, in any variant, beyond the allowlist', () => {
    const hits: string[] = [];
    for (const file of files) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
      const allowed = ALLOWED[rel];
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        const scrubbed = allowed ? line.split(allowed).join('') : line;
        if (/(^|[\s"'`:])text-brand-400\b/.test(scrubbed)) hits.push(`${rel}:${i + 1}`);
      });
    }
    expect(hits, 'text-brand-400 is 1.84:1 in light. Use var(--brand-text) / var(--brand-text-hover), or the --brand-tint/--brand-on-tint pair on a brand tint.').toEqual([]);
  });

  it('the allowlist entry still exists (a stale exemption is a hole)', () => {
    for (const [rel, token] of Object.entries(ALLOWED)) {
      expect(readFileSync(join(ROOT, rel), 'utf8')).toContain(token);
    }
  });
});

/*
  Row #279. The lighter shades, held at zero. text-brand-300 #6EE7B7 is 1.52:1
  on white; the 25 uses were hover states that turned fainter than the
  var(--brand-text) they replaced (now --brand-text-hover) and three
  tinted-callout texts on bg-brand-900/10..20, dark in intent but rendered in
  both themes (now the --brand-tint/--brand-on-tint pair, or --brand-text on a
  surface). 100 and 200 had no text uses. The allowlist is EMPTY on purpose: a
  dark-only pair must be measured and added here by file and token.
*/
describe('no text-brand-100/200/300 in source - row #279', () => {
  const ROOT = join(__dirname, '..');
  const files = sourceFiles(ROOT).filter((f) => /\.tsx?$/.test(f));
  const ALLOWED: Record<string, string> = {};
  const LIGHT_SHADE = /(^|[\s"'`:])text-brand-(100|200|300)\b/;

  it('has no text-brand-100/200/300 colour utility, in any variant, beyond the allowlist', () => {
    const hits: string[] = [];
    for (const file of files) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
      const allowed = ALLOWED[rel];
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        const scrubbed = allowed ? line.split(allowed).join('') : line;
        if (LIGHT_SHADE.test(scrubbed)) hits.push(`${rel}:${i + 1}`);
      });
    }
    expect(hits, 'text-brand-100/200/300 is ~1.5:1 or fainter on light surfaces. Use var(--brand-text) / var(--brand-text-hover), or the --brand-tint/--brand-on-tint pair on a brand tint.').toEqual([]);
  });

  it('the pattern catches bare, hover:, dark: and arbitrary-variant uses', () => {
    for (const u of ['text-brand-300', 'hover:text-brand-300', 'dark:text-brand-200', '[&_a:hover]:text-brand-100']) {
      expect(LIGHT_SHADE.test(`class="${u}"`), u).toBe(true);
    }
    expect(LIGHT_SHADE.test('border-brand-300 ring-brand-200 text-brand-700')).toBe(false);
  });

  it('every allowlist entry still exists (none today)', () => {
    for (const [rel, tok] of Object.entries(ALLOWED)) {
      expect(readFileSync(join(ROOT, rel), 'utf8')).toContain(tok);
    }
  });
});

/*
  Row #279. ds-tag-brand was bg-brand-50 text-brand-700 in BOTH themes: a light
  chip on dark pages, and anything inside it sat on a light background. It now
  takes the brand tint pair, whose per-theme contrast is asserted above
  (--brand-on-tint on --brand-tint), so the class must reference the tokens.
*/
describe('ds-tag-brand is themed - row #279', () => {
  const start = CSS.indexOf('.ds-tag-brand {');
  const body = CSS.slice(start, CSS.indexOf('}', start));

  it('is located', () => {
    expect(start).toBeGreaterThan(-1);
  });
  it('uses the per-theme brand tint pair', () => {
    expect(body).toContain('background-color: var(--brand-tint)');
    expect(body).toContain('color: var(--brand-on-tint)');
  });
  it('carries no fixed palette shade', () => {
    expect(body).not.toMatch(/brand-(50|100|700)\b/);
  });
});

/*
  Row #255. The workflow-map node hardcoded light-canvas colours as inline
  styles: step label #111827 on a ~6%-alpha accent tint, 1.08:1 in the dark
  default theme (axe, /product), with the category label the raw accent
  (4.43:1 light). The node body is now an opaque per-theme surface, so every
  pair below has exactly one background and is asserted AS A PAIR, in both
  themes. The category label colour is a per-theme token measured against that
  surface; the raw accent stays on the rail only.
*/
describe('workflow-map node pairs meet their floor in BOTH themes — row #255', () => {
  const CATEGORIES = Object.keys(CATEGORY_STYLES);
  const themeName = (b: 'root' | 'light') => (b === 'root' ? 'dark' : 'light');

  for (const block of ['root', 'light'] as const) {
    const bg = () => token(block, 'wf-node-bg');

    for (const cat of CATEGORIES) {
      it(`--wf-cat-${cat} on --wf-node-bg, ${themeName(block)} theme (>= 4.5:1)`, () => {
        const fg = token(block, `wf-cat-${cat}`);
        const ratio = contrastRatio(fg, bg());
        expect(ratio, `--wf-cat-${cat} (${fg}) on --wf-node-bg (${bg()}) is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }

    // step label, duration (+ its hover colour), system-chip text on the node body
    for (const name of ['content-primary', 'content-secondary', 'content-tertiary']) {
      it(`--${name} on --wf-node-bg, ${themeName(block)} theme (>= 4.5:1)`, () => {
        const ratio = contrastRatio(token(block, name), bg());
        expect(ratio, `--${name} on --wf-node-bg is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }

    it(`system-chip text --content-tertiary on its --surface-primary fill, ${themeName(block)} theme (>= 4.5:1)`, () => {
      const ratio = contrastRatio(token(block, 'content-tertiary'), token(block, 'surface-primary'));
      expect(ratio, `chip text is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });

    // meaningful icons (bottleneck / decision / sensitive / low-confidence), SC 1.4.11
    for (const name of ['status-danger', 'status-warning', 'status-info']) {
      it(`--${name} icon on --wf-node-bg, ${themeName(block)} theme (>= 3:1)`, () => {
        const ratio = contrastRatio(token(block, name), bg());
        expect(ratio, `--${name} on --wf-node-bg is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      });
    }

    // decision diamond border / terminal borders carry the node's shape
    it(`decision border --status-warning on its --status-warning-tint fill, ${themeName(block)} theme (>= 3:1)`, () => {
      const ratio = contrastRatio(token(block, 'status-warning'), token(block, 'status-warning-tint'));
      expect(ratio, `decision border is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    });
    it(`start-terminal border --status-success on --status-success-tint, ${themeName(block)} theme (>= 3:1)`, () => {
      const ratio = contrastRatio(token(block, 'status-success'), token(block, 'status-success-tint'));
      expect(ratio, `start border is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    });
    it(`end-terminal border --content-tertiary on --wf-node-bg, ${themeName(block)} theme (>= 3:1)`, () => {
      const ratio = contrastRatio(token(block, 'content-tertiary'), bg());
      expect(ratio, `end border is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    });
  }

  // The ordinal is white text on a fill that does not change with theme.
  for (const cat of CATEGORIES) {
    it(`ordinal badge: white on the ${cat} badge fill (>= 4.5:1)`, () => {
      const fill = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES].badge;
      const ratio = contrastRatio('#ffffff', fill);
      expect(ratio, `white on ${fill} is ${ratio.toFixed(2)}:1; the raw accent was 3.19-3.77 for four categories`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('the category label is NOT the raw accent in either theme', () => {
    // Guards the finding, not just its consequence: if a token is "simplified"
    // back to the accent, the pair tests above would still need to be the ones
    // to catch it; this fails first and says why.
    for (const cat of CATEGORIES) {
      const accent = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES].color.toLowerCase();
      const lightFg = token('light', `wf-cat-${cat}`).toLowerCase();
      expect(lightFg === accent, `${cat}: light foreground equals the raw accent ${accent}`).toBe(false);
    }
  });

  describe('node components carry no light-canvas literals', () => {
    const dir = join(__dirname, '..', 'components', 'workflow-view', 'nodes');
    const files = readdirSync(dir).filter((f) => /^Workflow\w+Node\.tsx$/.test(f));

    it('scans all three node components', () => {
      expect(files.sort()).toEqual(['WorkflowDecisionNode.tsx', 'WorkflowTaskNode.tsx', 'WorkflowTerminalNode.tsx']);
    });

    for (const f of ['WorkflowDecisionNode.tsx', 'WorkflowTaskNode.tsx', 'WorkflowTerminalNode.tsx']) {
      it(`${f} has no hex colour and no raw-accent text colour in code`, () => {
        const code = readFileSync(join(dir, f), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        expect(code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], 'hex literal in node code').toEqual([]);
        expect(/\bcolor:\s*n\.(accentColor|textColor)\b/.test(code), 'text colour taken from the raw accent').toBe(false);
      });
    }
  });
});

/*
  Row #255, edges. Edge strokes are meaningful non-text (they ARE the flow), so
  SC 1.4.11 (3:1) applies against the canvas they are drawn on. The map canvas
  is white in both themes (`!bg-white` on the React Flow <Background>; measured
  rgb(255,255,255) on /product dark and light), so white is the honest
  background. The old defaults were #cbd5e1 (1.48), #fca5a5 (1.90), #fbbf24
  (1.67), #9ca3af (2.54).
*/
describe('workflow-map edge strokes meet 3:1 on the white canvas — row #255', () => {
  const src = (f: string) => readFileSync(join(__dirname, '..', 'components', 'workflow-view', f), 'utf8');
  const strokes: Record<string, string> = {
    sequence: '#64748b',
    exception: '#dc2626',
    decision: '#d97706',
  };
  for (const [kind, hex] of Object.entries(strokes)) {
    it(`${kind} edge stroke ${hex} on #ffffff is >= 3:1 and is what viewModel/legend ship`, () => {
      expect(contrastRatio(hex, '#ffffff')).toBeGreaterThanOrEqual(3);
      expect(src('adapters/viewModel.ts').toLowerCase()).toContain(hex);
      expect(src('WorkflowLegend.tsx').toLowerCase()).toContain(`color="${hex}"`);
      expect(src('constants.ts').toLowerCase()).toContain(`stroke: '${hex}'`);
    });
  }
  it('arrow markers match the stroke colours in both canvases', () => {
    for (const f of ['WorkflowCanvas.tsx', 'WorkflowSwimlaneCanvas.tsx']) {
      const s = src(f).toLowerCase();
      expect(s, f).toContain('fill="#64748b"');
      expect(s, f).toContain('fill="#dc2626"');
      expect(s, f).toContain('fill="#d97706"');
    }
  });
});

// ─── Row #268: the three workflow-map views ─────────────────────────────────

/**
 * `DfgFrequencyMap`, `WorkflowSystemsMap` and `WorkflowVariantsMap` were never
 * measured (left open by loop 91). The failures were of three kinds, and the
 * guards below are shaped to catch each:
 *
 * 1. **Hard-coded light colour on a theme-dependent background** — `#9ca3af`
 *    text (2.54:1), `#fca5a5` border, and `--content-*` text on a hard-coded
 *    white strip or card (1.2:1–2.6:1 in the dark default theme). Fixed by
 *    tokens; guarded by the SOURCE SCAN below, which allows only enumerated,
 *    reasoned, counted literals.
 * 2. **Colour on the React Flow canvas.** The canvas is white in both themes
 *    (`colorMode="light"`, now explicit), so those marks are fixed pairs
 *    measured against #ffffff in `mapColors.ts`.
 * 3. **Alpha.** Opacity encodings that drop a mark under 3:1.
 *
 * Floors: 4.5:1 text (SC 1.4.3), 3:1 non-text (SC 1.4.11). The map-hue tokens
 * must clear 4.5:1 on every surface so one token serves a pill, a bare icon
 * and a bar.
 */
describe('workflow-map contrast — row #268', () => {
  const themeName = (b: 'root' | 'light') => (b === 'root' ? 'dark' : 'light');
  const SURF = ['surface-primary', 'surface-secondary', 'surface-elevated'] as const;
  const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  /** `fg` drawn at opacity `a` over opaque `bg`. */
  function over(fg: string, bg: string, a: number): string {
    const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    return '#' + [0, 1, 2].map((i) => hex2(p(fg, i) * a + p(bg, i) * (1 - a))).join('');
  }

  for (const block of ['root', 'light'] as const) {
    const t = themeName(block);

    describe(`${t} theme`, () => {
      for (const hue of ['indigo', 'violet', 'blue', 'cyan', 'orange']) {
        it(`--map-${hue}-fg clears 4.5:1 on its tint and on every surface`, () => {
          const fg = token(block, `map-${hue}-fg`);
          const tint = token(block, `map-${hue}-tint`);
          expect(contrastRatio(fg, tint), `--map-${hue}-fg on --map-${hue}-tint`).toBeGreaterThanOrEqual(4.5);
          for (const s of SURF) {
            expect(contrastRatio(fg, token(block, s)), `--map-${hue}-fg on --${s}`).toBeGreaterThanOrEqual(4.5);
          }
        });
      }

      for (const k of ['danger', 'warning', 'success']) {
        it(`--status-${k}-on-tint (used as bare text, icon, bar and dot) clears 4.5:1 on every surface`, () => {
          const fg = token(block, `status-${k}-on-tint`);
          for (const s of SURF) {
            expect(contrastRatio(fg, token(block, s)), `--status-${k}-on-tint on --${s}`).toBeGreaterThanOrEqual(4.5);
          }
        });
      }

      for (const name of ['content-secondary', 'content-tertiary']) {
        it(`--${name} text clears 4.5:1 on every surface`, () => {
          for (const s of SURF) {
            expect(contrastRatio(token(block, name), token(block, s)), `--${name} on --${s}`).toBeGreaterThanOrEqual(4.5);
          }
        });
      }

      it('divergence row wash keeps primary / secondary / tertiary text at 4.5:1', () => {
        const bg = token(block, 'map-row-warn');
        for (const name of ['content-primary', 'content-secondary', 'content-tertiary']) {
          expect(contrastRatio(token(block, name), bg), `--${name} on --map-row-warn`).toBeGreaterThanOrEqual(4.5);
        }
      });

      for (const cat of Object.keys(CATEGORY_STYLES)) {
        it(`category ordinal/label text --wf-cat-${cat} clears 4.5:1 on its accent tint (6-7%) over card and hover surfaces`, () => {
          const fg = token(block, `wf-cat-${cat}`);
          const accent = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES].color;
          // `${color}12` and `${color}10` are the two alpha tints the maps use.
          for (const alpha of [0x12 / 255, 0x10 / 255]) {
            for (const s of ['surface-elevated', 'surface-secondary'] as const) {
              const bg = over(accent, token(block, s), alpha);
              expect(contrastRatio(fg, bg), `${cat} text on ${accent}@${alpha.toFixed(2)} over --${s}`).toBeGreaterThanOrEqual(4.5);
            }
          }
        });
      }

      it('non-text marks (selected-card border, share bars, legend swatches, accent) clear 3:1 on every surface', () => {
        const marks = [
          ['--map-cyan-fg', token(block, 'map-cyan-fg')],
          ['--content-secondary', token(block, 'content-secondary')],
          ['--status-warning', token(block, 'status-warning')],
          ['--map-violet-fg', token(block, 'map-violet-fg')],
          ['EDGE_COLOR legend swatch', EDGE_COLOR],
        ] as const;
        for (const [label, fg] of marks) {
          for (const s of SURF) {
            expect(contrastRatio(fg, token(block, s)), `${label} on --${s}`).toBeGreaterThanOrEqual(3);
          }
        }
      });
    });
  }

  describe('React Flow canvas (white in BOTH themes — colorMode="light" is explicit)', () => {
    const dfg = readFileSync(join(__dirname, '..', 'components', 'workflow-view', 'DfgFrequencyMap.tsx'), 'utf8');

    it('DfgCanvas sets colorMode="light" deliberately, not by library default', () => {
      expect(dfg).toMatch(/<ReactFlow[\s\S]{0,400}colorMode="light"/);
    });

    it('edge colour is >= 3:1 on the canvas at full AND at the minimum opacity', () => {
      expect(contrastRatio(EDGE_COLOR, CANVAS_BG)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(over(EDGE_COLOR, CANVAS_BG, EDGE_MIN_OPACITY), CANVAS_BG)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(HAPPY_COLOR, CANVAS_BG)).toBeGreaterThanOrEqual(3);
    });

    it('the source opacity floor is the exported constant (a stray 0.2 would reopen the 1.2:1 edge)', () => {
      expect(dfg).toMatch(/EDGE_MIN_OPACITY \+ weight \* \(1 - EDGE_MIN_OPACITY\)/);
    });

    it('white text on the active toggle (HAPPY_COLOR) is >= 4.5:1; the old #6366f1 was not', () => {
      expect(contrastRatio('#ffffff', HAPPY_COLOR)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#ffffff', EDGE_COLOR)).toBeLessThan(4.5);
    });

    it('performance scale: every endpoint and every interpolated stop is >= 3:1, and its text >= 4.5:1', () => {
      const lerp = (a: string, b: string, k: number) => over(b, a, k);
      const stops = [PERF_FAST_COLOR, PERF_MEDIUM_COLOR, PERF_SLOW_COLOR, PERF_NEUTRAL_COLOR];
      for (let i = 0; i <= 50; i++) {
        stops.push(lerp(PERF_FAST_COLOR, PERF_MEDIUM_COLOR, i / 50), lerp(PERF_MEDIUM_COLOR, PERF_SLOW_COLOR, i / 50));
      }
      for (const c of stops) {
        expect(contrastRatio(c, CANVAS_BG), `${c} fill on canvas`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(readableTextOn(c), c), `text on ${c}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('terminals: glyph on fill >= 4.5:1; fill and border vs canvas >= 3:1', () => {
      for (const t of [TERMINAL_START, TERMINAL_END]) {
        expect(contrastRatio(TERMINAL_TEXT, t.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.bg, CANVAS_BG)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(t.border, CANVAS_BG)).toBeGreaterThanOrEqual(3);
      }
    });

    it('visit-count badge text >= 4.5:1 on its fill', () => {
      expect(contrastRatio(BADGE.text, BADGE.bg)).toBeGreaterThanOrEqual(4.5);
    });

    it('frequency node at its minimum opacity (0.7): text >= 4.5:1, border >= 3:1 (tokens resolve LIGHT here)', () => {
      const a = 0.7;
      const bg = over(token('light', 'surface-primary'), CANVAS_BG, a);
      expect(contrastRatio(over(token('light', 'content-primary'), CANVAS_BG, a), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(over(token('light', 'content-tertiary'), CANVAS_BG, a), CANVAS_BG)).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Source scan ───────────────────────────────────────────────────────────
  /**
   * Every colour LITERAL in the three files is either gone or enumerated here
   * with a count and a reason. A new `#9ca3af`, a new `text-amber-600`, a new
   * `rgba(...)` fails this test; so does an allowlisted literal that goes
   * missing (the count must stay exact, so an exemption cannot quietly grow).
   * `var(--token)` colours are not scanned — the token tests above measure
   * them. Comments are stripped first (the explanation of a fix quotes the old
   * colour).
   */
  describe('source scan — no unmeasured colour literal in the three map views', () => {
    const DIR = join(__dirname, '..', 'components', 'workflow-view');
    // The three views plus the panels row #268 names (the header, insights strip,
    // inspector, empty/error state and the variants story map embedded in the
    // variants view).
    const FILES = [
      'DfgFrequencyMap.tsx', 'WorkflowSystemsMap.tsx', 'WorkflowVariantsMap.tsx',
      'WorkflowHeader.tsx', 'WorkflowInsightsStrip.tsx', 'WorkflowInspectorPanel.tsx',
      'WorkflowEmptyState.tsx', 'WorkflowVariantStoryMap.tsx',
    ];

    // Literal -> count + why it is acceptable. 'pair' entries are re-measured below.
    const ALLOWED: Record<string, Record<string, { count: number; why: string }>> = {
      'DfgFrequencyMap.tsx': {
        '#ffffff': { count: 1, why: 'PAIR: active toggle text on HAPPY_COLOR (6.29:1, asserted above)' },
        'rgba(79,70,229,0.35)': { count: 1, why: 'decorative selection halo; selection is carried by the 2px HAPPY_COLOR border (elementsSelectable is false, so also unreachable)' },
        'rgba(0,0,0,0.10)': { count: 1, why: 'decorative drop shadow; carries no information' },
        'rgba(99,102,241,0.3)': { count: 1, why: 'decorative selection halo; selection is the 2px border' },
        'rgba(0,0,0,0.06)': { count: 1, why: 'decorative drop shadow' },
      },
      'WorkflowSystemsMap.tsx': {
        'rgba(8,145,178,0.12)': { count: 1, why: 'decorative selection halo; selection is the cyan border (>= 3:1, asserted above)' },
        'rgba(0,0,0,0.06)': { count: 1, why: 'decorative drop shadow' },
        'rgba(0,0,0,0.04)': { count: 1, why: 'decorative drop shadow' },
      },
      // Fixed light tint PAIRS (asserted in 'named panels' below): every one passes
      // in both themes because both sides are fixed. Borders are decorative: the
      // chip is identified by its text and fill.
      'WorkflowHeader.tsx': {
        'text-amber-700': { count: 2, why: 'PAIR on bg-amber-50' }, 'bg-amber-50': { count: 2, why: 'PAIR' }, 'border-amber-200': { count: 2, why: 'decorative chip outline' },
        'text-red-700': { count: 1, why: 'PAIR on bg-red-50' }, 'bg-red-50': { count: 1, why: 'PAIR' }, 'border-red-200': { count: 1, why: 'decorative chip outline' },
        'text-emerald-700': { count: 1, why: 'PAIR on bg-emerald-50' }, 'bg-emerald-50': { count: 1, why: 'PAIR' }, 'border-emerald-200': { count: 1, why: 'decorative chip outline' },
      },
      'WorkflowInsightsStrip.tsx': {
        'bg-red-50': { count: 1, why: 'PAIR with text-red-700' }, 'text-red-700': { count: 1, why: 'PAIR' }, 'border-red-200': { count: 1, why: 'decorative chip outline' }, 'bg-red-500': { count: 1, why: 'decorative 4px status dot; severity is carried by the chip text and icon' },
        'bg-amber-50': { count: 1, why: 'PAIR with text-amber-700' }, 'text-amber-700': { count: 1, why: 'PAIR' }, 'border-amber-200': { count: 1, why: 'decorative chip outline' }, 'bg-amber-500': { count: 1, why: 'decorative 4px status dot' },
        'bg-blue-50': { count: 1, why: 'PAIR with text-blue-700' }, 'text-blue-700': { count: 1, why: 'PAIR' }, 'border-blue-200': { count: 1, why: 'decorative chip outline' }, 'bg-blue-500': { count: 1, why: 'decorative 4px status dot' },
      },
      'WorkflowInspectorPanel.tsx': {
        'text-red-700': { count: 1, why: 'PAIR on bg-red-50 (edge-type chip)' }, 'bg-red-50': { count: 1, why: 'PAIR' },
      },
      'WorkflowEmptyState.tsx': {
        'bg-emerald-50/60': { count: 1, why: 'loading-skeleton placeholder shape; no information' }, 'border-emerald-100': { count: 1, why: 'loading-skeleton placeholder outline' },
      },
      'WorkflowVariantStoryMap.tsx': {
        '#059669': { count: 2, why: 'backbone accent (decision border) + spine edge stroke, both on the light canvas (asserted below)' },
        '#d97706': { count: 2, why: 'branch accent + branch edge stroke on the light canvas (asserted below)' },
        '#ecfdf5': { count: 1, why: 'PAIR: backbone node fill under --wf-cat-* text' },
        '#fffbeb': { count: 2, why: 'PAIR: branch node fill + edge-label fill' },
        '#64748b': { count: 1, why: 'shortcut edge stroke on the light canvas (4.76:1)' },
        '#92400e': { count: 1, why: 'PAIR: edge-label text on #fffbeb' },
        'text-amber-700': { count: 1, why: 'PAIR: "diverges" on #fffbeb' },
        'text-emerald-600': { count: 1, why: 'header icon; non-text, measured against every surface below' },
        'accent-emerald-600': { count: 1, why: 'range-input control colour; non-text, measured against every surface below' },
      },
      'WorkflowVariantsMap.tsx': {
        'bg-violet-600': { count: 5, why: 'PAIR: fixed fill under text-white (5.70:1, asserted below); 4 view-toggle buttons + 1 CTA' },
        'text-white': { count: 5, why: 'PAIR: white on bg-violet-600' },
        'bg-violet-700': { count: 1, why: 'PAIR: CTA hover fill under text-white (7.10:1)' },
      },
    };

    const COLOUR_LITERAL = new RegExp(
      [
        String.raw`#[0-9a-fA-F]{3,8}\b`,
        String.raw`rgba?\([^)]*\)`,
        String.raw`\b(?:text|bg|border(?:-[trblxyse])?|ring|stroke|fill|from|via|to|divide|accent|outline|decoration|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:/\d+)?(?![\w-])`,
        String.raw`\b(?:text|bg|border(?:-[trblxyse])?|fill|stroke)-(?:white|black)(?![\w-])`,
      ].join('|'),
      'g',
    );

    const strip = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).join('\n');

    for (const file of FILES) {
      it(`${file}: every colour literal is allowlisted, reasoned and counted`, () => {
        const text = strip(readFileSync(join(DIR, file), 'utf8'));
        const found = new Map<string, number>();
        for (const m of text.matchAll(COLOUR_LITERAL)) found.set(m[0], (found.get(m[0]) ?? 0) + 1);

        const allowed = ALLOWED[file] ?? {};
        const problems: string[] = [];
        for (const [lit, n] of found) {
          const a = allowed[lit];
          if (!a) problems.push(`${file}: unmeasured colour literal ${lit} x${n}. Use a token from globals.css, or measure it and add it here with a reason.`);
          else if (a.count !== n) problems.push(`${file}: ${lit} allowlisted x${a.count}, found x${n}. An exemption must not grow (or shrink) silently.`);
        }
        for (const lit of Object.keys(allowed)) {
          if (!found.has(lit)) problems.push(`${file}: allowlisted ${lit} no longer present — delete the entry.`);
        }
        expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
      });
    }

    it('the scan is not vacuous: it sees the known allowlisted literals', () => {
      const v = strip(readFileSync(join(DIR, 'WorkflowVariantsMap.tsx'), 'utf8'));
      expect((v.match(COLOUR_LITERAL) ?? []).length).toBeGreaterThanOrEqual(11);
      // The pattern must catch each form that actually failed before.
      for (const bad of ['#9ca3af', '#fca5a5', 'text-amber-600', 'bg-red-50', 'rgba(255,255,255,0.97)', 'accent-violet-600', 'border-t-violet-600']) {
        COLOUR_LITERAL.lastIndex = 0;
        expect(COLOUR_LITERAL.test(`x="${bad}"`), bad).toBe(true);
      }
    });

    it('PAIRs: white on violet-600 >= 4.5:1 and on violet-700 >= 4.5:1', () => {
      expect(contrastRatio('#ffffff', '#7c3aed')).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#ffffff', '#6d28d9')).toBeGreaterThanOrEqual(4.5);
    });

    it('named panels: fixed -700 text on its -50 fill is >= 4.5:1 (header chips, insight chips, edge-type chip)', () => {
      const pairs: Array<[string, string, string]> = [
        ['amber-700 on amber-50', '#b45309', '#fffbeb'],
        ['red-700 on red-50', '#b91c1c', '#fef2f2'],
        ['emerald-700 on emerald-50', '#047857', '#ecfdf5'],
        ['blue-700 on blue-50', '#1d4ed8', '#eff6ff'],
      ];
      for (const [label, fg, bg] of pairs) expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(4.5);
    });

    it('story map (light canvas in both themes): label tokens, edge strokes, node borders, label text', () => {
      for (const cat of Object.keys(CATEGORY_STYLES)) {
        for (const fill of ['#ecfdf5', '#fffbeb']) {
          expect(contrastRatio(token('light', `wf-cat-${cat}`), fill), `--wf-cat-${cat} on ${fill}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrastRatio('#92400e', '#fffbeb'), 'edge label text').toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#b45309', '#fffbeb'), '"diverges" text').toBeGreaterThanOrEqual(4.5);
      for (const [label, hex] of [['spine', '#059669'], ['shortcut', '#64748b'], ['branch', '#d97706']] as const) {
        expect(contrastRatio(hex, CANVAS_BG), `${label} edge on canvas`).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio('#059669', '#ecfdf5'), 'backbone decision border on its fill').toBeGreaterThanOrEqual(3);
      expect(contrastRatio('#d97706', '#fffbeb'), 'branch decision border on its fill').toBeGreaterThanOrEqual(3);
      expect(readFileSync(join(DIR, 'WorkflowVariantStoryMap.tsx'), 'utf8')).toMatch(/<ReactFlow[\s\S]{0,300}colorMode="light"/);
    });

    it('story map header icon / slider (#059669, page-theme backed) clear 3:1 on every surface in both themes', () => {
      for (const block of ['root', 'light'] as const) {
        for (const s of SURF) expect(contrastRatio('#059669', token(block, s)), `#059669 on --${s} (${themeName(block)})`).toBeGreaterThanOrEqual(3);
      }
    });
  });
});
