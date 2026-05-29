import { PublicNav } from '@/components/PublicNav';
import { Footer } from '@/components/Footer';

// Render public pages per-request instead of from frozen build-time HTML.
// This is the standard fix for a static-prerender hydration mismatch
// (the "flash → unstyled" + React #418/#425 we've been chasing).
export const dynamic = 'force-dynamic';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
