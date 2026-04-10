import { describe, it, expect } from 'vitest';
import { normalizeTitle, titleFamilySimilarity, isParameterizedVariant } from './titleNormalizer.js';

describe('normalizeTitle', () => {
  it('parses action + entity + artifact + qualifier from a workflow title', () => {
    const result = normalizeTitle('Email Customer World Cities Report');
    expect(result.action).toBe('email');
    expect(result.entity).toBe('customer');
    expect(result.qualifier).toBe('world');
    expect(result.artifact).toContain('city');
    expect(result.artifact).toContain('report');
  });

  it('produces identical familySignature for parameterized variants', () => {
    const world = normalizeTitle('Email Customer World Cities Report');
    const us = normalizeTitle('Email Customer US Cities Report');
    const emea = normalizeTitle('Email Customer EMEA Cities Report');

    expect(world.familySignature).toBe(us.familySignature);
    expect(world.familySignature).toBe(emea.familySignature);
  });

  it('produces different exactSignature for parameterized variants', () => {
    const world = normalizeTitle('Email Customer World Cities Report');
    const us = normalizeTitle('Email Customer US Cities Report');

    expect(world.exactSignature).not.toBe(us.exactSignature);
  });

  it('handles camelCase titles', () => {
    const result = normalizeTitle('downloadMonthlyReport');
    expect(result.action).toBe('download');
    expect(result.normalized).toBe('download monthly report');
  });

  it('handles underscore-separated titles', () => {
    const result = normalizeTitle('send_customer_email');
    expect(result.action).toBe('send');
    expect(result.entity).toBe('customer');
  });

  it('handles empty string', () => {
    const result = normalizeTitle('');
    expect(result.normalized).toBe('');
    expect(result.familySignature).toBe('');
    expect(result.action).toBeNull();
  });

  it('strips noise tokens but preserves meaningful content', () => {
    const result = normalizeTitle('Navigate to the Customer Dashboard for Review');
    expect(result.action).toBe('navigate');
    expect(result.entity).toBe('customer');
    expect(result.normalized).not.toContain('  '); // no double spaces
  });

  it('detects date-like qualifiers', () => {
    const q1 = normalizeTitle('Generate Report Q1');
    expect(q1.qualifier).toBe('q1');
  });

  it('detects geographic qualifiers', () => {
    const result = normalizeTitle('Send Customer Invoice APAC');
    expect(result.qualifier).toBe('apac');
  });

  it('preserves raw title', () => {
    const raw = 'Email Customer World Cities Report';
    const result = normalizeTitle(raw);
    expect(result.raw).toBe(raw);
  });
});

describe('titleFamilySimilarity', () => {
  it('returns 1.0 for identical family signatures', () => {
    const a = normalizeTitle('Email Customer World Cities Report');
    const b = normalizeTitle('Email Customer US Cities Report');
    expect(titleFamilySimilarity(a, b)).toBe(1.0);
  });

  it('returns high similarity for same action + entity, different artifact', () => {
    const a = normalizeTitle('Email Customer Cities Report');
    const b = normalizeTitle('Email Customer Invoice');
    const sim = titleFamilySimilarity(a, b);
    // Same action + entity = 0.7 weight matched
    expect(sim).toBeGreaterThan(0.6);
  });

  it('returns low similarity for completely different titles', () => {
    const a = normalizeTitle('Email Customer Report');
    const b = normalizeTitle('Download Invoice PDF');
    const sim = titleFamilySimilarity(a, b);
    expect(sim).toBeLessThan(0.4);
  });
});

describe('isParameterizedVariant', () => {
  it('detects parameterized variants with geographic qualifiers', () => {
    const world = normalizeTitle('Email Customer World Cities Report');
    const us = normalizeTitle('Email Customer US Cities Report');
    expect(isParameterizedVariant(world, us)).toBe(true);
  });

  it('returns false for identical titles', () => {
    const a = normalizeTitle('Email Customer World Cities Report');
    const b = normalizeTitle('Email Customer World Cities Report');
    expect(isParameterizedVariant(a, b)).toBe(false);
  });

  it('returns false for different processes', () => {
    const a = normalizeTitle('Email Customer Report');
    const b = normalizeTitle('Download Invoice PDF');
    expect(isParameterizedVariant(a, b)).toBe(false);
  });

  it('returns false for empty signatures', () => {
    const a = normalizeTitle('');
    const b = normalizeTitle('Email Customer Report');
    expect(isParameterizedVariant(a, b)).toBe(false);
  });
});
