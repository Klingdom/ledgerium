import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PERSONA_CATALOG,
  DEFAULT_PERSONA_KEY,
  getPersonaByKey,
  getDefaultPersona,
} from './persona-costs';

describe('persona-costs catalog', () => {
  it('has unique keys and positive loaded rates', () => {
    const keys = DEFAULT_PERSONA_CATALOG.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of DEFAULT_PERSONA_CATALOG) {
      expect(p.loadedHourlyRate).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });

  it('is sorted ascending by loaded rate', () => {
    for (let i = 1; i < DEFAULT_PERSONA_CATALOG.length; i++) {
      expect(DEFAULT_PERSONA_CATALOG[i]!.loadedHourlyRate).toBeGreaterThanOrEqual(
        DEFAULT_PERSONA_CATALOG[i - 1]!.loadedHourlyRate,
      );
    }
  });

  it('includes the default persona (Knowledge Worker $55)', () => {
    const def = getPersonaByKey(DEFAULT_PERSONA_KEY);
    expect(def).not.toBeNull();
    expect(def!.label).toBe('Knowledge Worker');
    expect(def!.loadedHourlyRate).toBe(55);
    expect(getDefaultPersona().key).toBe(DEFAULT_PERSONA_KEY);
  });

  it('getPersonaByKey returns null for unknown / empty keys (never imputes a rate)', () => {
    expect(getPersonaByKey('nope')).toBeNull();
    expect(getPersonaByKey(null)).toBeNull();
    expect(getPersonaByKey(undefined)).toBeNull();
    expect(getPersonaByKey('')).toBeNull();
  });

  it('is frozen (immutable catalog)', () => {
    expect(Object.isFrozen(DEFAULT_PERSONA_CATALOG)).toBe(true);
  });
});
