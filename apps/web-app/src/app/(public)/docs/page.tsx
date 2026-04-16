import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation — Ledgerium AI',
  description:
    'Complete user guide for Ledgerium AI — record workflows, generate SOPs, process maps, analytics, and more.',
};

/* ── Sidebar navigation items ─────────────────────────────────── */
const SIDEBAR_LINKS = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'visual-overview', label: 'Visual Overview' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'dashboard', label: 'Dashboard & Workflow Library' },
  { id: 'workflow-detail', label: 'Workflow Detail View' },
  { id: 'process-intelligence', label: 'Process Intelligence' },
  { id: 'recommendations', label: 'Recommendations Center' },
  { id: 'teams', label: 'Teams & Collaboration' },
  { id: 'account', label: 'Account & Settings' },
  { id: 'sharing', label: 'Sharing Workflows' },
  { id: 'exporting', label: 'Exporting Data' },
  { id: 'pricing', label: 'Plans & Pricing' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'faq', label: 'Troubleshooting & FAQ' },
] as const;

/* ── Small presentational helpers ────────────────────────────── */

function Screenshot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-lg border border-[var(--border-default)] shadow-lg bg-[var(--surface-primary)]">
        <Image
          src={src}
          alt={alt}
          width={900}
          height={560}
          className="block w-full h-auto"
          unoptimized
        />
      </div>
      <figcaption className="mt-2 text-sm text-[var(--content-tertiary)] text-center">
        {caption}
      </figcaption>
    </figure>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border-l-[3px] border-brand-400 bg-brand-900/10 px-4 py-3 text-sm text-brand-300 leading-relaxed">
      <span className="font-bold text-brand-400">Tip&nbsp;&nbsp;</span>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border-l-[3px] border-blue-400 bg-blue-900/10 px-4 py-3 text-sm text-blue-300 leading-relaxed">
      <span className="font-bold text-blue-400">Note&nbsp;&nbsp;</span>
      {children}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border-l-[3px] border-amber-400 bg-amber-900/10 px-4 py-3 text-sm text-amber-300 leading-relaxed">
      <span className="font-bold text-amber-400">Important&nbsp;&nbsp;</span>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
      {children}
    </code>
  );
}

/* Numbered steps that render the counter inline (works in RSC) */
function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="my-4 ml-0 list-none space-y-3">
      {steps.map((step: React.ReactNode, i: number) => (
        <li key={i} className="relative pl-11 text-[var(--content-primary)] leading-relaxed">
          <span className="absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-900/20 text-xs font-bold text-brand-400">
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function SectionDivider() {
  return <hr className="my-8 border-t border-[var(--border-default)]" />;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-20 border-t border-[var(--border-default)] pt-6 text-2xl font-bold tracking-tight text-[var(--content-primary)]"
    >
      {children}
    </h2>
  );
}

function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="scroll-mt-20 mt-10 mb-3 text-xl font-bold text-[var(--content-primary)]"
    >
      {children}
    </h3>
  );
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-7 mb-2 text-base font-semibold text-[var(--content-primary)]">
      {children}
    </h4>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 leading-relaxed text-[var(--content-primary)]">{children}</p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mb-4 ml-6 list-disc space-y-1.5 text-[var(--content-primary)] leading-relaxed [&>li::marker]:text-brand-400">
      {children}
    </ul>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)] px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--content-secondary)] whitespace-nowrap">
      {children}
    </th>
  );
}

function TD({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-[var(--border-default)] px-3.5 py-2.5 text-[var(--content-primary)]">
      {children}
    </td>
  );
}

/* ── Mobile TOC (client island would need 'use client' — use a     */
/*    details/summary element instead as a pure HTML solution)       */
function MobileTOC() {
  return (
    <details className="lg:hidden mb-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)]">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--content-primary)] select-none">
        On this page
      </summary>
      <nav className="px-4 pb-4 pt-1">
        <ol className="space-y-1">
          {SIDEBAR_LINKS.map(({ id, label }: typeof SIDEBAR_LINKS[number], i: number) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--content-secondary)] hover:text-brand-400 transition-colors"
              >
                <span className="text-brand-400 font-semibold w-5 text-right shrink-0">
                  {i + 1}.
                </span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

