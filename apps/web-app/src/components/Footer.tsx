import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG } from '@/lib/config';

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
    { href: '/terms', label: 'Terms' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/img/ledgerium_primary_logo.png"
              alt="Ledgerium AI"
              width={140}
              height={35}
              className="h-6 w-auto mb-3"
            />
            <p className="text-sm text-gray-500 leading-relaxed">
              Evidence-based workflow intelligence. Record real work, generate real documentation.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {heading}
              </p>
              <ul className="space-y-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Ledgerium AI. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Built for people who care about how work actually gets done.
          </p>
        </div>
      </div>
    </footer>
  );
}
