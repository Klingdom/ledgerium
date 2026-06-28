import type { CompetitorsPage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  DataPointCallout,
  SeoHero,
  ProseSection,
  MidCta,
  BulletList,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
  KeyTakeaways,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function CompetitorsPageView({ page }: { page: CompetitorsPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Start free" location="competitors_hero" author={page.author} updatedAt={page.updatedAt} />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <ProseSection title="The landscape">
        <p>{page.landscape}</p>
      </ProseSection>

      {/* Segment map */}
      <section className="py-14 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-2">{page.subject} competitors by segment</h2>
          <p className="text-xs text-[var(--content-tertiary)] mb-6">Grouped by what each segment does. Verified as of {page.verifiedAsOf}.</p>
          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
                  <th className="text-left px-5 py-3.5 font-semibold text-[var(--content-secondary)]">Segment</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-[var(--content-secondary)]">Example players</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-[var(--content-secondary)]">Best fit for</th>
                </tr>
              </thead>
              <tbody>
                {page.segments.map((s, i) => (
                  <tr key={s.segment} className={`border-b border-[var(--border-default)] last:border-0 ${i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'}`}>
                    <td className="px-5 py-3.5 font-medium text-[var(--content-primary)]">{s.segment}</td>
                    <td className="px-5 py-3.5 text-[#e2e8f0]">{s.players}</td>
                    <td className="px-5 py-3.5 text-[var(--content-secondary)]">{s.fitFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <MidCta location="competitors_mid" />

      <ProseSection title="Where Ledgerium fits">
        <p>{page.ledgeriumPosition}</p>
      </ProseSection>

      <BulletList title="How to evaluate this space" items={page.evaluationCriteria} />

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Try the structured-capture approach"
        body="Record one workflow free and see what measurable process data looks like next to a screenshot guide."
        ctaLabel="Start free"
        location="competitors_footer"
      />
    </>
  );
}
