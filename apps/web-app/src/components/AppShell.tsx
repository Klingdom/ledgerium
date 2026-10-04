'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Upload,
  User,
  LogOut,
  BarChart3,
  Users,
  Zap,
  Download,
  HelpCircle,
  ArrowLeftRight,
  Menu,
  X,
} from 'lucide-react';
import { ExtensionInstallButton } from '@/components/ExtensionInstallButton';
import { LogoFull } from '@/components/shared/LogoMark';
import { TrialStatusChip } from '@/components/TrialStatusChip';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useAnalyticsPlan } from '@/hooks/useAnalyticsPlan';
import { setUserPlanForAnalytics } from '@/lib/analytics';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Workflows', icon: LayoutDashboard },
  { href: '/compare', label: 'Compare', icon: ArrowLeftRight },
  { href: '/analytics', label: 'Intelligence', icon: BarChart3 },
  { href: '/recommendations', label: 'Actions', icon: Zap },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/account', label: 'Account', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  // Row #94: plan for analytics on every authenticated page. Shares the
  // /api/account request TrialStatusChip already makes — no extra request.
  useAnalyticsPlan();

  // Below `sm` the nav collapses into a disclosure (WCAG 1.4.10 reflow). At `sm`
  // and up the same markup is the unchanged inline row.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!navRef.current?.contains(t) && !menuButtonRef.current?.contains(t)) setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[var(--surface-primary)]">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm no-print">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-ds-4 sm:px-ds-6">
          <Link href="/dashboard" className="flex items-center">
            <LogoFull size={24} />
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-ds-md p-ds-2 text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="app-nav"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <nav
            id="app-nav"
            ref={navRef}
            aria-label="Primary"
            className={`${menuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-14 max-h-[calc(100dvh-3.5rem)] flex-col items-stretch gap-ds-1 overflow-y-auto border-b border-[var(--border-default)] bg-[var(--surface-elevated)] p-ds-3 shadow-lg sm:static sm:flex sm:max-h-none sm:flex-row sm:items-center sm:overflow-visible sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-ds-md px-ds-3 py-ds-2 text-ds-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <div className="mt-ds-2 flex flex-wrap items-center gap-ds-2 border-t border-[var(--border-default)] pt-ds-3 sm:ml-ds-2 sm:mt-0 sm:flex-nowrap sm:border-l sm:border-t-0 sm:pl-ds-3 sm:pt-0">
              {/*
                Placed before the install button so trial status reads ahead of
                a call to action rather than after one. Renders nothing at all
                for users without a trial, for paying subscribers, and while
                account data is still loading — see lib/trial-chip.ts.
              */}
              <TrialStatusChip />
              <ExtensionInstallButton
                location="app_nav"
                title="Download Chrome Extension"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-ds-md px-ds-3 py-ds-2 text-ds-sm font-medium text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Get Extension</span>
              </ExtensionInstallButton>
              <span className="hidden text-ds-xs text-[var(--content-tertiary)] sm:inline">
                {session?.user?.email}
              </span>
              <ThemeToggle />
              <Link
                href="/docs"
                className="rounded-ds-md p-ds-2 text-[var(--content-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-secondary)] transition-colors"
                title="Documentation"
                aria-label="Documentation"
              >
                <HelpCircle className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  // Row #351: drop this user's plan before the (full-navigation) sign-out.
                  setUserPlanForAnalytics(undefined);
                  void signOut({ callbackUrl: '/login' });
                }}
                className="rounded-ds-md p-ds-2 text-[var(--content-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-secondary)] transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-ds-4 py-ds-6 sm:px-ds-6">{children}</main>
    </div>
  );
}
