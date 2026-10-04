/**
 * Row #389 — guard: no free-text string property in any AnalyticsEvent variant.
 *
 * Approach (chosen over a hand-kept registry): read the real `AnalyticsEvent`
 * union with the TypeScript compiler API + type checker, so a property added
 * to ANY variant later is seen automatically with no registry to forget. A
 * property is "bounded" if its type contains no plain `string` (literal unions,
 * numbers, booleans, null all pass; type aliases are resolved by the checker).
 * A property whose type includes plain `string` must have its NAME on
 * ALLOWED_STRING_KEYS (opaque ids, taxonomy labels, fixed-vocabulary codes)
 * with a reason. Anything else fails: either narrow the type to a literal
 * union, drop the property, or add it to the allowlist with a reviewed reason.
 *
 * Limits: this checks names + types, not runtime values. An allowlisted name
 * can still be fed free text by a caller; each allowlist reason states why the
 * value is bounded at its call sites. `track()` payload type is the only
 * entry point, so a new variant cannot bypass the check.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import ts from 'typescript';

export const ALLOWED_STRING_KEYS: Readonly<Record<string, string>> = {
  event: 'discriminant literal',
  // opaque cuid/uuid identifiers, never titles
  workflowId: 'opaque id', tagId: 'opaque id', teamId: 'opaque id', portfolioId: 'opaque id',
  // fixed-vocabulary taxonomy codes (constants in code, never user content)
  location: 'fixed UI location code', limit: 'plan limit code', plan: 'plan tier code',
  newPlan: 'plan tier code', role: 'team role code', type: 'portfolio type code',
  mode: 'view-mode code', preset: 'preset id from catalog', column: 'column key from registry',
  filterKey: 'insight filter key from engine taxonomy', nodeCategory: 'CATEGORY_STYLES taxonomy key',
  sectionId: 'SECTION_IDS constant', targetSectionId: 'SECTION_IDS constant',
  category: 'insight category taxonomy', cardType: 'InsightCard.type taxonomy',
  errorName: 'Error constructor name only (never message)',
  referrerHost: 'hostname only, sanitised at source',
  utmSource: 'length-capped, dropped when it contains @ (sanitizeUtm)',
  utmMedium: 'length-capped, dropped when it contains @ (sanitizeUtm)',
  utmCampaign: 'length-capped, dropped when it contains @ (sanitizeUtm)',
  reason: 'fixed code (login: invalid_credentials)', error: 'fixed code literals at every emit site',
  endpoint: 'server route path, templated by api-error-reporting', path: 'static app route; opaque ids templated by posthog-privacy',
  destination: 'static app route literal', href: 'nav config constant',
  step: 'onboarding step id constant', format: 'export format code', tab: 'tab id / process_group_<opaque id>',
  stepCategory: 'step taxonomy category', alignmentLevel: 'alignment enum / SOP kind', driftLevel: 'drift enum',
  sectionLabel: 'SECTION_LABELS constant (static UI heading), not content',
  personaKey: 'persona catalog key chosen from a fixed <select>',
  pageType: 'SEO page taxonomy', slug: 'static content slug from catalog', hubType: 'SEO hub taxonomy',
  fromType: 'SEO page taxonomy', fromSlug: 'static content slug', toType: 'SEO page taxonomy', toSlug: 'static content slug',
  extensionVersion: 'semver of our extension', installId: 'opaque random install id', userId: 'opaque user id',
};

const FILE = path.resolve(__dirname, 'analytics.ts');

export function findStringProperties(file: string = FILE): { event: string; prop: string; type: string }[] {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true,
    skipLibCheck: true, jsx: ts.JsxEmit.Preserve,
    baseUrl: path.resolve(__dirname, '..', '..'), paths: { '@/*': ['./src/*'] },
  };
  const program = ts.createProgram([file], options);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(file)!;
  let alias: ts.TypeAliasDeclaration | undefined;
  sf.forEachChild((n) => {
    if (ts.isTypeAliasDeclaration(n) && n.name.text === 'AnalyticsEvent') alias = n;
  });
  if (!alias) throw new Error('AnalyticsEvent not found in analytics.ts');
  const union = checker.getTypeAtLocation(alias.name);
  const variants = union.isUnion() ? union.types : [union];
  const out: { event: string; prop: string; type: string }[] = [];
  const hasPlainString = (t: ts.Type): boolean => {
    if (t.isUnion()) return t.types.some(hasPlainString);
    if (t.flags & (ts.TypeFlags.String | ts.TypeFlags.TemplateLiteral | ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return true;
    if (checker.isArrayType(t)) return hasPlainString(checker.getTypeArguments(t as ts.TypeReference)[0]!);
    return false;
  };
  for (const v of variants) {
    const evSym = v.getProperty('event');
    const evType = evSym ? checker.getTypeOfSymbolAtLocation(evSym, alias) : undefined;
    const eventName = evType && evType.isStringLiteral() ? evType.value : '<unknown>';
    for (const sym of v.getProperties()) {
      const t = checker.getTypeOfSymbolAtLocation(sym, alias);
      if (hasPlainString(t)) out.push({ event: eventName, prop: sym.name, type: checker.typeToString(t) });
    }
  }
  return out;
}

describe('#389 analytics payload guard: no free-text string properties', () => {
  const found = findStringProperties();

  it('reads a plausible number of string properties (guard is not vacuous)', () => {
    expect(found.length).toBeGreaterThan(20);
    expect(found.some((f) => f.prop === 'workflowId')).toBe(true);
  });

  it('every plain-string property name is on the reviewed allowlist', () => {
    const bad = found.filter((f) => !(f.prop in ALLOWED_STRING_KEYS));
    expect(bad.map((f) => `${f.event}.${f.prop}: ${f.type}`)).toEqual([]);
  });

  it('tag_created and dashboard_v2_filter_applied carry no free-text string', () => {
    for (const ev of ['tag_created', 'dashboard_v2_filter_applied']) {
      expect(found.filter((f) => f.event === ev)).toEqual([]);
    }
  });

  it('allowlist has no stale entries (every name is still used)', () => {
    const used = new Set(found.map((f) => f.prop));
    const stale = Object.keys(ALLOWED_STRING_KEYS).filter((k) => k !== 'event' && !used.has(k));
    expect(stale).toEqual([]);
  });
});
