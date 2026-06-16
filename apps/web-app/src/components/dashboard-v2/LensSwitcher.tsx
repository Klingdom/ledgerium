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
 * arrow keys move FOCUS ONLY across tabs (roving tabindex). Activation happens
 * only on Enter / Space / click — NOT selection-follows-focus (atglance-review
 * item #8 + FRONTEND_DASHBOARD_REVIEW finding #6): arrowing to read labels must
 * not reconfigure the table or fire analytics. The active tab is visually
 * primary (brand underline + filled pill + semibold). A one-line caption under
 * the tablist shows the active lens's honest description plus a "two views"
 * hint.
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

  /**
   * Move keyboard focus to a tab WITHOUT activating it (roving tabindex). The
   * lens only changes on explicit activation (Enter / Space / click) — see
   * `activateTab`. This is the deliberate departure from selection-follows-focus
   * (atglance-review item #8): arrowing to read labels must be side-effect-free.
   */
  function focusTab(index: number) {
    const count = LENS_ORDER.length;
    const next = ((index % count) + count) % count;
    if (LENS_ORDER[next] === undefined) return;
    tabRefs.current[next]?.focus();
  }

  /** Activate the lens at `index` (called on click / Enter / Space only). */
  function activateTab(index: number) {
    const lens = LENS_ORDER[index];
    if (lens === undefined) return;
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
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      // Explicit activation only — never on arrow movement.
      e.preventDefault();
      activateTab(index);
    }
  }

  // Honest caption: the active lens's own description (jargon-avoided copy from
  // lenses.ts) plus a one-line "two views" framing so newcomers learn the tabs
  // are non-destructive views of the same data.
  const activeDescription = getLensConfig(activeLens).description;

  return (
    <div className="flex flex-col gap-ds-1">
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
              // Only the LSS tab controls a panel, and only while it is the
              // rendered panel. Setting aria-controls on a tab whose panel is not
              // in the DOM is a broken ARIA reference (FRONTEND_DASHBOARD_REVIEW
              // finding #5). The LSS panel id is `dashboard-lens-panel`.
              {...(lens === 'lss' && isActive
                ? { 'aria-controls': 'dashboard-lens-panel' }
                : {})}
              tabIndex={isActive ? 0 : -1}
              title={config.description}
              onClick={() => activateTab(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={[
                'relative px-ds-3 py-ds-2 text-[13px] -mb-px border-b-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#16a34a)] rounded-t-ds-sm',
                // Active lens is visually PRIMARY: brand underline + a subtle
                // accent-tinted pill + semibold weight (atglance-review item #8).
                isActive
                  ? 'border-[var(--accent,#16a34a)] bg-[var(--accent-subtle,rgba(22,163,74,0.08))] text-[var(--content-primary)] font-semibold'
                  : 'border-transparent text-[var(--content-secondary)] font-normal hover:text-[var(--content-primary)]',
              ].join(' ')}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Caption: honest active-lens description + non-destructive framing. */}
      <p className="px-ds-1 text-[12px] leading-[1.4] text-[var(--content-secondary)]">
        {activeDescription}{' '}
        <span className="text-[var(--content-tertiary)]">
          · Two views — switch anytime.
        </span>
      </p>
    </div>
  );
}
