import { describe, it, expect } from 'vitest';
import { ALL_PAGES, getPublishedPages } from '@/content/registry';
import { validateContent } from './validate';
import { generateSeoMetadata } from './metadata';
import { generateJsonLd } from './jsonLd';
import { getRelatedPages } from './related';

describe('SEO content quality gate', () => {
  it('passes the blocking validation gate with zero errors', () => {
    const { errors } = validateContent(ALL_PAGES);
    expect(errors).toEqual([]);
  });

  it('ships at least one published page per Tranche-0 type', () => {
    const types = new Set(getPublishedPages().map((p) => p.type));
    expect(types.has('compare')).toBe(true);
    expect(types.has('workflow')).toBe(true);
    expect(types.has('software')).toBe(true);
  });

  it('every page declares a non-empty h1 and short answer', () => {
    for (const p of ALL_PAGES) {
      expect(p.h1.trim().length).toBeGreaterThan(0);
      expect(p.shortAnswer.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('determinism (Ledgerium core principle)', () => {
  it('generateSeoMetadata is byte-identical across calls', () => {
    for (const p of ALL_PAGES) {
      const a = JSON.stringify(generateSeoMetadata(p));
      const b = JSON.stringify(generateSeoMetadata(p));
      expect(a).toBe(b);
    }
  });

  it('generateJsonLd is byte-identical across calls', () => {
    for (const p of ALL_PAGES) {
      const a = JSON.stringify(generateJsonLd(p));
      const b = JSON.stringify(generateJsonLd(p));
      expect(a).toBe(b);
    }
  });

  it('getRelatedPages is deterministic and never self-links', () => {
    for (const p of ALL_PAGES) {
      const a = JSON.stringify(getRelatedPages(p));
      const b = JSON.stringify(getRelatedPages(p));
      expect(a).toBe(b);
      const related = getRelatedPages(p);
      for (const r of related) {
        expect(r.path).not.toBe(`/${p.type}/${p.slug}`);
      }
    }
  });
});
