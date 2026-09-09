import type { SopTemplatePage } from '@/content/types';
import type { SopExportFormat } from './types';

/** File extension per export format. Never contains a date. */
const EXTENSION_BY_FORMAT: Record<SopExportFormat, string> = {
  markdown: 'md',
};

/**
 * `${page.slug}.${ext}`. Never contains a date. ASCII-only by construction —
 * `page.slug` is kebab-regex-validated at build time
 * (apps/web-app/src/lib/seo/validate.ts:191, `SLUG_RE`), so this filename is
 * always safe to interpolate unescaped into a `Content-Disposition` header.
 */
export function sopExportFilename(page: Pick<SopTemplatePage, 'slug'>, format: SopExportFormat): string {
  return `${page.slug}.${EXTENSION_BY_FORMAT[format]}`;
}
