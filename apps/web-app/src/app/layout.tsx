import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { PostHogProvider } from '@/components/PostHogProvider';
import { UmamiAnalytics } from '@/components/UmamiAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ledgerium AI — Workflow Workspace',
  description: 'Turn recorded workflows into durable, searchable, reusable process intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.className}`} suppressHydrationWarning>
      <body>
        <AuthProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </AuthProvider>
        {/*
          Umami is loaded CLIENT-SIDE here, after hydration, OUTSIDE React's managed
          tree (UmamiAnalytics injects a <script> via document.head.appendChild in a
          useEffect). The previous approach rendered <Script> directly in the SSR
          <head>; when the real Umami script actually loaded on the VPS it collided
          with React's head reconciliation → "TypeError: Cannot read properties of
          null (reading 'removeChild')" → the whole app crashed to an unstyled page.
          Every test env pointed Umami at a 404 URL, so the script never loaded and
          the crash never reproduced — which is why it only ever broke in production.
        */}
        <UmamiAnalytics />
      </body>
    </html>
  );
}
