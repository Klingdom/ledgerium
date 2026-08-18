import { SITE_CONFIG } from '@/lib/config';
import { PARENT_HUB } from '@/content/registry';
import type { SeoPage } from '@/content/types';
import { pageUrl } from './url';
import { SITE_ORGANIZATION_ID, SITE_WEBSITE_ID } from './organization';

type JsonLdObject = Record<string, unknown>;

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
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', '@id': SITE_WEBSITE_ID },
    datePublished: page.updatedAt,
    dateModified: page.updatedAt,
    // Entity anchoring for answer engines.
    about: { '@type': 'Thing', name: page.primaryKeyword },
    ...(page.secondaryKeywords.length > 0
      ? { mentions: page.secondaryKeywords.map((k) => ({ '@type': 'Thing', name: k })) }
      : {}),
    // Voice / answer-engine extraction targets (the answer-first lede + data callout).
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.seo-answer', '.seo-datapoint'] },
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
    datePublished: page.updatedAt,
    dateModified: page.updatedAt,
    author: {
      '@type': 'Person',
      name: page.author.name,
      ...(page.author.sameAs ? { sameAs: page.author.sameAs } : {}),
    },
    // References the canonical Organization node (app/layout.tsx via
    // @/lib/seo/organization) by @id rather than restating it — see the
    // 'Organization' no-op case in generateJsonLd() below for why.
    publisher: { '@id': SITE_ORGANIZATION_ID },
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
    // References the canonical Organization node (app/layout.tsx via
    // @/lib/seo/organization) by @id rather than restating it — see the
    // 'Organization' no-op case in generateJsonLd() below for why.
    provider: { '@id': SITE_ORGANIZATION_ID },
  };
}

function definedTerm(page: SeoPage): JsonLdObject | null {
  if (page.type !== 'answer') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: page.term,
    description: page.definition,
    url: pageUrl(page),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Ledgerium Process Glossary',
      url: `${SITE_CONFIG.url}/answers`,
    },
  };
}

function howTo(page: SeoPage): JsonLdObject | null {
  // Steps source varies by type: workflow + problem use `steps`, SOP templates
  // use `exampleProcedure`. (Fixes a prior gap where problem pages declared
  // HowTo but emitted none.)
  let steps: readonly { title: string; detail: string }[] | null = null;
  if (page.type === 'workflow' || page.type === 'problem') steps = page.steps;
  else if (page.type === 'sopTemplate') steps = page.exampleProcedure;
  if (!steps) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: page.h1,
    description: page.shortAnswer,
    step: steps.map((s, i) => ({
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
        // No-op by design. The canonical Organization node is emitted
        // exactly once, sitewide, by app/layout.tsx (@/lib/seo/organization)
        // — it is already present on every page regardless of what a leaf
        // page's own `jsonLd` array declares, so re-emitting it here would
        // recreate the original defect (SEO_AEO_EFFECTIVENESS_REVIEW_001 §5
        // P1-2: two Organization nodes on one page). Pages that need to
        // POINT AT the entity (Article.publisher, SoftwareApplication.provider)
        // reference it by `@id` — see `article()` / `softwareApplication()`.
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
      case 'DefinedTerm': {
        const d = definedTerm(page);
        if (d) out.push(d);
        break;
      }
      case 'ItemList':
        // Reserved for index/hub pages; no-op for leaf pages.
        break;
    }
  }
  return out;
}
