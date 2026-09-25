/**
 * entryKind — classification tests.
 *
 * The load-bearing property is NOT that `date` maps to `'date'`; it is that an
 * unrecognised or absent control type degrades to `'unknown'` so the renderers
 * fall back to today's wording instead of inventing a description of a control
 * nobody identified.
 */

import { describe, it, expect } from 'vitest';
import { classifyEntryKind, isChoiceEntry, ENTRY_KINDS, type EntryKind } from './entryKind.js';

describe('classifyEntryKind: recognised control types', () => {
  const cases: Array<[string, EntryKind]> = [
    ['text', 'text'],
    ['email', 'email'],
    ['number', 'number'],
    ['tel', 'phone'],
    ['date', 'date'],
    ['month', 'date'],
    ['week', 'date'],
    ['time', 'time'],
    ['datetime-local', 'datetime'],
    ['url', 'url'],
    ['search', 'search'],
    ['password', 'password'],
    ['checkbox', 'checkbox'],
    ['radio', 'radio'],
    ['file', 'file'],
    ['textarea', 'textarea'],
    ['select-one', 'select'],
    ['select-multiple', 'multiselect'],
    ['select', 'select'],
  ];

  for (const [dom, expected] of cases) {
    it(`maps "${dom}" to ${expected}`, () => {
      expect(classifyEntryKind(dom)).toBe(expected);
    });
  }
});

describe('classifyEntryKind: degrades rather than guesses', () => {
  it('returns unknown for undefined', () => {
    expect(classifyEntryKind(undefined)).toBe('unknown');
  });

  it('returns unknown for null', () => {
    expect(classifyEntryKind(null)).toBe('unknown');
  });

  it('returns unknown for an empty or whitespace-only string', () => {
    expect(classifyEntryKind('')).toBe('unknown');
    expect(classifyEntryKind('   ')).toBe('unknown');
  });

  it('returns unknown for control types we do not recognise', () => {
    // A custom element or a tag the inspector fell back to. The renderer must
    // keep today's generic wording rather than name something it cannot name.
    expect(classifyEntryKind('div')).toBe('unknown');
    expect(classifyEntryKind('ion-input')).toBe('unknown');
    expect(classifyEntryKind('color')).toBe('unknown');
  });

  it('does not inherit from Object.prototype', () => {
    // Guards the lookup against `constructor`/`toString` resolving to a
    // function via the prototype chain.
    expect(classifyEntryKind('constructor')).toBe('unknown');
    expect(classifyEntryKind('toString')).toBe('unknown');
    expect(classifyEntryKind('__proto__')).toBe('unknown');
  });
});

describe('classifyEntryKind: normalisation', () => {
  it('is case-insensitive, because HTML type is', () => {
    expect(classifyEntryKind('EMAIL')).toBe('email');
    expect(classifyEntryKind('Date')).toBe('date');
    expect(classifyEntryKind('DATETIME-LOCAL')).toBe('datetime');
  });

  it('trims surrounding whitespace from the serialization boundary', () => {
    expect(classifyEntryKind('  number  ')).toBe('number');
  });

  it('is deterministic across repeated calls', () => {
    const out = new Set(Array.from({ length: 10 }, () => classifyEntryKind('tel')));
    expect(out.size).toBe(1);
    expect([...out][0]).toBe('phone');
  });
});

describe('isChoiceEntry', () => {
  it('is true only for choices made from visible options', () => {
    const choices = ENTRY_KINDS.filter(isChoiceEntry).sort();
    expect(choices).toEqual(['checkbox', 'multiselect', 'radio', 'select']);
  });

  it('is false for every free-entry kind, including unknown', () => {
    expect(isChoiceEntry('text')).toBe(false);
    expect(isChoiceEntry('textarea')).toBe(false);
    expect(isChoiceEntry('file')).toBe(false);
    expect(isChoiceEntry('unknown')).toBe(false);
  });
});

describe('the taxonomy is closed and frozen', () => {
  it('ENTRY_KINDS lists every declared member exactly once', () => {
    expect(new Set(ENTRY_KINDS).size).toBe(ENTRY_KINDS.length);
    expect(ENTRY_KINDS).toContain('unknown');
  });

  it('is frozen, so a consumer cannot widen it at runtime', () => {
    expect(Object.isFrozen(ENTRY_KINDS)).toBe(true);
  });

  it('never returns a value outside the closed union', () => {
    const probes = ['date', 'nonsense', '', 'SELECT-ONE', 'file', 'proto'];
    for (const p of probes) {
      expect(ENTRY_KINDS).toContain(classifyEntryKind(p));
    }
  });
});
