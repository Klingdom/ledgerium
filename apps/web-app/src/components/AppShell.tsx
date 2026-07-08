'use client';

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
} from 'lucide-react';
import { ExtensionInstallButton } from '@/components/ExtensionInstallButton';
import { LogoFull } from '@/components/shared/LogoMark';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

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

  return (
    <div className="min-h-screen bg-[var(--surface-primary)]">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm no-print">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-ds-4 sm:px-ds-6">
          <Link href="/dashboard" className="flex items-center">
            <LogoFull size={24} />
          </Link>

          <nav className="flex items-center gap-ds-1">
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
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            <div className="ml-ds-2 flex items-center gap-ds-2 border-l border-[var(--border-default)] pl-ds-3">
              <ExtensionInstallButton
                location="app_nav"
                title="Download Chrome Extension"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-ds-md px-ds-3 py-ds-2 text-ds-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
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
              >
                <HelpCircle className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="rounded-ds-md p-ds-2 text-[var(--content-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--content-secondary)] transition-colors"
                title="Sign out"
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
