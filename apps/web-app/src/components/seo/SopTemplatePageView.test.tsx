/**
 * SopTemplatePageView — server-side wiring of the "Get this SOP" section.
 *
 * Environment: Vitest `node` (this workspace's default; no jsdom, no React
 * rendering — see HubPageView.test.tsx / WorkflowRow.test.tsx for the
 * identical convention). `SopTemplatePageView` is a Server Component, so
 * this suite verifies the build-time contract via source-text assertions:
 * `renderSopTemplateMarkdown()` is called once, server-side, and its result
 * is threaded down to `SopExportPanel` as a plain string prop — never
 * fetched or regenerated client-side (see SopExportPanel.test.tsx for the
 * client-side half of this same contract).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const src = readFileSync(fileURLToPath(new URL('./SopTemplatePageView.tsx', import.meta.url)), 'utf8');

describe('SopTemplatePageView: markdown is rendered once, server-side', () => {
  it('imports renderSopTemplateMarkdown from the sop-export lib', () => {
    expect(src).toMatch(/import\s*\{\s*renderSopTemplateMarkdown\s*\}\s*from\s*'@\/lib\/sop-export'/);
  });

  it('calls renderSopTemplateMarkdown exactly once, in the component body (not per-render effect)', () => {
    const matches = src.match(/renderSopTemplateMarkdown\(page\)/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('passes the resulting markdown down to SopExportPanel as a prop, not re-derived', () => {
    expect(src).toMatch(/<SopExportPanel\s+slug=\{[^}]+\}\s+markdown=\{markdown\}\s*\/>/);
  });
});

describe('SopTemplatePageView: "Get this SOP" section placement', () => {
  it('is placed after the hero/shortAnswer + data-point callout, before Key takeaways — not buried at the bottom', () => {
    const heroIdx = src.indexOf('<SeoHero');
    const dataPointIdx = src.indexOf('<DataPointCallout');
    const downloadSectionIdx = src.indexOf('<SopDownloadSection');
    const keyTakeawaysIdx = src.indexOf('<KeyTakeaways');
    const finalCtaIdx = src.indexOf('<FinalCta');

    expect(heroIdx).toBeGreaterThan(-1);
    expect(dataPointIdx).toBeGreaterThan(heroIdx);
    expect(downloadSectionIdx).toBeGreaterThan(dataPointIdx);
    expect(downloadSectionIdx).toBeLessThan(keyTakeawaysIdx);
    // Sanity check it is nowhere near the bottom of the page.
    expect(downloadSectionIdx).toBeLessThan(finalCtaIdx);
  });
});

describe('SopTemplatePageView: honest-limitation line styled like the existing HonestLimitation convention', () => {
  it('reuses the "Worth knowing" eyebrow + paragraph shape', () => {
    expect(src).toMatch(/Worth knowing/);
    expect(src).toContain(
      "This is a blank starting structure — it doesn&apos;t know your roles, thresholds, or systems.",
    );
  });
});
