'use client';

/**
 * DemoAnnotations — reusable numbered-callout overlay.
 *
 * Renders a `position: relative` wrapper around `children`, then
 * absolutely-positions numbered circle buttons at the coordinates given.
 * Clicking a button opens a single inline popover. One popover open at a time.
 *
 * Hard constraints:
 * - No server imports
 * - No Date.now() / Math.random()
 * - Mobile: ≥44px tap targets; popover full-width below 640px
 * - Dismiss on outside-click, Escape, or re-click
 * - Single pulse animation on first viewport entry (IntersectionObserver)
 * - No portals — rendered inline
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface DemoAnnotation {
  /** Unique identifier (e.g., "1", "2"). Used as key. */
  id: string;
  /** Displayed number inside the circle. */
  number: number;
  /** CSS `top` value for the circle, relative to the container. */
  top: string;
  /** CSS `left` value for the circle, relative to the container. */
  left: string;
  /** Popover heading. */
  title: string;
  /** Popover body text. */
  body: string;
  /** Which side the popover opens toward. Defaults to 'bottom'. */
  popoverSide?: 'top' | 'bottom' | 'left' | 'right';
}

interface DemoAnnotationsProps {
  annotations: DemoAnnotation[];
  children: React.ReactNode;
}

const POPOVER_OFFSET_PX = 12;

export default function DemoAnnotations({ annotations, children }: DemoAnnotationsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pulse animation on first viewport entry
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Dismiss on Escape
  useEffect(() => {
    if (!openId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openId]);

  // Dismiss on outside click
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if the click is on the container itself, not a button/popover
      const target = e.target as HTMLElement;
      if (!target.closest('[data-annotation-btn]') && !target.closest('[data-annotation-popover]')) {
        setOpenId(null);
      }
    },
    [],
  );

  const toggleAnnotation = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setOpenId(prev => (prev === id ? null : id));
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={handleContainerClick}
    >
      {children}

      {annotations.map(ann => {
        const isOpen = openId === ann.id;
        const side = ann.popoverSide ?? 'bottom';

        // Position the popover based on side
        const popoverStyle = getPopoverStyle(side);

        return (
          <div
            key={ann.id}
            className="absolute z-30"
            style={{ top: ann.top, left: ann.left, transform: 'translate(-50%, -50%)' }}
          >
            {/* Numbered circle button */}
            <button
              data-annotation-btn
              aria-label={`Annotation ${ann.number}: ${ann.title}`}
              aria-expanded={isOpen}
              onClick={e => toggleAnnotation(ann.id, e)}
              className={[
                // Base styles
                'relative flex items-center justify-center rounded-full',
                'text-white font-bold text-[11px] leading-none select-none',
                'border-2 border-white shadow-lg shadow-black/20',
                'bg-brand-600 hover:bg-brand-500 transition-colors duration-150',
                // Minimum 44px tap target (hidden overlay via ::before via wrapper trick)
                'w-[22px] h-[22px]',
                // Pulse on entry
                hasEntered && !isOpen ? 'animate-demo-pulse' : '',
                // Active state
                isOpen ? 'ring-2 ring-brand-400 ring-offset-1 scale-110' : '',
                // Tap target: outer div is the hit area
              ].join(' ')}
              style={{ minWidth: 22, minHeight: 22 }}
            >
              {/* Extended tap target for mobile — invisible overlay */}
              <span
                aria-hidden
                className="absolute inset-0 -m-3 sm:-m-2"
                style={{ display: 'block' }}
              />
              {ann.number}
            </button>

            {/* Popover */}
            {isOpen && (
              <div
                data-annotation-popover
                onClick={e => e.stopPropagation()}
                className={[
                  'absolute z-40 w-64 max-w-[calc(100vw-2rem)]',
                  'bg-[var(--surface-elevated,#1e293b)] border border-[var(--border-default,#334155)]',
                  'rounded-xl shadow-2xl shadow-black/40',
                  'text-[var(--content-primary,#f1f5f9)]',
                  'sm:w-64',
                  // Full-width below 640px is handled by max-w-[...] + positioning
                ].join(' ')}
                style={popoverStyle}
                role="tooltip"
              >
                {/* Arrow */}
                <PopoverArrow side={side} />

                <div className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-1.5">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5"
                    >
                      {ann.number}
                    </span>
                    <p className="text-[13px] font-semibold leading-snug text-[var(--content-primary,#f1f5f9)]">
                      {ann.title}
                    </p>
                  </div>
                  <p className="text-[12px] leading-relaxed text-[var(--content-secondary,#94a3b8)] pl-7">
                    {ann.body}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPopoverStyle(side: NonNullable<DemoAnnotation['popoverSide']>): React.CSSProperties {
  const offset = POPOVER_OFFSET_PX + 11; // 11 = half circle radius
  switch (side) {
    case 'top':
      return { bottom: `${offset}px`, left: '50%', transform: 'translateX(-50%)' };
    case 'left':
      return { right: `${offset}px`, top: '50%', transform: 'translateY(-50%)' };
    case 'right':
      return { left: `${offset}px`, top: '50%', transform: 'translateY(-50%)' };
    case 'bottom':
    default:
      return { top: `${offset}px`, left: '50%', transform: 'translateX(-50%)' };
  }
}

function PopoverArrow({ side }: { side: NonNullable<DemoAnnotation['popoverSide']> }) {
  const base =
    'absolute w-2 h-2 bg-[var(--surface-elevated,#1e293b)] border-[var(--border-default,#334155)]';

  switch (side) {
    case 'bottom':
      return (
        <span
          aria-hidden
          className={`${base} border-t border-l rotate-45`}
          style={{ top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }}
        />
      );
    case 'top':
      return (
        <span
          aria-hidden
          className={`${base} border-b border-r rotate-45`}
          style={{ bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }}
        />
      );
    case 'left':
      return (
        <span
          aria-hidden
          className={`${base} border-t border-r rotate-45`}
          style={{ right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }}
        />
      );
    case 'right':
      return (
        <span
          aria-hidden
          className={`${base} border-b border-l rotate-45`}
          style={{ left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }}
        />
      );
  }
}
