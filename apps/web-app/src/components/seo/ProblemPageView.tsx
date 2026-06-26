import type { ProblemPage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  SeoHero,
  BulletList,
  ProseSection,
  OldWayLedgeriumWay,
  MidCta,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function ProblemPageView({ page }: { page: ProblemPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Generate an SOP from a real workflow" location="problem_hero" />

      <BulletList title="How to tell you have this problem" items={page.diagnostic} />

      <ProseSection title="Why this happens">
        <p>{page.whyItHappens}</p>
      </ProseSection>

      {/* Manual approach vs Ledgerium approach reuses the old-way/new-way contrast */}
      <OldWayLedgeriumWay oldWay={page.manualApproach} ledgeriumWay={page.ledgeriumApproach} />

      <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-6">Step-by-step</h2>
          <ol className="space-y-4">
            {page.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-900/20 border border-brand-700/30 text-brand-500 text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--content-primary)]">{s.title}</p>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <MidCta location="problem_mid" />

      <BulletList title="Common mistakes" items={page.commonMistakes} />

      <HowLedgeriumCaptures />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Document the real process, not the remembered one"
        body="Record a workflow once and generate an SOP, a process map, and an improvement report from how the work actually happens."
        ctaLabel="Start free"
        location="problem_footer"
      />
    </>
  );
}
