import { describe, it, expect } from 'vitest';
import {
  CanonicalEventSchema,
  validateCanonicalEvent,
  isNavigationEvent,
  isInteractionEvent,
  isSessionEvent,
  isSystemEvent,
  isDerivedEvent,
} from './canonical-event.schema.js';
import type { CanonicalEvent } from './canonical-event.schema.js';

// ---------------------------------------------------------------------------
// Shared fixture builders
// ---------------------------------------------------------------------------

const VALID_NORMALIZATION_META = {
  sourceEventId: '550e8400-e29b-41d4-a716-446655440099',
  sourceEventType: 'click',
  normalizationRuleVersion: '1.0.0',
  redactionApplied: false,
};

const MINIMAL_VALID_EVENT: Record<string, unknown> = {
  event_id: '550e8400-e29b-41d4-a716-446655440000',
  schema_version: '1.0.0',
  session_id: 'session-canonical-001',
  t_ms: 1000,
  t_wall: '2026-01-15T10:00:00.000Z',
  event_type: 'interaction.click',
  actor_type: 'human',
  normalization_meta: VALID_NORMALIZATION_META,
};

function makeEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...MINIMAL_VALID_EVENT, ...overrides };
}

function makeCanonicalEvent(overrides: Partial<CanonicalEvent> = {}): CanonicalEvent {
  return validateCanonicalEvent(makeEvent(overrides as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// One canonical event per category for predicate tests
// ---------------------------------------------------------------------------

const NAV_EVENT = makeCanonicalEvent({ event_type: 'navigation.open_page' });
const INTERACTION_EVENT = makeCanonicalEvent({ event_type: 'interaction.click' });
const SESSION_EVENT = makeCanonicalEvent({ event_type: 'session.started', actor_type: 'recorder' });
const SYSTEM_EVENT = makeCanonicalEvent({
  event_type: 'system.redaction_applied',
  actor_type: 'system',
});
const DERIVED_EVENT = makeCanonicalEvent({
  event_type: 'derived.step_boundary_detected',
  actor_type: 'system',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanonicalEventSchema', () => {
  describe('valid events', () => {
    it('parses a minimal valid canonical event', () => {
      const result = CanonicalEventSchema.safeParse(MINIMAL_VALID_EVENT);
      expect(result.success).toBe(true);
    });

    it('parses an event with full page_context', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({
          page_context: {
            url: 'https://app.salesforce.com/leads',
            urlNormalized: 'https://app.salesforce.com/leads',
            domain: 'app.salesforce.com',
            routeTemplate: '/leads',
            pageTitle: 'Leads',
            applicationLabel: 'Salesforce',
            moduleLabel: 'CRM',
          },
        }),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page_context?.applicationLabel).toBe('Salesforce');
        expect(result.data.page_context?.moduleLabel).toBe('CRM');
      }
    });

    it('parses page_context without optional moduleLabel', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({
          page_context: {
            url: 'https://app.example.com/',
            urlNormalized: 'https://app.example.com/',
            domain: 'app.example.com',
            routeTemplate: '/',
            pageTitle: 'Home',
            applicationLabel: 'App',
          },
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('target_summary selectorConfidence bounds', () => {
    it('accepts selectorConfidence of 0.0', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({
          target_summary: { isSensitive: false, selectorConfidence: 0.0 },
        }),
      );
      expect(result.success).toBe(true);
    });

    it('accepts selectorConfidence of 1.0', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({
          target_summary: { isSensitive: false, selectorConfidence: 1.0 },
        }),
      );
      expect(result.success).toBe(true);
    });

    it('fails for selectorConfidence of 1.1 (above max)', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({
          target_summary: { isSensitive: false, selectorConfidence: 1.1 },
        }),
      );
      expect(result.success).toBe(false);
    });

    it('fails for selectorConfidence of -0.1 (below min)', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({
          target_summary: { isSensitive: false, selectorConfidence: -0.1 },
        }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe('event_type validation', () => {
    it('fails for invalid event_type "interaction.hover"', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({ event_type: 'interaction.hover' }),
      );
      expect(result.success).toBe(false);
    });

    it('fails for empty string event_type', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({ event_type: '' }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe('actor_type validation', () => {
    it('fails for actor_type "bot" (invalid)', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({ actor_type: 'bot' }),
      );
      expect(result.success).toBe(false);
    });

    it('accepts actor_type "human"', () => {
      const result = CanonicalEventSchema.safeParse(makeEvent({ actor_type: 'human' }));
      expect(result.success).toBe(true);
    });

    it('accepts actor_type "system"', () => {
      const result = CanonicalEventSchema.safeParse(makeEvent({ actor_type: 'system' }));
      expect(result.success).toBe(true);
    });

    it('accepts actor_type "recorder"', () => {
      const result = CanonicalEventSchema.safeParse(makeEvent({ actor_type: 'recorder' }));
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('fails when normalization_meta is missing', () => {
      const { normalization_meta: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = CanonicalEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when event_id is not a UUID', () => {
      const result = CanonicalEventSchema.safeParse(
        makeEvent({ event_id: 'not-a-uuid' }),
      );
      expect(result.success).toBe(false);
    });
  });
});

describe('validateCanonicalEvent', () => {
  it('returns a parsed event for valid input', () => {
    const event = validateCanonicalEvent(MINIMAL_VALID_EVENT);
    expect(event.session_id).toBe('session-canonical-001');
    expect(event.schema_version).toBe('1.0.0');
  });

  it('throws a ZodError for invalid input', () => {
    expect(() => validateCanonicalEvent({ not: 'valid' })).toThrow();
  });
});

describe('type predicate functions', () => {
  describe('isNavigationEvent', () => {
    it('returns true for a navigation event', () => {
      expect(isNavigationEvent(NAV_EVENT)).toBe(true);
    });

    it('returns false for interaction, session, system, and derived events', () => {
      expect(isNavigationEvent(INTERACTION_EVENT)).toBe(false);
      expect(isNavigationEvent(SESSION_EVENT)).toBe(false);
      expect(isNavigationEvent(SYSTEM_EVENT)).toBe(false);
      expect(isNavigationEvent(DERIVED_EVENT)).toBe(false);
    });
  });

  describe('isInteractionEvent', () => {
    it('returns true for an interaction event', () => {
      expect(isInteractionEvent(INTERACTION_EVENT)).toBe(true);
    });

    it('returns false for navigation, session, system, and derived events', () => {
      expect(isInteractionEvent(NAV_EVENT)).toBe(false);
      expect(isInteractionEvent(SESSION_EVENT)).toBe(false);
      expect(isInteractionEvent(SYSTEM_EVENT)).toBe(false);
      expect(isInteractionEvent(DERIVED_EVENT)).toBe(false);
    });
  });

  describe('isSessionEvent', () => {
    it('returns true for a session event', () => {
      expect(isSessionEvent(SESSION_EVENT)).toBe(true);
    });

    it('returns false for navigation, interaction, system, and derived events', () => {
      expect(isSessionEvent(NAV_EVENT)).toBe(false);
      expect(isSessionEvent(INTERACTION_EVENT)).toBe(false);
      expect(isSessionEvent(SYSTEM_EVENT)).toBe(false);
      expect(isSessionEvent(DERIVED_EVENT)).toBe(false);
    });
  });

  describe('isSystemEvent', () => {
    it('returns true for a system event', () => {
      expect(isSystemEvent(SYSTEM_EVENT)).toBe(true);
    });

    it('returns false for navigation, interaction, session, and derived events', () => {
      expect(isSystemEvent(NAV_EVENT)).toBe(false);
      expect(isSystemEvent(INTERACTION_EVENT)).toBe(false);
      expect(isSystemEvent(SESSION_EVENT)).toBe(false);
      expect(isSystemEvent(DERIVED_EVENT)).toBe(false);
    });
  });

  describe('isDerivedEvent', () => {
    it('returns true for a derived event', () => {
      expect(isDerivedEvent(DERIVED_EVENT)).toBe(true);
    });

    it('returns false for navigation, interaction, session, and system events', () => {
      expect(isDerivedEvent(NAV_EVENT)).toBe(false);
      expect(isDerivedEvent(INTERACTION_EVENT)).toBe(false);
      expect(isDerivedEvent(SESSION_EVENT)).toBe(false);
      expect(isDerivedEvent(SYSTEM_EVENT)).toBe(false);
    });
  });

  it('each predicate is mutually exclusive across all categories', () => {
    const allEvents = [NAV_EVENT, INTERACTION_EVENT, SESSION_EVENT, SYSTEM_EVENT, DERIVED_EVENT];
    const predicates = [
      isNavigationEvent,
      isInteractionEvent,
      isSessionEvent,
      isSystemEvent,
      isDerivedEvent,
    ];

    for (const event of allEvents) {
      const trueCount = predicates.filter((p) => p(event)).length;
      expect(trueCount).toBe(1);
    }
  });
});
