import { describe, it, expect } from 'vitest';
import { getBySlug } from '@/content/registry';
import type { SopTemplatePage } from '@/content/types';
import { renderSopExport } from './render';
import { UnsupportedSopExportFormatError } from './types';

const page = getBySlug('sopTemplate', 'invoice-approval-sop-template') as SopTemplatePage;

describe('renderSopExport — format dispatch (T13)', () => {
  it('defaults to markdown when no options are passed', () => {
    const doc = renderSopExport(page);
    expect(doc.format).toBe('markdown');
    expect(doc.contentType).toBe('text/markdown; charset=utf-8');
    expect(doc.filename).toBe('invoice-approval-sop-template.md');
    expect(doc.body.length).toBeGreaterThan(0);
  });

  it('defaults to markdown when options.format is explicitly "markdown"', () => {
    const doc = renderSopExport(page, { format: 'markdown' });
    expect(doc.format).toBe('markdown');
  });

  it('throws UnsupportedSopExportFormatError for an unknown format, never silently falling back', () => {
    expect(() => renderSopExport(page, { format: 'docx' as never })).toThrow(UnsupportedSopExportFormatError);
  });

  it('is byte-identical to renderSopTemplateMarkdown for the same page', async () => {
    const { renderSopTemplateMarkdown } = await import('./markdown');
    const doc = renderSopExport(page);
    expect(doc.body).toBe(renderSopTemplateMarkdown(page));
  });
});
