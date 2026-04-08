'use client';

import { useState } from 'react';
import { Download, Sparkles } from 'lucide-react';

/**
 * SOPTab — renders SOP artifacts using the Ledgerium design system.
 * Supports 3 template formats: Operator-Centric, Enterprise, Decision-Based.
 */

const SOP_TEMPLATE_LABELS: Record<string, string> = {
  operator_centric: 'Operator',
  enterprise: 'Enterprise',
  decision_based: 'Decision',
};

interface Props {
  sop: any;
  templateArtifacts?: {
    operator_centric?: any;
    enterprise?: any;
    decision_based?: any;
  };
  defaultTemplate?: string;
  workflowId?: string;
}

export function SOPTab({ sop, templateArtifacts, defaultTemplate, workflowId }: Props) {
  const hasTemplates = templateArtifacts && Object.values(templateArtifacts).some(Boolean);
  const [selectedFormat, setSelectedFormat] = useState<string>(defaultTemplate ?? 'operator_centric');
  const [showRaw, setShowRaw] = useState(!hasTemplates);

  if (!sop && !hasTemplates) {
    return <div className="text-ds-sm text-gray-400 py-ds-10">No SOP data available.</div>;
  }

  function handleExportMarkdown() {
    if (!workflowId) return;
    window.open(`/api/workflows/${workflowId}/export-markdown?artifactType=template_sop_${selectedFormat}`, '_blank');
  }

  return (
    <div className="ds-document">
      {/* Format Switcher */}
      {hasTemplates && (
        <div className="flex items-center justify-between mb-ds-4 no-print">
          <div className="flex items-center gap-ds-2">
            <span className="text-ds-xs text-gray-400 font-medium uppercase tracking-wide">Format</span>
            <div className="flex rounded-ds-md border border-gray-200 overflow-hidden">
              {Object.entries(SOP_TEMPLATE_LABELS).map(([key, label]) => {
                const isAvailable = templateArtifacts?.[key as keyof typeof templateArtifacts];
                const isSelected = !showRaw && selectedFormat === key;
                const isDefault = key === defaultTemplate;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedFormat(key); setShowRaw(false); }}
                    disabled={!isAvailable}
                    className={`px-ds-3 py-ds-1 text-ds-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-50 text-brand-700 border-r border-gray-200'
                        : 'text-gray-500 hover:bg-gray-50 border-r border-gray-200'
                    } ${!isAvailable ? 'opacity-30 cursor-not-allowed' : ''} last:border-r-0`}
                  >
                    {label}
                    {isDefault && <Sparkles className="inline h-3 w-3 ml-1 text-amber-500" />}
                  </button>
                );
              })}
              <button
                onClick={() => setShowRaw(true)}
                className={`px-ds-3 py-ds-1 text-ds-xs font-medium transition-colors ${
                  showRaw ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Raw
              </button>
            </div>
          </div>
          {!showRaw && workflowId && (
            <button onClick={handleExportMarkdown} className="btn-secondary gap-1 text-xs">
              <Download className="h-3.5 w-3.5" /> Markdown
            </button>
          )}
        </div>
      )}

      {/* Template View */}
      {hasTemplates && !showRaw && templateArtifacts?.[selectedFormat as keyof typeof templateArtifacts] ? (
        <TemplateSOPView
          data={templateArtifacts[selectedFormat as keyof typeof templateArtifacts]}
          templateType={selectedFormat}
        />
      ) : (
        /* Raw View (original) */
        <RawSOPView sop={sop} />
      )}
    </div>
  );
}

// ─── Template dispatcher ────────────────────────────────────────────────────

function TemplateSOPView({ data, templateType }: { data: any; templateType: string }) {
  switch (templateType) {
    case 'operator_centric': return <OperatorSOPView data={data} />;
    case 'enterprise': return <EnterpriseSOPView data={data} />;
    case 'decision_based': return <DecisionSOPView data={data} />;
    default: return <div className="text-ds-sm text-gray-400">Unknown template type.</div>;
  }
}

// ─── Operator-Centric SOP ───────────────────────────────────────────────────

function OperatorSOPView({ data }: { data: any }) {
  return (
    <>
      <header className="ds-header">
        <span className="ds-tag ds-tag-brand mb-ds-2">Operator SOP</span>
        <h1 className="ds-header-title">{data.taskTitle}</h1>
        <p className="ds-header-subtitle">{data.whatThisIsFor}</p>
        <div className="mt-ds-4 flex flex-wrap gap-ds-6">
          <QuickStat label="Steps" value={data.steps?.length ?? 0} />
          <QuickStat label="Systems" value={data.systemsNeeded?.length ?? 0} />
        </div>
      </header>

      {data.whenToUseIt && (
        <div className="ds-callout ds-callout-info">
          <p className="text-ds-xs font-semibold text-brand-700 uppercase tracking-wide mb-ds-1">When to Use</p>
          <p className="text-ds-sm text-gray-700">{data.whenToUseIt}</p>
        </div>
      )}

      {data.beforeYouBegin?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Before You Begin</h2>
          <ul className="space-y-ds-1">
            {data.beforeYouBegin.map((item: string, i: number) => (
              <li key={i} className="flex items-baseline gap-ds-2 text-ds-sm text-gray-600">
                <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ds-section">
        <h2 className="ds-section-label">Procedure</h2>
        <div className="space-y-ds-3">
          {(data.steps ?? []).map((step: any) => (
            <div key={step.number} className="ds-step border-l-[3px] border-l-brand-400">
              <div className="ds-step-header">
                <span className="ds-step-ordinal">{step.number}</span>
                <div className="flex-1 min-w-0">
                  <p className="ds-step-title">{step.action}</p>
                  <p className="mt-ds-1 text-ds-sm text-gray-600">{step.detail}</p>
                </div>
              </div>
              <div className="ds-step-footer">
                {step.system && <span>{step.system}</span>}
                {step.expectedResult && <span className="ml-auto text-gray-500">&rarr; {step.expectedResult}</span>}
              </div>
              {step.caution && (
                <div className="border-t border-amber-100 bg-amber-50/40 px-ds-5 py-ds-2">
                  <p className="text-ds-xs text-amber-700 font-medium">&#9888; {step.caution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {data.commonMistakes?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Common Mistakes</h2>
          <div className="space-y-ds-1">
            {data.commonMistakes.map((m: string, i: number) => (
              <div key={i} className="ds-callout ds-callout-warning">
                <p className="text-ds-sm text-gray-700">{m}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.tips?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Tips</h2>
          <ul className="space-y-ds-1">
            {data.tips.map((t: string, i: number) => (
              <li key={i} className="text-ds-sm text-gray-600">&bull; {t}</li>
            ))}
          </ul>
        </section>
      )}

      {data.completionCheck?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Completion Checklist</h2>
          <div className="ds-callout ds-callout-success">
            <ul className="space-y-ds-1">
              {data.completionCheck.map((c: string, i: number) => (
                <li key={i} className="flex items-baseline gap-ds-2 text-ds-sm text-gray-700">
                  <span className="text-green-600 font-medium flex-shrink-0">&#10003;</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <footer className="ds-attribution">{data.sourceNote ?? 'Generated from observed workflow behavior'}</footer>
    </>
  );
}

// ─── Enterprise SOP ─────────────────────────────────────────────────────────

function EnterpriseSOPView({ data }: { data: any }) {
  return (
    <>
      <header className="ds-header">
        <div className="flex items-center gap-ds-2 mb-ds-2">
          <span className="ds-tag ds-tag-brand">Enterprise SOP</span>
          {data.sopId && <span className="text-ds-xs text-gray-400">{data.sopId}</span>}
          {data.version && <span className="text-ds-xs text-gray-400">v{data.version}</span>}
        </div>
        <h1 className="ds-header-title">{data.title}</h1>
        <p className="ds-header-subtitle">{data.purpose}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
        {data.scope && (
          <section className="ds-section"><h2 className="ds-section-label">Scope</h2><p className="text-ds-sm text-gray-600">{data.scope}</p></section>
        )}
        {data.trigger && (
          <section className="ds-section"><h2 className="ds-section-label">Trigger</h2><p className="text-ds-sm text-gray-600">{data.trigger}</p></section>
        )}
      </div>

      {data.rolesAndResponsibilities?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Roles & Responsibilities</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-ds-sm">
              <thead><tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left py-ds-2 px-ds-4 text-gray-500 font-medium">Role</th>
                <th className="text-left py-ds-2 px-ds-4 text-gray-500 font-medium">Responsibility</th>
              </tr></thead>
              <tbody>
                {data.rolesAndResponsibilities.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-ds-2 px-ds-4 font-medium text-gray-800">{r.role}</td>
                    <td className="py-ds-2 px-ds-4 text-gray-600">{r.responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="ds-section">
        <h2 className="ds-section-label">Procedure</h2>
        <div className="space-y-ds-3">
          {(data.procedure ?? []).map((step: any) => (
            <div key={step.ordinal} className="ds-step border-l-[3px] border-l-brand-400">
              <div className="ds-step-header">
                <span className="ds-step-ordinal">{step.ordinal}</span>
                <div className="flex-1 min-w-0">
                  <p className="ds-step-title">{step.title}</p>
                  <p className="mt-ds-1 text-ds-sm text-gray-600">{step.instruction}</p>
                </div>
              </div>
              <div className="ds-step-footer">
                {step.actor && <span>Actor: {step.actor}</span>}
                {step.system && <span>System: {step.system}</span>}
              </div>
              {step.verificationPoint && (
                <div className="border-t border-green-100 bg-green-50/40 px-ds-5 py-ds-2">
                  <p className="text-ds-xs text-green-700 font-medium">&#10003; Verify: {step.verificationPoint}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {data.decisionPoints?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Decision Points</h2>
          <div className="space-y-ds-2">
            {data.decisionPoints.map((dp: any, i: number) => (
              <div key={i} className="ds-callout ds-callout-warning">
                <p className="text-ds-sm font-medium text-gray-900">At step {dp.atStepOrdinal}: {dp.question}</p>
                {dp.options?.map((opt: any, j: number) => (
                  <p key={j} className="text-ds-xs text-gray-600 mt-ds-1">&rarr; If {opt.condition}: {opt.action}</p>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.controls?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Controls</h2>
          <ul className="space-y-ds-1">
            {data.controls.map((c: string, i: number) => (
              <li key={i} className="text-ds-sm text-gray-600">&bull; {c}</li>
            ))}
          </ul>
        </section>
      )}

      {data.risks?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Risks</h2>
          <div className="space-y-ds-1">
            {data.risks.map((r: string, i: number) => (
              <div key={i} className="ds-callout ds-callout-danger"><p className="text-ds-sm text-gray-700">{r}</p></div>
            ))}
          </div>
        </section>
      )}

      <footer className="ds-attribution">{data.sourceNote ?? 'Generated from observed workflow behavior'}</footer>
    </>
  );
}

// ─── Decision-Based SOP ─────────────────────────────────────────────────────

function DecisionSOPView({ data }: { data: any }) {
  return (
    <>
      <header className="ds-header">
        <span className="ds-tag ds-tag-brand mb-ds-2">Decision-Based SOP</span>
        <h1 className="ds-header-title">{data.title}</h1>
        <p className="ds-header-subtitle">{data.purpose}</p>
      </header>

      {data.triggerCondition && (
        <div className="ds-callout ds-callout-info">
          <p className="text-ds-xs font-semibold text-brand-700 uppercase tracking-wide mb-ds-1">Trigger</p>
          <p className="text-ds-sm text-gray-700">{data.triggerCondition}</p>
        </div>
      )}

      {data.initialAssessment && (
        <section className="ds-section">
          <h2 className="ds-section-label">Initial Assessment</h2>
          <p className="text-ds-sm text-gray-600">{data.initialAssessment}</p>
        </section>
      )}

      {data.branches?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Decision Branches</h2>
          <div className="space-y-ds-4">
            {data.branches.map((branch: any, i: number) => (
              <div key={i} className="card px-ds-5 py-ds-4 border-l-[3px] border-l-amber-400">
                <p className="text-ds-sm font-semibold text-gray-900 mb-ds-2">If: {branch.condition}</p>
                <div className="space-y-ds-2 ml-ds-4">
                  {(branch.actions ?? []).map((action: any) => (
                    <div key={action.ordinal} className="flex items-start gap-ds-2">
                      <span className="text-ds-xs font-mono text-gray-400 mt-0.5">{action.ordinal}.</span>
                      <div>
                        <p className="text-ds-sm text-gray-700">{action.instruction}</p>
                        {action.system && <p className="text-ds-xs text-gray-400">{action.system}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {branch.outcome && (
                  <p className="mt-ds-2 text-ds-xs text-emerald-700 font-medium">&rarr; Outcome: {branch.outcome}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.escalationRules?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Escalation Rules</h2>
          <div className="space-y-ds-1">
            {data.escalationRules.map((r: string, i: number) => (
              <div key={i} className="ds-callout ds-callout-warning"><p className="text-ds-sm text-gray-700">{r}</p></div>
            ))}
          </div>
        </section>
      )}

      {data.exceptionHandling?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Exception Handling</h2>
          <div className="space-y-ds-1">
            {data.exceptionHandling.map((e: string, i: number) => (
              <div key={i} className="ds-callout ds-callout-danger"><p className="text-ds-sm text-gray-700">{e}</p></div>
            ))}
          </div>
        </section>
      )}

      {data.completionCriteria?.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-label">Completion Criteria</h2>
          <div className="ds-callout ds-callout-success">
            <ul className="space-y-ds-1">
              {data.completionCriteria.map((c: string, i: number) => (
                <li key={i} className="flex items-baseline gap-ds-2 text-ds-sm text-gray-700">
                  <span className="text-green-600 font-medium flex-shrink-0">&#10003;</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <footer className="ds-attribution">{data.sourceNote ?? 'Generated from observed workflow behavior'}</footer>
    </>
  );
}

// ─── Raw SOP View (original, for backward compatibility) ────────────────────

function RawSOPView({ sop }: { sop: any }) {
  if (!sop) return <div className="text-ds-sm text-gray-400 py-ds-10">No SOP data available.</div>;

  return (
    <>
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
    </>
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
