import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { PostHogProvider } from '@/components/PostHogProvider';
import { UmamiAnalytics } from '@/components/UmamiAnalytics';
import { SITE_CONFIG } from '@/lib/config';
import { SITE_WEBSITE_NODE, SITE_ORGANIZATION_NODE } from '@/lib/seo/organization';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = SITE_CONFIG.url;

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
// The full node definitions live in `@/lib/seo/organization` — the single
// source of truth every other JSON-LD block on the site references by `@id`
// instead of restating (SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 P1-2).
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [SITE_WEBSITE_NODE, SITE_ORGANIZATION_NODE],
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
