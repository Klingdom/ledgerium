/**
 * Instruction phrasing for input steps, derived from the captured control type.
 *
 * Two renderers generate these instructions — `sopBuilder.ts` (terse, no app
 * name, no trailing period) and `stepAnalyzer.ts` (names the app, ends in a
 * period). They must never describe the same control type with different words,
 * so the vocabulary lives here once and each renderer supplies only its own
 * sentence frame.
 *
 * Wording is from the growth-strategist consult at loop 49 (D-4 clause 1) and is
 * applied verbatim. Three of its rulings are load-bearing and are encoded here
 * rather than left to the caller:
 *
 *  1. `text` / `textarea` / `search` return `undefined` — naming "text" adds
 *     nothing a reader had not already assumed, and a string that adds nothing
 *     is noise. Callers keep their existing wording.
 *  2. `checkbox` and `radio` drop the "field" noun. Their accessible label is
 *     normally the option or statement itself ("Standard Shipping", "Active"),
 *     not a field name, so "Select 'Standard Shipping' field" is broken English
 *     and misdescribes what was captured.
 *  3. `password` returns `undefined`. It must never acquire a wording path of
 *     its own; `sopBuilder`'s sensitive branch already short-circuits before
 *     this is consulted, and `stepAnalyzer` keeps its existing generic string.
 *
 * What this must never do: describe the VALUE. The recorder stores
 * `value_present: boolean` and nothing else, so every phrase here has to stay
 * true for any content the field could hold. No format hints either — `pattern`
 * and `placeholder` are not captured today, so "(MM/DD/YYYY)" would be an
 * invented claim.
 *
 * Deterministic: same kind + label in, same string out.
 */

import { type EntryKind } from './entryKind.js';

/** How the instruction is framed around the label, per control type. */
type Frame =
  /** "... in the "{label}" field" — the label names a field. */
  | { readonly shape: 'field'; readonly verbPhrase: string }
  /** "... "{label}"" — the label IS the option or statement. */
  | { readonly shape: 'bare'; readonly verbPhrase: string };

/**
 * `undefined` means "this control type adds no useful information" — the caller
 * keeps whatever it renders today. That is a deliberate outcome, not a gap.
 */
const FRAMES: Readonly<Partial<Record<EntryKind, Frame>>> = Object.freeze({
  email: { shape: 'field', verbPhrase: 'Enter an email address' },
  number: { shape: 'field', verbPhrase: 'Enter a number' },
  phone: { shape: 'field', verbPhrase: 'Enter a phone number' },
  date: { shape: 'field', verbPhrase: 'Enter a date' },
  datetime: { shape: 'field', verbPhrase: 'Enter a date and time' },
  time: { shape: 'field', verbPhrase: 'Enter a time' },
  url: { shape: 'field', verbPhrase: 'Enter a web address' },
  file: { shape: 'field', verbPhrase: 'Attach a file' },
  select: { shape: 'field', verbPhrase: 'Select an option' },
  multiselect: { shape: 'field', verbPhrase: 'Select one or more options' },
  // Label is the option/statement itself — no "field" noun.
  radio: { shape: 'bare', verbPhrase: 'Select' },
  checkbox: { shape: 'bare', verbPhrase: 'Check or uncheck' },
});

function frameFor(kind: EntryKind): Frame | undefined {
  return Object.prototype.hasOwnProperty.call(FRAMES, kind) ? FRAMES[kind] : undefined;
}

/**
 * Terse frame — `sopBuilder` register. No app name, no trailing period.
 *
 * Returns `undefined` when the control type adds nothing, when the kind is
 * unknown, or when there is no label to anchor the sentence.
 */
export function phraseInputStepTerse(kind: EntryKind, label: string | undefined): string | undefined {
  if (label === undefined || label.trim() === '') return undefined;
  const frame = frameFor(kind);
  if (frame === undefined) return undefined;
  return frame.shape === 'field'
    ? `${frame.verbPhrase} in "${label}"`
    : `${frame.verbPhrase} "${label}"`;
}

/**
 * Narrative frame — `stepAnalyzer` register. Names the application and ends in
 * a period. Same vocabulary as the terse frame by construction.
 */
export function phraseInputStepNarrative(
  kind: EntryKind,
  label: string | undefined,
  appLabel: string,
): string | undefined {
  if (label === undefined || label.trim() === '') return undefined;
  const frame = frameFor(kind);
  if (frame === undefined) return undefined;
  return frame.shape === 'field'
    ? `${frame.verbPhrase} in the "${label}" field in ${appLabel}.`
    : `${frame.verbPhrase} "${label}" in ${appLabel}.`;
}
