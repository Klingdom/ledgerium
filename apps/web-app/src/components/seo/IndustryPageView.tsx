import type { IndustryPage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  DataPointCallout,
  SeoHero,
  ProseSection,
  BulletList,
  MidCta,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
  KeyTakeaways,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function IndustryPageView({ page }: { page: IndustryPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Document your workflows" location="industry_hero" author={page.author} updatedAt={page.updatedAt} />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <ProseSection title="Industry context">
        <p>{page.industryContext}</p>
      </ProseSection>

      <BulletList title="Common workflows" items={page.commonWorkflows} />
      <BulletList title="Documentation concerns" items={page.documentationConcerns} />

      <MidCta location="industry_mid" />

      <BulletList title="Compliance concerns" items={page.complianceConcerns} />
      <BulletList title="AI and automation opportunities" items={page.aiOpportunities} />

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Document your industry's workflows"
        body="Record each process once and turn it into an SOP, a process map, and an improvement report that matches how your team actually works."
        ctaLabel="Start free"
        location="industry_footer"
      />
    </>
  );
}
