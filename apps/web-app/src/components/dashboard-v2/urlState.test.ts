import { describe, it, expect } from 'vitest';
import {
  parseDashboardUrlState,
  serializeDashboardUrlState,
  DEFAULT_TIME_RANGE,
  DEFAULT_FILTERS,
  DEFAULT_SEARCH_QUERY,
  DEFAULT_SORT,
  type DashboardUrlState,
} from './urlState.js';

const DEFAULT_STATE: DashboardUrlState = {
  timeRange: DEFAULT_TIME_RANGE,
  filters: DEFAULT_FILTERS,
  searchQuery: DEFAULT_SEARCH_QUERY,
  sort: DEFAULT_SORT,
};

describe('serializeDashboardUrlState: defaults omitted', () => {
  it('produces an empty string for a fully-default state (pristine dashboard)', () => {
    expect(serializeDashboardUrlState(DEFAULT_STATE)).toBe('');
  });

  it('omits timeRange when it equals the default', () => {
    const qs = serializeDashboardUrlState({ ...DEFAULT_STATE, timeRange: 'all' });
    expect(qs).not.toContain('timeRange');
  });

  it('omits sort when it equals the default field+dir', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      sort: { field: 'date_recorded', dir: 'desc' },
    });
    expect(qs).not.toContain('sort');
  });

  it('omits empty searchQuery', () => {
    const qs = serializeDashboardUrlState({ ...DEFAULT_STATE, searchQuery: '' });
    expect(qs).not.toContain('q=');
  });

  it('omits an all-default filters object entirely', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { systems: [], opportunity: null, healthStatus: null, needsAttention: false },
    });
    expect(qs).toBe('');
  });
});

describe('round-trip: timeRange', () => {
  it.each(['7d', '30d', '90d'] as const)('round-trips %s', (value) => {
    const qs = serializeDashboardUrlState({ ...DEFAULT_STATE, timeRange: value });
    expect(qs).toContain(`timeRange=${value}`);
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.timeRange).toBe(value);
  });

  it('does not serialize "all" (the default) even though it is a valid value', () => {
    const qs = serializeDashboardUrlState({ ...DEFAULT_STATE, timeRange: 'all' });
    expect(qs).toBe('');
  });
});

describe('round-trip: filters', () => {
  it('round-trips opportunity', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, opportunity: 'automate' },
    });
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.filters?.opportunity).toBe('automate');
  });

  it('round-trips healthStatus', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, healthStatus: 'high_variation' },
    });
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.filters?.healthStatus).toBe('high_variation');
  });

  it('round-trips needsAttention=true', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, needsAttention: true },
    });
    expect(qs).toContain('attention=1');
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.filters?.needsAttention).toBe(true);
  });

  it('omits needsAttention when false (the default)', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, needsAttention: false },
    });
    expect(qs).not.toContain('attention');
  });

  it('round-trips multiple systems, preserving order', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, systems: ['Salesforce', 'Zendesk', 'Jira'] },
    });
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.filters?.systems).toEqual(['Salesforce', 'Zendesk', 'Jira']);
  });

  it('round-trips a system name containing a comma', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, systems: ['Acme, Inc'] },
    });
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.filters?.systems).toEqual(['Acme, Inc']);
  });

  it('round-trips a system name containing a space, alongside other systems', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, systems: ['Sales Force', 'HR System, EU'] },
    });
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.filters?.systems).toEqual(['Sales Force', 'HR System, EU']);
  });

  it('a URL with only one filter param present does not imply the others', () => {
    const parsed = parseDashboardUrlState('?opportunity=automate');
    expect(parsed.filters).toEqual({ opportunity: 'automate' });
    expect(parsed.filters?.systems).toBeUndefined();
    expect(parsed.filters?.healthStatus).toBeUndefined();
    expect(parsed.filters?.needsAttention).toBeUndefined();
  });
});

describe('round-trip: searchQuery', () => {
  it('round-trips a non-empty query', () => {
    const qs = serializeDashboardUrlState({ ...DEFAULT_STATE, searchQuery: 'invoice sync' });
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.searchQuery).toBe('invoice sync');
  });

  it('distinguishes an absent q param from an explicit empty q param', () => {
    const absent = parseDashboardUrlState('?timeRange=7d');
    expect(absent.searchQuery).toBeUndefined();

    const explicitEmpty = parseDashboardUrlState('?q=');
    expect(explicitEmpty.searchQuery).toBe('');
  });

  it('distinguishes an empty search from a whitespace-only search', () => {
    const empty = parseDashboardUrlState('?q=');
    expect(empty.searchQuery).toBe('');

    const whitespace = parseDashboardUrlState('?q=%20');
    expect(whitespace.searchQuery).toBe(' ');
  });
});

