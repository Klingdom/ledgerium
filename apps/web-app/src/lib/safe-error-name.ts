/**
 * Reduce any thrown value to an error CONSTRUCTOR NAME that is safe to send to
 * analytics — `TypeError`, `RangeError` — and never its message or stack.
 *
 * Extracted from `ErrorBoundary.describeBoundaryError` (row #92) so that every
 * client-side error report applies the same rule (row #246 added the route and
 * root boundaries as a second and third caller). The rule exists because error
 * messages in this codebase routinely interpolate the thing that broke — a
 * workflow title, a step label, a captured field name — and a crash report is
 * exactly the path by which recorded content would leak into a third party.
 *
 * `throw` accepts any value, so this must survive strings, plain objects,
 * `null`, and objects with a hostile `name`. Anything it cannot classify becomes
 * `'UnknownError'` rather than being coerced into a string, because coercing an
 * unknown throw is precisely how a message ends up in the payload.
 */
export function safeErrorName(error: unknown): string {
  let errorName = 'UnknownError';

  if (error instanceof Error && typeof error.name === 'string' && error.name.trim() !== '') {
    errorName = error.name.trim();
  }

  // A name is an identifier, not prose. Anything longer than a generous
  // identifier, or containing whitespace, is not a constructor name — it is
  // someone's message wearing one. Reject rather than truncate: a truncated
  // message is still a message.
  if (errorName.length > 40 || /\s/.test(errorName)) {
    errorName = 'UnknownError';
  }

  return errorName;
}
