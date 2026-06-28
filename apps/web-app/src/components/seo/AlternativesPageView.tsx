import type { AlternativesPage } from '@/content/types';
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

export function AlternativesPageView({ page }: { page: AlternativesPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Start free" location="alternatives_hero" author={page.author} updatedAt={page.updatedAt} />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <ProseSection title={`Why people look for a ${page.targetTool} alternative`}>
        <p>{page.whyPeopleSwitch}</p>
      </ProseSection>

      {/* Options list */}
      <section className="py-14 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-2">The strongest alternatives</h2>
          <p className="text-xs text-[var(--content-tertiary)] mb-6">Capabilities verified as of {page.verifiedAsOf}. Confirm details on each vendor&apos;s own site.</p>
          <ul className="space-y-4">
            {page.options.map((o) => (
              <li key={o.name} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                  <span className="text-base font-semibold text-[var(--content-primary)]">{o.name}</span>
                  <span className="text-xs text-brand-500 font-medium">Best for: {o.bestFor}</span>
                </div>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{o.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MidCta location="alternatives_mid" />

      <ProseSection title="Where Ledgerium fits">
        <p>{page.ledgeriumAngle}</p>
      </ProseSection>
      <ProseSection title={`When ${page.targetTool} is still the right choice`}>
        <p>{page.whenTargetStillFits}</p>
      </ProseSection>

      <BulletList title="How to choose" items={page.evaluationCriteria} />

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="See the structured-data difference for yourself"
        body="Record one workflow free and get an SOP, a process map, and an intelligence report, generated from real work rather than screenshots."
        ctaLabel="Start free"
        location="alternatives_footer"
      />
    </>
  );
}
