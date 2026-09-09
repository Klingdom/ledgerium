import { describe, it, expect } from 'vitest';
import { getPagesByType } from '@/content/registry';
import type { SopTemplatePage } from '@/content/types';
import { sopExportFilename } from './filename';

const PAGES = getPagesByType('sopTemplate').filter((p) => p.published) as SopTemplatePage[];

describe('sopExportFilename (T10)', () => {
  it('matches the expected filename shape for all 17 published pages', () => {
    for (const page of PAGES) {
      const filename = sopExportFilename(page, 'markdown');
      expect(filename).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
    }
  });

  it('is stable across repeated calls', () => {
    for (const page of PAGES) {
      expect(sopExportFilename(page, 'markdown')).toBe(sopExportFilename(page, 'markdown'));
    }
  });

  it('contains no digits-as-date, no quotes, and no non-ASCII characters', () => {
    for (const page of PAGES) {
      const filename = sopExportFilename(page, 'markdown');
      expect(filename).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(filename).not.toContain('"');
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(filename)).toBe(true);
    }
  });

  it('is exactly "${slug}.md"', () => {
    for (const page of PAGES) {
      expect(sopExportFilename(page, 'markdown')).toBe(`${page.slug}.md`);
    }
  });
});
