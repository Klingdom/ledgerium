/**
 * Blocks.tsx — install pathway added to the shared SEO/AEO blocks
 * (SEO_AEO_CONTENT_STRATEGY_001 Tier 1 item 4: no content page linked to
 * `/install`, the Chrome-extension install route).
 *
 * Environment: Vitest (node) — this workspace's default (see
 * apps/web-app/vitest.config.ts and the identical convention in
 * HubPageView.test.tsx / SopExportPanel.test.tsx / WorkflowRow.test.tsx: no
 * jsdom, no React rendering, no calling into `.tsx` component functions —
 * this workspace's `.tsx` source relies on Next.js's own JSX runtime
 * injection at build time, which isn't present under plain `tsx`/esbuild
 * execution (confirmed empirically: calling `HowLedgeriumCaptures(...)`
 * directly here throws `ReferenceError: React is not defined`). This suite
 * therefore follows the established pattern: exercise the exported pure
 * function directly (`installLinkLabel`), mirror the click→track() behavior
 * (identical to `runHubPageViewEffect` in HubPageView.test.tsx — TrackedLink's
 * own `onClick` is `track({ event: eventName, ...properties })`, verbatim,
 * see `@/components/TrackedLink`), and fall back to source-text assertions
 * (readFileSync, the SopExportPanel.test.tsx / WorkflowRow.test.tsx
 * precedent) for the JSX shape a node environment cannot render.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

import { track } from '@/lib/analytics.js';
import { resolveInstallTarget } from '@/lib/install.js';
import { installLinkLabel } from './Blocks.js';

const trackMock = vi.mocked(track);

beforeEach(() => {
  trackMock.mockReset();
});

// ── Mirror of TrackedLink's onClick for the seo_install_clicked event ──────
// TrackedLink's handler is `track({ event: eventName, ...(properties ?? {}) })`
// wrapped in try/catch (see @/components/TrackedLink.tsx) — reproduced
// verbatim for the exact properties shape this iteration's two install links
// pass, matching the HubPageView.test.tsx mirror-test precedent.

function fireSeoInstallClick(pageType: string, slug: string, placement: 'mechanism' | 'footer_cta'): void {
  try {
    track({ event: 'seo_install_clicked', pageType, slug, placement });
  } catch {
    // analytics must never break navigation
  }
}

// ── installLinkLabel: resolved from the resolver, never hardcoded ─────────

describe('installLinkLabel: resolved from resolveInstallTarget, never a hardcoded store URL', () => {
  it('reads "Install the extension" for the direct-download (sideload) method', () => {
    expect(installLinkLabel('direct_download')).toBe('Install the extension');
  });

  it('reads "Add to Chrome" for the web_store method — flips automatically once published', () => {
    expect(installLinkLabel('web_store')).toBe('Add to Chrome');
  });

  it('never claims a one-click Chrome Web Store install while unpublished', () => {
    expect(installLinkLabel('direct_download')).not.toMatch(/add to chrome/i);
  });

  it('defaults to the live resolveInstallTarget().method when no method is supplied', () => {
    // Ground truth as of this iteration: EXTENSION_CONFIG.chromeStoreUrl is
    // still the placeholder (lib/config.ts), so the resolver reports
    // direct_download and the default label must match — proving the
    // default argument is actually wired to the resolver, not a literal.
    const live = resolveInstallTarget();
    expect(live.method).toBe('direct_download');
    expect(installLinkLabel()).toBe(installLinkLabel(live.method));
  });
});

// ── Click behavior: both placements fire seo_install_clicked correctly ────

describe('seo_install_clicked: fires with the correct page identity and placement', () => {
  it('mechanism placement carries { pageType, slug, placement: "mechanism" }', () => {
    fireSeoInstallClick('industry', 'healthcare', 'mechanism');

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      event: 'seo_install_clicked',
      pageType: 'industry',
      slug: 'healthcare',
      placement: 'mechanism',
    });
  });

  it('footer_cta placement carries { pageType, slug, placement: "footer_cta" }', () => {
    fireSeoInstallClick('sopTemplate', 'invoice-approval', 'footer_cta');

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      event: 'seo_install_clicked',
      pageType: 'sopTemplate',
      slug: 'invoice-approval',
      placement: 'footer_cta',
    });
  });

  it('the two placements are distinguishable from each other', () => {
    fireSeoInstallClick('industry', 'healthcare', 'mechanism');
    fireSeoInstallClick('industry', 'healthcare', 'footer_cta');

    expect(trackMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ placement: 'mechanism' }));
    expect(trackMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ placement: 'footer_cta' }));
  });

  it('does not throw when track() itself throws (must never break navigation)', () => {
    trackMock.mockImplementationOnce(() => {
      throw new Error('simulated analytics failure');
    });
    expect(() => fireSeoInstallClick('industry', 'healthcare', 'mechanism')).not.toThrow();
  });
});

// ── Source-level assertions (node env — no DOM render) ─────────────────────

describe('Blocks.tsx: HowLedgeriumCaptures mechanism step renders a real /install link', () => {
  const src = readFileSync(fileURLToPath(new URL('./Blocks.tsx', import.meta.url)), 'utf8');
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('defines the /install destination as a constant, not an inline literal scattered through the file', () => {
    expect(codeOnly).toMatch(/const INSTALL = '\/install';/);
  });

  it('the "Install the extension" step carries href: INSTALL — the other two steps do not', () => {
    const stepsMatch = codeOnly.match(/const steps = \[([\s\S]*?)\];/);
    expect(stepsMatch).not.toBeNull();
    const stepsBlock = stepsMatch![1]!;
    const stepLines = stepsBlock.split(/\},?\s*\n/).filter((l) => l.trim().length > 0);
    expect(stepLines).toHaveLength(3);
    expect(stepLines[0]).toContain('href: INSTALL');
    expect(stepLines[1]).toContain('href: null');
    expect(stepLines[2]).toContain('href: null');
  });

  it('renders a TrackedLink for the install step firing seo_install_clicked with placement "mechanism"', () => {
    expect(codeOnly).toMatch(
      /href=\{href\}\s*\n\s*event="seo_install_clicked"\s*\n\s*properties=\{\{ pageType, slug, placement: 'mechanism' \}\}/,
    );
  });

  it('the mechanism install link is not styled as a competing primary CTA (no btn-primary)', () => {
    const linkMatch = codeOnly.match(/<TrackedLink\s+href=\{href\}[\s\S]*?<\/TrackedLink>/);
    expect(linkMatch).not.toBeNull();
    expect(linkMatch![0]).not.toContain('btn-primary');
  });

  it('the label text is the resolver-driven installLinkLabel(), not a hardcoded string', () => {
    expect(codeOnly).toMatch(/const installLabel = installLinkLabel\(\);/);
    expect(codeOnly).toMatch(/title: installLabel,/);
  });
});

describe('Blocks.tsx: FinalCta footer placement is a peer, not a replacement', () => {
  const src = readFileSync(fileURLToPath(new URL('./Blocks.tsx', import.meta.url)), 'utf8');
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const start = codeOnly.indexOf('export function FinalCta');
  const afterStart = codeOnly.slice(start + 1);
  const nextExportOffset = afterStart.search(/\nexport function /);
  const body = start === -1
    ? ''
    : codeOnly.slice(start, nextExportOffset === -1 ? codeOnly.length : start + 1 + nextExportOffset);

  it('FinalCta is found and contains exactly one btn-primary CTA (the original signup button)', () => {
    expect(start).not.toBe(-1);
    const primaryOccurrences = body.match(/btn-primary/g) ?? [];
    expect(primaryOccurrences).toHaveLength(1);
    // The one btn-primary link is still the signup CTA.
    expect(body).toMatch(/href=\{SIGNUP\}[\s\S]{0,200}btn-primary/);
  });

  it('renders exactly one seo_install_clicked TrackedLink pointed at INSTALL with placement "footer_cta"', () => {
    const installOccurrences = body.match(/seo_install_clicked/g) ?? [];
    expect(installOccurrences).toHaveLength(1);
    expect(body).toMatch(
      /href=\{INSTALL\}\s*\n\s*event="seo_install_clicked"\s*\n\s*properties=\{\{ pageType, slug, placement: 'footer_cta' \}\}/,
    );
  });

  it('the footer install link is not styled as a competing primary CTA (no btn-primary)', () => {
    const linkMatch = body.match(/<TrackedLink\s+href=\{INSTALL\}[\s\S]*?<\/TrackedLink>/);
    expect(linkMatch).not.toBeNull();
    expect(linkMatch![0]).not.toContain('btn-primary');
  });

  it('the supporting copy is a single short clause, not a new sales pitch', () => {
    // Exactly one new sentence of copy was added alongside the install link
    // ("Or <link> first."); the pre-existing free-plan disclaimer sentence
    // is untouched.
    expect(body).toContain('Free plan includes 5 documented workflows per month. No screenshots ever captured.');
    expect(body).toMatch(/Or\{' '\}[\s\S]{0,20}<TrackedLink\s+href=\{INSTALL\}/);
    expect(body).toMatch(/<\/TrackedLink>\{' '\}\s*\n\s*first\./);
  });

  it('accepts pageType and slug as required props (so the two placements are distinguishable per-page)', () => {
    expect(codeOnly).toMatch(/export function FinalCta\(\{[\s\S]{0,120}pageType,\s*\n\s*slug,/);
  });
});

describe('Blocks.tsx: honesty constraint — no hardcoded Chrome Web Store URL', () => {
  const src = readFileSync(fileURLToPath(new URL('./Blocks.tsx', import.meta.url)), 'utf8');
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('imports resolveInstallTarget from the shared resolver module', () => {
    expect(codeOnly).toMatch(/import\s+\{[^}]*resolveInstallTarget[^}]*\}\s+from\s+'@\/lib\/install'/);
  });

  it('never hardcodes a Chrome Web Store domain or the placeholder marker', () => {
    expect(codeOnly).not.toMatch(/chrome\.google\.com/i);
    expect(codeOnly).not.toMatch(/chromewebstore\.google\.com/i);
    expect(codeOnly).not.toContain('placeholder');
  });

  it('the label helper resolves the method from resolveInstallTarget(), not a literal', () => {
    expect(codeOnly).toMatch(
      /export function installLinkLabel\(method: InstallMethod = resolveInstallTarget\(\)\.method\)/,
    );
  });

  it('"Add to Chrome" appears exactly once — only as the resolver-driven return value, never as duplicated static copy', () => {
    const occurrences = codeOnly.match(/Add to Chrome/g) ?? [];
    expect(occurrences.length).toBe(1);
  });
});

// ── Integration: every SEO PageView wires page identity into both blocks ──

describe('every SEO content PageView passes pageType/slug into both install placements', () => {
  const dir = fileURLToPath(new URL('.', import.meta.url));
  const pageViewFiles = readdirSync(dir).filter((f) => /PageView\.tsx$/.test(f));

  // HubPageView / SeoPageView are index/router shells, not content pages —
  // they never render HowLedgeriumCaptures or FinalCta.
  const contentPageViews = pageViewFiles.filter(
    (f) => f !== 'HubPageView.tsx' && f !== 'SeoPageView.tsx',
  );

  it('found the expected 12 content PageView components', () => {
    expect(contentPageViews.length).toBe(12);
  });

  for (const file of contentPageViews) {
    it(`${file}: HowLedgeriumCaptures + FinalCta both receive pageType/slug`, () => {
      const fileSrc = readFileSync(`${dir}/${file}`, 'utf8');

      expect(fileSrc).toMatch(
        /<HowLedgeriumCaptures\s+pageType=\{page\.type\}\s+slug=\{page\.slug\}/,
      );
      expect(fileSrc).toMatch(/<FinalCta\s*\r?\n\s*pageType=\{page\.type\}\s*\r?\n\s*slug=\{page\.slug\}/);
    });

    it(`${file}: gained no competing primary CTA`, () => {
      const fileSrc = readFileSync(`${dir}/${file}`, 'utf8');
      // This iteration adds zero new `btn-primary`-classed elements directly
      // inside any PageView file — every primary button still comes from
      // the shared Blocks.tsx SeoHero/MidCta/FinalCta components, which each
      // render exactly one signup CTA.
      expect(fileSrc).not.toContain('btn-primary');
    });
  }
});
