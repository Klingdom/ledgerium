import { Check, X } from 'lucide-react';
import type { ComparePage, CompareRow } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  SeoHero,
  ProseSection,
  MidCta,
  BulletList,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

function Cell({ value, accent }: { value: CompareRow['competitor']; accent: boolean }) {
  if (value === true) return <Check className={`h-4 w-4 inline ${accent ? 'text-brand-500' : 'text-[var(--content-secondary)]'}`} />;
  if (value === false) return <X className="h-4 w-4 inline opacity-40 text-[var(--content-tertiary)]" />;
  return <span className={`text-sm ${accent ? 'text-[var(--content-primary)]' : 'text-[var(--content-secondary)]'}`}>{value}</span>;
}

export function ComparePageView({ page }: { page: ComparePage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Start free" location="compare_hero" />

      <ProseSection title="Why this comparison matters">
        <p>{page.whyItMatters}</p>
      </ProseSection>

      <section className="py-14 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-2 text-center">Side-by-side comparison</h2>
          <p className="text-xs text-[var(--content-tertiary)] text-center mb-8">
            {page.competitor} capabilities verified as of {page.verifiedAsOf}. Confirm current details on {page.competitor}&apos;s own site.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
                  <th className="text-left px-5 py-4 font-semibold text-[var(--content-secondary)] sticky left-0 bg-[var(--surface-elevated)] z-10">Feature</th>
                  <th className="px-5 py-4 font-semibold text-[var(--content-tertiary)] text-center w-[200px]">{page.competitor}</th>
                  <th className="px-5 py-4 text-center w-[200px] bg-brand-900/10 border-x border-brand-800/30 font-semibold text-brand-400">Ledgerium</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row, i) => (
                  <tr key={row.label} className={`border-b border-[var(--border-default)] last:border-0 ${i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'}`}>
                    <td className={`px-5 py-3.5 font-medium text-[var(--content-primary)] sticky left-0 z-10 ${i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'}`}>{row.label}</td>
                    <td className="px-5 py-3.5 text-center"><Cell value={row.competitor} accent={false} /></td>
                    <td className="px-5 py-3.5 text-center bg-brand-900/10 border-x border-brand-800/30"><Cell value={row.ledgerium} accent /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <MidCta location="compare_mid" />

      <BulletList title={`When ${page.competitor} fits`} items={page.whenCompetitorFits} />
      <BulletList title="When Ledgerium fits" items={page.whenLedgeriumFits} />

      <ProseSection title={`Where ${page.competitor} is stronger`}>
        <p>{page.competitorStrength}</p>
      </ProseSection>

      <HowLedgeriumCaptures />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Try Ledgerium free, 5 workflows, no credit card"
        body="Record your first workflow and get a structured SOP, a process map, and an intelligence report from real work, not memory."
        ctaLabel="Start free"
        location="compare_footer"
      />
    </>
  );
}
