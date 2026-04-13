'use client';

import { useEffect, useState } from 'react';

export interface ProcessHealthScoreBarProps {
  label: string;
  score: number; // 0–100
  interpretation: string;
  colorScheme: 'standard' | 'inverted' | 'neutral';
  animate?: boolean;
}

function resolveColors(
  score: number,
  colorScheme: 'standard' | 'inverted' | 'neutral',
): { text: string; bar: string } {
  if (colorScheme === 'neutral') {
    return { text: 'text-gray-700', bar: 'bg-gray-400' };
  }
  if (colorScheme === 'inverted') {
    // High score = good (linearity)
    if (score > 60) return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
    if (score >= 30) return { text: 'text-amber-600', bar: 'bg-amber-500' };
    return { text: 'text-red-600', bar: 'bg-red-500' };
  }
  // Standard: low score = good (complexity, friction)
  if (score < 40) return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
  if (score <= 70) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-red-600', bar: 'bg-red-500' };
}

/**
 * ProcessHealthScoreBar — single score card used in the Process Intelligence section.
 *
 * Renders a large score number, a 6px animated progress bar, and an
 * interpretation label. Color scheme is controlled by the caller.
 */
export function ProcessHealthScoreBar({
  label,
  score,
  interpretation,
  colorScheme,
  animate = true,
}: ProcessHealthScoreBarProps) {
  const { text, bar } = resolveColors(score, colorScheme);
  const clamped = Math.min(Math.max(score, 0), 100);

  // Animate bar width after mount
  const [width, setWidth] = useState(animate ? 0 : clamped);
  useEffect(() => {
    if (!animate) return;
    const id = setTimeout(() => setWidth(clamped), 50);
    return () => clearTimeout(id);
  }, [animate, clamped]);

  return (
    <div className="bg-white border border-gray-100 rounded-ds-lg px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </p>
      <p className={`text-[32px] font-bold tabular-nums leading-none mb-3 ${text}`}>
        {clamped}
      </p>
      {/* 6px progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${bar}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-ds-xs text-gray-500">{interpretation}</p>
    </div>
  );
}
