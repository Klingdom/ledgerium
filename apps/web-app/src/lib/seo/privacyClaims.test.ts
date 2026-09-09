/**
 * Regression lock for the corrected privacy claims.
 *
 * PRIVACY_CLAIM_CORRECTION_001: `apps/extension-app/src/content/label-extractor.ts`
 * reads and transmits the visible `innerText` of any clicked/focused
 * `<div>`/`<span>` (up to 40 chars / 5 words), filtered only by pattern-match
 * (email/URL/phone/SSN/card-shape). Names, addresses, dollar amounts,
 * reference numbers, and masked card last-4s pass the filter and are
 * transmitted as "labels." Several public-facing pages nonetheless asserted
 * Ledgerium "never captures screen content" and that there was "no risk of
 * capturing sensitive data visible on screen" — both false. This file locks
 * the correction: no public-facing copy may claim Ledgerium is
 * screen-content-free (an absolute negation), because it is not — it reads
 * short visible label text, which can contain sensitive on-screen data.
 *
 * The corrected copy is allowed to *volunteer the boundary* using hyphenated
 * phrasing like "screen-content-free" or "zero-screen-content" (i.e. "it
 * isn't screen-content-free") — that is an honest disclosure, not the
 * overclaim. This lock specifically targets the retired absolute-negation
 * phrasing "screen content" (unhyphenated, asserted as something Ledgerium
 * does not capture) and "no risk of capturing sensitive data".
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is .../apps/web-app/src/lib/seo

const CORRECTED_FILES = [
  resolve(__dirname, '..', '..', 'app', '(public)', 'security', 'page.tsx'),
  resolve(__dirname, '..', '..', 'app', '(public)', 'methodology', 'page.tsx'),
  resolve(__dirname, '..', '..', 'app', '(public)', 'compare', 'scribe', 'page.tsx'),
  resolve(__dirname, '..', '..', 'content', 'pages', 'alternatives.ts'),
  resolve(__dirname, '..', '..', 'content', 'pages', 'compare.ts'),
];

// The retired absolute-negation phrase — "screen content" with a space,
// asserted as something Ledgerium does not capture. The corrected copy uses
// hyphenated forms ("screen-content-free", "zero-screen-content") to
// honestly volunteer the boundary instead, which this pattern does not match.
const RETIRED_SCREEN_CONTENT_CLAIM = /screen content/i;
const RETIRED_NO_RISK_CLAIM = /no risk of capturing sensitive data/i;

describe('privacy claim correction — screen-content overclaim retired', () => {
  it.each(CORRECTED_FILES)('%s no longer asserts the unhyphenated "screen content" absolute-negation claim', (file) => {
    const text = readFileSync(file, 'utf8');
    expect(text).not.toMatch(RETIRED_SCREEN_CONTENT_CLAIM);
  });

  it.each(CORRECTED_FILES)('%s no longer asserts "no risk of capturing sensitive data"', (file) => {
    const text = readFileSync(file, 'utf8');
    expect(text).not.toMatch(RETIRED_NO_RISK_CLAIM);
  });

  it('the corrected scribe-compare FAQ answer honestly volunteers the screen-content-free boundary instead of overclaiming it', () => {
    const file = resolve(__dirname, '..', '..', 'app', '(public)', 'compare', 'scribe', 'page.tsx');
    const text = readFileSync(file, 'utf8');
    expect(text).toContain("isn't screen-content-free");
  });

  it('the corrected Tango-compare FAQ answer honestly volunteers the boundary instead of overclaiming it', () => {
    const file = resolve(__dirname, '..', '..', 'content', 'pages', 'compare.ts');
    const text = readFileSync(file, 'utf8');
    expect(text).toContain("isn't a zero-screen-content tool");
  });

  it('the screen-recording comparison table row is corrected to compare video capture, not an absolute "no screen content" claim', () => {
    const file = resolve(__dirname, '..', '..', 'content', 'pages', 'compare.ts');
    const text = readFileSync(file, 'utf8');
    expect(text).toContain("label: 'Records screen video'");
    expect(text).not.toContain("label: 'Captures screen content'");
  });
});
