import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/config';
import { LogoFull } from '@/components/shared/LogoMark';

const FOOTER_LINKS = {
  Product: [
    { href: '/product', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/install', label: 'Get Extension' },
    { href: '/dashboard.html', label: 'Interactive Demo' },
  ],
  Library: [
    { href: '/workflow-library', label: 'Workflow Library' },
    { href: '/sop-templates', label: 'SOP Templates' },
    { href: '/software', label: 'Software Guides' },
    { href: '/ai-opportunities', label: 'AI Opportunities' },
  ],
  Explore: [
    { href: '/departments', label: 'By Department' },
    { href: '/industries', label: 'By Industry' },
    { href: '/use-cases/personas', label: 'By Role' },
    { href: '/use-cases/problems', label: 'By Problem' },
  ],
  'Use Cases': [
    { href: '/use-cases/operations', label: 'Operations Teams' },
    { href: '/use-cases/compliance', label: 'Compliance & Audit' },
    { href: '/use-cases/ai-implementation', label: 'AI & Automation' },
    { href: '/compare/scribe', label: 'Ledgerium vs. Scribe' },
    { href: '/alternatives', label: 'Alternatives' },
    { href: '/competitors', label: 'Competitors' },
  ],
  Resources: [
    { href: '/docs', label: 'User Guide' },
    { href: '/blog', label: 'Blog' },
    { href: '/security', label: 'Security' },
    { href: '/support', label: 'Support' },
    { href: '/about', label: 'About' },
    { href: `mailto:${SITE_CONFIG.supportEmail}`, label: 'Contact' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--surface-elevated)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        {/* Brand */}
        <div className="mb-10 max-w-sm">
          <LogoFull size={20} />
          <p className="mt-3 text-sm text-[#e2e8f0] leading-relaxed">
            Evidence-based workflow intelligence. Record real work, generate real documentation.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-xs font-semibold text-[var(--content-tertiary)] uppercase tracking-wider mb-3">
                {heading}
              </p>
              <ul className="space-y-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-[#e2e8f0] hover:text-[var(--content-primary)] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[var(--content-tertiary)]">
            &copy; {new Date().getFullYear()} Ledgerium AI. All rights reserved.
          </p>
          <p className="text-xs text-[var(--content-tertiary)]">
            Built for people who care about how work actually gets done.
          </p>
        </div>
      </div>
    </footer>
  );
}
