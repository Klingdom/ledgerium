/**
 * Integration Risk Analyzer
 *
 * Stage 8 of the Agent Intelligence transformation pipeline.
 *
 * Analyzes the composed agents, skills, and systems to:
 * 1. Map required API integrations (system → IntegrationRequirement)
 * 2. Assess automation risks (RiskItem[]) across 7 risk categories
 *
 * All processing is deterministic: same input → same output.
 * Sort order is stable; IDs are assigned after final sort.
 */

import type {
  StepIntelligence,
  SkillLibrary,
  OpportunityAnalysis,
  WorkflowStructure,
  AgentComposition,
  IntegrationType,
  IntegrationReadiness,
  IntegrationRequirement,
  RiskSeverity,
  RiskCategory,
  RiskItem,
  IntegrationRiskAnalysis,
} from './types.js';
import { SYSTEM_CAPABILITIES } from './verb-maps.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Systems that require OAuth2 as their primary auth mechanism. */
const OAUTH_SYSTEMS = new Set(['gmail', 'outlook', 'google_drive', 'google_docs', 'google_sheets', 'google_calendar', 'google_forms']);

/** Systems whose names suggest email-protocol nature. */
const EMAIL_SYSTEMS = new Set(['gmail', 'outlook']);

const ALL_READINESS_KEYS: IntegrationReadiness[] = [
  'api_available',
  'api_limited',
  'no_api',
  'unknown',
];

const ALL_SEVERITY_KEYS: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];

const ALL_RISK_CATEGORY_KEYS: RiskCategory[] = [
  'data_integrity',
  'security',
  'reliability',
  'compliance',
  'human_displacement',
  'integration',
  'complexity',
];

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Humanize a system name for display.
 * Examples: 'gmail' → 'Gmail Integration', 'netsuite' → 'NetSuite Integration',
 *           'ms_teams' → 'Ms Teams Integration'
 */
function humanizeSystemName(system: string): string {
  const formatted = system
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  return `${formatted} Integration`;
}

/**
 * Determine the IntegrationType for a given system.
 * OAuth is the "harder" requirement for email/OAuth systems, so it wins.
 */
function deriveIntegrationType(system: string, readiness: IntegrationReadiness): IntegrationType {
  // OAuth systems: OAuth is the harder requirement
  if (OAUTH_SYSTEMS.has(system) || system.includes('email') || EMAIL_SYSTEMS.has(system)) {
    return 'oauth';
  }

  // No API available → browser automation
  if (readiness === 'unknown') {
    return 'browser_rpa';
  }

  // System has API capabilities → REST API
  const capabilities = SYSTEM_CAPABILITIES[system];
  if (capabilities && capabilities.length > 0) {
    return 'rest_api';
  }

  return 'browser_rpa';
}

/**
 * Determine readiness for a system based on SYSTEM_CAPABILITIES presence.
 */
function deriveReadiness(system: string): IntegrationReadiness {
  return SYSTEM_CAPABILITIES[system] !== undefined ? 'api_available' : 'unknown';
}

/**
 * Compute implementation complexity (1–5).
 */
function deriveComplexity(
  readiness: IntegrationReadiness,
  integrationType: IntegrationType,
  capabilityCount: number,
): number {
  if (integrationType === 'browser_rpa') return 5;
  if (readiness === 'unknown') return 4;
  // api_available
  if (capabilityCount <= 3) return 1;
  if (capabilityCount <= 6) return 2;
  return 3;
}

/**
 * Generate a contextual note for the integration.
 */
function buildIntegrationNote(
  system: string,
  readiness: IntegrationReadiness,
  integrationType: IntegrationType,
  capabilityCount: number,
): string {
  const parts: string[] = [];

  if (readiness === 'api_available') {
    const formattedName = system.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    parts.push(`${formattedName} has a well-documented API with ${capabilityCount} capabilities available`);
  } else {
    parts.push(`No known API mapping for ${system}. Browser automation may be required.`);
  }

  if (integrationType === 'oauth') {
    parts.push('Requires OAuth2 authentication flow setup');
  }

  return parts.join('. ');
}

/**
 * Choose the higher of two severities.
 */
