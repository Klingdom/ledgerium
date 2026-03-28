'use client';

import { formatDuration } from '@/lib/format';

interface Props {
  report: any;
}

export function ReportTab({ report }: Props) {
  if (!report) {
    return <div className="text-sm text-gray-400">No report data available.</div>;
  }

  const { header, executiveSummary, workflowOverview, metrics, sop } = report;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Report header */}
      <div className="card p-6 border-l-4 border-l-brand-500">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Workflow Report</p>
        <h2 className="text-xl font-bold text-gray-900">
          {executiveSummary?.title ?? header?.activityName}
        </h2>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Duration: <strong>{header?.durationLabel}</strong></span>
          <span>Generated: <strong>{header?.generatedAt ? new Date(header.generatedAt).toLocaleDateString() : '—'}</strong></span>
          <span>Engine: <strong>{header?.engineVersion ?? header?.schemaVersion}</strong></span>
        </div>
      </div>

      {/* Executive summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Executive Summary</h3>
        <div className="card p-5 space-y-3">
          {executiveSummary?.objective && (
            <p className="text-sm text-gray-700">{executiveSummary.objective}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniMetric label="Steps" value={executiveSummary?.totalSteps ?? metrics?.stepCount} />
            <MiniMetric label="Phases" value={executiveSummary?.totalPhases ?? metrics?.phaseCount} />
            <MiniMetric
              label="Confidence"
              value={executiveSummary?.workflowConfidence
                ? `${Math.round(executiveSummary.workflowConfidence * 100)}%`
                : '—'}
            />
            <MiniMetric
              label="Apps"
              value={executiveSummary?.applicationsUsed?.length ?? metrics?.systemsUsed?.length ?? 0}
            />
          </div>

          {executiveSummary?.applicationsUsed?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {executiveSummary.applicationsUsed.map((app: string) => (
                <span key={app} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {app}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Metrics */}
      {metrics && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Metrics</h3>
          <div className="card p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MiniMetric label="Total Duration" value={metrics.totalDurationLabel ?? formatDuration(metrics.totalDurationMs)} />
              <MiniMetric label="Steps" value={metrics.stepCount} />
              <MiniMetric label="Events" value={metrics.eventCount ?? metrics.humanEventCount} />
              <MiniMetric label="Phases" value={metrics.phaseCount} />
              <MiniMetric label="Error Steps" value={metrics.errorStepCount ?? 0} />
              <MiniMetric label="Status" value={metrics.completionStatus ?? 'complete'} />
            </div>
          </div>
        </section>
      )}

      {/* Workflow overview */}
      {workflowOverview?.steps?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Workflow Overview</h3>
          <div className="card divide-y divide-gray-100">
            {workflowOverview.steps.map((step: any) => (
              <div key={step.stepId ?? step.ordinal} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600">
                  {step.ordinal}
                </span>
                <span className="text-sm text-gray-800 flex-1">{step.title}</span>
                <span className="text-xs text-gray-400">
                  {step.categoryLabel ?? step.category}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SOP summary */}
      {sop?.steps?.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Standard Operating Procedure</h3>
          <div className="card p-5 space-y-3">
            <p className="text-sm text-gray-600">{sop.purpose ?? sop.overview}</p>
            <div className="space-y-2">
              {sop.steps.map((step: any) => (
                <div key={step.ordinal} className="flex gap-2 text-sm">
                  <span className="text-brand-600 font-medium flex-shrink-0">{step.ordinal}.</span>
                  <span className="text-gray-700">{step.action ?? step.text ?? step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-400">
        This report was generated deterministically from a recorded browser session.
        All content is evidence-backed — no AI inference was applied.
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
