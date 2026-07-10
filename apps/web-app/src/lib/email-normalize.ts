/**
 * Canonical email normalization for storage + lookup.
 *
 * Root-cause fix (2026-07-09): signup stored/looked-up email RAW while
 * forgot-password normalized to lowercase inline, so any mixed-case signup
 * email could never be found by the password-reset flow. This is the single
 * source of truth for normalizing an email before it is persisted OR used as
 * a lookup key — every call site (signup, login, forgot-password,
 * reset-password, admin reset-link, team invites) MUST route through this
 * function so stored values and lookup values are always byte-identical.
 *
 * Deterministic + pure: same input always produces the same output.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
