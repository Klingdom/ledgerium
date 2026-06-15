/**
 * reportSections — the canonical section-ID list and human-readable labels for
 * the WorkflowReportPage. Extracted to a pure module so the grouped-nav logic
 * (reportMeta.ts) and its coverage test can reference one source of truth without
 * importing the heavy report component.
 *
 * Pure data only — no logic, no Date/random, hydration-irrelevant.
 */

export const SECTION_IDS = [
  'rpt-verdict',
  'rpt-scorecard',
  'rpt-hero',
  'rpt-lead',
  'rpt-insight-cards',
  'rpt-scores',
  'rpt-phases',
  'rpt-metrics',
  'rpt-distribution',
  'rpt-consistency',
  'rpt-variance',
  'rpt-drift',
  'rpt-timestudy',
  'rpt-insights',
  'rpt-automation',
  'rpt-bottlenecks',
  'rpt-steps',
  'rpt-structure',
  'rpt-rework',
  'rpt-agents',
  'rpt-skills',
  'rpt-integrations',
  'rpt-roadmap',
] as const;

export const SECTION_LABELS: Record<string, string> = {
  'rpt-verdict': 'Verdict',
  'rpt-scorecard': 'Scorecard',
  'rpt-hero': 'Overview',
  'rpt-lead': 'Start Here',
  'rpt-insight-cards': 'Key Actions',
  'rpt-scores': 'Process Health',
  'rpt-phases': 'Phase Timeline',
  'rpt-metrics': 'Step Timing',
  'rpt-distribution': 'Cycle-Time Spread',
  'rpt-consistency': 'Consistency',
  'rpt-variance': 'Variance & Variants',
  'rpt-drift': 'Drift',
  'rpt-timestudy': 'Step Duration',
  'rpt-insights': 'Insights',
  'rpt-automation': 'Automation',
  'rpt-bottlenecks': 'Bottlenecks',
  'rpt-steps': 'Step Breakdown',
  'rpt-structure': 'Friction & Decisions',
  'rpt-rework': 'Rework Patterns',
  'rpt-agents': 'Composed Agents',
  'rpt-skills': 'Skill Library',
  'rpt-integrations': 'Integrations & Risks',
  'rpt-roadmap': 'Implementation Roadmap',
};
