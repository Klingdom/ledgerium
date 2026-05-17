'use client';

/**
 * KpiTile — single metric tile in the admin operations header strip.
 *
 * Displays a big number with an optional unit and delta.
 * Exactly one tile (Total Recordings) uses the mint accent color
 * per UX §12 and design assessment Move #1.
 *
 * @iter 072
 */

interface KpiTileProps {
  /** Short label shown above the value */
  label: string;
  /** Primary metric value — already formatted as a string */
  value: string;
  /** Optional unit displayed after the value (e.g. "MB") */
  unit?: string;
  /** Optional delta indicator (e.g. "+38 / 7d") */
  delta?: string;
  /** Apply mint accent (#20f2a6 via --accent CSS var) to the primary number */
  accent?: boolean;
  /** Additional sub-label text (e.g. "last 30d") */
  sublabel?: string;
}

export function KpiTile({ label, value, unit, delta, accent = false, sublabel }: KpiTileProps) {
  const valueColorClass = accent
    ? 'text-[var(--accent,#20f2a6)]'
    : 'text-[var(--content-primary)]';

  return (
    <div
      className="flex min-w-0 flex-col gap-1 rounded-lg bg-[var(--surface-secondary)] px-4 py-3"
      data-testid="kpi-tile"
    >
      <span className="text-[11px] text-[var(--content-tertiary)] uppercase tracking-wide truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span
          className={`text-[28px] font-semibold leading-none ${valueColorClass}`}
          data-testid={accent ? 'kpi-tile-accent-value' : 'kpi-tile-value'}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[13px] text-[var(--content-secondary)]">{unit}</span>
        )}
      </div>
      {sublabel && (
        <span className="text-[11px] text-[var(--content-tertiary)]">{sublabel}</span>
      )}
      {delta && (
        <span className="text-[12px] text-[var(--content-secondary)]">{delta}</span>
      )}
    </div>
  );
}
