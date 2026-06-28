/**
 * Shared server-component blocks for the SEO/AEO page engine.
 * Uses only the established design tokens. JSON-LD is injected in the route
 * page (not here), per the inline-script convention.
 */
import Link from 'next/link';
import { ArrowRight, Chrome, Circle, FileText } from 'lucide-react';
import { TrackedLink } from '@/components/TrackedLink';
import { getRelatedPages } from '@/lib/seo/related';
import { PARENT_HUB } from '@/content/registry';
import type { SeoPage } from '@/content/types';

const SIGNUP = '/signup';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Deterministic "Month YYYY" from an ISO date (YYYY-MM-DD). */
function formatUpdated(iso: string): string {
  const [y, m] = iso.split('-');
  const name = MONTH_NAMES[Number(m) - 1];
  return name ? `${name} ${y}` : iso;
}

export function Breadcrumbs({ page }: { page: SeoPage }) {
  const hub = PARENT_HUB[page.type];
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--content-tertiary)]">
        <li><Link href="/" className="hover:text-brand-500">Home</Link></li>
        {hub && (
          <>
            <li aria-hidden>/</li>
            <li><Link href={hub.path} className="hover:text-brand-500">{hub.label}</Link></li>
          </>
        )}
        <li aria-hidden>/</li>
        <li className="text-[var(--content-secondary)]">{page.eyebrow}</li>
      </ol>
    </nav>
  );
}

export function SeoHero({
  eyebrow,
  h1,
  shortAnswer,
  ctaLabel,
  location,
  author,
  updatedAt,
}: {
  eyebrow: string;
  h1: string;
  shortAnswer: string;
  ctaLabel: string;
  location: string;
  author?: { name: string };
  updatedAt?: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-10 pb-12 sm:pt-14">
        <span className="inline-block text-xs font-semibold text-brand-600 uppercase tracking-widest border border-brand-700/40 rounded-full px-4 py-1.5 mb-6 bg-brand-900/20">
          {eyebrow}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-[1.1] tracking-tight">
          {h1}
        </h1>
        {/* Visible E-E-A-T byline + freshness (also in JSON-LD) */}
        {(author || updatedAt) && (
          <p className="mt-4 text-xs text-[var(--content-tertiary)]">
            {author && <>By {author.name}</>}
            {author && updatedAt && <span aria-hidden> · </span>}
            {updatedAt && <>Updated {formatUpdated(updatedAt)}</>}
            <span aria-hidden> · </span>
            <Link href="/methodology" className="text-brand-500 hover:text-brand-400 underline underline-offset-2">
              How we research this
            </Link>
          </p>
        )}
        {/* AEO direct answer — first, before any selling */}
        <p className="seo-answer mt-6 text-lg text-[#e2e8f0] leading-relaxed">{shortAnswer}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <TrackedLink
            href={SIGNUP}
            event="cta_clicked"
            properties={{ location, destination: SIGNUP }}
            className="btn-primary text-base px-7 py-3.5 gap-2"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </TrackedLink>
          <Link href="/product" className="btn-secondary text-base px-7 py-3.5">
            See how it works
          </Link>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-900/20 via-transparent to-[var(--surface-secondary)]" />
    </section>
  );
}

/**
 * Renders the page's single original, citable fact as a prominent, quotable
 * call-out near the top of the page — the highest-leverage AEO element. Marked
 * `seo-datapoint` for Speakable extraction.
 */
export function DataPointCallout({ text }: { text: string }) {
  return (
    <section className="py-8 bg-[var(--surface-primary)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <aside role="note" className="seo-datapoint rounded-xl border-l-4 border-brand-600 bg-brand-900/10 px-5 py-4">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1.5">From Ledgerium recordings</p>
          <p className="text-[15px] text-[var(--content-primary)] leading-relaxed">{text}</p>
        </aside>
      </div>
    </section>
  );
}

/**
 * Quotable TL;DR — 3-5 self-contained takeaways near the top of the page, in the
 * first-30% zone answer engines extract from. Renders nothing until backfilled.
 */
