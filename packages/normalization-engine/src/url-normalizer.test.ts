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