/* ── Desktop sidebar ─────────────────────────────────────────── */
function Sidebar() {
  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <div className="sticky top-20 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--content-tertiary)]">
            Contents
          </p>
        </div>
        <nav className="px-2 py-3">
          <ol className="space-y-0.5">
            {SIDEBAR_LINKS.map(({ id, label }: typeof SIDEBAR_LINKS[number], i: number) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-[var(--content-secondary)] hover:text-brand-400 hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <span className="text-brand-400 font-semibold w-5 text-right shrink-0 text-xs">
                    {i + 1}.
                  </span>
                  <span className="leading-tight">{label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* PAGE                                                            */
/* ═══════════════════════════════════════════════════════════════ */
export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-primary)]">
      {/* Page header */}
      <div className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <p className="text-sm text-brand-400 font-medium mb-2">User Guide</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--content-primary)] mb-3">
            Ledgerium AI Documentation
          </h1>
          <p className="text-[var(--content-secondary)] max-w-2xl leading-relaxed">
            Everything you need to record workflows, read the intelligence outputs, collaborate
            with your team, and manage your account.
          </p>
          <p className="mt-3 text-xs text-[var(--content-tertiary)]">
            Last updated April 2026 &middot; Version 1.0
          </p>
          {/* Section navigation pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#quick-start"
              className="inline-flex items-center rounded-full border border-brand-500/40 bg-brand-900/20 px-3 py-1 text-xs font-medium text-brand-400 hover:bg-brand-900/40 transition-colors"
            >
              Quick Start
            </a>
            <a
              href="#visual-overview"
              className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-medium text-[var(--content-secondary)] hover:text-brand-400 hover:border-brand-500/40 transition-colors"
            >
              Extension
            </a>
            <a
              href="#web-app-overview"
              className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-medium text-[var(--content-secondary)] hover:text-brand-400 hover:border-brand-500/40 transition-colors"
            >
              Web App
            </a>
            <a
              href="#getting-started"
              className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-1 text-xs font-medium text-[var(--content-secondary)] hover:text-brand-400 hover:border-brand-500/40 transition-colors"
            >
              Full Reference
            </a>
          </div>
        </div>
      </div>

      {/* ── Quick Start Section ─────────────────────────────────── */}
      <section id="quick-start" className="scroll-mt-20 bg-[var(--surface-elevated)] border-b border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
              Get up and running
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--content-primary)] mb-3">
              Quick Start
            </h2>
            <p className="text-[var(--content-secondary)] max-w-xl mx-auto leading-relaxed">
              From zero to your first recorded workflow in under five minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900/30 text-sm font-bold text-brand-400 border border-brand-500/30">
                  1
                </span>
                <h3 className="text-base font-bold text-[var(--content-primary)]">Create Account</h3>
              </div>
              <p className="text-sm text-[var(--content-secondary)] leading-relaxed mb-4">
                Sign up free — no credit card required. Takes less than a minute.
              </p>
              <a
                href="https://ledgerium.ai/signup"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                ledgerium.ai/signup
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900/30 text-sm font-bold text-brand-400 border border-brand-500/30">
                  2
                </span>
                <h3 className="text-base font-bold text-[var(--content-primary)]">Install Extension</h3>
              </div>
              <p className="text-sm text-[var(--content-secondary)] leading-relaxed mb-4">
                Download the Chrome extension, enable Developer Mode, and load unpacked. Pinning it to your toolbar makes it easy to access.
              </p>
              <a
                href="/install"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Installation guide
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900/30 text-sm font-bold text-brand-400 border border-brand-500/30">
                  3
                </span>
                <h3 className="text-base font-bold text-[var(--content-primary)]">Record a Workflow</h3>
              </div>
              <p className="text-sm text-[var(--content-secondary)] leading-relaxed mb-4">
                Click the extension icon, name your workflow, hit Record, do your work, then click Stop. Your workflow syncs automatically.
              </p>
              <a
                href="#getting-started"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                Detailed guide
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Visual Overview Section ──────────────────────────────── */}
      <section id="visual-overview" className="scroll-mt-20 bg-[var(--surface-primary)] border-b border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
              Platform overview
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--content-primary)] mb-3">
              Visual Overview
            </h2>
            <p className="text-[var(--content-secondary)] max-w-xl mx-auto leading-relaxed">
              A tour of the Chrome extension and web application — what you will see and how each screen fits into your workflow.
            </p>
          </div>

          {/* Browser Extension subsection */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-900/30 border border-brand-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </span>
              <h3 className="text-xl font-bold text-[var(--content-primary)]">Browser Extension</h3>
              <span className="ml-1 rounded-full bg-brand-900/20 border border-brand-500/30 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                Chrome
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Extension card 1 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-brand-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/extension/01-idle-screen.png"
                    alt="Extension idle screen showing workflow name field and settings"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Idle Screen</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Start here. Name your workflow and configure settings before recording begins.
                  </p>
                </div>
              </div>

              {/* Extension card 2 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-brand-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/extension/04-recording-active.png"
                    alt="Extension recording active screen showing steps captured in real-time"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Recording Active</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    See steps captured in real-time as you work through your process.
                  </p>
                </div>
              </div>

              {/* Extension card 3 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-brand-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/extension/05-paused-screen.png"
                    alt="Extension paused screen with resume option"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Pause &amp; Resume</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Pause anytime mid-process, then resume when you are ready to continue.
                  </p>
                </div>
              </div>

              {/* Extension card 4 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-brand-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/extension/06-stopping-screen.png"
                    alt="Extension stopping screen showing auto-sync to account"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Stop &amp; Upload</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Finish recording and your workflow automatically syncs to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Web Application subsection */}
          <div id="web-app-overview" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-900/30 border border-violet-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </span>
              <h3 className="text-xl font-bold text-[var(--content-primary)]">Web Application</h3>
              <span className="ml-1 rounded-full bg-violet-900/20 border border-violet-500/30 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                ledgerium.ai
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Web app card 1 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-violet-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/dashboard-with-workflows.png"
                    alt="Workflow dashboard showing library of recorded workflows"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Workflow Dashboard</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Your library of recorded workflows — browse, search, and open any recording.
                  </p>
                </div>
              </div>

              {/* Web app card 2 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-violet-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/workflow-sop-tab.png"
                    alt="SOP generation view showing structured operating procedures"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">SOP Generation</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Structured operating procedures generated automatically from your recordings.
                  </p>
                </div>
              </div>

              {/* Web app card 3 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-violet-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/workflow-flow-view.png"
                    alt="Process map showing visual flow diagram with phases"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Process Maps</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Visual flow diagrams showing each phase and decision point in your process.
                  </p>
                </div>
              </div>

              {/* Web app card 4 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-violet-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/analytics-dashboard.png"
                    alt="Intelligence dashboard showing process health scores and analytics"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Intelligence Dashboard</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Process health scores, timing analytics, and variation insights across runs.
                  </p>
                </div>
              </div>

              {/* Web app card 5 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-violet-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/workflow-agents-tab.png"
                    alt="AI Agent analysis tab showing automation opportunities"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">AI Agent Analysis</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Automation opportunities identified from your workflow patterns.
                  </p>
                </div>
              </div>

              {/* Web app card 6 */}
              <div className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden hover:border-violet-500/40 transition-colors">
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-primary)]">
                  <Image
                    src="/docs/screenshots/teams-page.png"
                    alt="Teams page showing shared libraries and member roles"
                    width={640}
                    height={400}
                    className="block w-full h-full object-cover object-top"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-[var(--content-primary)] mb-1">Team Collaboration</h4>
                  <p className="text-sm text-[var(--content-secondary)] leading-relaxed">
                    Shared workflow libraries, member management, and role-based access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation pills to detailed reference */}
          <div className="mt-12 flex flex-wrap justify-center gap-3 pt-8 border-t border-[var(--border-default)]">
            <a
              href="#getting-started"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-500/40 bg-brand-900/20 px-4 py-2 text-sm font-semibold text-brand-400 hover:bg-brand-900/40 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Extension Guide
            </a>
            <a
              href="#dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-900/20 px-4 py-2 text-sm font-semibold text-violet-400 hover:bg-violet-900/40 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              Web App Reference
            </a>
          </div>
        </div>
      </section>

      {/* Body: sidebar + content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex gap-10 items-start">
          <Sidebar />

          {/* Main content */}
          <article className="min-w-0 flex-1 space-y-0">
            <MobileTOC />

            {/* ── 1. GETTING STARTED ──────────────────────────── */}
            <section className="mb-16">
              <H2 id="getting-started">1. Getting Started</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Create an account, install the Chrome extension, and record your first workflow
                in under five minutes.
              </p>

              <H3 id="create-account">1.1 Creating your account</H3>
              <P>Ledgerium AI is free to start — no credit card required.</P>
              <StepList
                steps={[
                  <>Go to <a href="https://ledgerium.ai/signup" className="text-brand-400 hover:underline">ledgerium.ai/signup</a>.</>,
                  <>Enter your name (optional), email address, and a password (minimum 8 characters).</>,
                  <>Click <strong className="text-[var(--content-primary)]">Create Account</strong>.</>,
                  <>You are signed in and taken to your dashboard.</>,
                ]}
              />

              <Screenshot
                src="/docs/screenshots/public-signup.png"
                alt="Ledgerium AI sign-up page showing name, email, and password fields with the Create Account button."
                caption="The sign-up page — create a free account with just an email and password."
              />

              <Tip>
                Use a work email address. This makes it easier to connect with teammates later
                when you create or join a team.
              </Tip>

              <H3 id="install-extension">1.2 Installing the Chrome extension</H3>
              <P>
                The Ledgerium AI Chrome extension is what records your workflows. You install
                it once, and it runs alongside your normal browser activity whenever you choose
                to record.
              </P>

              <H4>Step 1 — Download the extension</H4>
              <StepList
                steps={[
                  <>From the footer or product page, click <strong className="text-[var(--content-primary)]">Get Extension</strong>, or go to <a href="https://ledgerium.ai/install" className="text-brand-400 hover:underline">ledgerium.ai/install</a>.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Install Chrome Extension</strong>.</>,
                  <>A <Code>.zip</Code> file downloads to your computer.</>,
                ]}
              />

              <Screenshot
                src="/docs/screenshots/public-install.png"
                alt="Extension installation page showing the download button and four-step installation guide."
                caption="The install page walks you through download, Developer Mode, and loading the extension."
              />

              <H4>Step 2 — Enable Developer Mode in Chrome</H4>
              <P>
                Because the extension is installed directly (sideloaded), Chrome requires
                Developer Mode to be enabled.
              </P>
              <StepList
                steps={[
                  <>In Chrome, navigate to <Code>chrome://extensions</Code>.</>,
                  <>Toggle <strong className="text-[var(--content-primary)]">Developer mode</strong> on using the switch in the top-right corner.</>,
                ]}
              />
              <Note>
                Developer Mode is a standard Chrome setting. It does not reduce your
                browser&rsquo;s security for normal browsing — it only permits manually
                installed extensions to run.
              </Note>

              <H4>Step 3 — Load the extension</H4>
              <StepList
                steps={[
                  <>Unzip the downloaded file to a permanent folder on your computer.</>,
                  <>On the <Code>chrome://extensions</Code> page, click <strong className="text-[var(--content-primary)]">Load unpacked</strong>.</>,
                  <>Select the folder you unzipped.</>,
                  <>The Ledgerium AI extension appears in your extension list.</>,
                ]}
              />

              <H4>Step 4 — Pin the extension</H4>
              <StepList
                steps={[
                  <>Click the puzzle-piece icon in the Chrome toolbar (top right).</>,
                  <>Find <strong className="text-[var(--content-primary)]">Ledgerium AI</strong> in the list.</>,
                  <>Click the pin icon so Ledgerium AI stays visible in your toolbar.</>,
                ]}
              />

              <H3 id="connect-extension">1.3 Connecting the extension to your account</H3>
              <P>
                The extension syncs recordings to your web app account automatically once you
                provide an API key.
              </P>

              <H4>Generate an API key</H4>
              <StepList
                steps={[
                  <>In the web app, click <strong className="text-[var(--content-primary)]">Account</strong> in the top navigation bar.</>,
                  <>Scroll to the <strong className="text-[var(--content-primary)]">Extension Sync</strong> section.</>,
                  <>Click <strong className="text-[var(--content-primary)]">+ New API Key</strong>.</>,
                  <>Copy the key immediately — it is shown only once.</>,
                  <>Note the <strong className="text-[var(--content-primary)]">Sync URL</strong> displayed on the page (e.g., <Code>https://ledgerium.ai/api/sync</Code>).</>,
                ]}
              />

              <Screenshot
                src="/docs/screenshots/account-api-keys.png"
                alt="Account page showing the Extension Sync section with the New API Key button."
                caption="The Extension Sync section on the Account page — create and manage API keys here."
              />

              <H4>Configure the extension</H4>
              <StepList
                steps={[
                  <>Click the Ledgerium AI icon in your Chrome toolbar to open the side panel.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Sync Settings</strong> at the bottom of the panel.</>,
                  <>Paste the <strong className="text-[var(--content-primary)]">Sync URL</strong> and your <strong className="text-[var(--content-primary)]">API Key</strong> into the fields.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Save</strong>.</>,
                ]}
              />
              <P>
                The extension will now automatically upload recordings to your account when you
                stop recording.
              </P>

              <H3 id="first-recording">1.4 Recording your first workflow</H3>
              <StepList
                steps={[
                  <>Navigate to the web application or browser tool you want to document.</>,
                  <>Click the Ledgerium AI icon in your Chrome toolbar to open the side panel.</>,
                  <>Enter a descriptive name in the <strong className="text-[var(--content-primary)]">Workflow name</strong> field (e.g., &ldquo;Process a new support ticket&rdquo;).</>,
                  <>Click <strong className="text-[var(--content-primary)]">Record</strong>.</>,
                  <>A recording indicator confirms the session is live.</>,
                  <>Perform your workflow as you normally would.</>,
                  <>When finished, click <strong className="text-[var(--content-primary)]">Stop</strong>.</>,
                ]}
              />
              <P>
                The extension finalizes the session and, if sync is configured, uploads it to
                your account automatically. The workflow appears in your dashboard within seconds.
              </P>
              <Tip>
                Use a specific, descriptive name. &ldquo;Submit a monthly expense report in
                Concur&rdquo; is more useful than &ldquo;expense test.&rdquo; The name becomes
                the workflow title in your library.
              </Tip>

              <H3 id="upload-manual">1.5 Uploading a workflow manually</H3>
              <P>
                If you recorded a workflow without sync configured, you can upload the JSON file
                directly.
              </P>
              <StepList
                steps={[
                  <>In the web app, click <strong className="text-[var(--content-primary)]">Upload</strong> in the navigation bar.</>,
                  <>Drag and drop your <Code>.json</Code> file onto the upload area, or click to browse.</>,
                  <>The platform validates the file and processes it through the deterministic engine.</>,
                  <>On success, you see the workflow title, step count, and detected tools.</>,
                  <>Click <strong className="text-[var(--content-primary)]">View Workflow</strong> to open it.</>,
                ]}
              />

              <Screenshot
                src="/docs/screenshots/upload-page.png"
                alt="Upload Workflow page with drag-and-drop area and supported format information."
                caption="The upload page accepts Ledgerium recorder session bundles (.json)."
              />

              <Note>
                Upload only accepts <Code>.json</Code> files exported by the Ledgerium AI
                recorder (maximum 10 MB). The file is validated against the session bundle
                schema before processing begins.
              </Note>

              <H3 id="sample-workflow">1.6 Loading a sample workflow</H3>
              <P>If you want to explore the platform before recording anything:</P>
              <StepList
                steps={[
                  <>Go to your <strong className="text-[var(--content-primary)]">Dashboard</strong>.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Try a sample workflow</strong>.</>,
                  <>A pre-built workflow loads into your library with all tabs and outputs populated.</>,
                ]}
              />
              <P>
                This is a good way to see what a fully processed workflow looks like before
                recording your own.
              </P>
            </section>

            {/* ── 2. DASHBOARD ────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="dashboard">2. Dashboard &amp; Workflow Library</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                The dashboard is your home base. It shows all your workflows and gives you quick
                access to search, filter, organize, and navigate to any recording.
              </p>

              <Screenshot
                src="/docs/screenshots/dashboard-with-workflows.png"
                alt="Dashboard showing the Process Intelligence summary, KPI cards, and the Workflow Library with multiple recorded workflows."
                caption="The dashboard with 8 workflows: intelligence summary at the top, workflow library below."
              />

              <H3 id="dashboard-layout">2.1 Dashboard layout</H3>
              <P>The dashboard is split into two major areas:</P>

              <H4>Process Intelligence summary (top)</H4>
              <P>
                When you have enough workflows, the dashboard shows an intelligence summary with:
              </P>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Card</TH>
                    <TH>What it shows</TH>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['Sources & Workflows', 'Total workflows and data sources in your library'],
                      ['Steps & Duration', 'Combined step count and average duration across workflows'],
                      ['SOP & Confidence', 'SOP readiness score and average confidence percentage'],
                      ['Intelligence Summary', 'Count of active items, action items, and recent findings'],
                      ['AI Opportunities', 'Number of workflows with automation potential'],
                      ['Recent Activity', 'Latest workflow additions and changes'],
                    ] as Array<[string, string]>
                  ).map(([card, desc]) => (
                    <tr key={card}>
                      <TD><strong className="text-[var(--content-primary)]">{card}</strong></TD>
                      <TD>{desc}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <H4>Workflow Library (bottom)</H4>
              <P>
                The library shows all your workflows as a filterable list with quick-access
                metadata on each row. Toggle between <strong className="text-[var(--content-primary)]">Workflows</strong>{' '}
                view and <strong className="text-[var(--content-primary)]">Process Groups</strong> view using the view
                selector above the list.
              </P>

              <H3 id="search-filter">2.2 Searching and filtering</H3>
              <P>Use the toolbar above the workflow list to find specific workflows.</P>

              <Screenshot
                src="/docs/screenshots/dashboard-search-filter.png"
                alt="Dashboard with the search bar active, showing 'Purchase' typed into the search field with filtered results below."
                caption='Searching for "Purchase" instantly filters the workflow library.'
              />

              <H4>Search bar</H4>
              <P>Type any part of a workflow title. Results update as you type.</P>

              <H4>Preset quick-filter buttons</H4>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Button</TH>
                    <TH>Shows</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['All', 'Your complete library'],
                    ['AI Health', 'Workflows with health status indicators'],
                    ['AI SOP Status', 'SOP readiness filtering'],
                    ['Recently Added', 'Workflows from the last 7 days'],
                  ].map(([btn, desc]) => (
                    <tr key={btn}>
                      <TD><strong className="text-[var(--content-primary)]">{btn}</strong></TD>
                      <TD>{desc}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <H4>Sort options</H4>
              <P>
                Click the sort dropdown to order workflows by date added, name, step count, or
                duration.
              </P>

              <H3 id="workflow-cards">2.3 Workflow cards</H3>
              <P>Each row in the workflow library shows:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Title</strong> — the workflow name from the recording.</li>
                <li><strong className="text-[var(--content-primary)]">Tool badges</strong> — applications detected (e.g., Salesforce, Workday, Stripe).</li>
                <li><strong className="text-[var(--content-primary)]">Confidence badge</strong> — the engine&rsquo;s certainty in step segmentation (green = high, amber = moderate, red = low).</li>
                <li><strong className="text-[var(--content-primary)]">Step count &amp; duration</strong> — number of detected steps and total time.</li>
                <li><strong className="text-[var(--content-primary)]">Date</strong> — when the recording was created.</li>
                <li><strong className="text-[var(--content-primary)]">Favorite star</strong> — click to pin a workflow to the top of your library.</li>
              </UL>

              <H3 id="portfolios">2.4 Portfolios</H3>
              <P>
                Portfolios are folders that let you group related workflows — for example,
                &ldquo;Onboarding Workflows,&rdquo; &ldquo;Finance Processes,&rdquo; or
                &ldquo;Support Playbooks.&rdquo;
              </P>

              <Screenshot
                src="/docs/screenshots/dashboard-portfolio-sidebar.png"
                alt="Dashboard showing the portfolio sidebar on the left with the Portfolios section expanded."
                caption="The portfolio sidebar lets you organize workflows into named groups."
              />

              <H4>Creating a portfolio</H4>
              <StepList
                steps={[
                  <>In the sidebar, click the <strong className="text-[var(--content-primary)]">+</strong> icon next to &ldquo;Portfolios.&rdquo;</>,
                  <>Enter a name for the portfolio.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Create</strong>.</>,
                ]}
              />

              <H4>Navigating portfolios</H4>
              <UL>
                <li>Click any portfolio name in the sidebar to filter the dashboard to only workflows in that group.</li>
                <li>Portfolios can be nested to create a multi-level folder structure.</li>
              </UL>
            </section>

            {/* ── 3. WORKFLOW DETAIL ──────────────────────────── */}
            <section className="mb-16">
              <H2 id="workflow-detail">3. Workflow Detail View</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Click any workflow from the dashboard to open its detail page. This is where you
                access all the outputs generated from a recording.
              </p>

              <H3>Header</H3>
              <P>The header at the top of every workflow detail page shows:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Workflow title</strong> — editable by clicking the pencil icon next to it.</li>
                <li><strong className="text-[var(--content-primary)]">Metadata row</strong> — step count, total duration, phase count, confidence score, view count, and creation date.</li>
                <li><strong className="text-[var(--content-primary)]">Tool badges</strong> — all applications detected during the recording (e.g., <em>Salesforce</em>, <em>Google Sheets</em>).</li>
                <li><strong className="text-[var(--content-primary)]">Export buttons</strong> — <strong className="text-[var(--content-primary)]">Report</strong>, <strong className="text-[var(--content-primary)]">SOP</strong>, and <strong className="text-[var(--content-primary)]">JSON</strong> download buttons in the top-right corner.</li>
                <li><strong className="text-[var(--content-primary)]">Share button</strong> — enable a public link for this workflow.</li>
              </UL>

              <H3>Tab bar</H3>
              <P>
                Below the header, eight tabs give you different views of the same recording:
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Workflow</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">SOP</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">Report</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">Insights</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">Interpretation</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">Intelligence</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">AI Agents</strong> &middot;{' '}
                <strong className="text-[var(--content-primary)]">Evidence</strong>
              </P>

              <SectionDivider />

              <H3 id="process-map">3.1 Process Map (Workflow tab)</H3>
              <P>
                The Workflow tab renders your recorded process as an interactive visual map. It
                has multiple display modes selectable from the sub-toolbar.
              </P>

              <H4>Flow Intelligence mode (default)</H4>
              <P>Flow Intelligence shows the step-by-step execution as a connected node graph.</P>
              <Screenshot
                src="/docs/screenshots/workflow-flow-view.png"
                alt="Workflow tab showing the Flow Intelligence process map with connected step nodes, phases, and a minimap in the corner."
                caption="Flow Intelligence view — the default process map showing step sequence, phases, and inter-system connections."
              />
              <UL>
                <li><strong className="text-[var(--content-primary)]">Phases</strong> — steps are grouped into phases (e.g., &ldquo;Initiation,&rdquo; &ldquo;Processing,&rdquo; &ldquo;Completion&rdquo;) shown as labeled sections.</li>
                <li><strong className="text-[var(--content-primary)]">Step nodes</strong> — each node shows the step title, category badge, and duration.</li>
                <li><strong className="text-[var(--content-primary)]">Decision nodes</strong> — branching points appear as diamond shapes.</li>
                <li><strong className="text-[var(--content-primary)]">Interactive canvas</strong> — scroll to zoom, drag to pan.</li>
              </UL>

              <H4>Toolbar controls</H4>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Toggle</TH>
                    <TH>What it does</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Flow Intelligence', 'Default step-sequence view'],
                    ['Swimlane', 'Steps organized by system/application'],
                    ['Process Variants', 'Overlays execution paths from multiple recordings'],
                    ['System Interaction', 'Focus on cross-system integration patterns'],
                  ].map(([toggle, desc]) => (
                    <tr key={toggle}>
                      <TD><strong className="text-[var(--content-primary)]">{toggle}</strong></TD>
                      <TD>{desc}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <H4>Swimlane mode</H4>
              <P>
                Swimlane view reorganizes the workflow into horizontal lanes, one per detected
                system or application.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-swimlane-view.png"
                alt="Swimlane mode showing Salesforce and Google Sheets in separate horizontal lanes with arrows crossing between them."
                caption="Swimlane mode — each application gets its own lane, showing exactly where work transfers between systems."
              />
              <UL>
                <li>Each lane represents a different tool (e.g., Salesforce, Google Sheets).</li>
                <li><strong className="text-[var(--content-primary)]">Handoff edges</strong> — transitions between systems are shown as curved arrows crossing lane boundaries.</li>
                <li>Best for workflows that move across multiple tools.</li>
              </UL>

              <H4>Inspector panel</H4>
              <P>
                Click any node on the canvas to open the Inspector panel on the right. The
                Inspector shows the step title, category, duration, systems, operational
                definition, expected outcomes, and any warnings.
              </P>

              <SectionDivider />

              <H3 id="sop-tab">3.2 SOP Tab</H3>
              <P>
                The SOP tab presents the Standard Operating Procedure derived from the
                recording. Every instruction traces back to an observed event — no content is
                fabricated.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-sop-tab.png"
                alt="SOP tab showing numbered procedure steps with operational definitions, expected outcomes, and system badges."
                caption="The SOP tab — a structured, step-by-step operating procedure generated deterministically from the recording."
              />
              <P>The SOP has three sub-modes:</P>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Mode</TH>
                    <TH>Description</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Execution SOP', 'The primary reference — numbered steps with instructions, expected outcomes, duration, and system badges.'],
                    ['Visual Process', 'Steps grouped by phase with system context alongside each step.'],
                    ['Intelligence', 'Overlays friction points, decision criteria, rework loops, and optimization opportunities on the SOP.'],
                  ].map(([mode, desc]) => (
                    <tr key={mode}>
                      <TD><strong className="text-[var(--content-primary)]">{mode}</strong></TD>
                      <TD>{desc}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <P>Each step card in the Execution SOP shows:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Step number</strong> and <strong className="text-[var(--content-primary)]">title</strong> — sequential position and what the step accomplishes.</li>
                <li><strong className="text-[var(--content-primary)]">Category badge</strong> — the type of action (color-coded: Navigation, Form Submit, Data Entry, etc.).</li>
                <li><strong className="text-[var(--content-primary)]">Operational definition</strong> — a clear instruction describing exactly what to do.</li>
                <li><strong className="text-[var(--content-primary)]">Expected outcome</strong> — what should happen when the step is complete.</li>
                <li><strong className="text-[var(--content-primary)]">Duration</strong> and <strong className="text-[var(--content-primary)]">related systems</strong>.</li>
                <li><strong className="text-[var(--content-primary)]">Warnings</strong> — flags for sensitive data, non-standard behavior, or low-confidence segments.</li>
              </UL>
              <P>
                Use <strong className="text-[var(--content-primary)]">Expand All</strong> to open every step at once, or{' '}
                <strong className="text-[var(--content-primary)]">Collapse All</strong> to return to the summary view.
              </P>

              <SectionDivider />

              <H3 id="report-tab">3.3 Report Tab</H3>
              <P>
                The Report tab provides a structured summary formatted for sharing with
                stakeholders or managers who need an overview rather than full operational
                detail.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-report-tab.png"
                alt="Report tab showing a health scorecard with key metrics: duration, bottlenecks, phases, and step count."
                caption="The Report tab — a concise health scorecard and performance summary."
              />
              <H4>Health scorecard</H4>
              <P>A 0–100 score with color interpretation:</P>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Score</TH>
                    <TH>Status</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['80–100', 'Healthy — process is well-structured and consistent'],
                    ['60–79', 'Moderate — some friction or variance detected'],
                    ['40–59', 'Needs attention — notable issues present'],
                    ['0–39', 'Critical — significant problems detected'],
                  ].map(([score, status]) => (
                    <tr key={score}>
                      <TD>{score}</TD>
                      <TD>{status}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <H4>Key metrics</H4>
              <UL>
                <li>Total duration and average step duration</li>
                <li>Step count and distribution across phases</li>
                <li>Bottleneck count and friction points</li>
                <li>System interaction count</li>
              </UL>

              <SectionDivider />

              <H3 id="insights-tab">3.4 Insights Tab</H3>
              <P>
                The Insights tab surfaces specific, actionable findings from the process
                analysis, categorized by severity.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-insights-tab.png"
                alt="Insights tab showing a green 'No inefficiencies detected' status for a well-structured workflow."
                caption="The Insights tab — when a workflow is well-structured, it shows a clean health status. Workflows with issues show categorized finding cards."
              />
              <H4>Severity levels</H4>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Severity</TH>
                    <TH>Color</TH>
                    <TH>Meaning</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Critical', 'Red', 'A significant issue that affects process reliability'],
                    ['Warning', 'Amber', 'A notable issue worth addressing'],
                    ['Info', 'Blue', 'An observation or opportunity, not urgent'],
                  ].map(([sev, color, meaning]) => (
                    <tr key={sev}>
                      <TD>{sev}</TD>
                      <TD>{color}</TD>
                      <TD>{meaning}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <P>
                Each insight card shows: title, type (Bottleneck, Friction, Rework, Variance,
                Anomaly), explanation with data points, affected steps, and a concrete
                recommendation.
              </P>

              <SectionDivider />

              <H3 id="interpretation-tab">3.5 Interpretation Tab</H3>
              <P>
                The Interpretation tab provides an analytical summary of the process structure,
                written for process owners and improvement leads.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-interpretation-tab.png"
                alt="Interpretation tab with a prompt to upload a workflow to generate process intelligence."
                caption="The Interpretation tab — provides executive summary, complexity scores, phase breakdown, friction analysis, and decision points once populated."
              />
              <P>When populated, the tab includes:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Executive summary</strong> — paragraph-level description of what the process does, who performs it, and which systems are involved.</li>
                <li><strong className="text-[var(--content-primary)]">Process type classification</strong> — the engine&rsquo;s assessment of the process category with a confidence score.</li>
                <li><strong className="text-[var(--content-primary)]">Complexity scores</strong> — four 0–100 scores: Complexity, Friction, Linearity, and Manual Intensity.</li>
                <li><strong className="text-[var(--content-primary)]">Phase breakdown</strong> — each detected phase with dominant action types and step count.</li>
                <li><strong className="text-[var(--content-primary)]">Friction analysis</strong> and <strong className="text-[var(--content-primary)]">decision points</strong> — specific evidence-backed findings.</li>
              </UL>

              <SectionDivider />

              <H3 id="intelligence-tab">3.6 Intelligence Tab</H3>
              <P>
                The Intelligence tab shows detailed performance metrics, typically populated
                when multiple recordings of the same process are available for comparison.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-intelligence-tab.png"
                alt="Intelligence tab with an 'Analyze Workflows' button to run process intelligence."
                caption='Click "Analyze Workflows" to run the intelligence engine and populate metrics, variant analysis, and SOP alignment data.'
              />
              <P>Once analysis is complete, the tab includes:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Process metrics</strong> — run count, completion rate, duration statistics (median, mean, P90).</li>
                <li><strong className="text-[var(--content-primary)]">Variant analysis</strong> — standard path vs. alternative execution paths with similarity scores.</li>
                <li><strong className="text-[var(--content-primary)]">Time study</strong> — per-step duration breakdown showing steps with high variance.</li>
                <li><strong className="text-[var(--content-primary)]">SOP alignment</strong> — how closely observed execution matches the documented SOP, including undocumented steps and drift indicators.</li>
              </UL>

              <SectionDivider />

              <H3 id="agents-tab">3.7 AI Agents Tab</H3>
              <P>
                The AI Agents tab analyzes the workflow from an automation perspective,
                identifying which steps are candidates for AI or robotic process automation.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-agents-tab.png"
                alt="AI Agents tab with an 'Analyze with Agent Intelligence' button."
                caption='Click "Analyze with Agent Intelligence" to generate automation suitability scores, effort estimates, and agent composition maps.'
              />
              <P>Once analysis is complete:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Agent composition</strong> — a map of which AI agent types could cover each phase (data extraction, form-fill, decision agent, etc.).</li>
                <li><strong className="text-[var(--content-primary)]">Automation suitability per step</strong> — each step scored 0–100 for automation potential.</li>
                <li><strong className="text-[var(--content-primary)]">Effort and complexity estimates</strong> — development effort to automate each step.</li>
                <li><strong className="text-[var(--content-primary)]">Success probability</strong> — estimated reliability based on execution consistency.</li>
                <li><strong className="text-[var(--content-primary)]">Integration risk assessment</strong> — flags steps interacting with systems that may lack APIs.</li>
              </UL>
              <Note>The AI Agents tab is available on Growth and Enterprise plans.</Note>

              <SectionDivider />

              <H3 id="evidence-tab">3.8 Evidence Tab</H3>
              <P>
                The Evidence tab shows the raw structured data underlying all outputs. It is
                designed for engineers, auditors, and compliance reviewers who need to inspect
                exactly what was captured.
              </P>
              <Screenshot
                src="/docs/screenshots/workflow-evidence-tab.png"
                alt="Evidence tab showing expandable sections for Process Run, Process Definition, Process Map, and Standard Operating Procedure."
                caption="The Evidence tab — browse the raw process engine output as expandable JSON sections."
              />
              <P>The tab contains expandable sections for:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Process Run</strong> — the complete execution record with timestamps and event sequences.</li>
                <li><strong className="text-[var(--content-primary)]">Process Definition</strong> — the canonical step definitions, boundaries, and confidence scores.</li>
                <li><strong className="text-[var(--content-primary)]">Process Map</strong> — the structured process map with phases, nodes, and edges.</li>
                <li><strong className="text-[var(--content-primary)]">Standard Operating Procedure</strong> — the SOP data structure.</li>
              </UL>
              <P>
                Click <strong className="text-[var(--content-primary)]">Copy All JSON</strong> to copy the complete evidence bundle to your clipboard.
              </P>
              <Tip>
                All outputs are deterministic — the same recording always produces the same
                evidence structure, making it suitable for audit and compliance purposes.
              </Tip>
            </section>

            {/* ── 4. PROCESS INTELLIGENCE ─────────────────────── */}
            <section className="mb-16">
              <H2 id="process-intelligence">4. Process Intelligence</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                The Intelligence page provides portfolio-level analysis across all your
                workflows, surfacing patterns, comparisons, and insights across your entire
                library.
              </p>
              <P>
                Access it by clicking <strong className="text-[var(--content-primary)]">Intelligence</strong> in the top
                navigation bar.
              </P>

              <Screenshot
                src="/docs/screenshots/analytics-dashboard.png"
                alt="Process Intelligence page showing KPI cards, process health overview bar, process families list, and performance leaderboard."
                caption="The Intelligence page after running analysis — process families detected, health overview, and performance leaderboard."
              />

              <H3>4.1 Running analysis</H3>
              <P>
                Click the <strong className="text-[var(--content-primary)]">Run Analysis</strong> button (top right) to
                trigger the intelligence engine. This:
              </P>
              <StepList
                steps={[
                  <>Clusters similar workflows into <strong className="text-[var(--content-primary)]">process families</strong> based on step sequence patterns.</>,
                  <>Computes aggregate metrics across all runs within each family.</>,
                  <>Detects bottlenecks, variance, and drift at the portfolio level.</>,
                  <>Generates actionable insights and standardization recommendations.</>,
                ]}
              />
              <Tip>
                Run analysis periodically as you add new recordings to catch drift and new
                patterns that emerge over time.
              </Tip>

              <H3>4.2 Executive summary KPIs</H3>
              <P>Summary cards across the top of the page:</P>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>KPI</TH>
                    <TH>What it shows</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Workflows', 'Count of all recordings in your library'],
                    ['Process Families', 'Number of distinct process types detected'],
                    ['Total Runs', 'Aggregate execution count across families'],
                    ['Variants', 'Count of alternative execution paths'],
                    ['Avg Stability', 'Portfolio-wide consistency score'],
                    ['Active Signals', 'Number of active intelligence findings'],
                    ['High Variation', 'Families with concerning inconsistency'],
                  ].map(([kpi, desc]) => (
                    <tr key={kpi}>
                      <TD><strong className="text-[var(--content-primary)]">{kpi}</strong></TD>
                      <TD>{desc}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <H3>4.3 Process Health Overview</H3>
              <P>
                A color-coded bar showing the distribution of your workflows by health status:{' '}
                <strong className="text-[var(--content-primary)]">Stable</strong>,{' '}
                <strong className="text-[var(--content-primary)]">Moderate</strong>,{' '}
                <strong className="text-[var(--content-primary)]">Unstable</strong>, and{' '}
                <strong className="text-[var(--content-primary)]">Unanalyzed</strong>.
              </P>

              <H3>4.4 Process Families</H3>
              <P>
                Process families are clusters of similar workflows. Each family card shows the
                canonical name, run count, variant count, average duration, and stability score.
                Click any family to drill into the <strong className="text-[var(--content-primary)]">Process Detail</strong> view.
              </P>

              <H3>4.5 Performance Leaderboard</H3>
              <P>
                Ranked lists surfacing the workflows most in need of attention:{' '}
                <strong className="text-[var(--content-primary)]">Slowest processes</strong>,{' '}
                <strong className="text-[var(--content-primary)]">Highest variation</strong>, and{' '}
                <strong className="text-[var(--content-primary)]">Fastest processes</strong>.
              </P>

              <SectionDivider />

              <H3>4.6 Process Detail view</H3>
              <P>Click any process family from the Intelligence page to open the detailed view.</P>
              <Screenshot
                src="/docs/screenshots/analytics-process-detail.png"
                alt="Process detail view showing intelligence summary, action items, AI opportunities, and workflow library for a specific process family."
                caption="The Process Detail view — deep-dive into a specific process family with time study, variance analysis, and AI recommendations."
              />
              <P>The detail view includes:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Time study analysis</strong> — per-step duration breakdown with mean, median, and P90.</li>
                <li><strong className="text-[var(--content-primary)]">Variance analysis</strong> — duration CV, step count CV, and sequence stability.</li>
                <li><strong className="text-[var(--content-primary)]">Process variants</strong> — visualization of all execution paths with frequency.</li>
                <li><strong className="text-[var(--content-primary)]">SOP alignment</strong> — alignment score, undocumented steps, drift indicators.</li>
                <li><strong className="text-[var(--content-primary)]">Standardization scorecard</strong> — readiness for standardization.</li>
                <li><strong className="text-[var(--content-primary)]">Automation ROI candidates</strong> — steps ranked by automation potential and impact.</li>
                <li><strong className="text-[var(--content-primary)]">AI recommendations</strong> — specific recommendations with type, impact, confidence, effort, and evidence.</li>
              </UL>
            </section>

            {/* ── 5. RECOMMENDATIONS ──────────────────────────── */}
            <section className="mb-16">
              <H2 id="recommendations">5. Recommendations Center</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                The Recommendations page aggregates all AI-generated recommendations across your
                entire workflow library into one actionable view.
              </p>
              <P>
                Access it by clicking <strong className="text-[var(--content-primary)]">Actions</strong> in the navigation
                bar.
              </P>

              <Screenshot
                src="/docs/screenshots/recommendations-page.png"
                alt="Recommendation Center showing filterable list of automation recommendations with type, impact, and confidence badges."
                caption="The Recommendation Center with actionable improvement suggestions across all processes."
              />

              <H3>Filtering recommendations</H3>
              <P>Use the filter toolbar to narrow the list:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">By type</strong> — All Types, Standardize, Update SOP, Automate, Reduce Rework, Optimize Handoff.</li>
                <li><strong className="text-[var(--content-primary)]">By impact</strong> — All Impact, High, Medium, Low.</li>
                <li><strong className="text-[var(--content-primary)]">By confidence</strong> — All Confidence, High, Medium, Low.</li>
              </UL>

              <H3>Recommendation cards</H3>
              <P>Each card shows:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Type badge</strong> — the category (e.g., &ldquo;Automate step 4&rdquo;).</li>
                <li><strong className="text-[var(--content-primary)]">Process name</strong> — which process family the recommendation applies to.</li>
                <li><strong className="text-[var(--content-primary)]">Description</strong> — what to do and why, with specific evidence.</li>
                <li><strong className="text-[var(--content-primary)]">Impact, Confidence, Effort</strong> badges — color-coded severity indicators.</li>
                <li><strong className="text-[var(--content-primary)]">View Process</strong> link — jump directly to the Process Detail page.</li>
              </UL>
            </section>

            {/* ── 6. TEAMS ────────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="teams">6. Teams &amp; Collaboration</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Teams allow multiple users to share a workflow library, record together, and
                collaborate on process documentation.
              </p>

              <Screenshot
                src="/docs/screenshots/teams-page.png"
                alt="Teams page showing the empty state with a 'Create your first team' button."
                caption='The Teams page — click "Create Team" to start collaborating.'
              />

              <H3>6.1 Creating a team</H3>
              <StepList
                steps={[
                  <>Click <strong className="text-[var(--content-primary)]">Teams</strong> in the navigation bar.</>,
                  <>Click <strong className="text-[var(--content-primary)]">+ Create Team</strong>.</>,
                  <>Enter a team name.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Create</strong>.</>,
                ]}
              />

              <Screenshot
                src="/docs/screenshots/teams-create.png"
                alt="Create a new team dialog with a team name input field and Create/Cancel buttons."
                caption="The team creation dialog — enter a name and click Create."
              />

              <H3>6.2 Inviting team members</H3>
              <StepList
                steps={[
                  <>Go to your team&rsquo;s page.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Invite Member</strong>.</>,
                  <>Enter the email address of the person you want to invite.</>,
                  <>Select their role.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Send Invite</strong>.</>,
                ]}
              />
              <P>
                The invitee receives a link. They can follow it to join — even if they
                don&rsquo;t yet have a Ledgerium account.
              </P>

              <H3>6.3 Member roles</H3>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Role</TH>
                    <TH>Permissions</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Owner', 'Full control: manage billing, delete the team, assign any role'],
                    ['Admin', 'Manage members, invite others, manage all workflows and portfolios'],
                    ['Member', 'Record workflows, upload, view and edit shared library, create portfolios'],
                    ['Viewer', 'Read-only access to the shared library, no recording permissions'],
                  ].map(([role, perms]) => (
                    <tr key={role}>
                      <TD><strong className="text-[var(--content-primary)]">{role}</strong></TD>
                      <TD>{perms}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <H3>6.4 Shared workflow library</H3>
              <P>
                Once on a team, all Member and Admin recordings are visible in the shared team
                library. Portfolio organization applies across the whole team. Any team member
                with the appropriate role can view, search, filter, export workflows, assign
                them to portfolios, and run intelligence analysis across the full team library.
              </P>
            </section>

            {/* ── 7. ACCOUNT ──────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="account">7. Account &amp; Settings</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Manage your profile, billing, API keys, and privacy settings.
              </p>
              <P>
                Access your account by clicking <strong className="text-[var(--content-primary)]">Account</strong> in the
                top navigation bar.
              </P>

              <Screenshot
                src="/docs/screenshots/account-page.png"
                alt="Account page showing Profile, Plan & Billing, Extension Sync, and Trust & Privacy sections."
                caption="The Account page — all your settings organized into clear sections."
              />

              <H3>7.1 Profile</H3>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Email</strong> — your login email (read-only).</li>
                <li><strong className="text-[var(--content-primary)]">Name</strong> — your display name (editable).</li>
                <li><strong className="text-[var(--content-primary)]">Member since</strong> — account creation date.</li>
              </UL>

              <H3>7.2 Plan &amp; Billing</H3>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Current Plan</strong> — your active plan name.</li>
                <li><strong className="text-[var(--content-primary)]">Status</strong> — subscription status (active, trialing, etc.).</li>
                <li><strong className="text-[var(--content-primary)]">Uploads</strong> — recording count for the current billing period.</li>
                <li>Click <strong className="text-[var(--content-primary)]">Upgrade Now</strong> (for free/starter users) to change plans.</li>
                <li>For paid users, the <strong className="text-[var(--content-primary)]">Manage Subscription</strong> link opens Stripe&rsquo;s billing portal.</li>
              </UL>

              <H3>7.3 Extension Sync</H3>
              <P>
                This is where you create and manage API keys for connecting the Chrome extension
                to your account. You can create up to 3 API keys.
              </P>
              <UL>
                <li>The key prefix is shown for identification (the full key is only revealed at creation time).</li>
                <li>The last-used date is displayed for each key.</li>
                <li>Click the <strong className="text-[var(--content-primary)]">trash icon</strong> to revoke a key.</li>
              </UL>
              <Warning>
                Revoking a key immediately disconnects any extension using it. You will need to
                create a new key and reconfigure the extension.
              </Warning>

              <H3>7.4 Trust &amp; Privacy</H3>
              <P>The account page includes a summary of Ledgerium AI&rsquo;s commitments:</P>
              <UL>
                <li>All workflow processing is deterministic — same input, same output.</li>
                <li>Sensitive values are never stored — only field labels are preserved.</li>
                <li>Your workflow data is private to your account.</li>
              </UL>
            </section>

            {/* ── 8. SHARING ──────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="sharing">8. Sharing Workflows</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Share any workflow with someone outside your account using a public link — no
                login required for the viewer.
              </p>

              <H3>8.1 Enabling sharing</H3>
              <StepList
                steps={[
                  <>Open the workflow you want to share.</>,
                  <>Click the <strong className="text-[var(--content-primary)]">Share</strong> button in the workflow header.</>,
                  <>Toggle sharing on in the dialog.</>,
                  <>A public URL is generated. Click <strong className="text-[var(--content-primary)]">Copy Link</strong> to copy it to your clipboard.</>,
                ]}
              />

              <Screenshot
                src="/docs/screenshots/workflow-share-dialog.png"
                alt="Workflow detail page with the Share dialog active, showing the share toggle and generated public URL."
                caption="The sharing dialog — toggle on, copy the link, send to anyone."
              />

              <H3>8.2 What shared viewers see</H3>
              <P>Visitors with the public link can view:</P>
              <UL>
                <li>The workflow metadata (title, step count, duration, confidence, tools).</li>
                <li>The SOP tab — full standard operating procedure.</li>
                <li>The Report tab — health scorecard and key metrics.</li>
              </UL>
              <P>
                Shared viewers <strong className="text-[var(--content-primary)]">cannot</strong>: edit the workflow, access
                the Evidence tab, download raw JSON, or access your other workflows.
              </P>

              <H3>8.3 Revoking shared access</H3>
              <StepList
                steps={[
                  <>Open the workflow.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Share</strong>.</>,
                  <>Toggle sharing off.</>,
                ]}
              />
              <P>
                The previous link immediately stops working. If you re-enable sharing, a new
                unique link is generated.
              </P>
            </section>

            {/* ── 9. EXPORTING ────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="exporting">9. Exporting Data</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Ledgerium AI outputs are designed to be portable. Export in multiple formats
                from the workflow detail page header.
              </p>

              <H3>Export formats</H3>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Button</TH>
                    <TH>What downloads</TH>
                    <TH>Available on</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['JSON', 'Complete structured output: process run, definition, map, and SOP in one machine-readable file', 'All plans'],
                    ['Report', 'Workflow report as a structured document', 'Starter+'],
                    ['SOP', 'Standard operating procedure as a standalone document', 'Starter+'],
                  ].map(([btn, desc, plan]) => (
                    <tr key={btn}>
                      <TD><strong className="text-[var(--content-primary)]">{btn}</strong></TD>
                      <TD>{desc}</TD>
                      <TD>{plan}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <P>
                Files are named after the workflow title (e.g.,{' '}
                <Code>weekly-sales-pipeline-review-sop.json</Code>).
              </P>

              <H3>Exporting raw workflow data</H3>
              <P>
                Click the <strong className="text-[var(--content-primary)]">JSON</strong> button for the most complete
                export. Use it for:
              </P>
              <UL>
                <li>Archiving recordings for compliance.</li>
                <li>Importing into custom tools or pipelines.</li>
                <li>Sharing with engineering teams building automations.</li>
              </UL>

              <H3>Watermarked vs. clean exports</H3>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Plan</TH>
                    <TH>Export quality</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Free', 'Watermarked — includes a Ledgerium AI attribution footer'],
                    ['Starter and above', 'Clean exports — no watermark'],
                  ].map(([plan, quality]) => (
                    <tr key={plan}>
                      <TD>{plan}</TD>
                      <TD>{quality}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </section>

            {/* ── 10. PRICING ─────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="pricing">10. Plans &amp; Pricing</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Ledgerium AI offers five plan tiers. Annual billing saves approximately 17%
                compared to monthly.
              </p>

              <Screenshot
                src="/docs/screenshots/public-pricing.png"
                alt="Pricing page showing five tiers: Free, Starter, Team, Growth, and Enterprise with monthly/annual toggle."
                caption="The pricing page with monthly and annual billing toggle."
              />

              <H3>Plan comparison</H3>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Feature</TH>
                    <TH>Free</TH>
                    <TH>Starter</TH>
                    <TH>Team</TH>
                    <TH>Growth</TH>
                    <TH>Enterprise</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Price (monthly)', '$0', '$49', '$249', '$799', 'Custom'],
                    ['Price (annual)', '—', '$41/mo', '$207/mo', '$665/mo', 'Custom'],
                    ['Seats', '1 user', '1 recorder', '3 recorders + 5 viewers', '10 recorders, 15 seats', 'Custom'],
                    ['Recordings/month', '5', '15', 'Unlimited', 'Unlimited', 'Custom'],
                    ['SOP + process map', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
                    ['Public sharing', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
                    ['Clean exports', 'No', 'Yes', 'Yes', 'Yes', 'Yes'],
                    ['Health scores', 'No', 'Yes', 'Yes', 'Yes', 'Yes'],
                    ['Full intelligence layer', 'No', 'No', 'Yes', 'Yes', 'Yes'],
                    ['Bottleneck & friction analysis', 'No', 'No', 'Yes', 'Yes', 'Yes'],
                    ['Automation scoring', 'No', 'No', 'Yes', 'Yes', 'Yes'],
                    ['Shared team library', 'No', 'No', 'Yes', 'Yes', 'Yes'],
                    ['Advanced analytics', 'No', 'No', 'No', 'Yes', 'Yes'],
                    ['AI agent composition', 'No', 'No', 'No', 'Yes', 'Yes'],
                    ['SSO & RBAC', 'No', 'No', 'No', 'No', 'Yes'],
                    ['Audit trail', 'No', 'No', 'No', 'No', 'Yes'],
                    ['On-premise option', 'No', 'No', 'No', 'No', 'Yes'],
                  ].map(([feature, ...vals]) => (
                    <tr key={feature}>
                      <TD><strong className="text-[var(--content-primary)]">{feature}</strong></TD>
                      {vals.map((v, i) => <TD key={i}>{v}</TD>)}
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <H3>Plan details</H3>
              <P>
                <strong className="text-[var(--content-primary)]">Free</strong> — For individuals exploring the platform.
                Record up to 5 workflows per month, generate SOPs and process maps, share via
                public link. Exports include a watermark.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Starter ($49/mo)</strong> — For operations leads
                documenting their own processes. 15 recordings/month, clean exports, basic
                health scores.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Team ($249/mo)</strong> — For process improvement teams.
                Unlimited recordings, full intelligence layer, bottleneck analysis, automation
                scoring, shared team workspace.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Growth ($799/mo)</strong> — For AI implementation leads.
                Everything in Team, plus advanced analytics, cross-workflow comparison, AI
                agent composition, BPMN export.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Enterprise (custom)</strong> — For compliance-sensitive or
                large-scale deployments. SSO, RBAC, audit trail, on-premise option, custom
                retention. Contact{' '}
                <a
                  href="mailto:hello@ledgerium.ai?subject=Ledgerium%20Enterprise"
                  className="text-brand-400 hover:underline"
                >
                  hello@ledgerium.ai
                </a>
                .
              </P>

              <H3>Upgrading your plan</H3>
              <StepList
                steps={[
                  <>Go to <strong className="text-[var(--content-primary)]">Account</strong> in the navigation bar.</>,
                  <>Click <strong className="text-[var(--content-primary)]">Upgrade Now</strong> in the Plan &amp; Billing section.</>,
                  <>Select your desired plan.</>,
                  <>Complete payment via Stripe&rsquo;s secure checkout.</>,
                  <>Your account is upgraded immediately.</>,
                ]}
              />
            </section>

            {/* ── 11. PRIVACY ─────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="privacy">11. Privacy &amp; Security</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Ledgerium AI is designed as a trust-first platform. This section explains
                exactly what the extension captures, what it does not capture, and what
                controls you have.
              </p>

              <H3>11.1 What the extension captures</H3>
              <P>When recording is active, the extension captures:</P>
              <UL>
                <li><strong className="text-[var(--content-primary)]">Click events</strong> — where you clicked, element type (button, link, field), and when.</li>
                <li><strong className="text-[var(--content-primary)]">Navigation events</strong> — page transitions, URL changes at the domain/path level.</li>
                <li><strong className="text-[var(--content-primary)]">Form field interactions</strong> — which field was interacted with and its type, but <em>not</em> the content typed.</li>
                <li><strong className="text-[var(--content-primary)]">Timing data</strong> — how long each step and overall session took.</li>
                <li><strong className="text-[var(--content-primary)]">Application context</strong> — which tools and domains were active at each point.</li>
              </UL>

              <H3>11.2 What the extension does NOT capture</H3>
              <P>Ledgerium AI <strong className="text-[var(--content-primary)]">never</strong> intentionally captures:</P>
              <UL>
                <li>Screenshots or screen video</li>
                <li>Keystrokes or typed content</li>
                <li>Passwords, credentials, or one-time codes</li>
                <li>Clipboard contents</li>
                <li>Microphone audio or camera video</li>
                <li>Background activity when recording is stopped</li>
                <li>Hidden form field values that expose credentials</li>
              </UL>
              <Note>
                The platform&rsquo;s design principle is{' '}
                <strong className="text-blue-300">data minimization</strong>: capture only what
                is needed to reconstruct the workflow, and no more.
              </Note>

              <H3>11.3 Automatic sensitive value redaction</H3>
              <P>
                Input elements known to be sensitive — password fields, payment fields, and
                fields with standard <Code>autocomplete</Code> attributes indicating credential
                or financial data — are automatically excluded at the point of recording. Even
                if you record a workflow involving a login step, the password is never sent to
                Ledgerium AI.
              </P>

              <H3>11.4 Recording state visibility</H3>
              <P>
                The extension always shows you when recording is active. There is no background
                or hidden recording state. You can:
              </P>
              <UL>
                <li>See the live recording indicator in the side panel.</li>
                <li>Pause recording at any time with a single click.</li>
                <li>Stop recording at any time.</li>
                <li>Review captured steps before uploading.</li>
                <li>Discard a recording entirely.</li>
              </UL>

              <H3>11.5 Data storage</H3>
              <UL>
                <li>Data is encrypted in transit (HTTPS/TLS).</li>
                <li>Access is controlled by your account credentials.</li>
                <li>Team workflows are only visible to members with the appropriate role.</li>
                <li>Ledgerium AI staff do not access your data except to resolve a support issue you have explicitly raised.</li>
              </UL>

              <H3>11.6 User control summary</H3>
              <TableWrap>
                <thead>
                  <tr>
                    <TH>Control</TH>
                    <TH>How to use it</TH>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Start recording', <>Click <strong className="text-[var(--content-primary)]">Record</strong> in the extension side panel</>],
                    ['Pause recording', <>Click <strong className="text-[var(--content-primary)]">Pause</strong> in the side panel</>],
                    ['Stop recording', <>Click <strong className="text-[var(--content-primary)]">Stop</strong> in the side panel</>],
                    ['Discard a recording', 'Use the discard option before uploading'],
                    ['Delete a workflow', 'Hover over the card and click the trash icon'],
                    ['Revoke extension access', <>Delete the API key in Account &gt; Extension Sync</>],
                  ].map(([control, how], i) => (
                    <tr key={i}>
                      <TD>{control}</TD>
                      <TD>{how}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </section>

            {/* ── 12. FAQ ─────────────────────────────────────── */}
            <section className="mb-16">
              <H2 id="faq">12. Troubleshooting &amp; FAQ</H2>
              <p className="mt-2 mb-6 text-[var(--content-secondary)] leading-relaxed">
                Common questions and solutions for the most frequently encountered issues.
              </p>

              <H3>Extension not visible after install</H3>
              <P>
                <strong className="text-[var(--content-primary)]">Problem:</strong> The extension installed but you cannot
                see the icon in the Chrome toolbar.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Solution:</strong>
              </P>
              <StepList
                steps={[
                  <>Click the puzzle-piece icon in the Chrome toolbar (top right).</>,
                  <>Find <strong className="text-[var(--content-primary)]">Ledgerium AI</strong> in the extension list.</>,
                  <>Click the pin icon to pin it to the toolbar.</>,
                ]}
              />

              <H3>How to enable Developer Mode</H3>
              <P>
                <strong className="text-[var(--content-primary)]">Problem:</strong> Chrome is asking you to enable
                Developer Mode before you can load the extension.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Solution:</strong>
              </P>
              <StepList
                steps={[
                  <>Navigate to <Code>chrome://extensions</Code>.</>,
                  <>Toggle <strong className="text-[var(--content-primary)]">Developer mode</strong> on (top-right switch).</>,
                  <>Return to the Load unpacked step.</>,
                ]}
              />

              <H3>Extension not syncing</H3>
              <P>
                <strong className="text-[var(--content-primary)]">Problem:</strong> You stop a recording but the workflow
                does not appear in your dashboard.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Checklist:</strong>
              </P>
              <StepList
                steps={[
                  <>Open the extension side panel and click <strong className="text-[var(--content-primary)]">Sync Settings</strong>.</>,
                  <>Confirm the Sync URL is set to <Code>https://ledgerium.ai/api/sync</Code>.</>,
                  <>Confirm the API key is pasted correctly with no extra spaces.</>,
                  <>Verify the key hasn&rsquo;t been revoked in Account &gt; Extension Sync.</>,
                  <>Check your internet connection.</>,
                  <>Try uploading the recording manually via the Upload page as a fallback.</>,
                ]}
              />

              <H3>Dashboard is empty</H3>
              <P>
                <strong className="text-[var(--content-primary)]">Problem:</strong> You can log in but your dashboard shows
                no workflows.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Solutions:</strong>
              </P>
              <UL>
                <li>If you haven&rsquo;t recorded yet, click <strong className="text-[var(--content-primary)]">Try a sample workflow</strong> to load a pre-built example.</li>
                <li>If you have recorded but not synced, go to <strong className="text-[var(--content-primary)]">Upload</strong> and manually upload the <Code>.json</Code> file.</li>
                <li>Check whether a portfolio filter is active that might be hiding workflows.</li>
              </UL>

              <H3>Recording not capturing events</H3>
              <P>
                <strong className="text-[var(--content-primary)]">Problem:</strong> You are recording but the extension is
                not showing events.
              </P>
              <P>
                <strong className="text-[var(--content-primary)]">Checklist:</strong>
              </P>
              <StepList
                steps={[
                  <>Confirm the recording indicator shows <strong className="text-[var(--content-primary)]">Recording Active</strong>.</>,
                  <>Some pages restrict extensions. Chrome system pages (<Code>chrome://</Code>, <Code>chrome-extension://</Code>) won&rsquo;t capture events. Navigate to a normal web application.</>,
                  <>Try stopping and starting a new recording.</>,
                  <>If the problem persists on a specific application, contact support.</>,
                ]}
              />

              <H3>What does &ldquo;confidence score&rdquo; mean?</H3>
              <P>
                The confidence score reflects how certain the process engine is about the step
                boundaries it detected. A high score (green) means the engine cleanly identified
                where one step ended and another began. A lower score (amber or red) means there
                was ambiguity — for example, very rapid navigation or overlapping actions.
              </P>
              <P>
                A lower score does not mean the recording is wrong. It means you may want to
                review the step breakdown in the Evidence tab.
              </P>

              <H3>Can I record workflows across multiple tabs?</H3>
              <P>
                Yes. The extension captures events across all active tabs during a recording
                session. Multi-tab workflows are common when a process moves between a CRM,
                email, and spreadsheet. The Swimlane view will show each application in its own
                lane.
              </P>

              <H3>Is Ledgerium AI GDPR or HIPAA compliant?</H3>
              <P>
                The platform is designed with data minimization principles and does not capture
                sensitive personal content. Compliance readiness depends on your deployment
                context and governance policies. If you operate in a regulated environment,
                contact{' '}
                <a href="mailto:hello@ledgerium.ai" className="text-brand-400 hover:underline">
                  hello@ledgerium.ai
                </a>{' '}
                before deploying.
              </P>

              <H3>Forgot password</H3>
              <P>
                Contact support at{' '}
                <a href="mailto:hello@ledgerium.ai" className="text-brand-400 hover:underline">
                  hello@ledgerium.ai
                </a>{' '}
                to reset your password.
              </P>

              <H3>How do I contact support?</H3>
              <P>
                Email{' '}
                <a href="mailto:hello@ledgerium.ai" className="text-brand-400 hover:underline">
                  hello@ledgerium.ai
                </a>{' '}
                with your account email and a description of what you were trying to do.
              </P>
            </section>

            {/* Footer CTA */}
            <div className="border-t border-[var(--border-default)] pt-10 text-center">
              <p className="text-[var(--content-secondary)] mb-4">
                Still have questions?{' '}
                <a href="mailto:hello@ledgerium.ai" className="text-brand-400 hover:underline">
                  hello@ledgerium.ai
                </a>
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Get started free
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
