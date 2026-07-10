/**
 * email.ts — provider selection unit tests (pure, node env).
 * Password-reset-email reliability, Option A (Hostinger SMTP).
 */

import { describe, it, expect } from 'vitest';
import { selectEmailProvider, isEmailDeliveryConfigured } from './email';

describe('selectEmailProvider', () => {
  it('chooses smtp when SMTP_PASSWORD is set (SMTP takes precedence)', () => {
    expect(selectEmailProvider({ SMTP_PASSWORD: 'pw' })).toBe('smtp');
    expect(selectEmailProvider({ SMTP_PASSWORD: 'pw', RESEND_API_KEY: 're_x' })).toBe('smtp');
  });

  it('chooses resend when only RESEND_API_KEY is set', () => {
    expect(selectEmailProvider({ RESEND_API_KEY: 're_x' })).toBe('resend');
  });

  it('falls back to console when nothing is configured', () => {
    expect(selectEmailProvider({})).toBe('console');
  });

  it('treats empty / whitespace-only values as unset', () => {
    expect(selectEmailProvider({ SMTP_PASSWORD: '', RESEND_API_KEY: '  ' })).toBe('console');
    expect(selectEmailProvider({ SMTP_PASSWORD: '   ', RESEND_API_KEY: 're_x' })).toBe('resend');
  });
});

describe('isEmailDeliveryConfigured', () => {
  it('is true for smtp or resend, false for console', () => {
    expect(isEmailDeliveryConfigured({ SMTP_PASSWORD: 'pw' })).toBe(true);
    expect(isEmailDeliveryConfigured({ RESEND_API_KEY: 're_x' })).toBe(true);
    expect(isEmailDeliveryConfigured({})).toBe(false);
  });
});
