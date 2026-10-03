import { Check } from 'lucide-react';

export type CellValue = boolean | string;

export interface ComparisonRow {
  label: string;
  free: CellValue;
  starter: CellValue;
  solo: CellValue;
  team: CellValue;
  growth: CellValue;
  enterprise: CellValue;
  /** Set on the first row of each feature category. */
  category?: string;
}

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === 'coming-soon') {
    return (
      <span className="inline-block text-[var(--status-warning)] bg-amber-900/20 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap">
        Roadmap
      </span>
    );
  }
  if (value === true) {
    // Icon is decorative; the adjacent screen-reader text carries the meaning.
    return (
      <>
        <Check className="h-4 w-4 mx-auto text-[var(--brand-text)]" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="text-[var(--content-tertiary)]">—</span>
        <span className="sr-only">Not included</span>
      </>
    );
  }
  // String value (price, seat count, etc.)
  return <span className="text-[var(--content-primary)] text-sm">{value}</span>;
}

const PLAN_COLUMNS_BEFORE_TEAM = ['Free', 'Starter', 'Solo'] as const;
const PLAN_COLUMNS_AFTER_TEAM = ['Growth', 'Enterprise'] as const;

/**
 * Plan comparison table. Semantics (row #113 as re-scoped by MR-065):
 * - <caption> names the table; column headers scope="col"; the feature name is a
 *   <th scope="row"> so each cell is announced with its feature and plan.
 * - Each feature category is its own <tbody> whose first row is a single
 *   <th scope="rowgroup" colSpan>. "colgroup" would be wrong: it labels a group
 *   of COLUMNS, and these categories group ROWS. The th lives inside a tbody so
 *   the rowgroup scope has a real row group to apply to.
 */
export function ComparisonTable({ rows }: { rows: readonly ComparisonRow[] }) {
  const groups: { category: string; rows: { row: ComparisonRow; index: number }[] }[] = [];
  rows.forEach((row, index) => {
    if (row.category) groups.push({ category: row.category, rows: [] });
    groups[groups.length - 1]!.rows.push({ row, index });
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <caption className="sr-only">Plan comparison</caption>
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
            <th scope="col" className="text-left px-5 py-4 font-semibold text-[var(--content-secondary)] w-[220px] sticky left-0 bg-[var(--surface-elevated)] z-10">
              Feature
            </th>
            {PLAN_COLUMNS_BEFORE_TEAM.map((col) => (
              <th scope="col" key={col} className="px-4 py-4 font-semibold text-[var(--content-secondary)] text-center">
                {col}
              </th>
            ))}
            {/* Team column — highlighted */}
            <th scope="col" className="px-4 py-4 text-center bg-brand-900/10 border-x border-brand-800/30">
              <span className="font-semibold text-[var(--brand-text)]">Team</span>
            </th>
            {PLAN_COLUMNS_AFTER_TEAM.map((col) => (
              <th scope="col" key={col} className="px-4 py-4 font-semibold text-[var(--content-secondary)] text-center">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.category}>
            <tr className="bg-brand-900/20 border-t-2 border-brand-800/40">
              <th
                scope="rowgroup"
                colSpan={7}
                className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--brand-text)] sticky left-0 bg-brand-900/20 z-10"
              >
                {group.category}
              </th>
            </tr>
            {group.rows.map(({ row, index: i }) => (
              <tr
                key={row.label}
                className={`border-b border-[var(--border-default)] last:border-0 ${
                  i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'
                }`}
              >
                <th
                  scope="row"
                  className={`px-5 py-3.5 text-left font-medium text-[var(--content-primary)] sticky left-0 z-10 ${
                    i % 2 === 0 ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-secondary)]'
                  }`}
                >
                  {row.label}
                </th>
                <td className="px-4 py-3.5 text-center"><ComparisonCell value={row.free} /></td>
                <td className="px-4 py-3.5 text-center"><ComparisonCell value={row.starter} /></td>
                <td className="px-4 py-3.5 text-center"><ComparisonCell value={row.solo} /></td>
                {/* Team column — highlighted with subtle brand tint */}
                <td className="px-4 py-3.5 text-center bg-brand-900/10 border-x border-brand-800/30">
                  <ComparisonCell value={row.team} />
                </td>
                <td className="px-4 py-3.5 text-center"><ComparisonCell value={row.growth} /></td>
                <td className="px-4 py-3.5 text-center"><ComparisonCell value={row.enterprise} /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
