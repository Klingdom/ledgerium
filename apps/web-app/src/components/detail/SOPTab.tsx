'use client';

/**
 * SOPTab — renders SOP artifacts using the Ledgerium design system.
 *
 * Design principles:
 * - Consulting-grade visual hierarchy
 * - Scannable in seconds
 * - Clean section separation
 * - Steps as structured cards, not text walls
 * - Category color applied with restraint (left border only)
 * - Print/export ready via ds-* classes
 */

interface Props {
  sop: any;
}

export function SOPTab({ sop }: Props) {
  if (!sop) {
    return <div className="text-ds-sm text-gray-400 py-ds-10">No SOP data available.</div>;
  }

  return (
    <div className="ds-document">
      {/* ── Document Header ────────────────────────────────────────────── */}
      <header className="ds-header">
        <div className="flex items-center gap-ds-2 mb-ds-2">
          <span className="ds-tag ds-tag-brand">SOP</span>
          {sop.version && <span className="text-ds-xs text-gray-400">v{sop.version}</span>}
        </div>
        <h1 className="ds-header-title">{sop.title}</h1>
        {sop.businessObjective && (
          <p className="mt-ds-2 text-ds-base font-medium text-brand-700">{sop.businessObjective}</p>
        )}
        <p className="ds-header-subtitle">{sop.purpose}</p>

        {/* Quick stats row */}
        <div className="mt-ds-4 flex flex-wrap gap-ds-6">
          {sop.estimatedTime && <QuickStat label="Duration" value={sop.estimatedTime} />}
          {sop.steps?.length > 0 && <QuickStat label="Steps" value={sop.steps.length} />}
          {sop.systems?.length > 0 && <QuickStat label="Systems" value={sop.systems.length} />}
          {sop.qualityIndicators && (
            <QuickStat
              label="Confidence"
              value={`${Math.round((sop.qualityIndicators.averageConfidence ?? 0) * 100)}%`}
            />
          )}
        </div>
      </header>

      {/* ── Trigger ────────────────────────────────────────────────────── */}
      {sop.trigger && (
        <div className="ds-callout ds-callout-info">
          <p className="text-ds-xs font-semibold text-brand-700 uppercase tracking-wide mb-ds-1">When to Use</p>
          <p className="text-ds-sm text-gray-700">{sop.trigger}</p>
        </div>
      )}

      {/* ── Scope & Systems ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
        {sop.scope && (
          <section className="ds-section">
            <h2 className="ds-section-label">Scope</h2>
            <p className="text-ds-sm text-gray-600 leading-relaxed">{sop.scope}</p>
          </section>
        )}
        <section className="ds-section">
          <h2 className="ds-section-label">Systems & Roles</h2>
          <div className="flex flex-wrap gap-ds-2">
            {sop.systems?.map((s: string) => (
              <span key={s} className="ds-tag ds-tag-brand">{s}</span>
            ))}
            {sop.roles?.map((r: string) => (
              <span key={r} className="ds-tag ds-tag-neutral">{r}</span>
            ))}
          </div>
        </section>
      </div>

      {/* ── Prerequisites ──────────────────────────────────────────────── */}
      {sop.prerequisites?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Prerequisites</h2>
          <ul className="space-y-ds-2">
            {sop.prerequisites.map((p: string, i: number) => (
              <li key={i} className="flex items-baseline gap-ds-2 text-ds-sm text-gray-600">
                <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Quality Bar ────────────────────────────────────────────────── */}
      {sop.qualityIndicators && <QualityBar qi={sop.qualityIndicators} />}

      {/* ── Procedure Steps ────────────────────────────────────────────── */}
      <section className="ds-section">
        <h2 className="ds-section-label">Procedure</h2>
        <div className="space-y-ds-3">
          {sop.steps?.map((step: any) => (
            <StepCard key={step.stepId ?? step.ordinal} step={step} />
          ))}
        </div>
      </section>

      {/* ── Completion Criteria ─────────────────────────────────────────── */}
      {sop.completionCriteria?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Completion Criteria</h2>
          <div className="ds-callout ds-callout-success">
            <ul className="space-y-ds-2">
              {sop.completionCriteria.map((c: string, i: number) => (
                <li key={i} className="flex items-baseline gap-ds-2 text-ds-sm text-gray-700">
                  <span className="text-green-600 font-medium flex-shrink-0">✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Common Issues ──────────────────────────────────────────────── */}
      {sop.commonIssues?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Common Issues</h2>
          <div className="space-y-ds-2">
            {sop.commonIssues.map((issue: any, i: number) => (
              <div key={i} className="ds-callout ds-callout-warning">
                <p className="text-ds-sm font-medium text-gray-800">{issue.title}</p>
                <p className="mt-ds-1 text-ds-sm text-gray-600">{issue.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Friction Points ────────────────────────────────────────────── */}
      {sop.frictionSummary?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Observed Friction</h2>
          <div className="space-y-ds-2">
            {sop.frictionSummary.map((f: any, i: number) => (
              <FrictionItem key={i} friction={f} />
            ))}
          </div>
        </section>
      )}

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      {sop.notes?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Notes</h2>
          <ul className="space-y-ds-2">
            {sop.notes.map((n: string, i: number) => (
              <li key={i} className="text-ds-sm text-gray-500 leading-relaxed">{n}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Attribution ────────────────────────────────────────────────── */}
      <footer className="ds-attribution">
        Generated from observed workflow behavior · Evidence-linked · No AI inference applied
      </footer>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ds-metric">
      <p className="ds-metric-label">{label}</p>
      <p className="ds-metric-value">{value}</p>
    </div>
  );
}

function QualityBar({ qi }: { qi: any }) {
  const pct = Math.round((qi.averageConfidence ?? 0) * 100);
  const barClass = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="flex items-center justify-between mb-ds-3">
        <span className="ds-section-label">Quality Indicators</span>
        <span className="text-ds-sm font-semibold text-gray-700">{pct}% confidence</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-ds-3 grid grid-cols-4 gap-ds-4">
        <MiniStat label="Systems" value={qi.systemCount ?? 0} />
        <MiniStat label="Low Confidence" value={qi.lowConfidenceStepCount ?? 0} />
        <MiniStat label="Errors" value={qi.errorStepCount ?? 0} />
        <MiniStat label="Friction" value={qi.frictionCount ?? 0} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-ds-xs text-gray-400">{label}</p>
      <p className="text-ds-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

/* ── Category styling — single canonical definition ──────────────────────── */

const STEP_BORDER: Record<string, string> = {
  click_then_navigate:  'border-l-teal-500',
  fill_and_submit:      'border-l-blue-500',
  repeated_click_dedup: 'border-l-orange-500',
  single_action:        'border-l-gray-400',
  data_entry:           'border-l-violet-500',
  send_action:          'border-l-emerald-500',
  file_action:          'border-l-amber-500',
  error_handling:       'border-l-red-500',
  annotation:           'border-l-purple-500',
};

const CATEGORY_LABEL: Record<string, string> = {
  click_then_navigate: 'Navigation',
  fill_and_submit: 'Form Submit',
  repeated_click_dedup: 'Repeated Action',
  single_action: 'Action',
  data_entry: 'Data Entry',
  send_action: 'Submit',
  file_action: 'File',
  error_handling: 'Error',
  annotation: 'Note',
};

function StepCard({ step }: { step: any }) {
  const border = STEP_BORDER[step.category] ?? 'border-l-gray-300';
  const label = CATEGORY_LABEL[step.category] ?? 'Step';

  return (
    <div className={`ds-step border-l-[3px] ${border}`}>
      {/* Step header */}
      <div className="ds-step-header">
        <span className="ds-step-ordinal">{step.ordinal}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-ds-2 flex-wrap">
            <h3 className="ds-step-title">{step.title}</h3>
            <span className="ds-tag ds-tag-neutral text-[11px]">{label}</span>
            {step.isDecisionPoint && (
              <span className="ds-tag bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">Decision</span>
            )}
          </div>
          <p className="mt-ds-1 text-ds-sm text-gray-600">{step.action}</p>
        </div>
      </div>

      {/* Instructions detail */}
      {step.detail && step.detail !== 'System-initiated step — no operator action required.' && (
        <div className="ds-step-body">
          <div className="rounded-ds-md bg-gray-50 px-ds-4 py-ds-3 space-y-ds-1">
            {step.detail.split('\n').filter(Boolean).map((line: string, i: number) => {
              const isVerify = line.startsWith('\u2713');
              const isNote = line.startsWith('\u2192');
              return (
                <p key={i} className={`text-ds-sm leading-relaxed ${
                  isVerify ? 'text-emerald-700 font-medium' :
                  isNote ? 'text-gray-500 italic' :
                  'text-gray-700'
                }`}>
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision callout */}
      {step.decisionLabel && (
        <div className="mx-ds-5 mb-ds-3">
          <div className="ds-callout ds-callout-warning">
            <p className="text-ds-sm font-medium text-amber-800">
              <span className="font-semibold">Decision:</span> {step.decisionLabel}
            </p>
          </div>
        </div>
      )}

      {/* Friction */}
      {step.frictionIndicators?.length > 0 && (
        <div className="mx-ds-5 mb-ds-3 space-y-ds-1">
          {step.frictionIndicators.map((f: any, i: number) => (
            <FrictionItem key={i} friction={f} compact />
          ))}
        </div>
      )}

      {/* Step footer */}
      <div className="ds-step-footer">
        {step.system && <span>{step.system}</span>}
        {step.durationLabel && <span>{step.durationLabel}</span>}
        {step.confidence !== undefined && <ConfidenceDot value={step.confidence} />}
        {step.expectedOutcome && (
          <span className="ml-auto text-gray-500 truncate max-w-[240px]" title={step.expectedOutcome}>
            → {step.expectedOutcome}
          </span>
        )}
      </div>

      {/* Warnings */}
      {step.warnings?.length > 0 && (
        <div className="border-t border-amber-100 bg-amber-50/40 px-ds-5 py-ds-2">
          {step.warnings.map((w: string, i: number) => (
            <p key={i} className="text-ds-xs text-amber-700 font-medium">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const dotClass = pct >= 85 ? 'ds-confidence-high' : pct >= 70 ? 'ds-confidence-mid' : 'ds-confidence-low';
  return (
    <span className="inline-flex items-center gap-ds-1">
      <span className={dotClass} />
      <span>{pct}%</span>
    </span>
  );
}

function FrictionItem({ friction, compact }: { friction: any; compact?: boolean }) {
  const styles: Record<string, string> = {
    high: 'ds-callout ds-callout-danger',
    medium: 'ds-callout ds-callout-warning',
    low: 'rounded-ds-md bg-gray-50 px-ds-4 py-ds-2',
  };
  const cls = styles[friction.severity] ?? styles.low;
  return (
    <div className={cls}>
      <p className={compact ? 'text-ds-xs text-gray-600' : 'text-ds-sm text-gray-700'}>
        <span className="font-semibold uppercase text-ds-xs">{friction.severity}</span>
        <span className="mx-1.5 text-gray-300">·</span>
        {friction.label}
      </p>
    </div>
  );
}
