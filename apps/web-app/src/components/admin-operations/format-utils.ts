/**
 * Pure formatter functions for the Admin Operations Dashboard.
 *
 * All formatters are deterministic: same input → same output.
 * All formatters treat null/undefined as "—" unless otherwise noted.
 *
 * @module admin-operations/format-utils
 * @iter 072
 */

// ── Bytes ──────────────────────────────────────────────────────────────────────

/**
 * Format a byte count into a human-readable string.
 *
 * Examples:
 *   formatBytes(0)           → "0 B"
 *   formatBytes(1500)        → "1.5 KB"
 *   formatBytes(428_000_000) → "408.4 MB"
 *   formatBytes(null)        → "—"
 */
export function formatBytes(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / Math.pow(1024, i);
  const formatted = i === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[i]}`;
}

// ── Numbers ────────────────────────────────────────────────────────────────────

/**
 * Format a number with locale separators, or compact (e.g., "1.2k").
 *
 * Examples:
 *   formatNumber(1234)                    → "1,234"
 *   formatNumber(1234, { compact: true }) → "1.2k"
 *   formatNumber(null)                    → "—"
 */
export function formatNumber(
  n: number | null | undefined,
  opts?: { compact?: boolean },
): string {
  if (n == null) return '—';
  if (opts?.compact) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }
  return n.toLocaleString('en-US');
}

// ── Percentages ────────────────────────────────────────────────────────────────

/**
 * Format a 0–100 number as a percentage string.
 *
 * Examples:
 *   formatPercent(67.5)               → "67.5%"
 *   formatPercent(67.5, { fractionDigits: 0 }) → "68%"
 *   formatPercent(null)               → "—"
 */
export function formatPercent(
  n: number | null | undefined,
  opts?: { fractionDigits?: number },
): string {
  if (n == null) return '—';
  const digits = opts?.fractionDigits ?? 1;
  return `${n.toFixed(digits)}%`;
}

// ── Relative time ──────────────────────────────────────────────────────────────

/**
 * Format a Date as a human-readable relative time string.
 *
 * Examples:
 *   formatRelativeTime(new Date(Date.now() - 5000))   → "5s ago"
 *   formatRelativeTime(new Date(Date.now() - 90000))  → "2m ago"
 *   formatRelativeTime(new Date(Date.now() - 7200000)) → "2h ago"
 *   formatRelativeTime(null) → "—"
 */
export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return '—';
  const nowMs = Date.now();
  const diffMs = nowMs - date.getTime();
  if (diffMs < 0) return 'just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Format a millisecond duration as a human-readable string.
 *
 * Examples:
 *   formatDuration(1400)   → "1.4s"
 *   formatDuration(75000)  → "1m 15s"
 *   formatDuration(null)   → "—"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

// ── ISO date → display ─────────────────────────────────────────────────────────

/**
 * Format an ISO date string (YYYY-MM-DD) to a short display format.
 *
 * Examples:
 *   formatIsoDate("2026-05-16") → "May 16"
 *   formatIsoDate(null)         → "—"
 */
export function formatIsoDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(`${date}T00:00:00Z`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── Uptime ────────────────────────────────────────────────────────────────────

/**
 * Format seconds of uptime to a readable string.
 *
 * Examples:
 *   formatUptime(3600)    → "1h 0m"
 *   formatUptime(90061)   → "1d 1h"
 *   formatUptime(null)    → "—"
 */
export function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}
