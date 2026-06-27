import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SopTemplatePage } from '@/content/types';
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

export function SopTemplatePageView({ page }: { page: SopTemplatePage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Generate the SOP from real work" location="sop_hero" />

      <ProseSection title="Who uses this SOP and when">
        <p>{page.whoUsesIt}</p>
        <p>{page.whenToUseIt}</p>
      </ProseSection>

      {/* Editable SOP structure */}
      <section className="py-12 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-6">Editable SOP structure</h2>
          <dl className="space-y-4">
            {page.sopSections.map((s) => (
              <div key={s.heading} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5">
                <dt className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">{s.heading}</dt>
                <dd className="text-sm text-[#e2e8f0] leading-relaxed">{s.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Example procedure */}
      <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-6">Example procedure</h2>
          <ol className="space-y-4">
            {page.exampleProcedure.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-900/20 border border-brand-700/30 text-brand-500 text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--content-primary)]">{s.title}</p>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          {page.relatedWorkflowSlug && (
            <Link
              href={`/workflow-library/${page.relatedWorkflowSlug}`}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-400"
            >
              See the full workflow behind this SOP
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      <MidCta location="sop_mid" />

      <BulletList title="Common mistakes" items={page.commonMistakes} />

      <ProseSection title="How Ledgerium generates this SOP">
        <p>{page.howLedgeriumGenerates}</p>
      </ProseSection>

      <HowLedgeriumCaptures />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Generate this SOP from real work"
        body="Record the process once and Ledgerium writes the SOP from the actual steps, so it matches how your team really works."
        ctaLabel="Start free"
        location="sop_footer"
      />
    </>
  );
}
