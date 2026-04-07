'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Upload,
  User,
  LogOut,
  BarChart3,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Workflows', icon: LayoutDashboard },
  { href: '/analytics', label: 'Intelligence', icon: BarChart3 },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/account', label: 'Account', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm no-print">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-ds-4 sm:px-ds-6">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/img/ledgerium_primary_logo.png"
              alt="Ledgerium AI"
              width={160}
              height={40}
              className="h-7 w-auto"
              priority
            />
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
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            <div className="ml-ds-2 flex items-center gap-ds-2 border-l border-gray-200 pl-ds-3">
              <span className="hidden text-ds-xs text-gray-400 sm:inline">
                {session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="rounded-ds-md p-ds-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
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
