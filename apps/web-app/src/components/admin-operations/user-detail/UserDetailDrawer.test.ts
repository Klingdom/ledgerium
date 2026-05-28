/**
 * UserDetailDrawer — unit tests for pure helper functions.
 *
 * Environment: Vitest (node) — no React, no DOM.
 * State-derivation pattern: imports and tests exported pure helpers directly.
 *
 * React rendering / DOM interaction (Escape key, click-outside, focus
 * management) is covered by Playwright E2E. Here we verify the deterministic
 * URL-builder and status-derivation logic that drives the fetch flow.
 *
 * @iter 096 / ADM-002 PR-7
 */

import { describe, it, expect } from 'vitest';
import { buildUserDetailUrl, deriveDrawerStatus } from './UserDetailDrawer.js';

// ── buildUserDetailUrl ─────────────────────────────────────────────────────────

describe('buildUserDetailUrl', () => {
  it('returns the expected URL for a simple user id', () => {
    expect(buildUserDetailUrl('user_123')).toBe('/api/admin/users/user_123');
  });

  it('URL-encodes special characters in the user id', () => {
    // Verifies encodeURIComponent is applied
    expect(buildUserDetailUrl('user@example.com')).toBe(
      '/api/admin/users/user%40example.com',
    );
  });

  it('handles UUIDs without encoding', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(buildUserDetailUrl(uuid)).toBe(`/api/admin/users/${uuid}`);
  });

  it('encodes a slash in the id to prevent path traversal', () => {
    expect(buildUserDetailUrl('a/b')).toBe('/api/admin/users/a%2Fb');
  });

  it('returns a deterministic result when called twice with the same id', () => {
    const id = 'cuid_abc123';
    expect(buildUserDetailUrl(id)).toBe(buildUserDetailUrl(id));
  });
});

// ── deriveDrawerStatus ─────────────────────────────────────────────────────────

describe('deriveDrawerStatus', () => {
  it('returns "not_found" for HTTP 404', () => {
    expect(deriveDrawerStatus(404, false)).toBe('not_found');
    expect(deriveDrawerStatus(404, true)).toBe('not_found');
  });

  it('returns "error" for HTTP 500', () => {
    expect(deriveDrawerStatus(500, false)).toBe('error');
  });

  it('returns "error" for any HTTP >= 400 that is not 404', () => {
    expect(deriveDrawerStatus(400, false)).toBe('error');
    expect(deriveDrawerStatus(403, false)).toBe('error');
    expect(deriveDrawerStatus(422, false)).toBe('error');
    expect(deriveDrawerStatus(503, false)).toBe('error');
  });

  it('returns "not_found" for HTTP 200 when hasData is false', () => {
    expect(deriveDrawerStatus(200, false)).toBe('not_found');
  });

  it('returns "success" for HTTP 200 when hasData is true', () => {
    expect(deriveDrawerStatus(200, true)).toBe('success');
  });

  it('returns "success" for any 2xx when hasData is true', () => {
    expect(deriveDrawerStatus(201, true)).toBe('success');
  });

  it('returns "not_found" for 3xx when hasData is false', () => {
    // Status >= 400 check is the gate; 3xx falls through to the hasData check
    expect(deriveDrawerStatus(301, false)).toBe('not_found');
  });

  it('is deterministic — same inputs always produce same output', () => {
    expect(deriveDrawerStatus(200, true)).toBe(deriveDrawerStatus(200, true));
    expect(deriveDrawerStatus(404, false)).toBe(deriveDrawerStatus(404, false));
    expect(deriveDrawerStatus(500, false)).toBe(deriveDrawerStatus(500, false));
  });
});
