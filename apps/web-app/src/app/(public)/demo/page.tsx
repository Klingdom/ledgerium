import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Layers,
  FileText,
  ArrowRight,
  CheckCircle,
  Map,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — Ledgerium AI',
  description:
    'Record a real browser workflow, get a structured SOP and process map in under 5 minutes. See how ops teams use Ledgerium to document internal tool workflows.',
};

const STEPS = [
  {
    step: 1,
    icon: Play,
    title: 'Record a workflow',
    what: 'Open the Ledgerium side panel in Chrome. Name the workflow — "Create purchase order," "Process expense report," "Onboard new vendor" — and click Record. Then do your work normally across your ERP, CRM, and internal tools.',
    result: 'Every click, form entry, and navigation is captured as structured data — no screenshots, no typed content, no screen recording. Multi-system, multi-tab workflows are fully supported.',
    screenshot: '/img/demo/extension.png',
    screenshotAlt: 'Ledgerium browser extension ready to record a workflow',
  },
  {
    step: 2,
    icon: LayoutDashboard,
    title: 'See your workflow library',
    what: 'Every recording lands in your dashboard. The portfolio timestudy band gives you a baseline — average cycle time, total cases, runs, systems, and health score — and each row shows its run count N next to every metric.',
    result: 'This is not a document list. It is a measured baseline. Sort by health, filter by time range, and see which processes to investigate before you open a single recording.',
    screenshot: '/img/demo/dashboard.png',
    screenshotAlt: 'Ledgerium workflow library with portfolio timestudy band, cycle-time columns, and health scores',
  },
  {
    step: 3,
    icon: Map,
    title: 'Explore the process map',
    what: 'Open any workflow. The process map renders from observed transitions — switch to the frequency overlay to see how often each path was actually taken, or Variants to compare how different runs diverged.',
    result: 'The map was measured, not drawn. The thick paths are the route most runs actually took. Every edge is a real transition.',
    screenshot: '/img/demo/workflow-view.png',
    screenshotAlt: 'Ledgerium workflow view showing the directly-follows process map with observed transitions',
  },
  {
    step: 4,
    icon: FileText,
    title: 'Get your SOP instantly',
    what: 'Ledgerium generates a complete SOP with step-by-step instructions, system context, and expected outcomes. Every step cites the events it came from — and you can ask the workflow a question and get an answer grounded in the evidence.',
    result: 'A ready-to-share SOP with prerequisites, warnings, and completion criteria — generated from what was observed, not from memory. Share it with a public link.',
    screenshot: '/img/demo/sop-view.png',
    screenshotAlt: 'Ledgerium generated SOP with step-by-step instructions and evidence citations',
  },
  {
    step: 5,
    icon: BarChart3,
    title: 'Read the report',
    what: 'The report leads with a verdict, then a scorecard, a step-duration timestudy, and a before/after ROI estimate. Toggle steps as removed or automated to see the projected cycle time.',
    result: 'The ROI number is arithmetic over your own observed step durations — based on your real run history, not a consultant\'s estimate.',
    screenshot: '/img/demo/report-view.png',
    screenshotAlt: 'Ledgerium workflow report showing health verdict, scorecard, cycle-time distribution, and bottleneck analysis',
  },
];

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            Record a workflow. Get an SOP instantly.
          </h1>
          <p className="mt-4 text-lg text-[#e2e8f0] leading-relaxed">
            See how ops teams use Ledgerium to turn real browser workflows
            into structured SOPs and process maps — in under 5 minutes.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="space-y-20">
            {STEPS.map(({ step, icon: Icon, title, what, result, screenshot, screenshotAlt }) => (
              <div key={step} className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                {/* Text — 3 cols */}
                <div className={`md:col-span-3 ${step % 2 === 0 ? 'md:order-2' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-bold shadow-sm shadow-brand-600/20">
                      {step}
                    </span>
                    <h3 className="text-lg font-bold text-[var(--content-primary)]">{title}</h3>
                  </div>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed mb-3">
                    {what}
                  </p>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-brand-400 leading-relaxed">
                      {result}
                    </p>
                  </div>
                </div>

                {/* Screenshot — 2 cols */}
                <div className={`md:col-span-2 ${step % 2 === 0 ? 'md:order-1' : ''}`}>
                  <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-[var(--surface-elevated)]">
                    <Image
                      src={screenshot}
                      alt={screenshotAlt}
                      width={600}
                      height={450}
                      className="w-full h-auto"
                      priority={step <= 2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Output summary */}
      <section className="py-16 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-10">
            Every recording produces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Layers, label: 'Workflow Steps', sub: 'With timing and evidence' },
              { icon: FileText, label: 'SOP Document', sub: 'Event-level instructions' },
              { icon: Map, label: 'Process Map', sub: 'Phases and transitions' },
              { icon: CheckCircle, label: 'Workflow Report', sub: 'Ready to export' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="card p-5 text-center">
                <Icon className="h-5 w-5 text-brand-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-[var(--content-primary)]">{label}</p>
                <p className="text-[11px] text-[var(--content-tertiary)] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive demo dashboard callout */}
      <section className="py-12 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-xl border border-brand-700/30 bg-brand-900/15 p-8 text-center">
            <LayoutDashboard className="h-8 w-8 text-brand-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[var(--content-primary)] mb-2">
              Explore a sample workflow yourself
            </h3>
            <p className="text-sm text-[#e2e8f0] mb-5 max-w-lg mx-auto">
              Create a free account and open a sample workflow instantly — its SOP, process map,
              and report are all derived from a real recording. No extension install required to look around.
            </p>
            <Link href="/signup" className="btn-primary gap-2 px-6 py-3">
              <LayoutDashboard className="h-4 w-4" />
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Get your first SOP in 60 seconds
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Sign up free, and explore a sample workflow SOP immediately —
            no extension install required. When you&apos;re ready, record your own.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary gap-2 text-base px-7 py-3.5 shadow-sm shadow-brand-600/20">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/install-extension" className="btn-secondary text-base px-7 py-3.5">
              Install extension
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
