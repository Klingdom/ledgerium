import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/config';
import { LogoFull } from '@/components/shared/LogoMark';

const FOOTER_LINKS = {
  Product: [
    { href: '/demo', label: 'Demo' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/install-extension', label: 'Install Extension' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: `mailto:${SITE_CONFIG.supportEmail}`, label: 'Contact' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--surface-elevated)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <LogoFull size={20} />
            <p className="text-sm text-[#e2e8f0] leading-relaxed">
              Evidence-based workflow intelligence. Record real work, generate real documentation.
            </p>
          </div>

          {/* Link columns */}
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
