'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { LogoFull } from '@/components/shared/LogoMark';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

type NavLink = {
  href: string;
  label: string;
};

const NAV_LINKS: NavLink[] = [
  { href: '/product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/use-cases/operations', label: 'Use Cases' },
  { href: '/blog', label: 'Blog' },
  { href: '/docs', label: 'Docs' },
];

export function PublicNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = !!session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <LogoFull size={24} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                pathname === href
                  ? 'text-brand-400 bg-brand-900/30'
                  : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-secondary)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs + Theme toggle */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary text-sm gap-1.5">
              Go to app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors"
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
          className="md:hidden rounded-lg p-2 text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 space-y-1 shadow-lg">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${
                pathname === href
                  ? 'text-brand-400 bg-brand-900/30'
                  : 'text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block btn-primary text-sm text-center">
                Go to app
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--content-secondary)]">
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