function maxSeverity(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

// ─── Part A: Integration Mapping ─────────────────────────────────────────────

function buildIntegrations(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
  skillLibrary: SkillLibrary,
  workflow: WorkflowStructure,
): IntegrationRequirement[] {
  const integrations: IntegrationRequirement[] = [];

  for (const system of workflow.systems) {
    const readiness = deriveReadiness(system);
    const capabilities = SYSTEM_CAPABILITIES[system] ?? [];
    const integrationType = deriveIntegrationType(system, readiness);
    const complexity = deriveComplexity(readiness, integrationType, capabilities.length);
    const notes = buildIntegrationNote(system, readiness, integrationType, capabilities.length);

    const dependentAgentIds = agentComposition.agents
      .filter(agent => agent.systems.includes(system))
      .map(agent => agent.agentId);

    const dependentSkillIds = skillLibrary.skills
      .filter(skill => skill.requiredSystems.includes(system))
      .map(skill => skill.skillId);

    const affectedStepIds = steps
      .filter(step => step.system === system)
      .map(step => step.stepId);

    integrations.push({
      integrationId: `int-${system}`,
      system,
      integrationName: humanizeSystemName(system),
      integrationType,
      readiness,
      requiredCapabilities: [...capabilities],
      dependentAgentIds,
      dependentSkillIds,
      affectedStepIds,
      complexity,
      notes,
    } satisfies IntegrationRequirement);
  }

  // Sort by complexity descending, then alphabetically by system
  integrations.sort((a, b) => {
    if (b.complexity !== a.complexity) return b.complexity - a.complexity;
    return a.system.localeCompare(b.system);
  });

  return integrations;
}

// ─── Part B: Risk Detection ───────────────────────────────────────────────────

/**
 * Detect data integrity risks.
 * Signal: cross-system data movement (steps with input+output across multiple systems,
 * or opportunities of category 'data_movement').
 */
function detectDataIntegrityRisk(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
  opportunities: OpportunityAnalysis,
  workflow: WorkflowStructure,
): RiskItem | null {
  // Steps that actively transform data (not manual)
  const dataSteps = steps.filter(
    s =>
      s.automationClassification !== 'manual_only' &&
      s.inputData.length > 0 &&
      s.outputData.length > 0,
  );

  const hasDataMovementOpportunity = opportunities.opportunities.some(
    opp => opp.category === 'data_movement',
  );

  if (dataSteps.length === 0 && !hasDataMovementOpportunity) return null;

  const systemCount = workflow.systems.length;
  if (systemCount < 2) return null;

  const severity: RiskSeverity = systemCount >= 3 ? 'high' : 'medium';
  const systemList = workflow.systems.join(', ');
  const affectedStepIds = [...new Set([
    ...dataSteps.map(s => s.stepId),
    ...opportunities.opportunities
      .filter(opp => opp.category === 'data_movement')
      .flatMap(opp => opp.affectedStepIds),
  ])];

  const affectedAgentIds = agentComposition.agents
    .filter(agent =>
      agent.systems.some(sys => workflow.systems.includes(sys)),
    )
    .map(agent => agent.agentId);

  return {
    riskId: '',
    category: 'data_integrity',
    severity,
    title: 'Cross-System Data Transfer Integrity',
    description: `Automated data movement between ${workflow.systems.length} systems creates integrity risks if source formats change.`,
    impact: `Automated data transfer between ${systemList} could result in incorrect data if source format changes`,
    mitigation: 'Implement data validation checks at each transfer point. Add checksums for critical fields.',
    affectedStepIds,
    affectedAgentIds,
    systems: [...workflow.systems],
    confidence: 0.8,
  } satisfies RiskItem;
}

/**
 * Detect security risks.
 * Signal: integrations requiring OAuth, or error_handling steps that may expose sensitive data.
 */
function detectSecurityRisk(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
  integrations: IntegrationRequirement[],
): RiskItem | null {
  const oauthIntegrations = integrations.filter(i => i.integrationType === 'oauth');
  const hasErrorHandlingSteps = steps.some(
    s => s.rawReference.category === 'error_handling',
  );

  if (oauthIntegrations.length === 0 && !hasErrorHandlingSteps) return null;

  const oauthSystems = oauthIntegrations.map(i => i.system);
  const affectedAgentIds = agentComposition.agents
    .filter(agent => agent.systems.some(sys => oauthSystems.includes(sys)))
    .map(agent => agent.agentId);

  const affectedStepIds = steps
    .filter(s =>
      (s.system !== null && oauthSystems.includes(s.system)) ||
      s.rawReference.category === 'error_handling',
    )
    .map(s => s.stepId);

  return {
    riskId: '',
    category: 'security',
    severity: 'high',
    title: 'OAuth Token and Credential Security',
    description: 'Integrations requiring OAuth2 and sensitive error recovery paths must handle credentials securely.',
    impact: 'OAuth tokens and API credentials must be securely stored and rotated',
    mitigation: 'Use a secrets manager. Implement token rotation. Audit API access logs.',
    affectedStepIds,
    affectedAgentIds,
    systems: oauthSystems,
    confidence: 0.9,
  } satisfies RiskItem;
}

/**
 * Detect reliability risks.
 * Signal: integrations with unknown readiness or browser_rpa type, or many systems.
 */
function detectReliabilityRisk(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
  integrations: IntegrationRequirement[],
  workflow: WorkflowStructure,
): RiskItem | null {
  const fragileIntegrations = integrations.filter(
    i => i.readiness === 'unknown' || i.integrationType === 'browser_rpa',
  );
  const hasManySystemsSignal = workflow.systems.length >= 4;

  if (fragileIntegrations.length === 0 && !hasManySystemsSignal) return null;

  const hasBrowserRpa = fragileIntegrations.some(i => i.integrationType === 'browser_rpa');
  const severity: RiskSeverity = hasBrowserRpa ? 'high' : 'medium';

  const fragileSystems = fragileIntegrations.map(i => i.system);
  const allInvolvedSystems = hasManySystemsSignal
    ? [...workflow.systems]
    : fragileSystems;

  const affectedAgentIds = agentComposition.agents
    .filter(agent => agent.systems.some(sys => allInvolvedSystems.includes(sys)))
    .map(agent => agent.agentId);

  const affectedStepIds = steps
    .filter(s => s.system !== null && allInvolvedSystems.includes(s.system))
    .map(s => s.stepId);

  return {
    riskId: '',
    category: 'reliability',
    severity,
    title: 'Fragile Integration Reliability',
    description: `${fragileIntegrations.length > 0 ? 'Browser-based automation or unknown-API systems' : 'High system count'} increases the chance of automation failures.`,
    impact: 'Browser-based automation is fragile — UI changes can break the agent',
    mitigation: 'Prefer API integrations where available. Add retry logic with exponential backoff.',
    affectedStepIds,
    affectedAgentIds,
    systems: allInvolvedSystems,
    confidence: 0.75,
  } satisfies RiskItem;
}

/**
 * Detect compliance risks.
 * Signal: annotation steps, or steps involving customer/payment/invoice entities.
 */
function detectComplianceRisk(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
): RiskItem | null {
  const sensitiveEntities = new Set(['customer', 'payment', 'invoice']);

  const complianceSteps = steps.filter(
    s =>
      s.rawReference.category === 'annotation' ||
      (s.entity !== null && sensitiveEntities.has(s.entity)),
  );

  if (complianceSteps.length === 0) return null;

  const entities = [...new Set(
    complianceSteps
      .map(s => s.entity)
      .filter((e): e is string => e !== null),
  )];
  const entityLabel = entities.length > 0 ? entities.join(', ') : 'sensitive';

  const systems = [...new Set(
    complianceSteps
      .map(s => s.system)
      .filter((sys): sys is string => sys !== null),
  )];

  const affectedAgentIds = agentComposition.agents
    .filter(agent => agent.systems.some(sys => systems.includes(sys)))
    .map(agent => agent.agentId);

  return {
    riskId: '',
    category: 'compliance',
    severity: 'medium',
    title: 'Sensitive Data Compliance Exposure',
    description: `Automated processing of ${entityLabel} data requires audit trails and regulatory compliance review.`,
    impact: `Automated processing of ${entityLabel} data may require audit trails for regulatory compliance`,
    mitigation: 'Log all automated actions. Maintain audit trail. Review data handling policies.',
    affectedStepIds: complianceSteps.map(s => s.stepId),
    affectedAgentIds,
    systems,
    confidence: 0.7,
  } satisfies RiskItem;
}

/**
 * Detect human displacement risks.
 * Signal: steps classified as human_in_loop or manual_only being targeted by agents.
 */
function detectHumanDisplacementRisk(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
  opportunities: OpportunityAnalysis,
): RiskItem | null {
  const humanLoopSteps = steps.filter(
    s => s.automationClassification === 'human_in_loop',
  );
  const manualOnlySteps = steps.filter(
    s => s.automationClassification === 'manual_only',
  );

  if (humanLoopSteps.length === 0 && manualOnlySteps.length === 0) return null;

  // Check if manual_only steps are targeted by opportunities
  const manualOnlyStepIds = new Set(manualOnlySteps.map(s => s.stepId));
  const manualTargeted = opportunities.opportunities.some(opp =>
    opp.affectedStepIds.some(id => manualOnlyStepIds.has(id)),
  );

  const severity: RiskSeverity = manualTargeted && manualOnlySteps.length > 0
    ? 'medium'
    : 'low';

  const affectedSteps = [...humanLoopSteps, ...manualOnlySteps];
  const affectedStepIds = [...new Set(affectedSteps.map(s => s.stepId))];

  const affectedAgentIds = agentComposition.agents
    .filter(
      agent =>
        agent.interactionMode === 'collaborative' ||
        agent.interactionMode === 'approval_required',
    )
    .map(agent => agent.agentId);

  const systems = [...new Set(
    affectedSteps
      .map(s => s.system)
      .filter((sys): sys is string => sys !== null),
  )];

  return {
    riskId: '',
    category: 'human_displacement',
    severity,
    title: 'Human Judgment Displacement',
    description: 'Steps currently requiring human judgment are candidates for automation, risking quality reduction.',
    impact: 'Automating steps that currently require human judgment may reduce quality',
    mitigation: 'Implement human-in-the-loop checkpoints. Allow manual override at any point.',
    affectedStepIds,
    affectedAgentIds,
    systems,
    confidence: 0.8,
  } satisfies RiskItem;
}

/**
 * Detect integration complexity risks.
 * Signal: integrations with complexity >= 4.
 */
function detectIntegrationRisk(
  agentComposition: AgentComposition,
  integrations: IntegrationRequirement[],
): RiskItem | null {
  const complexIntegrations = integrations.filter(i => i.complexity >= 4);

  if (complexIntegrations.length === 0) return null;

  const hasComplexity5 = complexIntegrations.some(i => i.complexity === 5);
  const severity: RiskSeverity = hasComplexity5 ? 'high' : 'medium';

  const systems = complexIntegrations.map(i => i.system);
  const affectedAgentIds = agentComposition.agents
    .filter(agent => agent.systems.some(sys => systems.includes(sys)))
    .map(agent => agent.agentId);

  const affectedStepIds = complexIntegrations.flatMap(i => i.affectedStepIds);
  const systemLabel = systems.join(', ');

  return {
    riskId: '',
    category: 'integration',
    severity,
    title: 'High-Complexity Integration Requirements',
    description: `${complexIntegrations.length} integration(s) with complexity ≥ 4 will require significant implementation effort.`,
    impact: `Complex integration with ${systemLabel} increases implementation time and maintenance burden`,
    mitigation: 'Evaluate alternative integration approaches. Consider phased rollout.',
    affectedStepIds,
    affectedAgentIds,
    systems,
    confidence: 0.85,
  } satisfies RiskItem;
}

/**
 * Detect overall complexity risks.
 * Signal: 5+ activities, 3+ agents, or automationScore < 40.
 */
function detectComplexityRisk(
  agentComposition: AgentComposition,
  workflow: WorkflowStructure,
): RiskItem | null {
  const hasManyActivities = workflow.activityCount >= 5;
  const hasManyAgents = agentComposition.agentCount >= 3;
  const hasLowAutomationScore = workflow.automationScore < 40;

  if (!hasManyActivities && !hasManyAgents && !hasLowAutomationScore) return null;

  const severity: RiskSeverity = hasLowAutomationScore ? 'high' : 'medium';

  const affectedAgentIds = agentComposition.agents.map(a => a.agentId);
  const affectedStepIds: string[] = [];

  return {
    riskId: '',
    category: 'complexity',
    severity,
    title: 'High Workflow Complexity',
    description: `Workflow complexity (${workflow.activityCount} activities, ${agentComposition.agentCount} agents, automation score ${workflow.automationScore}) increases failure risk.`,
    impact: 'High workflow complexity increases the chance of edge cases and failures',
    mitigation: 'Start with the highest-scoring opportunities. Implement incrementally.',
    affectedStepIds,
    affectedAgentIds,
    systems: [...workflow.systems],
    confidence: 0.75,
  } satisfies RiskItem;
}

// ─── Part C: Aggregates ───────────────────────────────────────────────────────

function emptyReadinessBreakdown(): Record<IntegrationReadiness, number> {
  return Object.fromEntries(
    ALL_READINESS_KEYS.map(k => [k, 0]),
  ) as Record<IntegrationReadiness, number>;
}

function emptySeverityBreakdown(): Record<RiskSeverity, number> {
  return Object.fromEntries(
    ALL_SEVERITY_KEYS.map(k => [k, 0]),
  ) as Record<RiskSeverity, number>;
}

function emptyCategoryBreakdown(): Record<RiskCategory, number> {
  return Object.fromEntries(
    ALL_RISK_CATEGORY_KEYS.map(k => [k, 0]),
  ) as Record<RiskCategory, number>;
}

function computeOverallRiskLevel(risks: RiskItem[]): RiskSeverity {
  if (risks.length === 0) return 'low';
  return risks.reduce<RiskSeverity>(
    (highest, risk) => maxSeverity(highest, risk.severity),
    'low',
  );
}

function computeImplementationReadinessScore(
  integrations: IntegrationRequirement[],
  risks: RiskItem[],
): number {
  let score = 100;
  for (const integration of integrations) {
    if (integration.readiness === 'unknown') score -= 15;
    if (integration.integrationType === 'browser_rpa') score -= 20;
  }
  for (const risk of risks) {
    if (risk.severity === 'high') score -= 10;
    if (risk.severity === 'critical') score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Analyze integration requirements and automation risks for a workflow.
 *
 * @param steps - StepIntelligence[] from the parse stage
 * @param agentComposition - AgentComposition from the agent-composer stage
 * @param skillLibrary - SkillLibrary from the skill-extractor stage
 * @param opportunities - OpportunityAnalysis from the opportunity-detector stage
 * @param workflow - WorkflowStructure from the workflow-builder stage
 * @returns IntegrationRiskAnalysis with all integrations, risks, and aggregates
 */
export function analyzeIntegrationRisk(
  steps: StepIntelligence[],
  agentComposition: AgentComposition,
  skillLibrary: SkillLibrary,
  opportunities: OpportunityAnalysis,
  workflow: WorkflowStructure,
): IntegrationRiskAnalysis {
  // Part A: Build integrations
  const integrations = buildIntegrations(steps, agentComposition, skillLibrary, workflow);

  // Part B: Detect risks (one per category, merged if multiple signals)
  const rawRisks: (RiskItem | null)[] = [
    detectDataIntegrityRisk(steps, agentComposition, opportunities, workflow),
    detectSecurityRisk(steps, agentComposition, integrations),
    detectReliabilityRisk(steps, agentComposition, integrations, workflow),
    detectComplianceRisk(steps, agentComposition),
    detectHumanDisplacementRisk(steps, agentComposition, opportunities),
    detectIntegrationRisk(agentComposition, integrations),
    detectComplexityRisk(agentComposition, workflow),
  ];

  // Filter nulls and sort by severity descending, then title alphabetically
  const risks: RiskItem[] = rawRisks
    .filter((r): r is RiskItem => r !== null)
    .sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.title.localeCompare(b.title);
    });

  // Assign stable IDs after sorting
  risks.forEach((risk, idx) => {
    risk.riskId = `risk-${idx + 1}`;
  });

  // Part C: Aggregates
  const readinessBreakdown = emptyReadinessBreakdown();
  for (const integration of integrations) {
    readinessBreakdown[integration.readiness] += 1;
  }

  const severityBreakdown = emptySeverityBreakdown();
  const categoryBreakdown = emptyCategoryBreakdown();
  for (const risk of risks) {
    severityBreakdown[risk.severity] += 1;
    categoryBreakdown[risk.category] += 1;
  }

  const overallRiskLevel = computeOverallRiskLevel(risks);
  const implementationReadinessScore = computeImplementationReadinessScore(integrations, risks);

  return {
    integrations,
    risks,
    integrationCount: integrations.length,
    readinessBreakdown,
    riskCount: risks.length,
    severityBreakdown,
    categoryBreakdown,
    overallRiskLevel,
    implementationReadinessScore,
  } satisfies IntegrationRiskAnalysis;
}
