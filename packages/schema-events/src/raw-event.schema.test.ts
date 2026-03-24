import { describe, it, expect } from 'vitest';
import { RawCaptureEventSchema, RawEventTypeSchema, validateRawEvent } from './raw-event.schema.js';

// Minimal valid event — only required fields
const MINIMAL_VALID_EVENT = {
  raw_event_id: '550e8400-e29b-41d4-a716-446655440000',
  session_id: 'session-abc-123',
  t_ms: 0,
  t_wall: '2026-01-15T10:00:00.000Z',
  event_type: 'click',
  schema_version: '1.0.0',
} as const;

describe('RawCaptureEventSchema', () => {
  describe('valid events', () => {
    it('parses a minimal valid event with only required fields', () => {
      const result = RawCaptureEventSchema.safeParse(MINIMAL_VALID_EVENT);
      expect(result.success).toBe(true);
    });

    it('parses a full event with all optional fields present', () => {
      const result = RawCaptureEventSchema.safeParse({
        raw_event_id: '550e8400-e29b-41d4-a716-446655440001',
        session_id: 'session-full-001',
        t_ms: 12345,
        t_wall: '2026-01-15T10:00:00.000Z',
        event_type: 'input_changed',
        tab_id: 42,
        url: 'https://app.example.com/form',
        url_normalized: 'https://app.example.com/form',
        page_title: 'My Form',
        target_selector: '#email-input',
        target_label: 'Email',
        target_role: 'textbox',
        target_element_type: 'input',
        is_sensitive_target: false,
        value_present: true,
        annotation_text: 'Filled in email',
        schema_version: '1.0.0',
      });
      expect(result.success).toBe(true);
    });

    it('defaults is_sensitive_target to false when omitted', () => {
      const result = RawCaptureEventSchema.safeParse(MINIMAL_VALID_EVENT);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_sensitive_target).toBe(false);
      }
    });
  });

  describe('required field validation', () => {
    it('fails when raw_event_id is missing', () => {
      const { raw_event_id: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = RawCaptureEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when session_id is missing', () => {
      const { session_id: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = RawCaptureEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when t_ms is missing', () => {
      const { t_ms: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = RawCaptureEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when t_wall is missing', () => {
      const { t_wall: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = RawCaptureEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when event_type is missing', () => {
      const { event_type: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = RawCaptureEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when schema_version is missing', () => {
      const { schema_version: _omitted, ...rest } = MINIMAL_VALID_EVENT;
      const result = RawCaptureEventSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('t_ms validation', () => {
    it('fails when t_ms is -1 (negative)', () => {
      const result = RawCaptureEventSchema.safeParse({ ...MINIMAL_VALID_EVENT, t_ms: -1 });
      expect(result.success).toBe(false);
    });

    it('fails when t_ms is 0.5 (float)', () => {
      const result = RawCaptureEventSchema.safeParse({ ...MINIMAL_VALID_EVENT, t_ms: 0.5 });
      expect(result.success).toBe(false);
    });

    it('accepts t_ms of 0 (zero boundary)', () => {
      const result = RawCaptureEventSchema.safeParse({ ...MINIMAL_VALID_EVENT, t_ms: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts a large positive integer t_ms', () => {
      const result = RawCaptureEventSchema.safeParse({ ...MINIMAL_VALID_EVENT, t_ms: 9999999 });
      expect(result.success).toBe(true);
    });
  });

  describe('event_type validation', () => {
    it('fails for unknown event_type "custom_event"', () => {
      const result = RawCaptureEventSchema.safeParse({
        ...MINIMAL_VALID_EVENT,
        event_type: 'custom_event',
      });
      expect(result.success).toBe(false);
    });

    it('fails for empty string event_type', () => {
      const result = RawCaptureEventSchema.safeParse({
        ...MINIMAL_VALID_EVENT,
        event_type: '',
      });
      expect(result.success).toBe(false);
    });

    // All 15 valid enum values must be accepted
    const VALID_EVENT_TYPES = [
      'tab_activated',
      'url_changed',
      'page_loaded',
      'spa_route_changed',
      'click',
      'dblclick',
      'input_changed',
      'form_submitted',
      'element_focused',
      'element_blurred',
      'session_start',
      'session_pause',
      'session_resume',
      'session_stop',
      'user_annotation',
    ] as const;

    for (const eventType of VALID_EVENT_TYPES) {
      it(`accepts valid event_type "${eventType}"`, () => {
        const result = RawCaptureEventSchema.safeParse({
          ...MINIMAL_VALID_EVENT,
          event_type: eventType,
        });
        expect(result.success).toBe(true);
      });
    }
  });

  describe('schema_version validation', () => {
    it('fails when schema_version is "2.0.0"', () => {
      const result = RawCaptureEventSchema.safeParse({
        ...MINIMAL_VALID_EVENT,
        schema_version: '2.0.0',
      });
      expect(result.success).toBe(false);
    });

    it('fails when schema_version is "1.0" (truncated)', () => {
      const result = RawCaptureEventSchema.safeParse({
        ...MINIMAL_VALID_EVENT,
        schema_version: '1.0',
      });
      expect(result.success).toBe(false);
    });

    it('accepts schema_version "1.0.0"', () => {
      const result = RawCaptureEventSchema.safeParse(MINIMAL_VALID_EVENT);
      expect(result.success).toBe(true);
    });
  });

  describe('raw_event_id format', () => {
    it('fails when raw_event_id is not a valid UUID', () => {
      const result = RawCaptureEventSchema.safeParse({
        ...MINIMAL_VALID_EVENT,
        raw_event_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('validateRawEvent', () => {
  it('returns a parsed event when input is valid', () => {
    const event = validateRawEvent(MINIMAL_VALID_EVENT);
    expect(event.raw_event_id).toBe(MINIMAL_VALID_EVENT.raw_event_id);
    expect(event.event_type).toBe('click');
    expect(event.schema_version).toBe('1.0.0');
  });

  it('throws a ZodError when input is invalid', () => {
    expect(() => validateRawEvent({ not: 'valid' })).toThrow();
  });
});

describe('RawEventTypeSchema', () => {
  it('contains exactly 15 values', () => {
    expect(RawEventTypeSchema.options).toHaveLength(15);
  });
});
