import type { DepartmentPage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  SeoHero,
  ProseSection,
  BulletList,
  MidCta,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function DepartmentPageView({ page }: { page: DepartmentPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Document your workflows" location="department_hero" />

      <ProseSection title="Overview">
        <p>{page.overview}</p>
      </ProseSection>

      <BulletList title="Common workflows" items={page.commonWorkflows} />
      <BulletList title="Documentation problems" items={page.documentationProblems} />

      <MidCta location="department_mid" />

      <BulletList title="SOP needs" items={page.sopNeeds} />
      <BulletList title="AI and automation opportunities" items={page.aiOpportunities} />

      <HowLedgeriumCaptures />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Document your department's workflows"
        body="Record each workflow once and turn it into an SOP, a process map, and an improvement report, generated from how the work actually happens."
        ctaLabel="Start free"
        location="department_footer"
      />
    </>
  );
}
