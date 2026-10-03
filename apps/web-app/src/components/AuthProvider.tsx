'use client';

import { SessionProvider } from 'next-auth/react';

import { AnalyticsIdentitySync } from '@/components/AnalyticsIdentitySync';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AnalyticsIdentitySync />
      {children}
    </SessionProvider>
  );
}
