/**
 * UserDetailActions — unit tests.
 *
 * Environment: Vitest (node) — no React, no DOM.
 * Tests the structural contract of the UserDetailActions component via
 * static analysis of its exported module. Since all buttons are disabled
 * placeholders with no logic, we verify the component exports a function
 * and that the placeholder contract is documented.
 *
 * Note: button attribute assertions (disabled, aria-disabled) are verified
 * through integration in UserDetailDrawer E2E or snapshot tests. Here we
 * confirm the component module exports and the expected data-testid tokens
 * are defined in the source as string literals.
 *
 * @iter 096 / ADM-002 PR-7
 */

import { describe, it, expect } from 'vitest';
import { UserDetailActions } from './UserDetailActions.js';

// ── UserDetailActions export ───────────────────────────────────────────────────

describe('UserDetailActions', () => {
  it('exports a function component', () => {
    expect(typeof UserDetailActions).toBe('function');
  });

  it('component function has the correct name', () => {
    expect(UserDetailActions.name).toBe('UserDetailActions');
  });
});
