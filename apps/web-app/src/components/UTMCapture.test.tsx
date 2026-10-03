// @vitest-environment jsdom
/**
 * Row #362 — UTMCapture stores sanitized values; getFirstTouchUTM re-sanitizes
 * legacy raw records on read; the signup_completed spread carries only clean values.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

let search = '';
let pathname = '/pricing';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => pathname,
}));

import { UTMCapture } from './UTMCapture';
import { getFirstTouchUTM, FIRST_TOUCH_FIELD_SANITIZERS } from '@/lib/analytics';
import { UTM_KEYS } from '@/lib/utm-sanitize';

const KEY = 'ledgerium_first_touch_utm';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  search = '';
  pathname = '/pricing';
});

describe('UTMCapture stores sanitized values', () => {
  it('drops email-like values (plain, encoded, double-encoded) and caps the rest', () => {
    const q = new URLSearchParams({
      utm_source: 'google',
      utm_medium: 'a%2540b.com',
      utm_term: 'jane@example.com',
      utm_content: 'jane＠example.com',
      utm_campaign: 'c'.repeat(200),
    });
    search = q.toString();
    render(<UTMCapture />);
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.utm_source).toBe('google');
    expect(stored.utm_campaign).toBe('c'.repeat(64));
    expect(stored).not.toHaveProperty('utm_medium');
    expect(stored).not.toHaveProperty('utm_term');
    expect(stored).not.toHaveProperty('utm_content');
    expect(localStorage.getItem(KEY)).not.toMatch(/example|%40|@/);
  });
});

describe('getFirstTouchUTM sanitizes legacy stored raw values', () => {
  it('cleans records written before capture-time sanitizing', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        utm_source: 'newsletter',
        utm_term: 'jane.doe@example.com',
        utm_content: 'a%2540b.com',
        utm_medium: 'm'.repeat(300),
        landing_path: '/pricing',
        referrer_domain: 'news.example.com',
        captured_at: '2026-01-01T00:00:00.000Z',
      }),
    );
    expect(getFirstTouchUTM()).toEqual({
      utm_source: 'newsletter',
      utm_medium: 'm'.repeat(64),
      landing_path: '/pricing',
      referrer_domain: 'news.example.com',
      captured_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('signup_completed spread carries only sanitized values', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ utm_source: 'google', utm_term: 'x@y.co', utm_content: 'a%2540b.com', landing_path: '/' }),
    );
    // Same expression as SignupPageClient.tsx: track({ event: 'signup_completed', ...(utmData ?? {}) })
    const payload = { event: 'signup_completed', ...(getFirstTouchUTM() ?? {}) };
    expect(payload).toEqual({ event: 'signup_completed', utm_source: 'google', landing_path: '/' });
    expect(JSON.stringify(payload)).not.toMatch(/@|%40|x@y/);
  });
});

describe('row #392: the share token never enters first-touch attribution', () => {
  const TOKEN = 'shrTOKEN123abc';

  it('UTMCapture on /share/<token> stores the templated path', () => {
    pathname = `/share/${TOKEN}`;
    render(<UTMCapture />);
    const raw = localStorage.getItem(KEY)!;
    expect(JSON.parse(raw).landing_path).toBe('/share/[token]');
    expect(raw).not.toContain(TOKEN);
  });

  it('a legacy stored record with a raw landing_path is templated on read', () => {
    localStorage.setItem(KEY, JSON.stringify({ landing_path: `/share/${TOKEN}`, referrer_domain: '', captured_at: 'x' }));
    const out = getFirstTouchUTM()!;
    expect(out.landing_path).toBe('/share/[token]');
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  it('whitelist guard: every stored field is utm_* or a registered sanitized field, and no value is a raw path', () => {
    pathname = `/share/${TOKEN}`;
    search = 'utm_source=google';
    render(<UTMCapture />);
    const stored = JSON.parse(localStorage.getItem(KEY)!) as Record<string, string>;
    const allowed = new Set<string>([...UTM_KEYS, ...Object.keys(FIRST_TOUCH_FIELD_SANITIZERS)]);
    for (const [k, v] of Object.entries(stored)) {
      expect(allowed.has(k), `first-touch field "${k}" has no sanitizer in FIRST_TOUCH_FIELD_SANITIZERS`).toBe(true);
      // Sanitizing the stored value must be a no-op (it was sanitized at capture).
      if (k in FIRST_TOUCH_FIELD_SANITIZERS) expect(FIRST_TOUCH_FIELD_SANITIZERS[k]!(v)).toBe(v);
    }
    expect(JSON.stringify(stored)).not.toContain(TOKEN);
  });

  it('an unregistered field in a stored record is dropped on read', () => {
    localStorage.setItem(KEY, JSON.stringify({ utm_source: 'g', page: `/share/${TOKEN}`, landing_path: '/' }));
    const out = getFirstTouchUTM()!;
    expect(out).not.toHaveProperty('page');
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });
});
