/**
 * stepPhrasing — wording derived from the captured control type, plus the
 * end-to-end wiring into the renderer.
 *
 * The unit tests pin the growth consult's rulings. The wiring tests exist
 * because the entire process-engine suite passed unchanged when this shipped —
 * which meant no golden fixture exercised a typed input, so the new behaviour
 * had no end-to-end coverage at all.
 */

import { describe, it, expect } from 'vitest';
import { phraseInputStepTerse, phraseInputStepNarrative } from './stepPhrasing.js';
import { analyzeStep } from './stepAnalyzer.js';
import type { CanonicalEventInput, DerivedStepInput } from './types.js';
import type { EntryKind } from './entryKind.js';

const NOW = 1_773_489_600_000;
const SESSION_ID = 'sess-phrasing';

function inputEvent(elementType: string | undefined, label = 'Due'): CanonicalEventInput {
  return {
    event_id: 'e1',
    session_id: SESSION_ID,
    t_ms: NOW,
    t_wall: new Date(NOW).toISOString(),
    event_type: 'interaction.input_change',
    actor_type: 'human',
    page_context: {
      url: 'https://app.com/page',
      urlNormalized: 'https://app.com/page',
      domain: 'app.com',
      routeTemplate: '/page',
      pageTitle: 'Page',
      applicationLabel: 'Salesforce',
    },
    target_summary: {
      label,
      role: 'textbox',
      isSensitive: false,
      ...(elementType !== undefined && { elementType }),
    },
    normalization_meta: {
      sourceEventId: 'e1',
      sourceEventType: 'interaction.input_change',
      normalizationRuleVersion: '1.0.0',
      redactionApplied: false,
    },
  };
}

function singleStep(): DerivedStepInput {
  return {
    step_id: `${SESSION_ID}-step-1`,
    session_id: SESSION_ID,
    ordinal: 1,
    title: 'Enter data',
    status: 'finalized',
    grouping_reason: 'single_action',
    confidence: 0.85,
    source_event_ids: ['e1'],
    start_t_ms: NOW,
  };
}

describe('phrasing: kinds that carry information', () => {
  const cases: Array<[EntryKind, string, string]> = [
    ['email', 'Enter an email address in "Due"', 'Enter an email address in the "Due" field in Salesforce.'],
    ['number', 'Enter a number in "Due"', 'Enter a number in the "Due" field in Salesforce.'],
    ['phone', 'Enter a phone number in "Due"', 'Enter a phone number in the "Due" field in Salesforce.'],
    ['date', 'Enter a date in "Due"', 'Enter a date in the "Due" field in Salesforce.'],
    ['datetime', 'Enter a date and time in "Due"', 'Enter a date and time in the "Due" field in Salesforce.'],
    ['time', 'Enter a time in "Due"', 'Enter a time in the "Due" field in Salesforce.'],
    ['url', 'Enter a web address in "Due"', 'Enter a web address in the "Due" field in Salesforce.'],
    ['file', 'Attach a file in "Due"', 'Attach a file in the "Due" field in Salesforce.'],
    ['select', 'Select an option in "Due"', 'Select an option in the "Due" field in Salesforce.'],
    [
      'multiselect',
      'Select one or more options in "Due"',
      'Select one or more options in the "Due" field in Salesforce.',
    ],
  ];

  for (const [kind, terse, narrative] of cases) {
    it(`${kind} reads correctly in both registers`, () => {
      expect(phraseInputStepTerse(kind, 'Due')).toBe(terse);
      expect(phraseInputStepNarrative(kind, 'Due', 'Salesforce')).toBe(narrative);
    });
  }
});

