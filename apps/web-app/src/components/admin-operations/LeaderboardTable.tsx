'use client';

/**
 * LeaderboardTable — top-N users table for Admin Operations Dashboard.
 *
 * Displays truncated userId (first 8 + "..." + last 4) alongside
 * a count. No PII per PRD §6 / METRICS.md §6.
 *
 * @iter 072
 */

interface LeaderboardRow {
  userId: string;
  uploadCount: number;
}

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  /** Column header for the count column, e.g. "Uploads" */
  countLabel?: string;
  /** Maximum rows to render (default 10) */
  maxRows?: number;
  'data-testid'?: string;
}

export function LeaderboardTable({
  rows,
  countLabel = 'Uploads',
  maxRows = 10,
  'data-testid': testId,
}: LeaderboardTableProps) {
  const visible = rows.slice(0, maxRows);

  if (visible.length === 0) {
    return (
      <p className="py-4 text-center text-[13px] text-[var(--content-tertiary)]">
        No data available.
      </p>
    );
  }

  return (
    <table
      className="w-full text-[13px]"
      data-testid={testId ?? 'leaderboard-table'}
    >
      <thead>
        <tr className="border-b border-[var(--border-default)]">
          <th
            scope="col"
            className="pb-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]"
          >
            User
          </th>
          <th
            scope="col"
            className="pb-2 text-right text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]"
          >
            {countLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {visible.map((row, i) => (
          <tr
            key={row.userId}
            className={`${i < visible.length - 1 ? 'border-b border-[var(--border-default)]' : ''}`}
          >
            <td className="py-2 font-mono text-[12px] text-[var(--content-secondary)]">
              {row.userId}
            </td>
            <td className="py-2 text-right tabular-nums text-[var(--content-primary)]">
              {row.uploadCount.toLocaleString('en-US')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
