/**
 * href.ts — link classification unit tests.
 * Environment: Vitest (node) — pure logic. P1-2, SITE_STATE_REVIEW_002.
 */

import { describe, it, expect } from 'vitest';
import {
  isExternalProtocol,
  isStaticFileHref,
  isNativeHref,
  isNewTabHref,
} from './href';

describe('isExternalProtocol', () => {
  it('flags http/https/mailto/tel', () => {
    expect(isExternalProtocol('https://example.com')).toBe(true);
    expect(isExternalProtocol('http://example.com')).toBe(true);
    expect(isExternalProtocol('mailto:hello@ledgerium.ai')).toBe(true);
    expect(isExternalProtocol('tel:+15551234567')).toBe(true);
  });
  it('does not flag internal routes', () => {
    expect(isExternalProtocol('/signup')).toBe(false);
    expect(isExternalProtocol('/use-cases/operations')).toBe(false);
  });
});

describe('isStaticFileHref', () => {
  it('flags the /dashboard.html interactive demo (public asset)', () => {
    expect(isStaticFileHref('/dashboard.html')).toBe(true);
  });
  it('flags .pdf and .zip and query/hash variants', () => {
    expect(isStaticFileHref('/guide.pdf')).toBe(true);
    expect(isStaticFileHref('/ext.zip')).toBe(true);
    expect(isStaticFileHref('/dashboard.html?ref=footer')).toBe(true);
    expect(isStaticFileHref('/dashboard.html#top')).toBe(true);
  });
  it('does not flag app routes', () => {
    expect(isStaticFileHref('/product')).toBe(false);
    expect(isStaticFileHref('/compare/scribe')).toBe(false);
    expect(isStaticFileHref('/')).toBe(false);
  });
});

describe('isNativeHref', () => {
  it('is true for the dead-link case /dashboard.html and for mailto', () => {
    expect(isNativeHref('/dashboard.html')).toBe(true);
    expect(isNativeHref('mailto:hello@ledgerium.ai')).toBe(true);
  });
  it('is false for internal app routes (keep next/link)', () => {
    expect(isNativeHref('/install')).toBe(false);
    expect(isNativeHref('/pricing')).toBe(false);
  });
});

describe('isNewTabHref', () => {
  it('opens only cross-origin web links in a new tab', () => {
    expect(isNewTabHref('https://example.com')).toBe(true);
    expect(isNewTabHref('mailto:hello@ledgerium.ai')).toBe(false);
    expect(isNewTabHref('/dashboard.html')).toBe(false);
  });
});
