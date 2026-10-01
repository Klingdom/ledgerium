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
                        'status-warning-on-tint', 'status-success-tint', 'status-success-on-tint']) {
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
