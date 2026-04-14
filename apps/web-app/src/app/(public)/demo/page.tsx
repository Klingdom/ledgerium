import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  MousePointer2,
  Layers,
  FileText,
  Library,
  ArrowRight,
  CheckCircle,
  Map,
  LayoutDashboard,
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
    title: 'Start recording',
    what: 'Open the Ledgerium sidebar in Chrome. Name the workflow — "Create purchase order," "Process expense report," "Onboard new vendor." Click Record.',
    result: 'The extension starts capturing silently. A live step feed shows your progress as you work.',
    screenshot: '/img/screenshot-upload.png',
    screenshotAlt: 'Ledgerium upload workflow interface',
  },
  {
    step: 2,
    icon: MousePointer2,
    title: 'Do the workflow normally',
    what: 'Navigate your ERP, CRM, or internal tools. Fill forms, click buttons, switch between systems. Work exactly as you normally would.',
    result: 'Every click, form entry, and navigation is captured as structured data. Multi-system, multi-tab workflows are fully supported.',
    screenshot: '/img/screenshot-dashboard.png',
    screenshotAlt: 'Ledgerium dashboard showing recorded workflows with metrics',
  },
  {
    step: 3,
    icon: Layers,
    title: 'Stop and review',
    what: 'Click Stop. The engine segments your session into logical workflow steps with timing, system context, and confidence scores.',
    result: 'You see your workflow as structured steps — not a video to watch. Each step traces to specific observed actions.',
    screenshot: '/img/screenshot-workflow.png',
    screenshotAlt: 'Ledgerium workflow detail showing structured steps and process map',
  },
  {
    step: 4,
    icon: FileText,
    title: 'Get your SOP instantly',
    what: 'Ledgerium generates a complete SOP with step-by-step instructions, system context, expected outcomes, and a visual process map showing phases and transitions.',
    result: 'A ready-to-share SOP with prerequisites, warnings, and completion criteria — generated from evidence, not memory.',
    screenshot: '/img/screenshot-sop.png',
    screenshotAlt: 'Ledgerium generated SOP with step-by-step instructions and roles',
  },
  {
    step: 5,
    icon: Library,
    title: 'Build your workflow library',
    what: 'Every recording syncs to your searchable library. Find any workflow by title, system, or date. Keep your team\'s process documentation always up to date.',
    result: 'When the process changes, record it again. The new SOP replaces the old one. Documentation stays current automatically.',
    screenshot: '/img/screenshot-process-groups.png',
    screenshotAlt: 'Ledgerium process groups showing workflow families and variants',
  },
];

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            Record a workflow. Get an SOP instantly.
          </h1>
          <p className="mt-4 text-lg text-[#cbd5e1] leading-relaxed">
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
                  <p className="text-sm text-[#b0bec9] leading-relaxed mb-3">
                    {what}
                  </p>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-brand-700 leading-relaxed">
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
          <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-8 text-center">
            <LayoutDashboard className="h-8 w-8 text-brand-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[var(--content-primary)] mb-2">
              See the dashboard with real sample workflows
            </h3>
            <p className="text-sm text-[#b0bec9] mb-5 max-w-lg mx-auto">
              Browse 10 real workflow recordings — view SOPs, process maps,
              agent intelligence, and evidence traces. No signup required.
            </p>
            <a href="/dashboard.html" className="btn-primary gap-2 px-6 py-3">
              <LayoutDashboard className="h-4 w-4" />
              Explore the live dashboard
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Get your first SOP in 60 seconds
          </h2>
          <p className="mt-3 text-[#b0bec9]">
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
