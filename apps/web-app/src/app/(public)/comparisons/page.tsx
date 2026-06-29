import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { getPagesByType, pagePath } from '@/content/registry';

export const metadata: Metadata = {
  title: 'Compare Ledgerium to Other Tools',
  description:
    'See how Ledgerium compares to Scribe, Tango, process mining, task mining, screen recording, and manual SOP documentation. Honest, dated, side-by-side.',
  alternates: { canonical: '/comparisons' },
  openGraph: {
    type: 'website',
    title: 'Compare Ledgerium to Other Tools',
    description:
      'How Ledgerium compares to screenshot tools, process mining, and manual documentation — honest side-by-side comparisons.',
  },
};

// Hand-built head-to-head page (reserved slug, not in the content registry).
const HAND_BUILT = [
  {
    title: 'Ledgerium vs Scribe',
    href: '/compare/scribe',
    blurb: 'Structured process capture vs annotated screenshots.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Compare Ledgerium to Other Tools',
  description:
    'How Ledgerium compares to Scribe, Tango, process mining, task mining, screen recording, and manual SOP documentation.',
  url: 'https://ledgerium.ai/comparisons',
  inLanguage: 'en',
  isPartOf: { '@type': 'WebSite', '@id': 'https://ledgerium.ai/#website' },
};

export default function ComparisonsHubPage() {
  const compares = getPagesByType('compare');
  const cards = [
    ...HAND_BUILT,
    ...compares.map((p) => ({ title: p.h1, href: pagePath(p), blurb: p.shortAnswer })),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pt-16 pb-10 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            href="/product"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to product
          </Link>
          <span className="inline-block text-xs font-semibold text-brand-600 uppercase tracking-widest border border-brand-700/40 rounded-full px-4 py-1.5 mb-6 bg-brand-900/20">
            Compare
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            Compare Ledgerium to other tools
          </h1>
          <p className="mt-5 text-lg text-[#e2e8f0] leading-relaxed max-w-2xl">
            How Ledgerium stacks up against screenshot tools, process mining, task mining, and manual
            documentation. Every comparison is honest, dated, and concedes where the other tool is the
            better fit.
          </p>
        </div>
      </section>

      <section className="py-12 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-6">Head-to-head comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="card p-6 hover:border-brand-700/40 transition-colors group"
              >
                <h3 className="text-base font-semibold text-[var(--content-primary)] group-hover:text-brand-400 transition-colors">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm text-[#e2e8f0] leading-relaxed line-clamp-3">{c.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-500">
                  Read comparison
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-3">Looking for alternatives?</h2>
          <p className="text-[#e2e8f0] mb-6 max-w-2xl">
            Switching from a specific tool, or mapping the wider landscape? Start with these roundups.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/alternatives" className="btn-secondary gap-2">
              Tool alternatives
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/competitors" className="btn-secondary gap-2">
              Competitor landscape
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">See it on your own workflow</h2>
          <p className="mt-3 text-[#e2e8f0]">Record one workflow free and compare the output yourself.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 shadow-sm shadow-brand-600/20">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/product" className="btn-secondary">See the product</Link>
          </div>
        </div>
      </section>
    </>
  );
}
