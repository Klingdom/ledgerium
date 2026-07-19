import Link from 'next/link';
import type { AnswerPage } from '@/content/types';
import { getBySlug } from '@/content/registry';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  DataPointCallout,
  SeoHero,
  ProseSection,
  MidCta,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
  KeyTakeaways,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

/**
 * Definitional comparison table for an "X vs Y" answer page. Concept-vs-concept
 * only (not tool-vs-tool — that table lives in ComparePageView). Cell values
 * are plain prose, unlike CompareRow's boolean-aware cells.
 */
function ComparisonTable({ table }: { table: NonNullable<AnswerPage['comparisonTable']> }) {
  return (
    <section className="py-14 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-xl font-bold text-[var(--content-primary)] mb-8 text-center">
          {table.itemA} vs {table.itemB}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
                <th className="text-left px-5 py-4 font-semibold text-[var(--content-secondary)] sticky left-0 bg-[var(--surface-elevated)] z-10">
                  Aspect
                </th>
                <th className="px-5 py-4 font-semibold text-[var(--content-primary)] text-center w-[220px]">{table.itemA}</th>
                <th className="px-5 py-4 font-semibold text-[var(--content-primary)] text-center w-[220px]">{table.itemB}</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-[var(--border-default)] last:border-0 ${i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'}`}
                >
                  <td
                    className={`px-5 py-3.5 font-medium text-[var(--content-primary)] sticky left-0 z-10 ${i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'}`}
                  >
                    {row.label}
                  </td>
                  <td className="px-5 py-3.5 text-center text-[var(--content-secondary)]">{row.itemA}</td>
                  <td className="px-5 py-3.5 text-center text-[var(--content-secondary)]">{row.itemB}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/**
 * Inline glossary cross-link chips. Presentational only — graph authority
 * lives in `related`. Defensive: a chip only links if the target `answer`
 * page is already published; otherwise it renders as plain (non-broken) text,
 * so forward-authored `relatedTerms` (per BUILD_SPEC.md §3.1) never 404.
 */
function RelatedTerms({ terms }: { terms: AnswerPage['relatedTerms'] }) {
  if (terms.length === 0) return null;
  return (
    <section className="py-10 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-4">Related terms</h2>
        <div className="flex flex-wrap gap-2.5">
          {terms.map((t) => {
            const target = getBySlug('answer', t.slug);
            const resolvable = target && target.published;
            return resolvable ? (
              <Link
                key={t.slug}
                href={`/answers/${t.slug}`}
                className="inline-flex items-center rounded-full border border-brand-700/40 bg-brand-900/10 px-4 py-1.5 text-sm text-brand-500 hover:text-brand-400 hover:border-brand-600/60 transition-colors"
              >
                {t.term}
              </Link>
            ) : (
              <span
                key={t.slug}
                className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-1.5 text-sm text-[var(--content-tertiary)]"
              >
                {t.term}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Sources({ sources }: { sources: AnswerPage['sources'] }) {
  if (sources.length === 0) return null;
  return (
    <section className="py-10 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-4">Sources</h2>
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.label} className="text-sm text-[var(--content-secondary)] leading-relaxed">
              {s.url ? (
                <a href={s.url} className="text-brand-500 hover:text-brand-400 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
              {s.retrievedAt && <span className="text-[var(--content-tertiary)]"> — verified {s.retrievedAt}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AnswerPageView({ page }: { page: AnswerPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero
        eyebrow={page.eyebrow}
        h1={page.h1}
        shortAnswer={page.shortAnswer}
        ctaLabel="Start free"
        location="answer_hero"
        author={page.author}
        updatedAt={page.updatedAt}
      />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <ProseSection title={`Definition: ${page.term}`}>
        <p>{page.definition}</p>
      </ProseSection>

      {page.inDepth.map((section) => (
        <ProseSection key={section.heading} title={section.heading}>
          <p>{section.body}</p>
        </ProseSection>
      ))}

      {page.comparisonTable && <ComparisonTable table={page.comparisonTable} />}

      <MidCta location="answer_mid" />

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <RelatedTerms terms={page.relatedTerms} />
      <Sources sources={page.sources} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="See this in a real workflow recording"
        body="Record a workflow once and get a structured SOP, a process map, and an intelligence report generated from real work, not memory."
        ctaLabel="Start free"
        location="answer_footer"
      />
    </>
  );
}
