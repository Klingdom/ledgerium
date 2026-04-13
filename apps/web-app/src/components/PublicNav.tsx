'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';

type NavLink = {
  href: string;
  label: string;
  icon?: typeof LayoutDashboard;
  isExternal?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard.html', label: 'Live Demo', icon: LayoutDashboard, isExternal: true },
  { href: '/demo', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/install-extension', label: 'Install' },
  { href: '/about', label: 'About' },
];

export function PublicNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = !!session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            Ledgerium <span className="text-brand-600">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon, isExternal }) => {
            const classes = `rounded-lg px-3 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
              pathname === href
                ? 'text-brand-700 bg-brand-50'
                : href === '/dashboard.html'
                  ? 'text-brand-600 hover:text-brand-700 hover:bg-brand-50/60'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`;

            if (isExternal) {
              return (
                <a key={href} href={href} className={classes}>
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {label}
                </a>
              );
            }

            return (
              <Link key={href} href={href} className={classes}>
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary text-sm gap-1.5">
              Go to app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary text-sm">
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-lg">
          {NAV_LINKS.map(({ href, label, icon: Icon, isExternal }) => {
            const classes = `rounded-lg px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${
              pathname === href
                ? 'text-brand-700 bg-brand-50'
                : href === '/dashboard.html'
                  ? 'text-brand-600 bg-brand-50/40'
                  : 'text-gray-600 hover:bg-gray-50'
            }`;

            if (isExternal) {
              return (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className={classes}>
                  {Icon && <Icon className="h-4 w-4" />}
                  {label}
                </a>
              );
            }

            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={classes}>
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block btn-primary text-sm text-center">
                Go to app
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600">
                  Sign in
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="block btn-primary text-sm text-center">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
