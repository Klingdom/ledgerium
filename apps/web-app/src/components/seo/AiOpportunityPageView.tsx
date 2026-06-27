import type { AiOpportunityPage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  SeoHero,
  BulletList,
  ProseSection,
  MidCta,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function AiOpportunityPageView({ page }: { page: AiOpportunityPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Find your AI opportunities" location="ai_hero" />

      <BulletList title={`Repetitive work in ${page.functionArea.toLowerCase()}`} items={page.commonRepetitiveWork} />
      <BulletList title="Where AI helps" items={page.whereAiHelps} />
      <BulletList title="Where automation helps" items={page.whereAutomationHelps} />
      <BulletList title="Where humans should stay involved" items={page.whereHumansStayInvolved} />

      <ProseSection title="Example workflow analysis">
        <p>{page.exampleAnalysis}</p>
      </ProseSection>

      <MidCta location="ai_mid" />

      <BulletList title="Readiness checklist" items={page.readinessChecklist} />

      <HowLedgeriumCaptures />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Find where AI can actually help"
        body="Record a workflow once and Ledgerium scores where AI and automation fit, from the real steps, so you target the costly work with evidence."
        ctaLabel="Start free"
        location="ai_footer"
      />
    </>
  );
}
