/**
 * Entry-kind classification for input steps.
 *
 * The recorder already captures the control type — `target-inspector.ts` records
 * `el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase()` — and
 * until now both SOP renderers discarded it, rendering every typed step as
 * "Enter data in the X field" whether X was a date picker, a dropdown or a
 * free-text box. This module turns that captured type into a closed set the
 * renderers can describe. See `docs/features/field-capture/FIELD_CAPTURE_REVIEW_001.md`
 * §1 and §4 (Phase 1).
 *
 * What this does NOT do, and must never do: describe the VALUE. Ledgerium does
 * not capture what the user typed — `captureInputChange` records only
 * `value_present: boolean` — so a generated instruction may name the kind of
 * field ("a date"), never its contents. Every string derived from an EntryKind
 * has to remain true for any value the field could hold.
 *
 * Deterministic: same `elementType` in, same `EntryKind` out. No clock, no
 * randomness, no I/O.
 */

/**
 * Closed union. Values are OUR taxonomy, not raw DOM strings, so that
 * `datetime-local` and `date` can converge and unknown DOM types degrade to a
 * single honest bucket rather than leaking a tag name into prose.
 */
export type EntryKind =
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'url'
  | 'search'
  | 'password'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'file'
  | 'unknown';

/**
 * Raw DOM type/tag → our taxonomy. Anything absent maps to `'unknown'`, which
 * renders as today's wording — an unrecognised control must not invent a
 * description of itself.
 */
const DOM_TYPE_TO_ENTRY_KIND: Readonly<Record<string, EntryKind>> = Object.freeze({
  // <input type="...">
  text: 'text',
  email: 'email',
  number: 'number',
  tel: 'phone',
  date: 'date',
  month: 'date',
  week: 'date',
  time: 'time',
  'datetime-local': 'datetime',
  url: 'url',
  search: 'search',
  password: 'password',
  checkbox: 'checkbox',
  radio: 'radio',
  file: 'file',
  // tagName fallbacks, lower-cased by the inspector
  textarea: 'textarea',
  'select-one': 'select',
  'select-multiple': 'multiselect',
  select: 'select',
});

/**
 * Classify a captured element type.
 *
 * Returns `'unknown'` for undefined, empty, whitespace-only or unrecognised
 * input. Case-insensitive because `type` is case-insensitive in HTML, and
 * trimmed because the value crosses a serialization boundary.
 */
export function classifyEntryKind(elementType: string | undefined | null): EntryKind {
  if (typeof elementType !== 'string') return 'unknown';
  const normalized = elementType.trim().toLowerCase();
  if (normalized === '') return 'unknown';
  // Own-property check, not a bare lookup: `elementType` comes from the DOM and
  // is attacker-influencable, so `constructor` / `toString` / `__proto__` would
  // otherwise resolve through the prototype chain to a function, which `??`
  // does not catch. Caught by test, not by inspection.
  if (!Object.prototype.hasOwnProperty.call(DOM_TYPE_TO_ENTRY_KIND, normalized)) return 'unknown';
  return DOM_TYPE_TO_ENTRY_KIND[normalized] ?? 'unknown';
}

/**
 * True when the kind is a choice made from options visible on screen rather
 * than free typing. These read better with a different verb ("Select" rather
 * than "Enter"), and they are also the only kinds where surfacing the CHOSEN
 * option could ever be honest — a selected option comes from a closed list the
 * user picked from, not from typed content. That is deliberately out of scope
 * here; this flag exists so the distinction is drawn in one place.
 */
export function isChoiceEntry(kind: EntryKind): boolean {
  return kind === 'checkbox' || kind === 'radio' || kind === 'select' || kind === 'multiselect';
}

/**
 * Compile-time exhaustiveness lock. If a member is added to `EntryKind` without
 * being handled by the renderers' switch, this fails the build rather than
 * silently falling through to a generic string.
 */
const _DECLARED_ENTRY_KINDS = [
  'text',
  'email',
  'number',
  'phone',
  'date',
  'time',
  'datetime',
  'url',
  'search',
  'password',
  'checkbox',
  'radio',
  'select',
  'multiselect',
  'textarea',
  'file',
  'unknown',
] as const satisfies readonly EntryKind[];

export const ENTRY_KINDS: readonly EntryKind[] = Object.freeze([..._DECLARED_ENTRY_KINDS]);

type _EntryKindExhaustive =
  Exclude<EntryKind, (typeof _DECLARED_ENTRY_KINDS)[number]> extends never ? true : never;
const _entryKindExhaustive: _EntryKindExhaustive = true;
void _entryKindExhaustive;
