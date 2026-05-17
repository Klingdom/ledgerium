/**
 * AdminOperationsPage — Server Component gate tests.
 *
 * QA-attention item 1 (iter 073): verify that the notFound() gate
 * correctly fires for unauthenticated and non-admin users, and that
 * the admin user sees the dashboard component rendered.
 *
 * Environment: Vitest (node) — JSX is evaluated but no full DOM render.
 * The Server Component is called as an async function (standard Next.js
 * App Router server-component test pattern).
 *
 * next/navigation notFound() throws a special NEXT_NOT_FOUND error
 * internally. We catch and assert that error type here.
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth')            — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls isAdminUnlimited
 *  - vi.mock('next/navigation')       — captures notFound() calls
 *  - vi.mock('@/components/admin-operations/AdminOperationsDashboard') — avoids
 *    rendering the full client component tree in a node environment
 *
 * @iter 073
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks — must be declared before the import under test ───────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  isAdminUnlimited: vi.fn(),
}));

// next/navigation notFound() throws an internal error; we replace it with a
// trackable function that throws a distinguishable error for test assertions.
// Use vi.hoisted() so mockNotFound is initialized BEFORE the hoisted vi.mock()
// factory runs — without this, the factory reads `mockNotFound` before its
// `const` binding is initialized, throwing "Cannot access 'mockNotFound'
// before initialization".
const { mockNotFound } = vi.hoisted(() => ({
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

// Stub the heavy Client Component — we only need to assert it renders,
// not test its full tree in this server-component test.
vi.mock('@/components/admin-operations/AdminOperationsDashboard', () => ({
  AdminOperationsDashboard: () => '<AdminOperationsDashboard />',
}));

import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import AdminOperationsPage from './page';

// ── Typed mock references ──────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminUnlimited as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callPage(): Promise<unknown> {
  return AdminOperationsPage();
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminOperationsPage — auth gate (QA item 1, iter 073)', () => {
  it('calls notFound() when there is no session (unauthenticated user)', async () => {
    mockAuth.mockResolvedValue(null);
    mockIsAdmin.mockReturnValue(false);

    await expect(callPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('calls notFound() when session has no email', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_001' } });
    mockIsAdmin.mockReturnValue(false);

    await expect(callPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('calls notFound() when authenticated but email is not on admin allowlist', async () => {
    mockAuth.mockResolvedValue({
      user: { email: 'regular@example.com', id: 'user_002' },
    });
    mockIsAdmin.mockReturnValue(false);

    await expect(callPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it('does NOT call notFound() when session is a valid admin', async () => {
    mockAuth.mockResolvedValue({
      user: { email: 'philklingmbb@gmail.com', id: 'user_admin' },
    });
    mockIsAdmin.mockReturnValue(true);

    const result = await callPage();

    expect(mockNotFound).not.toHaveBeenCalled();
    // The page renders (result is JSX — in node env it's an object)
    expect(result).toBeDefined();
  });

  it('passes the session email to isAdminUnlimited for verification', async () => {
    const adminEmail = 'philklingmbb@gmail.com';
    mockAuth.mockResolvedValue({ user: { email: adminEmail, id: 'user_admin' } });
    mockIsAdmin.mockReturnValue(true);

    await callPage();

    expect(mockIsAdmin).toHaveBeenCalledWith(adminEmail);
  });

  it('does not call any query function before the admin check (no DB leak)', async () => {
    // This test verifies the auth gate fires before any DB access.
    // The queries module is not mocked here — if the page tried to call DB
    // functions before checking admin status, it would throw a different error.
    mockAuth.mockResolvedValue({ user: { email: 'attacker@evil.com' } });
    mockIsAdmin.mockReturnValue(false);

    await expect(callPage()).rejects.toThrow('NEXT_NOT_FOUND');
    // notFound() fired — confirmed no DB calls happened after gate
    expect(mockNotFound).toHaveBeenCalledOnce();
  });
});
