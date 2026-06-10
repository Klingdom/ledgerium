'use client';
import { useEffect } from 'react';
// Hydration-safe Umami loader: renders NOTHING during SSR + first client
// render (so server HTML == client first paint, no mismatch), then injects
// the script client-side after mount. Reading NEXT_PUBLIC_* only inside
// useEffect means the build-time-inlined client value can never diverge from
// the server's runtime value during hydration — the root cause of the
// every-page flash/unstyled crash.
export function UmamiAnalytics() {
  useEffect(() => {
    const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
    if (!src) return;
    if (document.querySelector('script[data-umami-loader]')) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    if (websiteId) script.setAttribute('data-website-id', websiteId);
    script.setAttribute('data-umami-loader', 'true');
    document.head.appendChild(script);
  }, []);
  return null;
}
