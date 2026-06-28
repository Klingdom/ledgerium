import type { SoftwarePage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  DataPointCallout,
  SeoHero,
  BulletList,
  OldWayLedgeriumWay,
  MidCta,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
  KeyTakeaways,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function SoftwarePageView({ page }: { page: SoftwarePage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Start free" location="software_hero" author={page.author} updatedAt={page.updatedAt} />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <BulletList title={`Common workflows in ${page.vendor}`} items={page.commonWorkflows} />
      <BulletList title="Why documenting them is hard" items={page.documentationChallenges} />

      <OldWayLedgeriumWay oldWay={page.oldWay} ledgeriumWay={page.ledgeriumWay} />

      <MidCta location="software_mid" />

      {/* Real product output preview — no invented UI */}
      <section className="py-12 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-5">The SOP Ledgerium generates</h2>
          <img
            src="/img/demo/sop-view.png"
            alt={`Step-by-step SOP generated from a recorded ${page.vendor} workflow`}
            className="w-full rounded-xl border border-[var(--border-default)]"
            loading="lazy"
          />
        </div>
      </section>

      <BulletList title="Common mistakes" items={page.commonMistakes} />

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading={`Document a ${page.vendor} workflow from real work`}
        body="Record the real process in your own account and generate an SOP, a process map, and an intelligence report that matches what your team actually sees."
        ctaLabel="Start free"
        location="software_footer"
      />
      <p className="mx-auto max-w-3xl px-4 sm:px-6 py-6 text-xs text-[var(--content-tertiary)] text-center">
        {page.vendor} is a trademark of its respective owner. Ledgerium AI is not affiliated with or endorsed by {page.vendor}.
      </p>
    </>
  );
}
