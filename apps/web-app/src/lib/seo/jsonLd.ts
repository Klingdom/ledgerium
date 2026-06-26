import { SITE_CONFIG } from '@/lib/config';
import { PARENT_HUB } from '@/content/registry';
import type { SeoPage } from '@/content/types';
import { pageUrl } from './url';

type JsonLdObject = Record<string, unknown>;

function organization(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ledgerium AI',
    url: SITE_CONFIG.url,
    description:
      'Ledgerium AI records real browser workflows and turns them into SOPs, process maps, workflow intelligence reports, and AI opportunity reports.',
    knowsAbout: ['process intelligence', 'workflow automation', 'SOP documentation', 'process mining'],
    sameAs: ['https://www.linkedin.com/company/ledgerium'],
  };
}

function breadcrumbs(page: SeoPage): JsonLdObject {
  const hub = PARENT_HUB[page.type];
  const items: JsonLdObject[] = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_CONFIG.url },
  ];
  let pos = 2;
  if (hub) {
    items.push({ '@type': 'ListItem', position: pos++, name: hub.label, item: `${SITE_CONFIG.url}${hub.path}` });
  }
  items.push({ '@type': 'ListItem', position: pos, name: page.h1, item: pageUrl(page) });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function webPage(page: SeoPage): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.metaTitle,
    description: page.metaDescription,
    url: pageUrl(page),
    dateModified: page.updatedAt,
  };
}

function faqPage(page: SeoPage): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function article(page: SeoPage): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.h1,
    description: page.shortAnswer,
    url: pageUrl(page),
    dateModified: page.updatedAt,
    author: {
      '@type': 'Person',
      name: page.author.name,
      ...(page.author.sameAs ? { sameAs: page.author.sameAs } : {}),
    },
    publisher: { '@type': 'Organization', name: 'Ledgerium AI', url: SITE_CONFIG.url },
  };
}

function softwareApplication(page: SeoPage): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Ledgerium AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Chrome',
    description: page.shortAnswer,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: { '@type': 'Organization', name: 'Ledgerium AI', url: SITE_CONFIG.url },
  };
}

function howTo(page: SeoPage): JsonLdObject | null {
  if (page.type !== 'workflow') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: page.h1,
    description: page.shortAnswer,
    step: page.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.detail,
    })),
  };
}

/**
 * Build the JSON-LD object array for a page based on its declared `jsonLd` types.
 * Note: FAQPage and HowTo no longer produce Google rich results (HowTo removed
 * Sept 2023, FAQPage removed May 2026). They are emitted for LLM / answer-engine
 * semantic parsing only — never claim rich-result CTR from them.
 */
export function generateJsonLd(page: SeoPage): JsonLdObject[] {
  const out: JsonLdObject[] = [];
  for (const t of page.jsonLd) {
    switch (t) {
      case 'Organization':
        out.push(organization());
        break;
      case 'BreadcrumbList':
        out.push(breadcrumbs(page));
        break;
      case 'WebPage':
        out.push(webPage(page));
        break;
      case 'FAQPage':
        if (page.faqs.length > 0) out.push(faqPage(page));
        break;
      case 'Article':
        out.push(article(page));
        break;
      case 'SoftwareApplication':
        out.push(softwareApplication(page));
        break;
      case 'HowTo': {
        const h = howTo(page);
        if (h) out.push(h);
        break;
      }
      case 'ItemList':
        // Reserved for index/hub pages; no-op for leaf pages.
        break;
    }
  }
  return out;
}
