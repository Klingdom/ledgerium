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
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/pricing',
}));

import { UTMCapture } from './UTMCapture';
import { getFirstTouchUTM } from '@/lib/analytics';

const KEY = 'ledgerium_first_touch_utm';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  search = '';
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
