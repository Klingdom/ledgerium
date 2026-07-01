import { PublicNav } from '@/components/PublicNav';
import { Footer } from '@/components/Footer';

// NOTE (SITE_PERFORMANCE_REVIEW_001 P0-1): `export const dynamic = 'force-dynamic'`
// was REMOVED here. It had been added as a blunt fix for a static-prerender
// hydration mismatch (React #418/#425) caused by PublicNav's auth-conditional
// CTA. That mismatch is now correctly neutralised at the component level by the
// `mounted` hydration gate in PublicNav (server HTML + first client paint both
// render the logged-out CTAs; the authenticated swap happens only after mount),
// and the theme is a hardcoded `dark` class with `suppressHydrationWarning` on
// <html> in the root layout — so there is no remaining mismatch source.
// force-dynamic was therefore forcing all ~124 SEO pages to SSR on every request
// (0% CDN HTML cache) for zero functional benefit. Removing it restores static
// generation for every static-capable public page; pages that genuinely need
// request-time data (cookies/headers/searchParams) still opt into dynamic
// rendering on their own via Next's per-route detection.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
