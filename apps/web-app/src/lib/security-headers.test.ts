import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { buildSecurityHeaders, FRAME_EXEMPTIONS } from '../../security-headers';

const require_ = createRequire(import.meta.url);
// Load the REAL next.config.js so the test pins what Next actually serves.
const nextConfig = require_('../../next.config.js') as {
  headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
};

// Mirrors next/path-to-regexp semantics for the only pattern we use.
const matchesAll = (source: string, path: string) =>
  source === '/:path*' && path.startsWith('/');

describe('#350 security response headers', () => {
  it('next.config headers() applies the full set to every path', async () => {
    const entries = await nextConfig.headers();
    for (const path of ['/pricing', '/share/abc', '/dashboard', '/workflows/123']) {
      const applied = entries.filter((e) => matchesAll(e.source, path)).flatMap((e) => e.headers);
      const get = (k: string) => applied.find((h) => h.key === k)?.value;
      expect(get('X-Frame-Options')).toBe('DENY');
      expect(get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
      expect(get('X-Content-Type-Options')).toBe('nosniff');
      expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    }
  });

  it('does not set HSTS or a full CSP at the app layer', async () => {
    const keys = (await nextConfig.headers()).flatMap((e) => e.headers.map((h) => h.key));
    expect(keys).not.toContain('Strict-Transport-Security');
    const csp = (await nextConfig.headers()).flatMap((e) => e.headers).find((h) => h.key === 'Content-Security-Policy');
    expect(csp?.value).not.toMatch(/script-src|default-src/);
  });

  it('exemption list is empty today (nothing is framable)', () => {
    expect(FRAME_EXEMPTIONS).toEqual([]);
    expect(buildSecurityHeaders()).toHaveLength(1);
  });

  it('exemption hook overrides frame-ancestors for its path only', () => {
    const entries = buildSecurityHeaders([{ source: '/embed/:path*', frameAncestors: 'https://partner.example' }]);
    expect(entries).toHaveLength(2);
    expect(entries[1]!.source).toBe('/embed/:path*');
    expect(entries[1]!.headers).toContainEqual({
      key: 'Content-Security-Policy',
      value: 'frame-ancestors https://partner.example',
    });
  });
});
