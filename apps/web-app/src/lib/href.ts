/**
 * Href classification for link rendering.
 *
 * next/link performs client-side App-Router navigation. For hrefs that are NOT
 * app routes — external protocols and static assets served from /public (e.g.
 * `/dashboard.html`, the no-signup interactive demo) — client navigation finds
 * no matching route and renders the app's not-found page, so the link appears
 * dead even though the target is reachable by direct URL. Such hrefs must use a
 * native <a> for a real browser navigation.
 *
 * P1-2, SITE_STATE_REVIEW_002 (2026-07-07).
 */

/** External protocol links (open the mail client, dialer, or another origin). */
export function isExternalProtocol(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

/**
 * Static file assets served from /public rather than the app router
 * (.html/.htm, .pdf, .zip). These are not routes and must not go through
 * next/link client navigation.
 */
export function isStaticFileHref(href: string): boolean {
  return /\.(html?|pdf|zip)(\?[^#]*)?(#.*)?$/i.test(href);
}

/** True when the href must render as a native <a> instead of next/link. */
export function isNativeHref(href: string): boolean {
  return isExternalProtocol(href) || isStaticFileHref(href);
}

/** True when a native link should open in a new tab (cross-origin web links only). */
export function isNewTabHref(href: string): boolean {
  return /^https?:/i.test(href);
}