describe('round-trip: sort', () => {
  it('round-trips field+dir', () => {
    const qs = serializeDashboardUrlState({
      ...DEFAULT_STATE,
      sort: { field: 'health_score', dir: 'asc' },
    });
    expect(qs).toContain('sort=health_score%3Aasc');
    const parsed = parseDashboardUrlState(qs);
    expect(parsed.sort).toEqual({ field: 'health_score', dir: 'asc' });
  });

  it('round-trips every known sort field', () => {
    const fields = [
      'health_score',
      'name',
      'opportunity',
      'run_count',
      'cycle_time',
      'last_run',
      'date_recorded',
      'case_volume',
    ] as const;
    for (const field of fields) {
      const qs = serializeDashboardUrlState({ ...DEFAULT_STATE, sort: { field, dir: 'asc' } });
      const parsed = parseDashboardUrlState(qs);
      expect(parsed.sort).toEqual({ field, dir: 'asc' });
    }
  });
});

describe('defensive parsing: hostile / malformed input never throws and falls back to default', () => {
  it('rejects an unknown timeRange value', () => {
    const parsed = parseDashboardUrlState('?timeRange=banana');
    expect(parsed.timeRange).toBeUndefined();
  });

  it('rejects an unknown opportunity value', () => {
    const parsed = parseDashboardUrlState('?opportunity=nonsense');
    expect(parsed.filters?.opportunity).toBeUndefined();
  });

  it('rejects an unknown healthStatus value', () => {
    const parsed = parseDashboardUrlState('?health=totally-broken');
    expect(parsed.filters?.healthStatus).toBeUndefined();
  });

  it('rejects a malformed sort param (missing dir)', () => {
    expect(() => parseDashboardUrlState('?sort=;drop')).not.toThrow();
    const parsed = parseDashboardUrlState('?sort=;drop');
    expect(parsed.sort).toBeUndefined();
  });

  it('rejects a sort param with an unknown field and unknown dir', () => {
    const parsed = parseDashboardUrlState('?sort=nonsense:sideways');
    expect(parsed.sort).toBeUndefined();
  });

  it('rejects a sort param with a valid field but invalid dir', () => {
    const parsed = parseDashboardUrlState('?sort=name:sideways');
    expect(parsed.sort).toBeUndefined();
  });

  it('rejects a sort param with too many segments', () => {
    const parsed = parseDashboardUrlState('?sort=name:asc:extra');
    expect(parsed.sort).toBeUndefined();
  });

  it('never throws on garbage query strings', () => {
    const hostileInputs = [
      '?;;;===',
      '???&&&===',
      '%zz',
      '?timeRange=<script>alert(1)</script>',
      '?systems=&systems=&systems=',
      '?opportunity[]=automate',
      String.fromCharCode(0),
      ' ',
    ];
    for (const input of hostileInputs) {
      expect(() => parseDashboardUrlState(input)).not.toThrow();
    }
  });

  it('handles an empty search string with no params present', () => {
    const parsed = parseDashboardUrlState('');
    expect(parsed).toEqual({});
  });

  it('handles a bare "?" with no params present', () => {
    const parsed = parseDashboardUrlState('?');
    expect(parsed).toEqual({});
  });

  it('ignores empty-string systems entries but keeps valid ones', () => {
    const parsed = parseDashboardUrlState('?systems=&systems=Jira');
    expect(parsed.filters?.systems).toEqual(['Jira']);
  });

  it('works whether or not the leading "?" is included', () => {
    const withMark = parseDashboardUrlState('?timeRange=7d');
    const withoutMark = parseDashboardUrlState('timeRange=7d');
    expect(withMark).toEqual(withoutMark);
  });
});

describe('full round-trip: a realistic multi-field URL', () => {
  it('serializes and re-parses a complex state losslessly (module round trip)', () => {
    const state: DashboardUrlState = {
      timeRange: '90d',
      filters: {
        systems: ['Salesforce', 'NetSuite, EU'],
        opportunity: 'standardize',
        healthStatus: 'stale',
        needsAttention: true,
      },
      searchQuery: 'quarterly close',
      sort: { field: 'cycle_time', dir: 'asc' },
    };
    const qs = serializeDashboardUrlState(state);
    const parsed = parseDashboardUrlState(qs);
    expect(parsed).toEqual({
      timeRange: '90d',
      filters: {
        systems: ['Salesforce', 'NetSuite, EU'],
        opportunity: 'standardize',
        healthStatus: 'stale',
        needsAttention: true,
      },
      searchQuery: 'quarterly close',
      sort: { field: 'cycle_time', dir: 'asc' },
    });
  });
});
