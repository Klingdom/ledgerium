'use client';

import { useState, useCallback } from 'react';
import {
  Bot,
  RefreshCw,
  Zap,
  Layers,
  Target,
  Shield,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Plug,
  Map,
} from 'lucide-react';

interface Props {
  workflowId: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function automationScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function opportunityScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-[var(--surface-secondary)] text-[var(--content-primary)]';
}

const CATEGORY_COLORS: Record<string, string> = {
  repetition: 'bg-blue-100 text-blue-800',
  deterministic_logic: 'bg-green-100 text-green-800',
  data_movement: 'bg-purple-100 text-purple-800',
  content_generation: 'bg-amber-100 text-amber-800',
  multi_system_orchestration: 'bg-indigo-100 text-indigo-800',
  friction_reduction: 'bg-red-100 text-red-800',
  decision_support: 'bg-orange-100 text-orange-800',
};

const ROLE_COLORS: Record<string, string> = {
  executor: 'bg-green-100 text-green-800',
  assistant: 'bg-blue-100 text-blue-800',
  orchestrator: 'bg-purple-100 text-purple-800',
  monitor: 'bg-[var(--surface-secondary)] text-[var(--content-primary)]',
  specialist: 'bg-amber-100 text-amber-800',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const READINESS_COLORS: Record<string, string> = {
  api_available: 'bg-green-100 text-green-800',
  sdk_available: 'bg-blue-100 text-blue-800',
  webhook_only: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-yellow-100 text-yellow-800',
  manual_only: 'bg-red-100 text-red-800',
};

function pill(label: string, colorClass: string) {
  const safe = colorClass || 'bg-[var(--surface-secondary)] text-[var(--content-primary)]';
  return (
    <span key={label} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${safe}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

// ── Collapsible Section ──────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  activeSection: string;
  onToggle: (id: string) => void;
  badge?: string | undefined;
  children: React.ReactNode;
}

function Section({ id, title, icon, activeSection, onToggle, badge, children }: SectionProps) {
  const isOpen = activeSection === id;
  return (
    <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-ds-5 py-ds-3 bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)] transition-colors text-left"
      >
        <span className="flex items-center gap-ds-2 text-ds-sm font-semibold text-[var(--content-primary)]">
          {icon}
          {title}
          {badge && (
            <span className="ml-1 rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--content-secondary)]">
              {badge}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-[var(--content-tertiary)] flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--content-tertiary)] flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className="px-ds-5 py-ds-4">{children}</div>}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryBanner({ result }: { result: any }) {
  const score = result?.workflow?.automationScore ?? 0;
  const agentCount = result?.agentComposition?.agentCount ?? 0;
  const totalOpportunities = result?.opportunities?.totalOpportunities ?? 0;
  const readinessScore = result?.integrationRisk?.implementationReadinessScore ?? 0;
  const stepCount = result?.workflow?.stepCount ?? 0;
  const activityCount = result?.workflow?.activityCount ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-ds-3">
      <div className="card px-ds-4 py-ds-3 col-span-2 sm:col-span-1">
        <p className="ds-metric-label flex items-center gap-1">
          <Zap className="h-3 w-3" /> Automation Score
        </p>
        <p className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-ds-base font-bold ${automationScoreColor(score)}`}>
          {score}/100
        </p>
      </div>
      <div className="card px-ds-4 py-ds-3">
        <p className="ds-metric-label flex items-center gap-1">
          <Layers className="h-3 w-3" /> Steps
        </p>
        <p className="ds-metric-value">{stepCount}</p>
      </div>
      <div className="card px-ds-4 py-ds-3">
        <p className="ds-metric-label flex items-center gap-1">
          <Layers className="h-3 w-3" /> Activities
        </p>
        <p className="ds-metric-value">{activityCount}</p>
      </div>
      <div className="card px-ds-4 py-ds-3">
        <p className="ds-metric-label flex items-center gap-1">
          <Bot className="h-3 w-3" /> Agents
        </p>
        <p className="ds-metric-value">{agentCount}</p>
      </div>
      <div className="card px-ds-4 py-ds-3">
        <p className="ds-metric-label flex items-center gap-1">
          <Target className="h-3 w-3" /> Opportunities
        </p>
        <p className="ds-metric-value">{totalOpportunities}</p>
      </div>
      <div className="card px-ds-4 py-ds-3">
        <p className="ds-metric-label flex items-center gap-1">
          <Shield className="h-3 w-3" /> Readiness
        </p>
        <p className="ds-metric-value">{readinessScore}/100</p>
      </div>
    </div>
  );
}

function OpportunitiesSection({ opportunities }: { opportunities: any }) {
  const list: any[] = opportunities?.opportunities ?? [];
  const sorted = [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (sorted.length === 0) {
    return <p className="text-ds-sm text-[var(--content-tertiary)]">No opportunities identified.</p>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-ds-xs">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
            <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium w-14">Score</th>
            <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Opportunity</th>
            <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden sm:table-cell">Category</th>
            <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden md:table-cell">Classification</th>
            <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Time Saved</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((opp: any, i: number) => (
            <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]">
              <td className="py-ds-2 px-ds-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${opportunityScoreColor(opp.score ?? 0)}`}>
                  {opp.score ?? '—'}
                </span>
              </td>
              <td className="py-ds-2 px-ds-4 font-medium text-[var(--content-primary)]">{opp.title ?? '—'}</td>
              <td className="py-ds-2 px-ds-4 hidden sm:table-cell">
                {opp.category ? pill(opp.category, CATEGORY_COLORS[opp.category] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]') : '—'}
              </td>
              <td className="py-ds-2 px-ds-4 hidden md:table-cell text-[var(--content-secondary)]">{opp.classification ?? '—'}</td>
              <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums">
                {formatMs(opp.estimatedTimeSavingsMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentsSection({ agentComposition }: { agentComposition: any }) {
  const agents: any[] = agentComposition?.agents ?? [];

  if (agents.length === 0) {
    return <p className="text-ds-sm text-[var(--content-tertiary)]">No agents composed.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
      {agents.map((agent: any, i: number) => (
        <div key={i} className="card px-ds-4 py-ds-4 space-y-ds-2">
          <div className="flex items-start justify-between gap-ds-2">
            <div>
              <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{agent.agentName ?? `Agent ${i + 1}`}</p>
              <p className="text-ds-xs text-[var(--content-secondary)]">{agent.interactionMode ?? ''}</p>
            </div>
            {agent.role && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium flex-shrink-0 ${ROLE_COLORS[agent.role] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'}`}>
                {agent.role}
              </span>
            )}
          </div>

          {/* Capability score bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--content-secondary)]">Capability</span>
              <span className="text-[11px] font-medium text-[var(--content-primary)]">{agent.capabilityScore ?? 0}/100</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)]">
              <div
                className="h-1.5 rounded-full bg-brand-500"
                style={{ width: `${Math.min(agent.capabilityScore ?? 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Systems */}
          {agent.systems?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.systems.map((sys: string) => (
                <span key={sys} className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
                  {sys}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-ds-4 text-[11px] text-[var(--content-secondary)]">
            {agent.tasks?.length > 0 && <span>{agent.tasks.length} task{agent.tasks.length !== 1 ? 's' : ''}</span>}
            {agent.skills?.length > 0 && <span>{agent.skills.length} skill{agent.skills.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ skillLibrary }: { skillLibrary: any }) {
  const skills: any[] = skillLibrary?.skills ?? [];
  const uniqueCount = skillLibrary?.uniqueSkillCount ?? skills.length;
  const reusableCount = skillLibrary?.reusableSkillCount ?? 0;

  if (skills.length === 0) {
    return <p className="text-ds-sm text-[var(--content-tertiary)]">No skills identified.</p>;
  }

  return (
    <>
      <div className="flex items-center gap-ds-4 mb-ds-3 text-ds-xs text-[var(--content-secondary)]">
        <span><strong className="text-[var(--content-primary)]">{uniqueCount}</strong> unique skills</span>
        <span><strong className="text-[var(--content-primary)]">{reusableCount}</strong> reusable</span>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-ds-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Skill</th>
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden sm:table-cell">Type</th>
              <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium w-32">Reusability</th>
              <th className="text-center py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium w-16 hidden md:table-cell">Autonomous</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill: any, i: number) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]">
                <td className="py-ds-2 px-ds-4 font-medium text-[var(--content-primary)]">{skill.skillName ?? '—'}</td>
                <td className="py-ds-2 px-ds-4 hidden sm:table-cell">
                  {skill.skillType ? pill(skill.skillType, 'bg-indigo-100 text-indigo-800') : '—'}
                </td>
                <td className="py-ds-2 px-ds-4">
                  <div className="flex items-center gap-ds-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--surface-secondary)]">
                      <div
                        className="h-1.5 rounded-full bg-brand-400"
                        style={{ width: `${Math.min((skill.reusabilityScore ?? 0), 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-[var(--content-secondary)] w-8 text-right">{skill.reusabilityScore ?? 0}</span>
                  </div>
                </td>
                <td className="py-ds-2 px-ds-4 text-center hidden md:table-cell">
                  {skill.autonomous ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-[var(--content-tertiary)] mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IntegrationsRisksSection({ integrationRisk }: { integrationRisk: any }) {
  const integrations: any[] = integrationRisk?.integrations ?? [];
  const risks: any[] = integrationRisk?.risks ?? [];
  const overallRiskLevel: string = integrationRisk?.overallRiskLevel ?? '';

  return (
    <div className="space-y-ds-5">
      {/* Risk level banner */}
      {overallRiskLevel && (
        <div className={`flex items-center gap-ds-2 rounded-lg px-ds-4 py-ds-3 text-ds-sm font-medium border ${SEVERITY_COLORS[overallRiskLevel] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'} border-current/20`}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Overall risk: <span className="capitalize">{overallRiskLevel}</span>
        </div>
      )}

      {/* Integrations table */}
      {integrations.length > 0 && (
        <div>
          <p className="text-ds-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wide mb-ds-2">Integrations</p>
          <div className="card overflow-hidden">
            <table className="w-full text-ds-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
                  <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">System</th>
                  <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium">Readiness</th>
                  <th className="text-left py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden sm:table-cell">Complexity</th>
                  <th className="text-right py-ds-2 px-ds-4 text-[var(--content-secondary)] font-medium hidden md:table-cell">Setup Time</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((integ: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]">
                    <td className="py-ds-2 px-ds-4 font-medium text-[var(--content-primary)]">{integ.system ?? '—'}</td>
                    <td className="py-ds-2 px-ds-4">
                      {integ.readiness
                        ? pill(integ.readiness, READINESS_COLORS[integ.readiness] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]')
                        : '—'}
                    </td>
                    <td className="py-ds-2 px-ds-4 hidden sm:table-cell">
                      {integ.complexity != null ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, dotIdx) => (
                            <div
                              key={dotIdx}
                              className={`h-2 w-2 rounded-full ${dotIdx < integ.complexity ? 'bg-[var(--content-primary)]' : 'bg-[var(--surface-secondary)]'}`}
                            />
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-ds-2 px-ds-4 text-right text-[var(--content-primary)] tabular-nums hidden md:table-cell">
                      {formatMs(integ.estimatedSetupTimeMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risks list */}
      {risks.length > 0 && (
        <div>
          <p className="text-ds-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wide mb-ds-2">Risks</p>
          <div className="space-y-ds-2">
            {risks.map((risk: any, i: number) => (
              <div key={i} className="card px-ds-4 py-ds-3">
                <div className="flex items-start gap-ds-3">
                  <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${risk.severity === 'critical' || risk.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-ds-2 flex-wrap">
                      <p className="text-ds-sm font-medium text-[var(--content-primary)]">{risk.title ?? '—'}</p>
                      {risk.severity && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_COLORS[risk.severity] ?? 'bg-[var(--surface-secondary)] text-[var(--content-primary)]'}`}>
                          {risk.severity}
                        </span>
                      )}
                      {risk.category && (
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
                          {risk.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {risk.mitigation && (
                      <p className="mt-ds-1 text-ds-xs text-[var(--content-secondary)]">{risk.mitigation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {integrations.length === 0 && risks.length === 0 && (
        <p className="text-ds-sm text-[var(--content-tertiary)]">No integration data available.</p>
      )}
    </div>
  );
}

function RoadmapSection({ artifacts }: { artifacts: any }) {
  const roadmap: any[] = artifacts?.roadmap ?? [];

  if (roadmap.length === 0) {
    return <p className="text-ds-sm text-[var(--content-tertiary)]">No roadmap available.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-[var(--surface-secondary)]" aria-hidden />

      <div className="space-y-ds-4">
        {roadmap.map((phase: any, i: number) => (
          <div key={i} className="relative flex items-start gap-ds-4">
            {/* Phase node */}
            <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand-300 bg-[var(--surface-elevated)] text-ds-sm font-bold text-brand-700">
              {phase.phase ?? i + 1}
            </div>

            {/* Phase content */}
            <div className="card flex-1 px-ds-4 py-ds-3 mb-0">
              <div className="flex items-start justify-between gap-ds-2 flex-wrap">
                <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{phase.title ?? `Phase ${phase.phase ?? i + 1}`}</p>
                {phase.estimatedEffort && (
                  <span className="text-[11px] text-[var(--content-secondary)] flex-shrink-0">{phase.estimatedEffort}</span>
                )}
              </div>
              {phase.description && (
                <p className="mt-ds-1 text-ds-xs text-[var(--content-secondary)]">{phase.description}</p>
              )}
              {phase.prerequisites?.length > 0 && (
                <div className="mt-ds-2 flex flex-wrap gap-1">
                  {phase.prerequisites.map((prereq: string, pi: number) => (
                    <span key={pi} className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--content-secondary)]">
                      {prereq}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AgentIntelligenceTab({ workflowId }: Props) {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Default-expanded sections
  const [activeSection, setActiveSection] = useState<string>('opportunities');

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/agent-intelligence`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? 'Agent intelligence analysis failed');
        return;
      }
      const data = await res.json();
      setResult(data.data);
    } catch {
      setError('Failed to run agent intelligence analysis');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  function handleToggleSection(id: string) {
    setActiveSection((prev) => (prev === id ? '' : id));
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!result && !isLoading) {
    return (
      <div className="text-center py-ds-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]">
          <Bot className="h-7 w-7 text-[var(--content-tertiary)]" />
        </div>
        <h3 className="mt-ds-4 text-ds-base font-medium text-[var(--content-primary)]">Run agent intelligence</h3>
        <p className="mt-ds-1 text-ds-sm text-[var(--content-secondary)]">
          Identify automation opportunities, compose agents, and generate an implementation roadmap.
        </p>
        {error && <p className="text-ds-xs text-red-500 mt-ds-2">{error}</p>}
        <button onClick={analyze} className="btn-primary gap-1.5 mt-ds-4">
          <Zap className="h-4 w-4" />
          Analyze with Agent Intelligence
        </button>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="text-center py-ds-12">
        <RefreshCw className="mx-auto h-8 w-8 text-brand-500 animate-spin" />
        <p className="mt-ds-3 text-ds-sm text-[var(--content-secondary)]">Running agent intelligence pipeline...</p>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  const { opportunities, agentComposition, skillLibrary, integrationRisk, artifacts, metadata } = result;

  const opportunityCount = opportunities?.totalOpportunities ?? opportunities?.opportunities?.length ?? 0;
  const agentCount = agentComposition?.agentCount ?? agentComposition?.agents?.length ?? 0;
  const skillCount = skillLibrary?.uniqueSkillCount ?? skillLibrary?.skills?.length ?? 0;
  const riskCount = integrationRisk?.risks?.length ?? 0;
  const roadmapCount = artifacts?.roadmap?.length ?? 0;

  return (
    <div className="ds-document">
      {/* Summary banner */}
      <SummaryBanner result={result} />

      {/* Collapsible sections */}
      <div className="space-y-ds-3 mt-ds-4">
        <Section
          id="opportunities"
          title="Opportunities"
          icon={<Target className="h-4 w-4 text-brand-500" />}
          activeSection={activeSection}
          onToggle={handleToggleSection}
          {...(opportunityCount > 0 ? { badge: String(opportunityCount) } : {})}
        >
          <OpportunitiesSection opportunities={opportunities} />
        </Section>

        <Section
          id="agents"
          title="Composed Agents"
          icon={<Bot className="h-4 w-4 text-purple-500" />}
          activeSection={activeSection}
          onToggle={handleToggleSection}
          {...(agentCount > 0 ? { badge: String(agentCount) } : {})}
        >
          <AgentsSection agentComposition={agentComposition} />
        </Section>

        <Section
          id="skills"
          title="Skill Library"
          icon={<BookOpen className="h-4 w-4 text-indigo-500" />}
          activeSection={activeSection}
          onToggle={handleToggleSection}
          {...(skillCount > 0 ? { badge: String(skillCount) } : {})}
        >
          <SkillsSection skillLibrary={skillLibrary} />
        </Section>

        <Section
          id="integrations"
          title="Integrations & Risks"
          icon={<Plug className="h-4 w-4 text-orange-500" />}
          activeSection={activeSection}
          onToggle={handleToggleSection}
          {...(riskCount > 0 ? { badge: `${riskCount} risk${riskCount !== 1 ? 's' : ''}` } : {})}
        >
          <IntegrationsRisksSection integrationRisk={integrationRisk} />
        </Section>

        <Section
          id="roadmap"
          title="Implementation Roadmap"
          icon={<Map className="h-4 w-4 text-green-600" />}
          activeSection={activeSection}
          onToggle={handleToggleSection}
          {...(roadmapCount > 0 ? { badge: `${roadmapCount} phase${roadmapCount !== 1 ? 's' : ''}` } : {})}
        >
          <RoadmapSection artifacts={artifacts} />
        </Section>
      </div>

      {/* Metadata + re-analyze */}
      <div className="mt-ds-4 flex items-center justify-between flex-wrap gap-ds-2">
        {metadata?.processedAt && (
          <p className="text-ds-xs text-[var(--content-tertiary)]">
            Analyzed {new Date(metadata.processedAt).toLocaleString()} · engine {metadata.engineVersion ?? '—'} · {formatMs(metadata.pipelineDurationMs)}
          </p>
        )}
        <button onClick={analyze} disabled={isLoading} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>
      </div>
    </div>
  );
}
