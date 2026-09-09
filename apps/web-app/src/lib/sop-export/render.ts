import type { SopTemplatePage } from '@/content/types';
import type { SopExportDocument, SopExportFormat } from './types';
import { UnsupportedSopExportFormatError } from './types';
import { renderSopTemplateMarkdown } from './markdown';
import { sopExportFilename } from './filename';

/**
 * Single entry point for all consumers (route handler, tests, future UI).
 * Defaults to `'markdown'`. THROWS `UnsupportedSopExportFormatError` on an
 * unknown format — fail loudly, never silently fall back to markdown.
 */
export function renderSopExport(
  page: SopTemplatePage,
  options?: { readonly format?: SopExportFormat },
): SopExportDocument {
  const format = options?.format ?? 'markdown';

  if (format !== 'markdown') {
    throw new UnsupportedSopExportFormatError(format);
  }

  return {
    format: 'markdown',
    filename: sopExportFilename(page, format),
    contentType: 'text/markdown; charset=utf-8',
    body: renderSopTemplateMarkdown(page),
  };
}
