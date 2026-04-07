export { processSession } from './processSession.js';
export { validateProcessEngineInput } from './inputValidator.js';
export type {
  ProcessEngineInput,
  CanonicalEventInput,
  DerivedStepInput,
  SessionMetaInput,
  ProcessOutput,
  ProcessRun,
  ProcessDefinition,
  StepDefinition,
  ProcessMap,
  ProcessMapNode,
  ProcessMapEdge,
  ProcessMapPhase,
  ProcessMapNodeType,
  ProcessMapNodeMetadata,
  SOP,
  SOPStep,
  SOPInstruction,
  GroupingReason,
  BoundaryReason,
  CategoryConfig,
  InputValidationResult,
  FrictionIndicator,
  FrictionType,
  CommonIssue,
  QualityIndicators,
} from './types.js';
export { PROCESS_ENGINE_VERSION, CATEGORY_CONFIG } from './types.js';
export {
  analyzeStep,
  deriveOperationalDefinition,
  eventTypeLabel,
  formatDuration,
} from './stepAnalyzer.js';
export {
  inferBusinessObjective,
  inferTrigger,
  detectFriction,
  detectDecisionPoints,
  extractCommonIssues,
  inferRoles,
  cleanActivityName,
  cleanStepTitle,
  classifyInstructionType,
  computeQualityIndicators,
} from './contentEnricher.js';

// ─── Template system ─────────────────────────────────────────────────────────

export {
  renderTemplates,
  renderArtifactsToMarkdown,
  selectTemplates,
  renderProcessMap,
  renderSOP,
  renderProcessMapMarkdown,
  renderSOPMarkdown,
} from './templates/index.js';
export type { TemplateOverrides } from './templateSelector.js';
export type {
  ProcessMapTemplateType,
  SOPTemplateType,
  TemplateSelection,
  RenderedProcessMap,
  RenderedSOP,
  RenderedArtifacts,
  SwimlaneProcessMap,
  BPMNProcessMap,
  SIPOCProcessMap,
  OperatorSOP,
  EnterpriseSOP,
  DecisionSOP,
} from './templateTypes.js';
