/**
 * Shared formatting utilities for the web app.
 */

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 100) return '< 1s';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  // timeZone:'UTC' makes this deterministic across server (VPS, UTC) and the
  // client (user's browser TZ). Without it the SSR'd string can differ from the
  // hydrated string near a day boundary → React hydration mismatch → the
  // "flash → unstyled" crash. (Flash-class fix, 2026-06-09.)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format an ISO timestamp as an absolute date + time in UTC, e.g.
 * "Jun 12, 2026, 14:05". Used as a DETERMINISTIC, observed row disambiguator
 * (atglance-review #15) when multiple visible rows share the same title.
 *
 * timeZone:'UTC' + a fixed 24-hour clock make this byte-identical across server
 * (UTC VPS) and client (any browser TZ) — no hydration mismatch, no Date.now().
 * Returns '' for null/undefined (callers fall back honestly).
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function formatDateRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function formatConfidence(c: number | null | undefined): string {
  if (c === null || c === undefined) return '';
  return `${Math.round(c * 100)}%`;
}
