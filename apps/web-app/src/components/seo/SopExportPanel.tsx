'use client';

/**
 * SopExportPanel — the interactive "Get this SOP" controls (download,
 * copy-to-clipboard, and the post-download upsell) on a
 * `/sop-templates/[slug]` page.
 *
 * This is the ONLY client boundary this feature introduces; the page and the
 * rest of the "Get this SOP" section shell (heading, honest-limitation line)
 * stay in the Server Component (`SopTemplatePageView.tsx`).
 *
 * `markdown` is rendered server-side by `SopTemplatePageView` via
 * `renderSopTemplateMarkdown()` (see `@/lib/sop-export`, out of scope for
 * this file) and passed down here as a plain string prop. This component
 * deliberately does NOT import `@/lib/sop-export` and does NOT `fetch()` the
 * `.md` route at runtime — it only reads the prop it was given, so the copy
 * button always copies exactly the same bytes the download anchor would
 * fetch (and that the static `/sop-templates/<slug>/download.md` route
 * serves — see that route's `route.ts` for the server side of this contract).
 *
 * Copy source of truth (verbatim, do not reword):
 * docs/meta/SEO_AEO_CONTENT_STRATEGY_001/sop_export_copy.md §1 / §2 / §4.
 */

import { useState } from 'react';
import { TrackedLink } from '@/components/TrackedLink';
import { track } from '@/lib/analytics';

export type SopCopyState = 'idle' | 'success' | 'error';

/**
 * The static download route served by `download.md/route.ts` (out of scope
 * for this iteration). Kept as a pure, directly-testable function so the
 * per-slug href is verified without rendering the component.
 */
export function sopDownloadHref(slug: string): string {
  return `/sop-templates/${slug}/download.md`;
}

/**
 * Fires `seo_template_downloaded` for the download anchor. Called from the
 * anchor's `onClick` — it never calls `preventDefault()` and never blocks
 * the native `download` navigation; a thrown `track()` is swallowed so a
 * broken analytics pipe can never break the file download.
 */
export function trackSopDownload(slug: string): void {
  try {
    track({ event: 'seo_template_downloaded', slug, format: 'markdown', method: 'download' });
  } catch {
    // analytics must never break navigation
  }
}

/**
 * Copies `markdown` verbatim via the injected `writeText` (real callers pass
 * `navigator.clipboard.writeText`, which throws in insecure contexts and
 * when clipboard permission is denied). That failure is real and is
 * surfaced to the caller as `'error'` — it is never swallowed into a false
 * `'success'`. `seo_template_downloaded` (method: 'copy') fires ONLY after a
 * genuine success; a failed copy emits no analytics event at all.
 */
export async function copySopMarkdown(
  markdown: string,
  slug: string,
  writeText: (text: string) => Promise<void>,
): Promise<SopCopyState> {
  try {
    await writeText(markdown);
  } catch {
    return 'error';
  }
  try {
    track({ event: 'seo_template_downloaded', slug, format: 'markdown', method: 'copy' });
  } catch {
    // analytics must never break the UI
  }
  return 'success';
}

/**
 * The post-download offer is ungated: it appears once the file has actually
 * been obtained — a download click, or a copy that genuinely succeeded —
 * and never before. A failed copy attempt did not obtain the file, so it
 * does not reveal the offer on its own.
 */
export function shouldShowPostDownloadOffer(hasDownloaded: boolean, copyState: SopCopyState): boolean {
  return hasDownloaded || copyState === 'success';
}

export function SopExportPanel({ slug, markdown }: { slug: string; markdown: string }) {
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [copyState, setCopyState] = useState<SopCopyState>('idle');

  function handleDownloadClick() {
    trackSopDownload(slug);
    setHasDownloaded(true);
  }

  async function handleCopyClick() {
    const result = await copySopMarkdown(markdown, slug, (text) => navigator.clipboard.writeText(text));
    setCopyState(result);
  }

  const showOffer = shouldShowPostDownloadOffer(hasDownloaded, copyState);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={sopDownloadHref(slug)}
          download
          onClick={handleDownloadClick}
          className="btn-primary text-base px-7 py-3.5"
        >
          Download the template
        </a>
        <button
          type="button"
          onClick={handleCopyClick}
          className="btn-secondary text-base px-7 py-3.5"
        >
          Copy to clipboard
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--content-tertiary)]">
        Markdown file. Opens in any editor or wiki — no account needed.
      </p>
      <p role="status" aria-live="polite" className="mt-2 text-xs min-h-[1em]">
        {copyState === 'success' && <span className="text-green-600">Copied.</span>}
        {copyState === 'error' && (
          <span className="text-red-600">Couldn&apos;t copy — download it instead.</span>
        )}
      </p>

      {showOffer && (
        <div className="mt-6 rounded-xl border border-brand-700/40 bg-brand-900/10 p-6">
          <h3 className="text-base font-semibold text-[var(--content-primary)]">Filling this in by hand?</h3>
          <p className="mt-2 text-sm text-[var(--content-secondary)] leading-relaxed">
            This template is blank on purpose — you still have to name your roles, thresholds, and
            exceptions. Record one real run of this process instead, and Ledgerium fills those in from
            what actually happened. Free includes 5 recordings a month.
          </p>
          <TrackedLink
            href="/signup"
            event="cta_clicked"
            properties={{ location: 'sop_export_offer', destination: '/signup' }}
            className="btn-primary text-sm px-5 py-2.5 mt-4 inline-flex"
          >
            Try it on a real run
          </TrackedLink>
        </div>
      )}
    </div>
  );
}
