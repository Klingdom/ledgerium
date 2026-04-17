import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/config';
import {
  BookOpen,
  Download,
  CreditCard,
  Shield,
  FileText,
  Eye,
  Mail,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support — Ledgerium AI Workflow Recorder & SOP Generator',
  description:
    'Get help with the Ledgerium AI workflow recorder and automated SOP generator. Find user guides, troubleshooting steps, billing help, and contact options.',
  openGraph: {
    title: 'Support — Ledgerium AI Workflow Recorder & SOP Generator',
    description:
      'Find answers, user guides, and contact options for the Ledgerium AI workflow recorder, SOP generator, and process documentation tool.',
  },
};

const QUICK_LINKS = [
  {
    icon: BookOpen,
    title: 'User Guide',
    description: 'Complete documentation for all features and workflows.',
    href: '/docs',
  },
  {
    icon: Download,
    title: 'Install Extension',
    description: 'Step-by-step guide to install the Chrome extension.',
    href: '/install',
  },
  {
    icon: CreditCard,
    title: 'Pricing & Plans',
    description: 'Compare plans and understand what is included.',
    href: '/pricing',
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'How we protect your data and what we collect.',
    href: '/security',
  },
  {
    icon: FileText,
    title: 'Terms of Service',
    description: 'Our terms governing use of the platform.',
    href: '/terms',
  },
  {
    icon: Eye,
    title: 'Privacy Policy',
    description: 'Full details on data handling and your rights.',
    href: '/privacy',
  },
] as const;

const FAQS = [
  {
    q: 'How do I install the Chrome extension?',
    a: (
      <>
        Download the extension zip, unzip it to a permanent folder, then open{' '}
        <code className="bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">
          chrome://extensions
        </code>
        , enable Developer mode, and click &ldquo;Load unpacked&rdquo;. Full step-by-step
        instructions with screenshots are on the{' '}
        <Link
          href="/install"
          className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
        >
          Install page
        </Link>
        .
      </>
    ),
  },
  {
    q: 'I forgot my password',
    a: (
      <>
        Use the{' '}
        <Link
          href="/forgot-password"
          className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
        >
          forgot password page
        </Link>{' '}
        to receive a reset link by email. Check your spam folder if the email does not
        arrive within a few minutes.
      </>
    ),
  },
  {
    q: 'How do I upgrade my plan?',
    a: (
      <>
        Compare available plans on the{' '}
        <Link
          href="/pricing"
          className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
        >
          pricing page
        </Link>
        . Once signed in, you can also upgrade directly from your account settings under
        Billing &amp; Plan.
      </>
    ),
  },
  {
    q: 'Can I export my workflows?',
    a: 'Yes. JSON and Markdown export formats are available on the Starter plan and above. You can export individual workflows from the Workflow Detail view or batch-export from your library.',
  },
  {
    q: 'What data does the extension collect?',
    a: (
      <>
        The extension records structural interaction data — clicks, navigation, form field
        names, timing, and system feedback. It does not capture screenshots, screen
        recordings, keystrokes, or typed content. See the{' '}
        <Link
          href="/security"
          className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
        >
          Security &amp; Privacy page
        </Link>{' '}
        for the full breakdown.
      </>
    ),
  },
  {
    q: 'How do I contact support?',
    a: (
      <>
        Email us at{' '}
        <a
          href={`mailto:${SITE_CONFIG.supportEmail}`}
          className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
        >
          {SITE_CONFIG.supportEmail}
        </a>
        . We typically respond within 24 hours on business days.
      </>
    ),
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your data is preserved. Access continues at Free tier limits — 5 recordings per month, with your existing recordings remaining viewable. No data is deleted on cancellation.',
  },
] as const;

export default function SupportPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-6">
            <HelpCircle className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)]">
            How can we help?
          </h1>
          <p className="mt-4 text-lg text-[#e2e8f0] leading-relaxed max-w-xl mx-auto">
            Find answers, documentation, and contact options.
          </p>
        </div>
      </section>

      {/* Quick Links Grid */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-10 text-center">
            Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map(({ icon: Icon, title, description, href }) => (
              <Link
                key={href}
                href={href}
                className="card p-6 flex flex-col gap-4 hover:border-brand-600/50 hover:bg-[var(--surface-secondary)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-brand-600/10 border border-brand-600/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-brand-500" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--content-tertiary)] group-hover:text-brand-400 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--content-primary)] mb-1">
                    {title}
                  </p>
                  <p className="text-xs text-[#e2e8f0] leading-relaxed">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Common Questions */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-10">
            <HelpCircle className="h-5 w-5 text-[var(--content-tertiary)]" />
            <h2 className="text-lg font-bold text-[var(--content-primary)]">
              Common Questions
            </h2>
          </div>
          <div className="space-y-8">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-sm font-semibold text-[var(--content-primary)] mb-1.5">
                  {q}
                </h3>
                <p className="text-sm text-[#e2e8f0] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-8 text-center">
            Contact Us
          </h2>
          <div className="card p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-600/10 border border-brand-600/20 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-brand-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--content-primary)] mb-1">
                  Email Support
                </p>
                <a
                  href={`mailto:${SITE_CONFIG.supportEmail}`}
                  className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors text-sm"
                >
                  {SITE_CONFIG.supportEmail}
                </a>
                <p className="mt-3 text-sm text-[#e2e8f0] leading-relaxed">
                  We typically respond within 24 hours on business days.
                </p>
                <p className="mt-4 text-sm text-[#e2e8f0] leading-relaxed">
                  Evaluating Ledgerium for your organization?{' '}
                  <Link
                    href="/security"
                    className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
                  >
                    See our enterprise security overview
                  </Link>{' '}
                  for compliance documentation, data handling details, and enterprise
                  evaluation resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Status Note */}
      <section className="py-8 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="text-xs text-[var(--content-tertiary)]">
            System status:{' '}
            <span className="text-green-500 font-medium">All systems operational</span>
          </p>
        </div>
      </section>
    </>
  );
}
