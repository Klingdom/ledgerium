/**
 * SopExportPanel — download/copy affordances on `/sop-templates/[slug]`.
 *
 * Environment: Vitest `node` (this workspace's default; see
 * apps/web-app/vitest.config.ts and the identical convention in
 * HubPageView.test.tsx / WorkflowRow.test.tsx / DashboardV2Shell.test.tsx —
 * no jsdom, no React rendering). This suite exercises the exported pure
 * helper functions directly (`sopDownloadHref`, `trackSopDownload`,
 * `copySopMarkdown`, `shouldShowPostDownloadOffer`) rather than mounting the
 * component, and falls back to source-text assertions (readFileSync,
 * matching the WorkflowRow.test.tsx precedent) for the two things that can
 * only be verified against the rendered JSX in a node environment: the
 * failure copy string, and the absence of any client-side regeneration of
 * the markdown document.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

import { track } from '@/lib/analytics.js';
import {
  sopDownloadHref,
  trackSopDownload,
  copySopMarkdown,
  shouldShowPostDownloadOffer,
  SopExportPanel,
} from './SopExportPanel.js';

const trackMock = vi.mocked(track);

beforeEach(() => {
  trackMock.mockReset();
});

// ── sopDownloadHref: per-slug download route ──────────────────────────────

describe('sopDownloadHref: per-slug download route', () => {
  it('builds /sop-templates/<slug>/download.md for a given slug', () => {
    expect(sopDownloadHref('invoice-approval')).toBe('/sop-templates/invoice-approval/download.md');
  });

  it('is slug-specific — different slugs produce different hrefs', () => {
    expect(sopDownloadHref('incident-management')).toBe('/sop-templates/incident-management/download.md');
    expect(sopDownloadHref('password-reset')).toBe('/sop-templates/password-reset/download.md');
    expect(sopDownloadHref('invoice-approval')).not.toBe(sopDownloadHref('password-reset'));
  });
});

// ── trackSopDownload: analytics on the download anchor click ──────────────

describe('trackSopDownload: fires seo_template_downloaded(method: download)', () => {
  it('calls track with the correct event shape for the given slug', () => {
    trackSopDownload('invoice-approval');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      event: 'seo_template_downloaded',
      slug: 'invoice-approval',
      format: 'markdown',
      method: 'download',
    });
  });

  it('does not throw when track() itself throws (must never break navigation)', () => {
    trackMock.mockImplementationOnce(() => {
      throw new Error('simulated analytics failure');
    });
    expect(() => trackSopDownload('invoice-approval')).not.toThrow();
  });
});

// ── copySopMarkdown: clipboard success/failure + analytics gating ─────────

describe('copySopMarkdown: success emits analytics with method "copy"', () => {
  it('resolves "success" and calls track exactly once on a successful writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const result = await copySopMarkdown('# SOP body', 'invoice-approval', writeText);

    expect(result).toBe('success');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      event: 'seo_template_downloaded',
      slug: 'invoice-approval',
      format: 'markdown',
      method: 'copy',
    });
  });

  it('passes the markdown argument through to writeText verbatim (not regenerated)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const markdown = '# Invoice approval SOP\n\n[fill in: approver name or title]\n';

    await copySopMarkdown(markdown, 'invoice-approval', writeText);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(markdown);
  });

  it('a different markdown prop value is copied verbatim too (no transformation, no caching)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const otherMarkdown = '# Incident management SOP\n\nSomething entirely different.\n';

    await copySopMarkdown(otherMarkdown, 'incident-management', writeText);

    expect(writeText).toHaveBeenCalledWith(otherMarkdown);
  });
});

describe('copySopMarkdown: failure emits NO analytics', () => {
  it('resolves "error" and does not call track when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));

    const result = await copySopMarkdown('# SOP body', 'invoice-approval', writeText);

    expect(result).toBe('error');
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('resolves "error" when writeText throws synchronously (insecure context)', async () => {
    const writeText = vi.fn(() => {
      throw new Error('clipboard write is not allowed in this context');
    });

    const result = await copySopMarkdown('# SOP body', 'invoice-approval', writeText);

    expect(result).toBe('error');
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('a throwing track() on the success path does not propagate (UI must not break)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    trackMock.mockImplementationOnce(() => {
      throw new Error('simulated analytics failure');
    });

    await expect(copySopMarkdown('# SOP body', 'invoice-approval', writeText)).resolves.toBe('success');
  });
});

// ── shouldShowPostDownloadOffer: hidden initially, shown after either action ─

describe('shouldShowPostDownloadOffer: hidden initially, shown after either action', () => {
  it('is hidden before any download or copy has occurred', () => {
    expect(shouldShowPostDownloadOffer(false, 'idle')).toBe(false);
  });

  it('is shown once the download anchor has been clicked', () => {
    expect(shouldShowPostDownloadOffer(true, 'idle')).toBe(true);
  });

  it('is shown once a copy has succeeded', () => {
    expect(shouldShowPostDownloadOffer(false, 'success')).toBe(true);
  });

  it('is NOT shown on a failed copy alone — a failure did not obtain the file', () => {
    expect(shouldShowPostDownloadOffer(false, 'error')).toBe(false);
  });

  it('stays shown once both a download and a successful copy have happened', () => {
    expect(shouldShowPostDownloadOffer(true, 'success')).toBe(true);
  });

  it('a download click wins even if a copy attempt later fails', () => {
    expect(shouldShowPostDownloadOffer(true, 'error')).toBe(true);
  });
});

// ── Component surface ──────────────────────────────────────────────────────

describe('SopExportPanel: component surface', () => {
  it('is a function component', () => {
    expect(typeof SopExportPanel).toBe('function');
  });
});

// ── Source-level assertions (node env — no DOM render) ─────────────────────

describe('SopExportPanel: markdown is passed through, never regenerated client-side', () => {
  const src = readFileSync(fileURLToPath(new URL('./SopExportPanel.tsx', import.meta.url)), 'utf8');
  // Strip comments so the docblock's own explanation of what this file does
  // NOT do (which necessarily names the forbidden import/call) doesn't
  // trip these assertions — only executable code is checked here, matching
  // the WorkflowRow.test.tsx `codeOnly` precedent.
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('does not import the sop-export renderer', () => {
    expect(codeOnly).not.toContain('@/lib/sop-export');
    expect(codeOnly).not.toContain('renderSopTemplateMarkdown');
  });

  it('does not fetch the .md route at runtime', () => {
    expect(codeOnly).not.toMatch(/\bfetch\s*\(/);
  });

  it('the copy handler reads the markdown prop, not a derived/local value', () => {
    expect(codeOnly).toMatch(/copySopMarkdown\(markdown,\s*slug,/);
  });
});

describe('SopExportPanel: verbatim copy present in source (docs/meta/SEO_AEO_CONTENT_STRATEGY_001/sop_export_copy.md)', () => {
  const src = readFileSync(fileURLToPath(new URL('./SopExportPanel.tsx', import.meta.url)), 'utf8');

  it('renders the exact download CTA + supporting sentence (§1)', () => {
    expect(src).toContain('Download the template');
    expect(src).toContain('Markdown file. Opens in any editor or wiki — no account needed.');
  });

  it('renders the exact copy button + success + failure strings (§2)', () => {
    expect(src).toContain('Copy to clipboard');
    expect(src).toContain('Copied.');
    expect(src).toContain("Couldn&apos;t copy — download it instead.");
  });

  it('the failure string is rendered only when copyState is "error"', () => {
    expect(src).toMatch(/copyState === 'error'[\s\S]{0,80}Couldn&apos;t copy/);
  });

  it('renders the exact post-download offer heading, body, and CTA (§4)', () => {
    expect(src).toContain('Filling this in by hand?');
    expect(src).toContain(
      'This template is blank on purpose — you still have to name your roles, thresholds, and',
    );
    expect(src).toContain('Free includes 5 recordings a month.');
    expect(src).toContain('Try it on a real run');
  });

  it('the failure/success status text is announced via role="status" aria-live="polite"', () => {
    expect(src).toMatch(/role="status"\s+aria-live="polite"/);
  });

  it('the post-download offer contains zero gating (no email input, no modal)', () => {
    expect(src).not.toMatch(/type=["']email["']/);
    expect(src).not.toContain('<Modal');
    expect(src).not.toContain('<Dialog');
  });
});
