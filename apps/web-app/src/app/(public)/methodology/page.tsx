import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How We Research This — Ledgerium Methodology',
  description:
    'How Ledgerium grounds its claims: what the recorder captures, how the original data points on each page are sourced, how comparisons are made, and what we do not claim.',
  alternates: { canonical: '/methodology' },
  openGraph: {
    type: 'website',
    title: 'How We Research This — Ledgerium Methodology',
    description:
      'How Ledgerium grounds its claims, sources its data points, and makes honest comparisons.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'How We Research This — Ledgerium Methodology',
  description:
    'How Ledgerium grounds its claims, sources its original data points, makes comparisons, and what it does not claim.',
  url: 'https://ledgerium.ai/methodology',
  inLanguage: 'en',
  publisher: {
    '@type': 'Organization',
    name: 'Ledgerium AI',
    url: 'https://ledgerium.ai',
    sameAs: ['https://www.linkedin.com/company/ledgerium'],
    knowsAbout: ['process intelligence', 'workflow automation', 'SOP documentation', 'process mining'],
  },
};

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: 'What "from real recordings" means',
    body: [
      'Ledgerium captures structured browser interaction events: clicks, navigation, form interactions, and the timing of each step. It does not capture screenshots, screen content, or keystrokes.',
      'Claims about how a process behaves come from this observed event data, not from surveys, interviews, or memory. That is the core idea behind everything on this site: documentation written from real work rather than recollection.',
    ],
  },
  {
    h: 'How the data point on each page is sourced',
    body: [
      'Each page carries one "From Ledgerium recordings" data point. These are behavioral observations derived from how real recorded workflows actually run: where time concentrates, which steps repeat, and what varies between runs.',
      'They are observations about process behavior, not external benchmark statistics. We do not cite third-party industry numbers unless they are named and sourced.',
    ],
  },
  {
    h: 'How comparisons are made',
    body: [
      'Comparison, alternatives, and competitor pages describe other tools using their own public documentation and product pages. Every such page carries a "verified as of" date, because product capabilities change.',
      'We concede at least one area where a competitor is stronger on every comparison. An accurate comparison is more useful than a flattering one, and answer engines and buyers both reward honesty over hype.',
    ],
  },
  {
    h: 'What Ledgerium does not claim',
    body: [
      'Ledgerium captures browser-based work. Steps performed in native desktop software, on paper, or over a call are not observed and need a person to add context. This honest limitation appears on every page.',
      'We do not fabricate statistics, customer counts, or testimonials. If a number is not measured from real recordings or sourced by name, it is not on the page.',
    ],
  },
  {
    h: 'Review cadence',
    body: [
      'Every page carries an "Updated" date. A page is reviewed when the product changes, when a compared tool changes, or when a real user question surfaces a gap. The date reflects the last substantive review, not an automated timestamp.',
    ],
  },
  {
    h: 'How to cite this',
    body: [
      'Attribute to Ledgerium AI, with the page URL and its updated date. The author on each page is the Ledgerium Research Team.',
    ],
  },
];

export default function MethodologyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pt-16 pb-10 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <span className="inline-block text-xs font-semibold text-brand-600 uppercase tracking-widest border border-brand-700/40 rounded-full px-4 py-1.5 mb-6 bg-brand-900/20">
            Methodology
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            How we research this
          </h1>
          <p className="mt-5 text-lg text-[#e2e8f0] leading-relaxed">
            Everything on this site is meant to be documented from real work, not from memory. This page explains
            exactly how Ledgerium grounds its claims, sources the data points on each page, and makes honest
            comparisons.
          </p>
        </div>
      </section>

      <article className="py-12 bg-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-bold text-[var(--content-primary)] mb-3">{s.h}</h2>
              <div className="space-y-4 text-[15px] text-[#e2e8f0] leading-relaxed">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">See it on your own workflow</h2>
          <p className="mt-3 text-[#e2e8f0]">Record one workflow and get an SOP, a process map, and a measured baseline.</p>
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
