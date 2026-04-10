'use client';

import { formatDuration } from '@/lib/format';

/**
 * ReportTab — workflow report rendering using the Ledgerium design system.
 *
 * Layout: Header → Key Metrics → Observations → Steps → SOP Summary → Attribution
 */

interface Props {
  report: any;
}

export function ReportTab({ report }: Props) {
  if (!report) {
    return <div className="text-ds-sm text-gray-400 py-ds-10">No report data available.</div>;
  }

  const { header, executiveSummary, workflowOverview, metrics, sop } = report;

  return (
    <div className="ds-document">
      {/* ── Document Header ────────────────────────────────────────────── */}
      <header className="ds-header">
        <div className="flex items-center gap-ds-2 mb-ds-2">
          <span className="ds-tag ds-tag-brand">Report</span>
          {(header?.engineVersion ?? header?.schemaVersion) && (
            <span className="text-ds-xs text-gray-400">Engine {header.engineVersion ?? header.schemaVersion}</span>
          )}
        </div>
        <h1 className="ds-header-title">{executiveSummary?.title ?? header?.activityName}</h1>
        {executiveSummary?.objective && (
          <p className="ds-header-subtitle">{executiveSummary.objective}</p>
        )}
        <div className="mt-ds-4 flex flex-wrap gap-ds-6">
          <QuickStat label="Duration" value={header?.durationLabel ?? '—'} />
          <QuickStat label="Generated" value={header?.generatedAt ? new Date(header.generatedAt).toLocaleDateString() : '—'} />
        </div>
      </header>

      {/* ── Key Metrics ────────────────────────────────────────────────── */}
      <section className="ds-section">
        <h2 className="ds-section-label">Key Metrics</h2>
        <div className="card px-ds-5 py-ds-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-6">
            <div className="ds-metric">
              <p className="ds-metric-label">Steps</p>
              <p className="ds-metric-value">{executiveSummary?.totalSteps ?? metrics?.stepCount ?? '—'}</p>
            </div>
            <div className="ds-metric">
              <p className="ds-metric-label">Phases</p>
              <p className="ds-metric-value">{executiveSummary?.totalPhases ?? metrics?.phaseCount ?? '—'}</p>
            </div>
            <div className="ds-metric">
              <p className="ds-metric-label">Confidence</p>
              <p className="ds-metric-value">
                {executiveSummary?.workflowConfidence
                  ? `${Math.round(executiveSummary.workflowConfidence * 100)}%`
                  : '—'}
              </p>
            </div>
            <div className="ds-metric">
              <p className="ds-metric-label">Duration</p>
              <p className="ds-metric-value">{metrics?.totalDurationLabel ?? formatDuration(metrics?.totalDurationMs) ?? '—'}</p>
            </div>
          </div>

          {/* Systems tags */}
          {executiveSummary?.applicationsUsed?.length > 0 && (
            <div className="mt-ds-4 pt-ds-3 border-t border-gray-100">
              <p className="ds-metric-label mb-ds-2">Systems</p>
              <div className="flex flex-wrap gap-ds-2">
                {executiveSummary.applicationsUsed.map((app: string) => (
                  <span key={app} className="ds-tag ds-tag-brand">{app}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Quality Advisory ──────────────────────────────────────────── */}
      {report.qualityAdvisory && (
        <div className="flex items-start gap-ds-2 rounded-ds-sm bg-amber-50 border border-amber-200 px-ds-4 py-ds-3">
          <svg className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          <p className="text-ds-xs text-amber-800">{report.qualityAdvisory}</p>
        </div>
      )}

      {/* ── Key Observations ───────────────────────────────────────────── */}
      {executiveSummary?.keyObservations?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Key Observations</h2>
          <div className="space-y-ds-2">
            {executiveSummary.keyObservations.map((obs: string, i: number) => (
              <div key={i} className="flex items-baseline gap-ds-2 text-ds-sm text-gray-700">
                <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                {obs}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Detailed Metrics ───────────────────────────────────────────── */}
      {metrics && (
        <section className="ds-section">
          <h2 className="ds-section-label">Activity Breakdown</h2>
          <div className="card px-ds-5 py-ds-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-ds-6">
              <div className="ds-metric">
                <p className="ds-metric-label">Active Time</p>
                <p className="ds-metric-value">{formatDuration(metrics.activeDurationMs)}</p>
              </div>
              <div className="ds-metric">
                <p className="ds-metric-label">Idle Time</p>
                <p className="ds-metric-value">{formatDuration(metrics.idleDurationMs)}</p>
              </div>
              <div className="ds-metric">
                <p className="ds-metric-label">Events</p>
                <p className="ds-metric-value">{metrics.eventCount ?? metrics.humanEventCount ?? '—'}</p>
              </div>
              <div className="ds-metric">
                <p className="ds-metric-label">Clicks</p>
                <p className="ds-metric-value">{metrics.clickCount ?? 0}</p>
              </div>
              <div className="ds-metric">
                <p className="ds-metric-label">Data Entries</p>
                <p className="ds-metric-value">{metrics.inputCount ?? 0}</p>
              </div>
              <div className="ds-metric">
                <p className="ds-metric-label">Error Steps</p>
                <p className="ds-metric-value">{metrics.errorStepCount ?? 0}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Workflow Steps ─────────────────────────────────────────────── */}
      {workflowOverview?.steps?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Workflow Steps</h2>
          <div className="card overflow-hidden divide-y divide-gray-100">
            {workflowOverview.steps.map((step: any) => (
              <div key={step.stepId ?? step.ordinal} className="flex items-center gap-ds-3 px-ds-5 py-ds-3 hover:bg-gray-50/50 transition-colors">
                <span className="ds-step-ordinal text-[11px]">{step.ordinal}</span>
                <span className="text-ds-sm text-gray-800 flex-1 min-w-0 truncate">{step.title}</span>
                <span className="ds-tag ds-tag-neutral text-[11px] flex-shrink-0">
                  {step.categoryLabel ?? step.category?.replace(/_/g, ' ')}
                </span>
                <span className="text-ds-xs text-gray-400 flex-shrink-0 w-12 text-right tabular-nums">
                  {step.durationLabel}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SOP Summary ────────────────────────────────────────────────── */}
      {sop?.steps?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Procedure Summary</h2>
          <div className="card px-ds-5 py-ds-4 space-y-ds-3">
            {sop.overview && <p className="text-ds-sm text-gray-600">{sop.overview}</p>}
            <div className="space-y-ds-2">
              {sop.steps.map((step: any) => (
                <div key={step.ordinal} className="flex gap-ds-2 text-ds-sm">
                  <span className="text-brand-600 font-semibold flex-shrink-0 tabular-nums w-5 text-right">
                    {step.ordinal}.
                  </span>
                  <span className="text-gray-700">{step.action ?? step.text ?? step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Attribution ────────────────────────────────────────────────── */}
      <footer className="ds-attribution">
        Generated from observed workflow behavior · Evidence-backed · No AI inference applied
      </footer>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ds-metric">
      <p className="ds-metric-label">{label}</p>
      <p className="ds-metric-value">{value}</p>
    </div>
  );
}
