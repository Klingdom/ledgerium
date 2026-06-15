'use client';

/**
 * LensSwitcher — the persona LENS tablist (v1).
 *
 * A small `role="tablist"` segmented control that switches the active dashboard
 * lens. v1 wires "Library" (default) and "Measure & Analyze" (LSS). Switching is
 * client-only state owned by the shell — selecting a tab calls `onLensChange`;
 * there is no refetch.
 *
 * Accessibility (standard ARIA tabs pattern, per UX_PERSONA_DASHBOARD §2.3 /
 * frontend notes): each tab is `role="tab"` with `aria-selected`; left/right
 * arrow keys move focus + activate across tabs (roving tabindex). The active tab
 * has a brand underline.
 *
 * Determinism / hydration safety: pure presentational component — no
 * Date.now()/Math.random(), no localStorage read here (the shell's `useLens`
 * owns SSR-safe persistence). Renders identically on server and first client
 * paint given the same `activeLens` prop.
 *
 * @see ./lens.ts — SSR-safe persistence hook
 * @see ../../lib/dashboard-lenses/lenses.ts — LENS_ORDER, LENS_CONFIGS
 */

import { useRef } from 'react';
import {
  LENS_ORDER,
  getLensConfig,
  type Lens,
} from '@/lib/dashboard-lenses/lenses.js';

export interface LensSwitcherProps {
  /** The currently-active lens (owned by the shell via useLens). */
  activeLens: Lens;
  /** Called with the next lens when a tab is activated. */
  onLensChange: (lens: Lens) => void;
}

export default function LensSwitcher({ activeLens, onLensChange }: LensSwitcherProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const count = LENS_ORDER.length;
    const next = ((index % count) + count) % count;
    const lens = LENS_ORDER[next];
    if (lens === undefined) return;
    tabRefs.current[next]?.focus();
    onLensChange(lens);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusTab(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusTab(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTab(LENS_ORDER.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Dashboard view"
      className="flex items-center gap-ds-1 border-b border-[var(--border-subtle)]"
    >
      {LENS_ORDER.map((lens, index) => {
        const config = getLensConfig(lens);
        const isActive = lens === activeLens;
        return (
          <button
            key={lens}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`lens-tab-${lens}`}
            aria-selected={isActive}
            aria-controls="dashboard-lens-panel"
            tabIndex={isActive ? 0 : -1}
            title={config.description}
            onClick={() => onLensChange(lens)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              'relative px-ds-3 py-ds-2 text-[13px] -mb-px border-b-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#16a34a)] rounded-t-ds-sm',
              isActive
                ? 'border-[var(--accent,#16a34a)] text-[var(--content-primary)] font-semibold'
                : 'border-transparent text-[var(--content-secondary)] font-normal hover:text-[var(--content-primary)]',
            ].join(' ')}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
