/**
 * referrerClassification.ts — shared referrer taxonomy for SeoPageView (leaf
 * pages) and HubPageView (hub/index pages).
 *
 * SEO attribution unblock (SEO_AEO_EXPANSION_001 §2.2 Batch 2), PART 2 of 2.
 *
 * Environment: Vitest `node` (this workspace's default — see
 * apps/web-app/vitest.config.ts). `classifyReferrer()` only touches
 * `document.referrer`, so each scenario stubs a minimal `document` global via
 * `vi.stubGlobal`, mirroring the pattern already used in analytics.test.ts for
 * window/localStorage/crypto.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_REFERRERS, classifyReferrer } from './referrerClassification.js';

function stubDocumentReferrer(referrer: string | undefined): void {
  vi.stubGlobal('document', { referrer: referrer ?? '' });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('classifyReferrer: direct', () => {
  it('returns "direct" when document is undefined (SSR/build-time)', () => {
    vi.stubGlobal('document', undefined);
    expect(classifyReferrer()).toBe('direct');
  });

  it('returns "direct" when document.referrer is empty', () => {
    stubDocumentReferrer('');
    expect(classifyReferrer()).toBe('direct');
  });
});

describe('classifyReferrer: organic', () => {
  it.each([
    'https://www.google.com/search?q=how+to+document+a+workflow',
    'https://google.co.uk/search',
    'https://bing.com/search?q=sop+template',
    'https://duckduckgo.com/',
    'https://search.yahoo.com/search',
    'https://www.ecosia.org/search',
  ])('classifies %s as organic', (referrer) => {
    stubDocumentReferrer(referrer);
    expect(classifyReferrer()).toBe('organic');
  });
});

describe('classifyReferrer: ai', () => {
  it('classifies every domain in AI_REFERRERS as ai', () => {
    for (const domain of AI_REFERRERS) {
      stubDocumentReferrer(`https://${domain}/`);
      expect(classifyReferrer()).toBe('ai');
    }
  });

  it('classifies a subdomain of an AI_REFERRERS entry as ai', () => {
    stubDocumentReferrer('https://chat.chatgpt.com/');
    expect(classifyReferrer()).toBe('ai');
  });

  it('strips a leading www. before matching', () => {
    stubDocumentReferrer('https://www.perplexity.ai/');
    expect(classifyReferrer()).toBe('ai');
  });
});

describe('classifyReferrer: other', () => {
  it('classifies an unrelated domain as other', () => {
    stubDocumentReferrer('https://news.ycombinator.com/');
    expect(classifyReferrer()).toBe('other');
  });

  it('classifies a social referrer as other', () => {
    stubDocumentReferrer('https://www.linkedin.com/feed/');
    expect(classifyReferrer()).toBe('other');
  });

  it('returns "other" (not throwing) on a malformed referrer URL', () => {
    stubDocumentReferrer('not-a-valid-url');
    expect(classifyReferrer()).toBe('other');
  });

  it('does not false-positive on an AI-referrer domain used as a path segment', () => {
    // e.g. https://example.com/redirect?to=chatgpt.com — the AI domain string
    // appears, but the actual hostname is unrelated.
    stubDocumentReferrer('https://example.com/redirect?to=chatgpt.com');
    expect(classifyReferrer()).toBe('other');
  });
});
