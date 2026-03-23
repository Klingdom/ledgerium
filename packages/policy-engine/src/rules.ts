import { classifySensitivity, SENSITIVE_SELECTOR_PATTERNS } from './sensitivity.js';

export interface PolicyConfig {
  captureTextInputValues: false;   // always false in MVP — hardcoded
  captureScreenshots: false;       // always false in MVP — hardcoded
  captureDomSnapshots: false;      // always false in MVP — hardcoded
  blockedDomains: string[];
  allowedDomains: string[];        // empty = all allowed
  ruleVersion: string;
}

export const DEFAULT_POLICY: PolicyConfig = {
  captureTextInputValues: false,
  captureScreenshots: false,
  captureDomSnapshots: false,
  blockedDomains: [],
  allowedDomains: [],
  ruleVersion: '1.0.0',
};

export type PolicyDecision = {
  outcome: 'allow' | 'block' | 'redact';
  reason: string;
  redactionApplied: boolean;
};

export interface PolicyLogEntry {
  sessionId: string;
  eventId: string;
  t_ms: number;
  outcome: PolicyDecision['outcome'];
  reason: string;
}

function extractDomain(url?: string): string | undefined {
  if (url === undefined || url === '') return undefined;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function applyPolicy(
  config: PolicyConfig,
  context: {
    url?: string;
    inputType?: string;
    selector?: string;
    label?: string;
    isSensitiveTarget?: boolean;
  },
): PolicyDecision {
  const domain = extractDomain(context.url);

  // Domain block list check
  if (domain !== undefined && config.blockedDomains.length > 0) {
    if (config.blockedDomains.some((d) => d.toLowerCase() === domain)) {
      return {
        outcome: 'block',
        reason: `Domain '${domain}' is in the blocked domains list.`,
        redactionApplied: false,
      };
    }
  }

  // Domain allow list check (non-empty list = explicit allow list)
  if (domain !== undefined && config.allowedDomains.length > 0) {
    if (!config.allowedDomains.some((d) => d.toLowerCase() === domain)) {
      return {
        outcome: 'block',
        reason: `Domain '${domain}' is not in the allowed domains list.`,
        redactionApplied: false,
      };
    }
  }

  // Sensitive target flag
  if (context.isSensitiveTarget === true) {
    return {
      outcome: 'redact',
      reason: 'Target is marked as sensitive.',
      redactionApplied: true,
    };
  }

  // Password input type
  if (context.inputType === 'password') {
    return {
      outcome: 'redact',
      reason: 'Input type is password.',
      redactionApplied: true,
    };
  }

  // Selector pattern matching
  if (context.selector !== undefined && context.selector !== '') {
    const matchedPattern = SENSITIVE_SELECTOR_PATTERNS.find((p) =>
      p.test(context.selector as string),
    );
    if (matchedPattern !== undefined) {
      return {
        outcome: 'redact',
        reason: `Selector matched sensitive pattern: ${matchedPattern.toString()}`,
        redactionApplied: true,
      };
    }
  }

  // Label pattern matching (reuse classifier)
  const classification = classifySensitivity(
    context.inputType,
    context.selector,
    context.label,
  );
  if (classification.isSensitive) {
    return {
      outcome: 'redact',
      reason: `Field classified as sensitive (${classification.sensitivityClass ?? 'unknown'}).`,
      redactionApplied: true,
    };
  }

  return {
    outcome: 'allow',
    reason: 'No policy rules triggered.',
    redactionApplied: false,
  };
}

export function createPolicyLog(
  sessionId: string,
  eventId: string,
  decision: PolicyDecision,
  t_ms: number,
): PolicyLogEntry {
  return {
    sessionId,
    eventId,
    t_ms,
    outcome: decision.outcome,
    reason: decision.reason,
  };
}
