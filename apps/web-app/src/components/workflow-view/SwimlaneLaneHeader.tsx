'use client';

import { memo } from 'react';
import type { SwimlaneLane } from './adapters/swimlaneAdapter';

interface SwimlaneLaneHeaderProps {
  lane: SwimlaneLane;
}

const LANE_HEADER_WIDTH = 200;

export const SwimlaneLaneHeader = memo(function SwimlaneLaneHeader({
  lane,
}: SwimlaneLaneHeaderProps) {
  const { color, label, stepCount, durationLabel, bounds } = lane;

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        width: LANE_HEADER_WIDTH,
        height: bounds.height,
        background: `${color}0a`, // ~4% opacity
        borderLeft: `3px solid ${color}66`, // ~40% opacity
        borderRadius: '8px 0 0 8px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 12,
        boxSizing: 'border-box',
      }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-xs font-semibold truncate leading-tight"
          style={{ color: 'var(--content-primary)' }}
          title={label}
        >
          {label}
        </span>
        <span
          className="text-[10px] leading-tight"
          style={{ color: 'var(--content-tertiary)' }}
        >
          {stepCount} step{stepCount !== 1 ? 's' : ''}
        </span>
        {durationLabel && (
          <span
            className="text-[10px] leading-tight"
            style={{ color: 'var(--content-tertiary)' }}
          >
            {durationLabel}
          </span>
        )}
      </div>
    </div>
  );
});
