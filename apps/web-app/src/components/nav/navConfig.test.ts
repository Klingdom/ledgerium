import { describe, it, expect } from 'vitest';
import { TOP_NAV, type NavTopItem, type NavItemId } from './navConfig';
import { getPublishedPages, pagePath } from '@/content/registry';

/**
 * NAVIGATION_IA_001 §11.1 (blocking): every nav href must resolve to a real
 * route — a hand-built static route or a published content page. This guards
 * against dead nav links, which are click-zero trust failures.
 */

// Hand-built / hub-index routes that are not content-registry pages.
const STATIC_ROUTES = new Set<string>([
  '/product', '/pricing', '/login', '/signup',
  '/use-cases/operations', '/use-cases/compliance', '/use-cases/ai-implementation',
  '/use-cases/personas', '/use-cases/problems',
  '/departments', '/industries',
  '/workflow-library', '/sop-templates', '/ai-opportunities', '/software',
  '/comparisons', '/blog', '/docs', '/methodology', '/about', '/security', '/support',
]);

function collectLeaves(items: readonly NavTopItem[]): { id: NavItemId; href: string }[] {
  const out: { id: NavItemId; href: string }[] = [];
  for (const item of items) {
    if (item.kind === 'link') {
      out.push({ id: item.id, href: item.href });
      continue;
    }
    for (const col of item.columns) {
      for (const leaf of col.items) out.push({ id: leaf.id, href: leaf.href });
      if (col.viewAll) out.push({ id: col.viewAll.id, href: col.viewAll.href });
    }
    if (item.footerLink) out.push({ id: item.footerLink.id, href: item.footerLink.href });
  }
  return out;
}

describe('PublicNav route integrity (NAV §11.1)', () => {
  const validRoutes = new Set<string>([...STATIC_ROUTES, ...getPublishedPages().map(pagePath)]);
  const leaves = collectLeaves(TOP_NAV);

  it('every nav href resolves to a known static route or a published page', () => {
    const dead = leaves.filter((l) => !validRoutes.has(l.href)).map((l) => `${l.id} → ${l.href}`);
    expect(dead, `dead nav links: ${dead.join(', ')}`).toEqual([]);
  });

  it('has no duplicate nav item ids', () => {
    const ids = leaves.map((l) => l.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `duplicate ids: ${dupes.join(', ')}`).toEqual([]);
  });

  it('curated leaf counts match the spec (Solutions 5/5/5, Software 5)', () => {
    const solutions = TOP_NAV.find((i) => i.kind === 'menu' && i.id === 'solutions');
    expect(solutions && solutions.kind === 'menu').toBe(true);
    if (solutions && solutions.kind === 'menu') {
      const byCount = Object.fromEntries(solutions.columns.map((c) => [c.column, c.items.length]));
      expect(byCount.by_role).toBe(5);
      expect(byCount.by_department).toBe(5);
      expect(byCount.by_industry).toBe(5);
    }
  });
});
