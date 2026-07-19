import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  extractDomain,
  deriveRouteTemplate,
  deriveApplicationLabel,
  TRACKING_PARAMS,
} from './url-normalizer.js';

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------

describe('normalizeUrl', () => {
  describe('tracking parameter removal', () => {
    it('strips utm_source from a URL', () => {
      const result = normalizeUrl('https://example.com/page?utm_source=email&id=42');
      expect(result).not.toContain('utm_source');
      expect(result).toContain('id=42');
    });

    it('strips utm_campaign and utm_medium together', () => {
      const result = normalizeUrl(
        'https://example.com/page?utm_campaign=spring&utm_medium=social&q=hello',
      );
      expect(result).not.toContain('utm_campaign');
      expect(result).not.toContain('utm_medium');
      expect(result).toContain('q=hello');
    });

    it('strips fbclid from a URL', () => {
      const result = normalizeUrl('https://example.com/?fbclid=abc123&page=1');
      expect(result).not.toContain('fbclid');
      expect(result).toContain('page=1');
    });

    it('strips gclid from a URL', () => {
      const result = normalizeUrl('https://example.com/?gclid=xyz789&section=home');
      expect(result).not.toContain('gclid');
      expect(result).toContain('section=home');
    });

    it('preserves non-tracking query parameters', () => {
      const result = normalizeUrl('https://example.com/search?q=hello&page=2&limit=20');
      expect(result).toContain('q=hello');
      expect(result).toContain('page=2');
      expect(result).toContain('limit=20');
    });

    it('leaves a URL with no query params unchanged', () => {
      const url = 'https://example.com/about';
      expect(normalizeUrl(url)).toBe(url);
    });

    it('does not leave an orphan "?" when all params are stripped', () => {
      const result = normalizeUrl('https://example.com/?utm_source=x&utm_medium=y');
      expect(result).not.toContain('?');
    });

    it('strips all tracking params when URL contains only tracking params', () => {
      const result = normalizeUrl('https://example.com/?utm_source=a&utm_campaign=b&fbclid=c');
      expect(result).not.toContain('utm_source');
      expect(result).not.toContain('utm_campaign');
      expect(result).not.toContain('fbclid');
    });
  });

  describe('malformed URLs', () => {
    it('returns the original string unchanged for a malformed URL', () => {
      const bad = 'not a url at all %%';
      expect(normalizeUrl(bad)).toBe(bad);
    });

    it('returns an empty string unchanged', () => {
      expect(normalizeUrl('')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('preserves the URL hash fragment', () => {
      const result = normalizeUrl('https://example.com/page?utm_source=x#section-2');
      expect(result).toContain('#section-2');
      expect(result).not.toContain('utm_source');
    });

    it('handles a URL with only a path and no query string', () => {
      const url = 'https://example.com/reports/123';
      expect(normalizeUrl(url)).toBe(url);
    });
  });
});

// ---------------------------------------------------------------------------
// extractDomain
// ---------------------------------------------------------------------------

describe('extractDomain', () => {
  it('extracts hostname from a full Salesforce URL', () => {
    expect(extractDomain('https://app.salesforce.com/leads')).toBe('app.salesforce.com');
  });

  it('extracts hostname from a simple URL', () => {
    expect(extractDomain('https://example.com/page')).toBe('example.com');
  });

  it('extracts localhost', () => {
    expect(extractDomain('http://localhost:3000/dashboard')).toBe('localhost');
  });

  it('returns empty string for a malformed URL', () => {
    expect(extractDomain('not-a-url')).toBe('');
  });

  it('returns empty string for an empty string', () => {
    expect(extractDomain('')).toBe('');
  });

  it('does not include the port in the returned hostname', () => {
    // URL.hostname does not include the port
    expect(extractDomain('https://app.example.com:8080/path')).toBe('app.example.com');
  });
});

// ---------------------------------------------------------------------------
// deriveRouteTemplate
// ---------------------------------------------------------------------------

describe('deriveRouteTemplate', () => {
  describe('integer segment replacement', () => {
    it('replaces a numeric task ID with :id', () => {
      expect(deriveRouteTemplate('/tasks/123')).toBe('/tasks/:id');
    });

    it('replaces multiple integer segments', () => {
      expect(deriveRouteTemplate('/org/42/team/7')).toBe('/org/:id/team/:id');
    });
  });

  describe('UUID segment replacement', () => {
    it('replaces a standard UUID segment with :id', () => {
      expect(
        deriveRouteTemplate('/users/550e8400-e29b-41d4-a716-446655440000/profile'),
      ).toBe('/users/:id/profile');
    });

    it('handles a UUID at the end of the path', () => {
      expect(
        deriveRouteTemplate('/records/550e8400-e29b-41d4-a716-446655440000'),
      ).toBe('/records/:id');
    });
  });

  describe('hex string segment replacement', () => {
    it('replaces a 12-char lowercase hex segment with :id', () => {
      // abc123def456 = 12 chars, all lowercase hex — matches HEX_ID_RE (10+)
      expect(deriveRouteTemplate('/reports/abc123def456')).toBe('/reports/:id');
    });

    it('replaces a 10-char hex segment (minimum boundary)', () => {
      expect(deriveRouteTemplate('/items/abcdef0123')).toBe('/items/:id');
    });

    it('does not replace a 9-char hex string (below threshold)', () => {
      // 9 hex chars — does NOT match HEX_ID_RE which requires 10+
      expect(deriveRouteTemplate('/items/abcdef012')).toBe('/items/abcdef012');
    });
  });

  describe('static paths unchanged', () => {
    it('leaves a path with no dynamic segments unchanged', () => {
      expect(deriveRouteTemplate('/settings')).toBe('/settings');
    });

    it('leaves the root path unchanged', () => {
      expect(deriveRouteTemplate('/')).toBe('/');
    });

    it('leaves a multi-segment static path unchanged', () => {
      expect(deriveRouteTemplate('/admin/users/list')).toBe('/admin/users/list');
    });
  });

  describe('mixed paths', () => {
    it('handles mixed static and dynamic segments', () => {
      expect(
        deriveRouteTemplate('/tasks/123/comments/456'),
      ).toBe('/tasks/:id/comments/:id');
    });
  });

  // ---------------------------------------------------------------------
  // F-1 privacy fix: compound (kebab-case, multi-word) slug segments
  // ---------------------------------------------------------------------

  describe('compound-slug segment replacement (F-1 privacy fix)', () => {
    it('replaces a two-word person-name-shaped slug with :slug', () => {
      expect(deriveRouteTemplate('/patients/sarah-connor/notes')).toBe(
        '/patients/:slug/notes',
      );
    });

    it('replaces a three-word company-name-shaped slug with :slug', () => {
      expect(deriveRouteTemplate('/deals/acme-corp-renewal')).toBe(
        '/deals/:slug',
      );
    });

    it('replaces a compound slug at the end of the path', () => {
      expect(deriveRouteTemplate('/companies/globex-industries')).toBe(
        '/companies/:slug',
      );
    });

    it('replaces multiple compound slugs in the same path', () => {
      expect(
        deriveRouteTemplate('/accounts/john-smith/invoices/acme-corp-2024'),
      ).toBe('/accounts/:slug/invoices/:slug');
    });

    it('does not double-classify a compound slug that also matches the hex rule (hex rule wins, still parameterized)', () => {
      // 'abcdef0123' alone is a 10-char hex run (rule 3); hyphenating it
      // routes it through the compound-slug rule instead — either way it
      // is parameterized, which is what matters for the privacy fix.
      expect(deriveRouteTemplate('/x/ab-cdef0123')).toBe('/x/:slug');
    });
  });

  describe('safe single-word route nouns are NOT over-parameterized (regression)', () => {
    it('leaves common single-word static route segments unchanged', () => {
      expect(deriveRouteTemplate('/dashboard')).toBe('/dashboard');
      expect(deriveRouteTemplate('/settings')).toBe('/settings');
      expect(deriveRouteTemplate('/reports')).toBe('/reports');
      expect(deriveRouteTemplate('/contacts/new')).toBe('/contacts/new');
      expect(deriveRouteTemplate('/home')).toBe('/home');
    });

    it('leaves an underscore-separated (non-hyphenated) multi-word segment unchanged', () => {
      // Underscore is not the compound-slug signal — only '-' is.
      expect(deriveRouteTemplate('/reports/monthly_summary')).toBe(
        '/reports/monthly_summary',
      );
    });

    it('leaves a single word containing no hyphen unchanged regardless of length', () => {
      expect(deriveRouteTemplate('/administration')).toBe('/administration');
    });
  });

  describe('accepted false-positive: legitimate multi-word static routes', () => {
    it('parameterizes common two-word static UI routes (documented tradeoff)', () => {
      // These are legitimate, non-sensitive static routes that happen to
      // share the compound-slug shape. This is an intentional accepted
      // cost — see isCompoundSlugSegment() doc comment.
      expect(deriveRouteTemplate('/auth/sign-in')).toBe('/auth/:slug');
      expect(deriveRouteTemplate('/errors/not-found')).toBe('/errors/:slug');
    });
  });

  describe('determinism', () => {
    it('returns byte-identical output across repeated calls with the same input', () => {
      const input = '/patients/sarah-connor/visits/123/notes/abc123def456';
      const first = deriveRouteTemplate(input);
      const second = deriveRouteTemplate(input);
      const third = deriveRouteTemplate(input);
      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(first).toBe('/patients/:slug/visits/:id/notes/:id');
    });
  });

  describe('edge cases', () => {
    it('returns an empty string for an empty pathname', () => {
      expect(deriveRouteTemplate('')).toBe('');
    });

    it('leaves the root path "/" unchanged', () => {
      expect(deriveRouteTemplate('/')).toBe('/');
    });

    it('preserves a trailing slash after a compound slug', () => {
      expect(deriveRouteTemplate('/patients/sarah-connor/')).toBe(
        '/patients/:slug/',
      );
    });

    it('preserves a leading segment with no slash prefix', () => {
      expect(deriveRouteTemplate('patients/sarah-connor')).toBe(
        'patients/:slug',
      );
    });

    it('does not parameterize a lone hyphen segment', () => {
      expect(deriveRouteTemplate('/items/-')).toBe('/items/-');
    });

    it('collapses a double-hyphen segment into two tokens and parameterizes it', () => {
      expect(deriveRouteTemplate('/items/foo--bar')).toBe('/items/:slug');
    });
  });
});

// ---------------------------------------------------------------------------
// deriveApplicationLabel
// ---------------------------------------------------------------------------

describe('deriveApplicationLabel', () => {
  describe('known application mappings', () => {
    it('maps a Salesforce domain to "Salesforce"', () => {
      expect(deriveApplicationLabel('app.salesforce.com')).toBe('Salesforce');
    });

    it('maps a NetSuite subdomain to "NetSuite"', () => {
      expect(deriveApplicationLabel('system.netsuite.com')).toBe('NetSuite');
    });

    it('maps a Workday domain to "Workday"', () => {
      expect(deriveApplicationLabel('impl.workday.com')).toBe('Workday');
    });

    it('maps a ServiceNow domain to "ServiceNow"', () => {
      expect(deriveApplicationLabel('company.servicenow.com')).toBe('ServiceNow');
    });

    it('maps a SAP domain to "SAP"', () => {
      expect(deriveApplicationLabel('my.sap.com')).toBe('SAP');
    });
  });

  describe('localhost and loopback', () => {
    it('maps "localhost" to "Local Dev"', () => {
      expect(deriveApplicationLabel('localhost')).toBe('Local Dev');
    });

    it('maps "127.0.0.1" to "Local Dev"', () => {
      expect(deriveApplicationLabel('127.0.0.1')).toBe('Local Dev');
    });
  });

  describe('unknown domains — fallback capitalization', () => {
    it('capitalizes the first part of an unknown subdomain hostname', () => {
      // 'myapp.example.com' → strip www (none), parts = ['myapp','example','com'] → 'Myapp'
      expect(deriveApplicationLabel('myapp.example.com')).toBe('Myapp');
    });

    it('capitalizes a single-part unknown hostname', () => {
      expect(deriveApplicationLabel('intranet')).toBe('Intranet');
    });

    it('strips www prefix before resolving label', () => {
      // www.example.com → stripped to example.com → 'Example'
      expect(deriveApplicationLabel('www.example.com')).toBe('Example');
    });
  });

  describe('case insensitivity', () => {
    it('matches known app label regardless of input hostname case', () => {
      expect(deriveApplicationLabel('APP.SALESFORCE.COM')).toBe('Salesforce');
    });
  });
});

// ---------------------------------------------------------------------------
// TRACKING_PARAMS set
// ---------------------------------------------------------------------------

describe('TRACKING_PARAMS', () => {
  it('contains the standard UTM parameters', () => {
    expect(TRACKING_PARAMS.has('utm_source')).toBe(true);
    expect(TRACKING_PARAMS.has('utm_medium')).toBe(true);
    expect(TRACKING_PARAMS.has('utm_campaign')).toBe(true);
    expect(TRACKING_PARAMS.has('utm_term')).toBe(true);
    expect(TRACKING_PARAMS.has('utm_content')).toBe(true);
  });

  it('contains fbclid and gclid', () => {
    expect(TRACKING_PARAMS.has('fbclid')).toBe(true);
    expect(TRACKING_PARAMS.has('gclid')).toBe(true);
  });

  it('does not contain legitimate query param names', () => {
    expect(TRACKING_PARAMS.has('id')).toBe(false);
    expect(TRACKING_PARAMS.has('q')).toBe(false);
    expect(TRACKING_PARAMS.has('page')).toBe(false);
  });
});

// ─── F-1 position rule: person-collection identifiers ────────────────────────
//
// Closes the single-token false negative the shape rules cannot reach:
// '/patients/connor' has no hyphen, no digits, and is structurally identical
// to a static route word. Position is the only available signal.

describe('deriveRouteTemplate — person-collection position rule (F-1)', () => {
  it('parameterizes a single-token surname after a person collection', () => {
    expect(deriveRouteTemplate('/patients/connor')).toBe('/patients/:id');
  });

  it('parameterizes a single-token company name after /customers', () => {
    expect(deriveRouteTemplate('/customers/acmecorp')).toBe('/customers/:id');
  });

  it('parameterizes regardless of collection-noun casing', () => {
    expect(deriveRouteTemplate('/Patients/connor')).toBe('/Patients/:id');
  });

  it('handles the singular form of the collection noun', () => {
    expect(deriveRouteTemplate('/patient/connor')).toBe('/patient/:id');
  });

  it('still parameterizes deeper path segments normally', () => {
    expect(deriveRouteTemplate('/patients/connor/notes')).toBe('/patients/:id/notes');
  });

  it('does NOT parameterize a segment after a non-person collection', () => {
    expect(deriveRouteTemplate('/reports/quarterly')).toBe('/reports/quarterly');
  });

  it('does NOT parameterize the collection noun itself', () => {
    expect(deriveRouteTemplate('/patients')).toBe('/patients');
  });

  it('leaves a bare person-collection with trailing slash intact', () => {
    expect(deriveRouteTemplate('/users/')).toBe('/users/');
  });

  it('composes with the integer rule', () => {
    expect(deriveRouteTemplate('/users/12345/settings')).toBe('/users/:id/settings');
  });

  it('composes with the compound-slug rule', () => {
    expect(deriveRouteTemplate('/customers/acme-corp-renewal')).toBe('/customers/:slug');
  });

  it('is deterministic across repeated calls', () => {
    const input = '/patients/connor/notes';
    const results = new Set([
      deriveRouteTemplate(input),
      deriveRouteTemplate(input),
      deriveRouteTemplate(input),
    ]);
    expect(results.size).toBe(1);
  });
});

describe('deriveRouteTemplate — static route verbs are NOT identifiers (F-1)', () => {
  it('leaves /contacts/new intact', () => {
    expect(deriveRouteTemplate('/contacts/new')).toBe('/contacts/new');
  });

  it('leaves /admin/users/list intact', () => {
    expect(deriveRouteTemplate('/admin/users/list')).toBe('/admin/users/list');
  });

  it('leaves /patients/search intact', () => {
    expect(deriveRouteTemplate('/patients/search')).toBe('/patients/search');
  });

  it('leaves /users/me intact', () => {
    expect(deriveRouteTemplate('/users/me')).toBe('/users/me');
  });

  it('still parameterizes a real identifier in the same collection', () => {
    expect(deriveRouteTemplate('/contacts/connor')).toBe('/contacts/:id');
  });

  it('matches route verbs case-insensitively', () => {
    expect(deriveRouteTemplate('/contacts/New')).toBe('/contacts/New');
  });
});