export function KeyTakeaways({ items }: { items?: readonly string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="py-10 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-4">Key takeaways</h2>
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t} className="flex items-start gap-3 text-[15px] text-[var(--content-primary)] leading-relaxed">
              <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HowLedgeriumCaptures({ introSentence }: { introSentence?: string | undefined } = {}) {
  const steps = [
    { icon: Chrome, title: 'Install the extension', text: 'Add the Ledgerium recorder to Chrome. No screenshots and no keystrokes are ever captured.' },
    { icon: Circle, title: 'Record the real workflow', text: 'Perform the process once. Ledgerium captures the structured steps, timing, and system context.' },
    { icon: FileText, title: 'Get the output', text: 'Receive an SOP, a process map, and a workflow intelligence report generated from the real work.' },
  ];
  return (
    <section className="py-16 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-xl font-bold text-[var(--content-primary)] mb-4">How Ledgerium captures this</h2>
        {introSentence && (
          <p className="text-[15px] text-[#e2e8f0] leading-relaxed mb-8 max-w-3xl">{introSentence}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card p-6 flex flex-col gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-900/20 border border-brand-700/25 flex items-center justify-center">
                <Icon className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--content-primary)]">{`${i + 1}. ${title}`}</h3>
              <p className="text-sm text-[#e2e8f0] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-xl font-bold text-[var(--content-primary)] mb-5">{title}</h2>
        <div className="text-[15px] text-[#e2e8f0] leading-relaxed space-y-4">{children}</div>
      </div>
    </section>
  );
}

export function OldWayLedgeriumWay({ oldWay, ledgeriumWay }: { oldWay: string; ledgeriumWay: string }) {
  return (
    <section className="py-14 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-7">
          <p className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-2">The old way</p>
          <p className="text-sm text-[var(--content-secondary)] leading-relaxed">{oldWay}</p>
        </div>
        <div className="rounded-xl border border-brand-700/40 bg-brand-900/10 p-7">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">With Ledgerium</p>
          <p className="text-sm text-[var(--content-primary)] leading-relaxed">{ledgeriumWay}</p>
        </div>
      </div>
    </section>
  );
}

export function BulletList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-xl font-bold text-[var(--content-primary)] mb-5">{title}</h2>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-[#e2e8f0] leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MidCta({ location }: { location: string }) {
  return (
    <section className="py-12 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <TrackedLink
          href={SIGNUP}
          event="cta_clicked"
          properties={{ location, destination: SIGNUP }}
          className="btn-primary text-base px-7 py-3.5 gap-2 inline-flex"
        >
          See this in a real workflow recording
          <ArrowRight className="h-4 w-4" />
        </TrackedLink>
      </div>
    </section>
  );
}

export function RelatedPagesGrid({ page }: { page: SeoPage }) {
  const related = getRelatedPages(page, 3);
  if (related.length === 0) return null;
  return (
    <section className="py-14 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-lg font-bold text-[var(--content-primary)] mb-6">Related to this</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {related.map((r, i) => (
            <TrackedLink
              key={r.path}
              href={r.path}
              event="seo_related_page_clicked"
              properties={{ fromType: page.type, fromSlug: page.slug, toType: r.type, toSlug: r.path.split('/').pop(), linkRank: i + 1 }}
              className="card p-5 flex flex-col gap-2 hover:border-brand-700/40 transition-colors"
            >
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">{r.eyebrow}</span>
              <span className="text-sm font-semibold text-[var(--content-primary)] leading-snug">{r.title}</span>
              <span className="text-xs text-[var(--content-tertiary)]">{r.why}</span>
            </TrackedLink>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HonestLimitation({ text }: { text: string }) {
  return (
    <section className="py-10 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-2">Worth knowing</p>
        <p className="text-sm text-[var(--content-secondary)] leading-relaxed">{text}</p>
      </div>
    </section>
  );
}

export function FinalCta({ heading, body, ctaLabel, location }: { heading: string; body: string; ctaLabel: string; location: string }) {
  return (
    <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">{heading}</h2>
        <p className="mt-5 text-[#e2e8f0] leading-relaxed max-w-xl mx-auto">{body}</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <TrackedLink
            href={SIGNUP}
            event="cta_clicked"
            properties={{ location, destination: SIGNUP }}
            className="btn-primary text-base px-7 py-3.5 gap-2"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </TrackedLink>
          <Link href="/product" className="btn-secondary text-base px-7 py-3.5">See how it works</Link>
        </div>
        <p className="mt-5 text-xs text-[var(--content-tertiary)]">Free plan includes 5 documented workflows per month. No screenshots ever captured.</p>
      </div>
    </section>
  );
}
