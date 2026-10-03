/**
 * Backlog #350 — single source of truth for baseline security response headers.
 * Plain CommonJS so next.config.js can require() it (Next does not transpile
 * the config file). Typed via security-headers.d.ts.
 *
 * Scope: anti-clickjacking + MIME sniffing + referrer only. NOT a full CSP
 * (inline scripts/styles are unaffected). HSTS is deliberately NOT set here:
 * it belongs at the TLS-terminating edge (a wrong app-level value is sticky
 * in browsers and the app is also served over http in dev).
 */

/**
 * Exemption hook for a future embeddable route (#137). Each entry:
 *   { source: '/embed/:path*', frameAncestors: "https://partner.example" }
 * `source` is a Next route pattern; `frameAncestors` is the CSP source list
 * that replaces 'none' for that path. X-Frame-Options is OMITTED for exempt
 * paths (XFO cannot express an allow-list; CSP frame-ancestors supersedes it
 * in modern browsers). Currently empty: nothing is framable.
 */
const FRAME_EXEMPTIONS = [];

const BASE_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const FRAME_DENY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

/** Builds the Next `headers()` result. Exemptions are listed first and the
 * catch-all deny is excluded for them via a negative lookahead is not
 * possible with plain patterns, so exempt paths get their own entry AFTER the
 * catch-all; Next merges by key with later entries winning. */
function buildSecurityHeaders(exemptions = FRAME_EXEMPTIONS) {
  const entries = [
    { source: '/:path*', headers: [...BASE_HEADERS, ...FRAME_DENY_HEADERS] },
  ];
  for (const ex of exemptions) {
    entries.push({
      source: ex.source,
      headers: [
        { key: 'Content-Security-Policy', value: `frame-ancestors ${ex.frameAncestors}` },
        // Overrides the catch-all DENY; an empty XFO value would be invalid, so
        // use ALLOWALL-free approach: CSP frame-ancestors governs modern browsers.
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    });
  }
  return entries;
}

module.exports = { FRAME_EXEMPTIONS, BASE_HEADERS, FRAME_DENY_HEADERS, buildSecurityHeaders };
