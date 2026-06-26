'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { SeoPage } from '@/content/types';

/**
 * FAQ accordion. Answers are always rendered in the DOM (collapsed with the
 * `hidden` attribute, not removed), so they remain crawlable and the page's
 * FAQPage JSON-LD stays authoritative. Uses button + aria-expanded for a11y and
 * fires seo_faq_expanded on open.
 */
export function FaqBlock({
  faqs,
  pageType,
  slug,
}: {
  faqs: SeoPage['faqs'];
  pageType: string;
  slug: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  function toggle(i: number) {
    const next = open === i ? null : i;
    setOpen(next);
    if (next === i) {
      try {
        track({ event: 'seo_faq_expanded', pageType, slug, questionIndex: i });
      } catch {
        // analytics must never break the page
      }
    }
  }

  return (
    <section className="py-16 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-[var(--content-primary)] mb-8">Frequently asked questions</h2>
        <dl className="space-y-4">
          {faqs.map(({ q, a }, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${slug}-${i}`;
            return (
              <div key={q} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] overflow-hidden">
                <dt>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-4 text-base font-semibold text-[var(--content-primary)] hover:text-brand-500 transition-colors"
                  >
                    <span>{q}</span>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-[var(--content-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                </dt>
                <dd id={panelId} hidden={!isOpen} className="px-6 pb-5 text-sm text-[#e2e8f0] leading-relaxed">
                  {a}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
