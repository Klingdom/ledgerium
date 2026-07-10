/**
 * email-normalize.ts — unit tests.
 *
 * Environment: Vitest (node) — pure logic, no rendering (matches web-app
 * test convention; see UsageQuotaMeter.test.tsx / install.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './email-normalize';

describe('normalizeEmail', () => {
  it('lowercases an all-uppercase email', () => {
    expect(normalizeEmail('SAMANTHA.MYERS@EQUIPMENTSHARE.COM')).toBe(
      'samantha.myers@equipmentshare.com',
    );
  });

  it('lowercases a mixed-case email', () => {
    expect(normalizeEmail('Samantha.Myers@EquipmentShare.com')).toBe(
      'samantha.myers@equipmentshare.com',
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('trims and lowercases together', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('trims tabs and newlines, not just spaces', () => {
    expect(normalizeEmail('\tuser@example.com\n')).toBe('user@example.com');
  });

  it('is a no-op on an already-normalized email', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('is idempotent — normalizing twice equals normalizing once', () => {
    const once = normalizeEmail('  Mixed.Case@Example.COM  ');
    const twice = normalizeEmail(once);
    expect(twice).toBe(once);
  });

  it('does not alter internal whitespace-free structure of the local part', () => {
    expect(normalizeEmail('First.Last+tag@Example.com')).toBe(
      'first.last+tag@example.com',
    );
  });

  it('handles an empty string', () => {
    expect(normalizeEmail('')).toBe('');
  });

  it('handles a whitespace-only string', () => {
    expect(normalizeEmail('   ')).toBe('');
  });
});
