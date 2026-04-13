'use client';

export interface AutomationScoreChipProps {
  score: number; // 0–100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_CONFIG = {
  sm: { px: 32, stroke: 3, fontSize: 9, label: 'text-[9px]' },
  md: { px: 48, stroke: 4, fontSize: 12, label: 'text-[11px]' },
  lg: { px: 64, stroke: 5, fontSize: 16, label: 'text-ds-xs' },
};

/**
 * AutomationScoreChip — circular SVG gauge showing an automation opportunity score.
 *
 * Renders a filled arc (violet-500 stroke) over a gray background circle.
 * The score number is centered in the gauge.
 *
 * @param score      0–100 value
 * @param size       'sm' | 'md' | 'lg' — controls pixel size
 * @param showLabel  Whether to show a "Score" label below
 */
export function AutomationScoreChip({
  score,
  size = 'md',
  showLabel = false,
}: AutomationScoreChipProps) {
  const config = SIZE_CONFIG[size];
  const clamped = Math.min(Math.max(score, 0), 100);

  const cx = config.px / 2;
  const cy = config.px / 2;
  const radius = (config.px - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  // Start arc at top (-90deg)
  const rotation = -90;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg
        width={config.px}
        height={config.px}
        viewBox={`0 0 ${config.px} ${config.px}`}
        aria-label={`Automation score: ${clamped}`}
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#f3f4f6" /* gray-100 */
          strokeWidth={config.stroke}
        />
        {/* Filled arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#8b5cf6" /* violet-500 */
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
        {/* Score label centered */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={config.fontSize}
          fontWeight="700"
          fill="#6d28d9" /* violet-700 */
          fontFamily="inherit"
        >
          {clamped}
        </text>
      </svg>
      {showLabel && (
        <span className={`${config.label} text-gray-400 font-medium`}>Score</span>
      )}
    </div>
  );
}
