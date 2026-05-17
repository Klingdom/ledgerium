/**
 * /admin/operations — Admin Operations Dashboard page.
 *
 * Server Component. Auth check runs at the page level:
 *   - Unauthenticated: notFound() → 404 (hides route existence, AC-6)
 *   - Authenticated, non-admin: notFound() → 404
 *   - Admin: renders AdminOperationsDashboard Client Component
 *
 * The 404 response (not 401/403) is intentional — it prevents non-admin
 * users from discovering that an admin surface exists.
 *
 * @iter 072
 */

// Explicit React import: Next.js production build uses the automatic JSX
// runtime so this is functionally a no-op there, but the web-app vitest
// config uses classic JSX runtime (environment: 'node', no JSX plugin) and
// needs React in scope for `<Component />` to compile to React.createElement.
import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import { AdminOperationsDashboard } from '@/components/admin-operations/AdminOperationsDashboard';

export const metadata = {
  title: 'Operations — Ledgerium Admin',
  robots: { index: false, follow: false },
};

export default async function AdminOperationsPage() {
  const session = await auth();

  // Enforce admin gate: 404 for unauthenticated or non-admin (AC-6)
  if (!session?.user?.email || !isAdminUnlimited(session.user.email)) {
    notFound();
  }

  return <AdminOperationsDashboard />;
}
