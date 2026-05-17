'use client';

/**
 * LoadingSkeleton — animated placeholder for admin operations sections.
 *
 * Matches final layout so page does not shift on data arrival (UX §9).
 * No "Loading..." text — animated pulse only.
 *
 * @iter 072
 */

interface LoadingSkeletonProps {
  variant?: 'tile' | 'chart' | 'list' | 'gauge';
  rows?: number;
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--surface-elevated)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function LoadingSkeleton({ variant = 'list', rows = 5 }: LoadingSkeletonProps) {
  if (variant === 'tile') {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonBlock className="h-3 w-12" />
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    );
  }

  if (variant === 'gauge') {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-6 w-full" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
    );
  }

  // default: list
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <SkeletonBlock className="h-3 flex-1" />
          <SkeletonBlock className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
