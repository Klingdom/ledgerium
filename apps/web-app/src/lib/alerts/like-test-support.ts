/**
 * Test-only: emulates Prisma `contains` on SQLite, which compiles to LIKE '%x%':
 * `_` = any one char, `%` = any run, ASCII case-insensitive (D4 M2).
 */
const REGEX_SPECIALS = '.*+?^${}()|[]\\';

export function likeContains(haystack: string | null, needle: string): boolean {
  const pattern = needle
    .split('')
    .map((c) => (c === '_' ? '[\\s\\S]' : c === '%' ? '[\\s\\S]*' : REGEX_SPECIALS.includes(c) ? `\\${c}` : c))
    .join('');
  return new RegExp(pattern, 'i').test(haystack ?? '');
}

type PropWhere = { properties?: { contains?: string }; AND?: PropWhere[] };

/** Applies `where.properties.contains` and every `where.AND[*].properties.contains` under LIKE semantics. */
export function propertiesMatch(properties: string | null, where: PropWhere): boolean {
  if (where.properties?.contains !== undefined && !likeContains(properties, where.properties.contains)) return false;
  return (where.AND ?? []).every((w) => propertiesMatch(properties, w));
}