describe('phrasing: choice controls drop the "field" noun', () => {
  // A radio or checkbox label is normally the option or statement itself, so
  // "Select 'Standard Shipping' field" would be both broken English and a
  // misdescription of what was captured.
  it('radio names the option, not a field', () => {
    expect(phraseInputStepTerse('radio', 'Standard Shipping')).toBe('Select "Standard Shipping"');
    expect(phraseInputStepNarrative('radio', 'Standard Shipping', 'Shop')).toBe(
      'Select "Standard Shipping" in Shop.',
    );
  });

  it('checkbox is a toggle, not a selection', () => {
    expect(phraseInputStepTerse('checkbox', 'Active')).toBe('Check or uncheck "Active"');
    expect(phraseInputStepNarrative('checkbox', 'Active', 'Shop')).toBe(
      'Check or uncheck "Active" in Shop.',
    );
  });

  it('select keeps the field noun, because its label names the field', () => {
    expect(phraseInputStepTerse('select', 'Shipping method')).toBe(
      'Select an option in "Shipping method"',
    );
  });
});

describe('phrasing: silence where a word would add nothing or claim too much', () => {
  it('text, textarea and search stay on the existing wording', () => {
    const quiet: EntryKind[] = ['text', 'textarea', 'search'];
    for (const kind of quiet) {
      expect(phraseInputStepTerse(kind, 'Notes')).toBeUndefined();
      expect(phraseInputStepNarrative(kind, 'Notes', 'App')).toBeUndefined();
    }
  });

  it('password never gets a wording path of its own', () => {
    expect(phraseInputStepTerse('password', 'Password')).toBeUndefined();
    expect(phraseInputStepNarrative('password', 'Password', 'App')).toBeUndefined();
  });

  it('unknown control types stay silent rather than inventing a description', () => {
    expect(phraseInputStepTerse('unknown', 'Mystery')).toBeUndefined();
  });

  it('returns undefined without a label to anchor the sentence', () => {
    expect(phraseInputStepTerse('date', undefined)).toBeUndefined();
    expect(phraseInputStepTerse('date', '   ')).toBeUndefined();
    expect(phraseInputStepNarrative('date', undefined, 'App')).toBeUndefined();
  });

  it('never mentions a value, for any kind', () => {
    const all: EntryKind[] = [
      'email', 'number', 'phone', 'date', 'datetime', 'time',
      'url', 'file', 'select', 'multiselect', 'radio', 'checkbox',
    ];
    for (const kind of all) {
      const s = phraseInputStepNarrative(kind, 'Field', 'App') ?? '';
      expect(s).not.toMatch(/\bvalue is\b|\bentered "|\btyped\b/i);
    }
  });

  it('adds no format hint, which is not captured today', () => {
    const s = phraseInputStepNarrative('date', 'Due', 'App') ?? '';
    expect(s).not.toMatch(/MM|DD|YYYY|format/i);
  });
});

describe('wiring: the renderer uses the captured control type end to end', () => {
  it('a date input produces the date wording, not the generic one', () => {
    const def = analyzeStep(singleStep(), [inputEvent('date')]);
    expect(def.operationalDefinition).toBe('Enter a date in the "Due" field in Salesforce.');
  });

  it('an unrecognised control type keeps the pre-existing wording', () => {
    const def = analyzeStep(singleStep(), [inputEvent('ion-datepicker')]);
    expect(def.operationalDefinition).toBe('Enter data in the "Due" field in Salesforce.');
  });

  it('an absent control type keeps the pre-existing wording', () => {
    const def = analyzeStep(singleStep(), [inputEvent(undefined)]);
    expect(def.operationalDefinition).toBe('Enter data in the "Due" field in Salesforce.');
  });

  it('a password input keeps the generic wording and never names the field kind', () => {
    const def = analyzeStep(singleStep(), [inputEvent('password', 'Password')]);
    expect(def.operationalDefinition).toBe('Enter data in the "Password" field in Salesforce.');
    expect(def.operationalDefinition).not.toMatch(/Enter a password/i);
  });

  it('is deterministic across repeated renders', () => {
    const out = new Set(
      Array.from({ length: 5 }, () => analyzeStep(singleStep(), [inputEvent('tel')]).operationalDefinition),
    );
    expect(out.size).toBe(1);
  });
});
