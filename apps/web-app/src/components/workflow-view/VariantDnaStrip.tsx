'use client';

/**
 * Variant DNA strip — each recorded path as a row of color-coded step tokens,
 * most-frequent first, with deviations from the standard path highlighted. Lets
 * you scan many variants at once and spot where they diverge. Pure, deterministic
 * render (sorted by frequency with a stable id tie-break) → hydration-safe.
 */

import type { ViewVariantPath } from './adapters/viewModel';
import { CATEGORY_STYLES } from './constants';

interface Props {
  variants: ViewVariantPath[];
}

export function VariantDnaStrip({ variants }: Props) {
  const sorted = [...variants].sort(
    (a, b) => b.frequency - a.frequency || a.id.localeCompare(b.id),
  );

  return (
    <div className="absolute inset-0 overflow-auto bg-[var(--surface-secondary)] p-4">
      <div className="mx-auto max-w-5xl space-y-2">
        <p className="mb-3 text-[10px] text-[var(--content-tertiary)]">
          Each row is a recorded path, most frequent first. Outlined cells are where the path deviates from the standard.
        </p>
        {sorted.map((v) => (
          <div key={v.id} className="flex items-center gap-3 rounded-lg bg-[var(--surface-elevated)] px-3 py-2 border border-[var(--border-subtle)]">
            <div className="w-40 flex-shrink-0">
              <p className="flex items-center gap-1 truncate text-[11px] font-medium text-[var(--content-primary)]">
                {v.isStandard && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#059669' }} />}
                {v.label}
              </p>
              <p className="text-[9px] text-[var(--content-tertiary)]">
                {Math.round(v.frequency * 100)}% · {v.runCount} run{v.runCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {v.stepCategories.map((cat, i) => {
                const style = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
                const diverges = !v.isStandard && v.divergencePoints.includes(i);
                return (
                  <span
                    key={i}
                    title={style.label}
                    className="flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[8px] font-bold"
                    style={{
                      color: style.color,
                      background: `${style.color}1a`,
                      outline: diverges ? '1.5px solid #d97706' : 'none',
                      outlineOffset: diverges ? '1px' : undefined,
                    }}
                  >
                    {style.label.slice(0, 3)}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
