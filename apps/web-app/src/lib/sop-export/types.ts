/**
 * SOP export contract types.
 *
 * Source of truth: docs/meta/SEO_AEO_CONTENT_STRATEGY_001/sop_export_contract.md §2.
 *
 * `SopExportFormat` is deliberately named `'markdown'`, not `'md'` — the file
 * *extension* is `.md` (see filename.ts), but the discriminant naming the
 * format itself spells out the word, matching `SopExportDocument.contentType`
 * ("text/markdown") and reading unambiguously at every call site.
 */

/**
 * Phase 2 adds 'docx'. Widening this union is the ONLY change Phase 2 needs
 * at the contract boundary — every consumer that switches on `format` stays
 * exhaustiveness-checked by the compiler.
 *
 * Phase-2 determinism warning (recorded now per contract §2 D2 revision 2):
 * a `.docx` file is a ZIP archive, and ZIP central-directory entries embed a
 * per-entry last-modified timestamp. A naïve `.docx` writer therefore
 * produces different bytes on every invocation and silently violates the
 * byte-determinism guarantee this module exists to provide. Phase 2 MUST
 * zero every entry's mtime to a fixed epoch derived from `page.updatedAt`
 * (never the wall-clock time) and MUST pin its zip-writing dependency. If
 * that constraint cannot be met, `.docx` should not ship.
 */
export type SopExportFormat = 'markdown';

/**
 * Discriminated on `format` so Phase 2's binary body is additive, not
 * breaking. Consumers that switch on `format` stay exhaustiveness-checked.
 */
export interface SopExportDocument {
  readonly format: 'markdown';
  /** e.g. "invoice-approval-sop-template.md" */
  readonly filename: string;
  readonly contentType: 'text/markdown; charset=utf-8';
  /** Phase 2 'docx' variant will carry a Uint8Array here instead. */
  readonly body: string;
}

/**
 * Thrown by `renderSopExport` for a format it does not (yet) support. This is
 * a programming error, not a user-input path — the route handler never
 * passes a user-supplied format — so failing loudly here is correct: never
 * silently fall back to markdown.
 */
export class UnsupportedSopExportFormatError extends Error {
  readonly format: string;

  constructor(format: string) {
    super(`Unsupported SOP export format: "${format}"`);
    this.name = 'UnsupportedSopExportFormatError';
    this.format = format;
  }
}
