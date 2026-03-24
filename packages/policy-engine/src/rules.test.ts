import { describe, it, expect } from 'vitest';
import {
  applyPolicy,
  createPolicyLog,
  DEFAULT_POLICY,
  type PolicyConfig,
} from './rules.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<PolicyConfig> = {}): PolicyConfig {
  return { ...DEFAULT_POLICY, ...overrides };
}

// ---------------------------------------------------------------------------
// applyPolicy
// ---------------------------------------------------------------------------

describe('applyPolicy', () => {
  describe('allow outcomes', () => {
    it('returns outcome "allow" when no restrictions are configured and event is not sensitive', () => {
      const decision = applyPolicy(makeConfig(), {
        url: 'https://app.example.com/dashboard',
        inputType: 'text',
        selector: '#search-box',
        label: 'Search',
        isSensitiveTarget: false,
      });
      expect(decision.outcome).toBe('allow');
      expect(decision.redactionApplied).toBe(false);
    });

    it('returns outcome "allow" for an event with no context fields', () => {
      const decision = applyPolicy(makeConfig(), {});
      expect(decision.outcome).toBe('allow');
      expect(decision.redactionApplied).toBe(false);
    });

    it('returns outcome "allow" when domain matches allowedDomains', () => {
      const config = makeConfig({ allowedDomains: ['app.example.com'] });
      const decision = applyPolicy(config, {
        url: 'https://app.example.com/page',
        isSensitiveTarget: false,
      });
      expect(decision.outcome).toBe('allow');
    });
  });

  describe('block outcomes — domain block list', () => {
    it('returns outcome "block" when domain is in blockedDomains', () => {
      const config = makeConfig({ blockedDomains: ['blocked.example.com'] });
      const decision = applyPolicy(config, {
        url: 'https://blocked.example.com/sensitive-page',
      });
      expect(decision.outcome).toBe('block');
      expect(decision.redactionApplied).toBe(false);
    });

    it('returns outcome "block" for case-insensitive blockedDomains match', () => {
      const config = makeConfig({ blockedDomains: ['BLOCKED.EXAMPLE.COM'] });
      const decision = applyPolicy(config, {
        url: 'https://blocked.example.com/page',
      });
      expect(decision.outcome).toBe('block');
    });
  });

  describe('block outcomes — domain allow list', () => {
    it('returns outcome "block" when allowedDomains is non-empty and domain is NOT in list', () => {
      const config = makeConfig({ allowedDomains: ['allowed.example.com'] });
      const decision = applyPolicy(config, {
        url: 'https://other.example.com/page',
      });
      expect(decision.outcome).toBe('block');
      expect(decision.redactionApplied).toBe(false);
    });

    it('empty allowedDomains does not block any domain', () => {
      const config = makeConfig({ allowedDomains: [] });
      const decision = applyPolicy(config, {
        url: 'https://any.example.com/page',
      });
      expect(decision.outcome).toBe('allow');
    });
  });

  describe('redact outcomes', () => {
    it('returns outcome "redact" when isSensitiveTarget is true', () => {
      const decision = applyPolicy(makeConfig(), {
        url: 'https://app.example.com/form',
        isSensitiveTarget: true,
      });
      expect(decision.outcome).toBe('redact');
      expect(decision.redactionApplied).toBe(true);
    });

    it('returns outcome "redact" when inputType is "password"', () => {
      const decision = applyPolicy(makeConfig(), {
        url: 'https://app.example.com/login',
        inputType: 'password',
      });
      expect(decision.outcome).toBe('redact');
      expect(decision.redactionApplied).toBe(true);
    });

    it('returns outcome "redact" when selector matches a sensitive pattern', () => {
      const decision = applyPolicy(makeConfig(), {
        url: 'https://app.example.com/form',
        selector: 'input#ssn',
      });
      expect(decision.outcome).toBe('redact');
      expect(decision.redactionApplied).toBe(true);
    });

    it('returns outcome "redact" when label matches a sensitive pattern via classifier', () => {
      // Use "ssn" — matches /ssn/i pattern. "Social Security Number" does not match
      // due to the space separator limitation in classifySensitivity (tracked debt).
      const decision = applyPolicy(makeConfig(), {
        url: 'https://app.example.com/form',
        label: 'ssn',
      });
      expect(decision.outcome).toBe('redact');
      expect(decision.redactionApplied).toBe(true);
    });
  });

  describe('priority ordering', () => {
    it('block takes priority over redact when domain is blocked and target is sensitive', () => {
      const config = makeConfig({ blockedDomains: ['blocked.example.com'] });
      const decision = applyPolicy(config, {
        url: 'https://blocked.example.com/form',
        isSensitiveTarget: true,
        inputType: 'password',
      });
      // Domain block check runs before sensitivity check
      expect(decision.outcome).toBe('block');
      expect(decision.redactionApplied).toBe(false);
    });

    it('allow-list block takes priority over redact when domain not in allow list and target is sensitive', () => {
      const config = makeConfig({ allowedDomains: ['allowed.example.com'] });
      const decision = applyPolicy(config, {
        url: 'https://other.example.com/form',
        isSensitiveTarget: true,
      });
      expect(decision.outcome).toBe('block');
    });
  });

  describe('decision shape', () => {
    it('always returns a reason string', () => {
      const decision = applyPolicy(makeConfig(), { url: 'https://app.example.com/' });
      expect(typeof decision.reason).toBe('string');
      expect(decision.reason.length).toBeGreaterThan(0);
    });

    it('redactionApplied is false on allow outcome', () => {
      const decision = applyPolicy(makeConfig(), {});
      expect(decision.redactionApplied).toBe(false);
    });

    it('redactionApplied is false on block outcome', () => {
      const config = makeConfig({ blockedDomains: ['bad.com'] });
      const decision = applyPolicy(config, { url: 'https://bad.com/page' });
      expect(decision.redactionApplied).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_POLICY
// ---------------------------------------------------------------------------

describe('DEFAULT_POLICY', () => {
  it('has empty blockedDomains', () => {
    expect(DEFAULT_POLICY.blockedDomains).toEqual([]);
  });

  it('has empty allowedDomains', () => {
    expect(DEFAULT_POLICY.allowedDomains).toEqual([]);
  });

  it('has ruleVersion "1.0.0"', () => {
    expect(DEFAULT_POLICY.ruleVersion).toBe('1.0.0');
  });

  it('has captureTextInputValues false', () => {
    expect(DEFAULT_POLICY.captureTextInputValues).toBe(false);
  });

  it('has captureScreenshots false', () => {
    expect(DEFAULT_POLICY.captureScreenshots).toBe(false);
  });

  it('has captureDomSnapshots false', () => {
    expect(DEFAULT_POLICY.captureDomSnapshots).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createPolicyLog
// ---------------------------------------------------------------------------

describe('createPolicyLog', () => {
  it('returns an entry with all required fields', () => {
    const decision = applyPolicy(makeConfig(), {
      url: 'https://app.example.com/',
      isSensitiveTarget: true,
    });
    const entry = createPolicyLog('session-001', 'event-uuid-123', decision, 5000);

    expect(entry).toHaveProperty('sessionId', 'session-001');
    expect(entry).toHaveProperty('eventId', 'event-uuid-123');
    expect(entry).toHaveProperty('t_ms', 5000);
    expect(entry).toHaveProperty('outcome');
    expect(entry).toHaveProperty('reason');
  });

  it('propagates the outcome from the PolicyDecision', () => {
    const allowDecision = applyPolicy(makeConfig(), {});
    const allowEntry = createPolicyLog('s', 'e', allowDecision, 0);
    expect(allowEntry.outcome).toBe('allow');

    const blockConfig = makeConfig({ blockedDomains: ['bad.com'] });
    const blockDecision = applyPolicy(blockConfig, { url: 'https://bad.com/' });
    const blockEntry = createPolicyLog('s', 'e', blockDecision, 0);
    expect(blockEntry.outcome).toBe('block');

    const redactDecision = applyPolicy(makeConfig(), { isSensitiveTarget: true });
    const redactEntry = createPolicyLog('s', 'e', redactDecision, 0);
    expect(redactEntry.outcome).toBe('redact');
  });

  it('propagates the reason string from the PolicyDecision', () => {
    const decision = applyPolicy(makeConfig(), { inputType: 'password' });
    const entry = createPolicyLog('session-002', 'event-abc', decision, 1234);
    expect(entry.reason).toBe(decision.reason);
  });

  it('stores the provided t_ms value', () => {
    const decision = applyPolicy(makeConfig(), {});
    const entry = createPolicyLog('s', 'e', decision, 99999);
    expect(entry.t_ms).toBe(99999);
  });
});
