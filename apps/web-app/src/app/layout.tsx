import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { PostHogProvider } from '@/components/PostHogProvider';
import { UmamiAnalytics } from '@/components/UmamiAnalytics';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ledgerium.ai';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Ledgerium AI — Workflow Workspace',
  description: 'Turn recorded workflows into durable, searchable, reusable process intelligence.',
  openGraph: {
    type: 'website',
    title: 'Ledgerium AI',
    description: 'Record real workflows and generate SOPs, process maps, and AI opportunity reports from how work actually happens.',
    url: SITE_URL,
    siteName: 'Ledgerium AI',
    images: [{ url: '/img/demo/dashboard.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ledgerium AI',
    description: 'Record real workflows and generate SOPs, process maps, and AI opportunity reports from how work actually happens.',
    images: ['/img/demo/dashboard.png'],
  },
  // Google Search Console domain/property verification. Set
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the token from GSC ("HTML tag" method);
  // Next renders <meta name="google-site-verification"> only when present.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

// Sitewide entity schema (WebSite + Organization) emitted once on every page.
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Ledgerium AI',
      description: 'Evidence-based workflow intelligence: record real work, generate real documentation.',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Ledgerium AI',
      url: SITE_URL,
      description:
        'Ledgerium AI records real browser workflows and turns them into SOPs, process maps, workflow intelligence reports, and AI opportunity reports.',
      knowsAbout: ['process intelligence', 'workflow automation', 'SOP documentation', 'process mining', 'AI integration'],
      sameAs: ['https://www.linkedin.com/company/ledgerium'],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.className}`} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
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
