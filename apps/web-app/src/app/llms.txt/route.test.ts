import { describe, it, expect } from 'vitest';
import { getPagesByType } from '@/content/registry';
import { GET } from './route';

describe('GET /llms.txt — SOP template download line (sop_export_contract.md §6.2)', () => {
  it('emits a Download (Markdown) line for every published sopTemplate page, pointing at download.md', async () => {
    const text = await GET().text();
    const sopPages = getPagesByType('sopTemplate').filter((p) => p.published);
    expect(sopPages.length).toBeGreaterThan(0);
    for (const p of sopPages) {
      expect(text).toContain(`Download (Markdown): `);
      expect(text).toContain(`/sop-templates/${p.slug}/download.md`);
    }
  });

  it('does not emit a Download (Markdown) line for a non-sopTemplate type (e.g. workflow)', async () => {
    const text = await GET().text();
    const workflowPages = getPagesByType('workflow').filter((p) => p.published);
    for (const p of workflowPages) {
      expect(text).not.toContain(`/workflow-library/${p.slug}/download.md`);
    }
  });
});
