import type { PersonaPage } from '@/content/types';
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

export function PersonaPageView({ page }: { page: PersonaPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Record your first workflow" location="persona_hero" />

      <ProseSection title="A day in this role">
        <p className="text-sm text-[var(--content-tertiary)]">{page.whoThisIsFor}</p>
        <p>{page.dayInTheLife}</p>
      </ProseSection>

      <BulletList title="Pain points" items={page.painPoints} />
      <BulletList title="What this role usually searches for" items={page.whatTheySearchFor} />

      <MidCta location="persona_mid" />

      <BulletList title="Jobs to be done" items={page.jobsToBeDone} />
      <BulletList title="Workflows this role needs to document" items={page.commonWorkflowsToDocument} />

      <ProseSection title="How Ledgerium helps">
        <p>{page.howLedgeriumHelps}</p>
      </ProseSection>

      <HowLedgeriumCaptures />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Document your team's real workflows"
        body="Record a workflow once and turn it into an SOP, a process map, and an improvement report, generated from how the work actually happens."
        ctaLabel="Start free"
        location="persona_footer"
      />
    </>
  );
}
