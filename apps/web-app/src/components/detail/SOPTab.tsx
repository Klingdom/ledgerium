'use client';

interface Props {
  sop: any;
}

export function SOPTab({ sop }: Props) {
  if (!sop) {
    return <div className="text-sm text-gray-400">No SOP data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">{sop.title}</h2>
        <p className="mt-2 text-sm text-gray-600">{sop.purpose}</p>

        {sop.scope && (
          <p className="mt-2 text-sm text-gray-500">
            <strong className="text-gray-700">Scope:</strong> {sop.scope}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          {sop.estimatedTime && (
            <span>Estimated time: <strong className="text-gray-700">{sop.estimatedTime}</strong></span>
          )}
          {sop.systems?.length > 0 && (
            <span>Systems: <strong className="text-gray-700">{sop.systems.join(', ')}</strong></span>
          )}
        </div>
      </div>

      {/* Prerequisites */}
      {sop.prerequisites?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Prerequisites
          </h3>
          <ul className="space-y-1">
            {sop.prerequisites.map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Procedure Steps
        </h3>
        <div className="space-y-3">
          {sop.steps?.map((step: any) => (
            <div key={step.stepId ?? step.ordinal} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {step.ordinal}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="mt-1 text-sm text-gray-700">{step.action}</p>

                  {step.detail && (
                    <div className="mt-2 rounded-md bg-gray-50 p-3">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                        {step.detail}
                      </pre>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                    {step.system && <span>System: {step.system}</span>}
                    {step.durationLabel && <span>{step.durationLabel}</span>}
                    {step.confidence !== undefined && (
                      <span>{Math.round(step.confidence * 100)}% confidence</span>
                    )}
                  </div>

                  {step.expectedOutcome && (
                    <p className="mt-1 text-xs text-gray-500">
                      <strong>Expected outcome:</strong> {step.expectedOutcome}
                    </p>
                  )}

                  {step.warnings?.length > 0 && (
                    <div className="mt-2">
                      {step.warnings.map((w: string, i: number) => (
                        <p key={i} className="text-xs text-amber-600">&#9888; {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion criteria */}
      {sop.completionCriteria?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Completion Criteria
          </h3>
          <ul className="space-y-1">
            {sop.completionCriteria.map((c: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {sop.notes?.length > 0 && (
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
          <ul className="space-y-1">
            {sop.notes.map((n: string, i: number) => (
              <li key={i} className="text-xs text-gray-500">{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
