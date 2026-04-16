'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue?: (v: number) => string;
  onChange: (v: number) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: SliderInputProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--content-secondary)]">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-brand-400 min-w-[4rem] text-right">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-[var(--surface-elevated)]
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-brand-400
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-brand-400
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
        style={{
          // Paint the filled track with the brand color using a gradient trick
          background: `linear-gradient(to right, #34d399 0%, #34d399 ${
            ((value - min) / (max - min)) * 100
          }%, var(--surface-elevated) ${
            ((value - min) / (max - min)) * 100
          }%, var(--surface-elevated) 100%)`,
        }}
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-[var(--content-tertiary)]">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

function ResultCard({ label, value, sub, highlight }: ResultCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-1 ${
        highlight
          ? 'border-brand-700/60 bg-brand-900/20'
          : 'border-[var(--border-default)] bg-[var(--surface-elevated)]'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--content-tertiary)]">
        {label}
      </span>
      <span
        className={`text-2xl sm:text-3xl font-bold tabular-nums ${
          highlight ? 'text-brand-400' : 'text-[var(--content-primary)]'
        }`}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs text-[var(--content-tertiary)]">{sub}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatUSD(n: number): string {
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `$${Math.round(n).toLocaleString('en-US')}`;
  }
  return `$${Math.round(n)}`;
}

function formatHours(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} hrs/yr`;
}

// ---------------------------------------------------------------------------
// ROI Calculations
// The Team plan cost is fixed at $249/mo * 12 = $2,988/yr.
// Each SOP is updated twice per year (as specified).
// Ledgerium reduces capture time to 0.1 h per SOP per update.
// ---------------------------------------------------------------------------

const TEAM_PLAN_ANNUAL = 249 * 12; // $2,988
const LEDGERIUM_HOURS_PER_SOP = 0.1;
const UPDATES_PER_YEAR = 2;

interface ROIResult {
  manualCost: number;
  ledgeriumCost: number;
  annualSavings: number;
  timeSaved: number;
  roi: number;
}

function calculateROI(sops: number, hoursPerSop: number, rate: number): ROIResult {
  const manualCost = sops * hoursPerSop * rate * UPDATES_PER_YEAR;
  const ledgeriumCost =
    sops * LEDGERIUM_HOURS_PER_SOP * rate * UPDATES_PER_YEAR + TEAM_PLAN_ANNUAL;
  const annualSavings = Math.max(0, manualCost - ledgeriumCost);
  const timeSaved = sops * (hoursPerSop - LEDGERIUM_HOURS_PER_SOP) * UPDATES_PER_YEAR;
  // ROI = savings / Ledgerium total cost, expressed as X:1
  const roi = ledgeriumCost > 0 ? annualSavings / ledgeriumCost : 0;

  return { manualCost, ledgeriumCost, annualSavings, timeSaved, roi };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ROICalculator() {
  const [sops, setSops] = useState(20);
  const [hoursPerSop, setHoursPerSop] = useState(8);
  const [rate, setRate] = useState(75);

  const { annualSavings, timeSaved, roi } = calculateROI(sops, hoursPerSop, rate);

  const roiLabel =
    roi >= 1
      ? `${roi.toFixed(1)}:1 return`
      : roi > 0
      ? `${(roi * 100).toFixed(0)}% of cost`
      : 'Break-even';

  return (
    <section className="py-20 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--content-primary)]">
            Calculate your ROI
          </h2>
          <p className="mt-3 text-base text-[var(--content-secondary)] max-w-xl mx-auto">
            See how much time and money Ledgerium saves compared to manual documentation.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6 sm:p-8 space-y-10">
          {/* Sliders */}
          <div className="space-y-8">
            <SliderInput
              label="Number of SOPs your team maintains"
              value={sops}
              min={5}
              max={100}
              step={5}
              onChange={setSops}
            />
            <SliderInput
              label="Hours to create/update one SOP manually"
              value={hoursPerSop}
              min={2}
              max={40}
              step={2}
              formatValue={(v) => `${v} hrs`}
              onChange={setHoursPerSop}
            />
            <SliderInput
              label="Average hourly cost (loaded)"
              value={rate}
              min={25}
              max={200}
              step={5}
              formatValue={(v) => `$${v}/hr`}
              onChange={setRate}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border-default)]" />

          {/* Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ResultCard
              label="Annual savings"
              value={formatUSD(annualSavings)}
              sub="vs. fully manual process"
              highlight
            />
            <ResultCard
              label="Time saved"
              value={formatHours(timeSaved)}
              sub="across all SOPs"
            />
            <ResultCard
              label="ROI"
              value={roiLabel}
              sub="savings / Ledgerium cost"
            />
          </div>

          {/* Assumptions footnote */}
          <p className="text-xs text-[var(--content-tertiary)] text-center leading-relaxed">
            Based on Team plan ($249/mo). Assumes 2 update cycles per SOP per year and 0.1 hr capture time per SOP with Ledgerium.
          </p>
        </div>
      </div>
    </section>
  );
}
