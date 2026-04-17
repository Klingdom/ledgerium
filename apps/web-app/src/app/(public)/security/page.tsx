import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Eye,
  Zap,
  Lock,
  CheckCircle,
  XCircle,
  Server,
  Users,
  Key,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy-Safe Workflow Recorder — Secure Process Documentation | Ledgerium',
  description:
    'Privacy-safe workflow recorder with no screenshots, no keystrokes, and no background recording. Secure process documentation built on a trust-first, data-minimization architecture.',
  openGraph: {
    title: 'Privacy-Safe Workflow Recorder — Secure Process Documentation | Ledgerium',
    description:
      'Ledgerium captures browser interaction structure — not screen content. No screenshots, no keystroke logging. Secure process documentation by design.',
  },
};

const PRINCIPLES = [
  {
    icon: Shield,
    title: 'Data Minimization',
    description:
      'We capture only what is needed to reconstruct the workflow — structural interaction data, not screen content.',
    details: [
      'No screenshots',
      'No video',
      'No keystrokes',
      'No clipboard',
      'No audio',
    ],
  },
  {
    icon: Eye,
    title: 'User-Controlled Recording',
    description:
      'Recording is always user-initiated. The extension never runs silently. You see every step captured in real-time.',
    details: [
      'Start / stop / pause / discard controls',
      'Live step feed',
      'No background capture',
    ],
  },
  {
    icon: Zap,
    title: 'Deterministic Processing',
    description:
      'The same recording always produces the same output. No AI rewriting, no hallucinated content, no creative interpretation.',
    details: [
      'Reproducible outputs',
      'Evidence-linked steps',
      'Audit-safe',
    ],
  },
  {
    icon: Lock,
    title: 'Privacy by Architecture',
    description:
      'Sensitive values are redacted automatically. Password fields, payment fields, and credential inputs are excluded at the point of recording.',
    details: [
      'Automatic field-level redaction',
      'No PII storage',
      'Encrypted in transit',
    ],
  },
] as const;

const CAPTURED_ITEMS = [
  'Click events (element type, position, timing)',
  'Navigation events (URL at domain/path level)',
  'Form field interactions (field type, not content)',
  'Timing data (step and session duration)',
  'Application context (which tools were active)',
];

const NOT_CAPTURED_ITEMS = [
  'Screenshots or screen recordings',
  'Keystrokes or typed content',
  'Passwords or credentials',
  'Clipboard contents',
  'Audio or video',
  'Background browsing activity',
];

const COMPLIANCE_CARDS = [
  {
    icon: Shield,
    title: 'SOC 2 Alignment',
    details: [
      'Data minimization',
      'Access controls',
      'Encryption in transit',
    ],
  },
  {
    icon: Eye,
    title: 'GDPR Considerations',
    details: [
      'No PII capture by default',
      'User-controlled recording',
      'Data export / deletion',
    ],
  },
  {
    icon: Server,
    title: 'Audit Trail',
    details: [
      'Deterministic outputs',
      'Evidence-linked steps',
      'Reproducible processing',
    ],
  },
] as const;

type FeatureAvailability = 'available' | 'coming-soon';

const ENTERPRISE_FEATURES: Array<{ label: string; status: FeatureAvailability }> = [
  { label: 'Role-based access control', status: 'available' },
  { label: 'SSO integration', status: 'coming-soon' },
  { label: 'Custom data retention policies', status: 'coming-soon' },
  { label: 'On-premise deployment', status: 'coming-soon' },
  { label: 'Dedicated support', status: 'available' },
  { label: 'Custom SLAs', status: 'available' },
];

function AvailabilityBadge({ status }: { status: FeatureAvailability }) {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-700/50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
        Available on Enterprise
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 border border-amber-700/40 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
      Coming soon
    </span>
  );
}

export default function SecurityPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-brand-900/20 to-[var(--surface-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <span className="inline-block rounded-full border border-brand-600/40 bg-brand-900/30 px-3 py-1 text-xs font-semibold text-brand-400 uppercase tracking-wide mb-6">
            Trust Architecture
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] leading-tight">
            Security &amp; Privacy
          </h1>
          <p className="mt-5 text-lg text-[#e2e8f0] leading-relaxed max-w-2xl mx-auto">
            Ledgerium AI is built with a trust-first architecture. No screenshots, no keystrokes,
            no background recording. You control what gets captured, and every output traces to
            source evidence.
          </p>
        </div>
      </section>

      {/* Core Principles — 2×2 grid */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-12">
            Core security principles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PRINCIPLES.map(({ icon: Icon, title, description, details }) => (
              <div
                key={title}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-brand-600/20 border border-brand-600/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-brand-400" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--content-primary)]">{title}</h3>
                </div>
                <p className="text-sm text-[#e2e8f0] leading-relaxed mb-4">{description}</p>
                <ul className="space-y-1.5">
                  {details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-[var(--content-tertiary)] flex-shrink-0" />
                      <span className="text-xs text-[var(--content-tertiary)]">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we capture / What we don't */}
      <section className="py-20 bg-[var(--surface-secondary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-[var(--content-primary)] mb-12">
            What we capture — and what we don&apos;t
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Captured */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle className="h-5 w-5 text-brand-500" />
                <h3 className="text-sm font-bold text-[var(--content-primary)]">What we capture</h3>
              </div>
              <ul className="space-y-3">
                {CAPTURED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#e2e8f0] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Not captured */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <XCircle className="h-5 w-5 text-[var(--content-tertiary)]" />
                <h3 className="text-sm font-bold text-[var(--content-primary)]">What we never capture</h3>
              </div>
              <ul className="space-y-3">
                {NOT_CAPTURED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <XCircle className="h-4 w-4 text-[var(--content-tertiary)] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-[#e2e8f0] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Readiness */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-xl font-bold text-[var(--content-primary)] mb-4">
              Built for regulated environments
            </h2>
            <p className="text-[#e2e8f0] leading-relaxed">
              Ledgerium&apos;s architecture supports common compliance frameworks. All outputs are
              deterministic and traceable, making them suitable for audit and documentation purposes.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {COMPLIANCE_CARDS.map(({ icon: Icon, title, details }) => (
              <div
                key={title}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-brand-600/20 border border-brand-600/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-brand-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--content-primary)]">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
                      <span className="text-xs text-[#e2e8f0]">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-xl font-bold text-[var(--content-primary)] mb-10">
            Enterprise-grade controls
          </h2>
          <div className="divide-y divide-[var(--border-subtle)]">
            {ENTERPRISE_FEATURES.map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {status === 'available' ? (
                    <Users className="h-4 w-4 text-brand-400 flex-shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-[var(--content-tertiary)] flex-shrink-0" />
                  )}
                  <span className="text-sm text-[var(--content-primary)]">{label}</span>
                </div>
                <AvailabilityBadge status={status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--content-primary)]">
            Ready to evaluate Ledgerium for your organization?
          </h2>
          <p className="mt-3 text-[#e2e8f0]">
            Talk to us about your compliance requirements, deployment preferences, or enterprise needs.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`mailto:${SITE_CONFIG.supportEmail}?subject=Ledgerium Enterprise Evaluation`}
              className="btn-primary gap-2 shadow-sm shadow-brand-600/20"
            >
              <Key className="h-4 w-4" />
              Contact us
            </a>
            <Link href="/product" className="btn-secondary gap-2">
              See the product
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
