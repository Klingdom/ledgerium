import type { WorkflowPage } from '@/content/types';
import { SeoPageView } from './SeoPageView';
import {
  Breadcrumbs,
  DataPointCallout,
  SeoHero,
  ProseSection,
  OldWayLedgeriumWay,
  MidCta,
  BulletList,
  HowLedgeriumCaptures,
  HonestLimitation,
  RelatedPagesGrid,
  FinalCta,
  KeyTakeaways,
} from './Blocks';
import { FaqBlock } from './FaqBlock';

export function WorkflowPageView({ page }: { page: WorkflowPage }) {
  return (
    <>
      <SeoPageView pageType={page.type} slug={page.slug} />
      <Breadcrumbs page={page} />
      <SeoHero eyebrow={page.eyebrow} h1={page.h1} shortAnswer={page.shortAnswer} ctaLabel="Capture this workflow once" location="workflow_hero" author={page.author} updatedAt={page.updatedAt} />
      <DataPointCallout text={page.originalDataPoint} />
      <KeyTakeaways items={page.keyTakeaways} />

      <ProseSection title="Who uses this workflow">
        <p>{page.whoUsesIt}</p>
        <p className="text-sm text-[var(--content-tertiary)]">Systems involved: {page.systems.join(', ')}.</p>
      </ProseSection>

      <OldWayLedgeriumWay oldWay={page.oldWay} ledgeriumWay={page.ledgeriumWay} />

      <section className="py-12 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-6">Sample workflow steps</h2>
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

      <MidCta location="workflow_mid" />

      {/* Real product output preview — no invented UI */}
      <section className="py-12 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-5">What Ledgerium generates from this</h2>
          <img
            src="/img/demo/report-view.png"
            alt="Workflow intelligence report generated from a recorded workflow, showing step timing and process health"
            className="w-full rounded-xl border border-[var(--border-default)]"
            loading="lazy"
          />
        </div>
      </section>

      <BulletList title="Metrics Ledgerium can reveal" items={page.metrics.map((m) => `${m.label}: ${m.note}`)} />
      <BulletList title="Common mistakes" items={page.commonMistakes} />
      <BulletList title="AI and automation opportunities" items={page.aiOpportunities} />

      <HowLedgeriumCaptures introSentence={page.mechanismIntro} />
      <HonestLimitation text={page.honestLimitation} />
      <FaqBlock faqs={page.faqs} pageType={page.type} slug={page.slug} />
      <RelatedPagesGrid page={page} />
      <FinalCta
        heading="Capture this workflow once"
        body="Record the real process and turn it into an SOP, a process map, and an AI opportunity report, generated from how the work actually happens."
        ctaLabel="Start free"
        location="workflow_footer"
      />
    </>
  );
}
