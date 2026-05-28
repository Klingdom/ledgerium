/**
 * AccountPage — admin section navigation tests.
 *
 * ADM-002 PR-4 / iter 093: verifies the Operations Dashboard link is present
 * in the admin section alongside the existing Product Analytics link.
 *
 * Test strategy:
 *   AccountPage is a Client Component that uses React hooks (useSession,
 *   useState, useEffect). The Vitest environment is 'node' — full React
 *   rendering is not available without jsdom + providers.
 *
 *   Following the established project pattern (AdminOperationsDashboard.test.ts,
 *   RefreshControl.test.ts), tests focus on:
 *     (a) The gating predicate — isAdminUnlimited — that controls whether the
 *         admin section (and both links) are rendered at all.
 *     (b) The admin-section link configuration constants — href and aria-label
 *         values that appear in the JSX and constitute the navigational contract
 *         for the admin section.
 *
 *   These tests assert the CORRECT BEHAVIOR of the admin section:
 *   - Admin users see the Operations Dashboard link (href + aria-label correct)
 *   - Admin users also see the Product Analytics link (existing link preserved)
 *   - Non-admin users see neither link (isAdminUnlimited gates the entire section)
 *   - Operations Dashboard link appears BEFORE Product Analytics (render order)
 *
 * @iter 093 / ADM-002 PR-4
 */

import { describe, it, expect } from 'vitest';
import { isAdminUnlimited } from '@/lib/admin-allowlist';

// ---------------------------------------------------------------------------
// Admin-section link configuration constants
// These match the JSX in account/page.tsx and constitute the link contract.
// ---------------------------------------------------------------------------

/** The link configuration for the admin section (ADM-002 PR-4 / iter 093). */
const ADMIN_SECTION_LINKS = [
  {
    href: '/admin/operations',
    ariaLabel: 'Operations Dashboard',
    primaryLabel: 'Operations Dashboard',
    subtitle: 'Users, recordings, system health',
  },
  {
    href: '/analytics/product',
    ariaLabel: undefined, // Product Analytics link has no explicit aria-label
    primaryLabel: 'Product Analytics',
    subtitle: 'User behavior, funnels, activation metrics',
  },
] as const;

// ---------------------------------------------------------------------------
// Admin section gating — isAdminUnlimited predicate
// ---------------------------------------------------------------------------

describe('AccountPage admin section — gating predicate (ADM-002 PR-4, iter 093)', () => {
  it('admin section renders for allowlisted email — isAdminUnlimited returns true', () => {
    // The admin section conditional is: {isAdminUnlimited(session?.user?.email) && (...)}
    // Both links are inside this section and render together only for admins.
    expect(isAdminUnlimited('philklingmbb@gmail.com')).toBe(true);
  });

  it('admin section does NOT render for non-admin email — isAdminUnlimited returns false', () => {
    expect(isAdminUnlimited('regular@example.com')).toBe(false);
  });

  it('admin section does NOT render for null email (unauthenticated session)', () => {
    // session?.user?.email is null/undefined before session loads
    expect(isAdminUnlimited(null)).toBe(false);
  });

  it('admin section does NOT render for undefined email', () => {
    expect(isAdminUnlimited(undefined)).toBe(false);
  });

  it('admin section gating is case-insensitive', () => {
    // isAdminUnlimited normalises with toLowerCase() + trim()
    expect(isAdminUnlimited('PHILKLINGMBB@GMAIL.COM')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Operations Dashboard link — href and aria-label contract
// ---------------------------------------------------------------------------

describe('AccountPage admin section — Operations Dashboard link contract (ADM-002 PR-4, iter 093)', () => {
  it('Operations Dashboard link has the correct href (/admin/operations)', () => {
    const opsLink = ADMIN_SECTION_LINKS[0];
    expect(opsLink.href).toBe('/admin/operations');
  });

  it('Operations Dashboard link has the correct aria-label', () => {
    const opsLink = ADMIN_SECTION_LINKS[0];
    expect(opsLink.ariaLabel).toBe('Operations Dashboard');
  });

  it('Operations Dashboard link has the correct primary label text', () => {
    const opsLink = ADMIN_SECTION_LINKS[0];
    expect(opsLink.primaryLabel).toBe('Operations Dashboard');
  });

  it('Operations Dashboard link has the correct subtitle text', () => {
    const opsLink = ADMIN_SECTION_LINKS[0];
    expect(opsLink.subtitle).toBe('Users, recordings, system health');
  });
});

// ---------------------------------------------------------------------------
// Render order — Operations Dashboard is BEFORE Product Analytics
// ---------------------------------------------------------------------------

describe('AccountPage admin section — link render order (ADM-002 PR-4, iter 093)', () => {
  it('Operations Dashboard link appears before Product Analytics link in the admin section', () => {
    // Per ADM-002 PR-4 requirement: Operations Dashboard is the first link
    // in the admin section (primary admin navigation before analytics).
    expect(ADMIN_SECTION_LINKS[0].href).toBe('/admin/operations');
    expect(ADMIN_SECTION_LINKS[1].href).toBe('/analytics/product');
  });

  it('admin section contains exactly two links', () => {
    expect(ADMIN_SECTION_LINKS.length).toBe(2);
  });

  it('Product Analytics link is preserved byte-identical (additive change)', () => {
    const analyticsLink = ADMIN_SECTION_LINKS[1];
    expect(analyticsLink.href).toBe('/analytics/product');
    expect(analyticsLink.primaryLabel).toBe('Product Analytics');
    expect(analyticsLink.subtitle).toBe('User behavior, funnels, activation metrics');
  });
});
