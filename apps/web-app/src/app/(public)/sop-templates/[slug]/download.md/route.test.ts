import { describe, it, expect } from 'vitest';
import { getPagesByType } from '@/content/registry';
import { GET, generateStaticParams } from './route';

describe('GET /sop-templates/[slug]/download.md', () => {
  it('returns 200 with the correct headers and a non-empty body for a known, published slug', async () => {
    const res = GET(new Request('http://localhost/sop-templates/invoice-approval-sop-template/download.md'), {
      params: { slug: 'invoice-approval-sop-template' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="invoice-approval-sop-template.md"');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
    expect(body.startsWith('<!--')).toBe(true);
  });

  it('returns 404 for an unknown slug', () => {
    const res = GET(new Request('http://localhost/sop-templates/does-not-exist/download.md'), {
      params: { slug: 'does-not-exist' },
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for a slug belonging to a different page type', () => {
    // Any published non-sopTemplate slug proves the type guard, not just the
    // existence guard.
    const res = GET(new Request('http://localhost/sop-templates/invoice-approval-workflow/download.md'), {
      params: { slug: 'invoice-approval-workflow' },
    });
    expect(res.status).toBe(404);
  });
});

describe('generateStaticParams — route parity with the page route (T12)', () => {
  it('returns exactly the 17 published sopTemplate slugs', () => {
    const expected = getPagesByType('sopTemplate')
      .filter((p) => p.published)
      .map((p) => p.slug)
      .sort();
    const actual = generateStaticParams()
      .map((p) => p.slug)
      .sort();
    expect(actual).toEqual(expected);
    expect(actual.length).toBe(17);
  });
});
