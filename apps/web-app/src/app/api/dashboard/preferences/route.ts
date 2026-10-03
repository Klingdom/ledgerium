import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  deserializePreferencesFromDb,
  migratePreferences,
  serializePreferencesForDb,
} from '@/lib/dashboard-columns/persistence.js';
import { listColumnKeys } from '@/lib/dashboard-columns/index.js';
import type { ColumnKey, UserDashboardPreference } from '@/lib/dashboard-columns/index.js';
import type { SavedView } from '@/lib/dashboard-columns/persistence.js';
import type { FilterSet } from '@/lib/dashboard-columns/filters.js';

// ── Zod schema for PUT body validation ────────────────────────────────────────

const VALID_COLUMN_KEYS = new Set<string>(listColumnKeys());

const columnKeySchema = z.string().refine(
  (key): key is ColumnKey => VALID_COLUMN_KEYS.has(key),
  { message: 'Unknown column key' },
) as z.ZodType<ColumnKey>;

// ── SavedView validation (backlog #367) ───────────────────────────────────────
// Mirrors the persistence `SavedView` shape and the client limits enforced in
// ColumnPicker (MAX_SAVED_VIEWS / MAX_VIEW_NAME_LENGTH).
const MAX_SAVED_VIEWS = 10;
const MAX_VIEW_NAME_LENGTH = 64;
const MAX_VIEW_FILTERS = 50;
const MAX_ID_LENGTH = 128;

// Filter column keys are NOT checked against the registry: persistence keeps
// filters verbatim even when a column is later retired (audit-honesty
// invariant 3 in persistence.ts), so a stale-key filter must still round-trip.
const filterColumnKeySchema = z.string().min(1).max(64);
const shortString = z.string().max(256);

const filterValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('scalar'),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'before', 'after']),
    value: z.union([shortString, z.number()]),
  }).strict(),
  z.object({
    kind: z.literal('range'),
    operator: z.literal('between'),
    min: z.number(),
    max: z.number(),
  }).strict(),
  z.object({
    kind: z.literal('dateRange'),
    operator: z.literal('between'),
    startIso: shortString,
    endIso: shortString,
  }).strict(),
  z.object({
    kind: z.literal('multi'),
    operator: z.enum(['in', 'notIn']),
    values: z.array(shortString).max(100),
  }).strict(),
  z.object({
    kind: z.literal('text'),
    operator: z.enum(['contains', 'startsWith']),
    value: shortString,
  }).strict(),
  z.object({
    kind: z.literal('flag'),
    operator: z.enum(['isTrue', 'isFalse']),
  }).strict(),
]);

const savedViewSchema = z.object({
  id: z.string().min(1).max(MAX_ID_LENGTH),
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, 'Saved view name must not be empty')
        .max(MAX_VIEW_NAME_LENGTH, `Saved view name must be at most ${MAX_VIEW_NAME_LENGTH} characters`),
    ),
  // Unknown keys inside a view are dropped (not rejected), matching how
  // migratePreferences treats stale top-level keys; non-string entries reject.
  visibleColumns: z.array(z.string().max(64)).max(200),
  columnOrder: z.array(z.string().max(64)).max(200),
  filters: z.array(z.object({ columnKey: filterColumnKeySchema, value: filterValueSchema }).strict()).max(MAX_VIEW_FILTERS),
  // Client-supplied; never trusted. Replaced server-side (see mergeSavedViews).
  createdAt: z.string().max(64),
});

const savedViewsSchema = z
  .array(savedViewSchema)
  .max(MAX_SAVED_VIEWS, `At most ${MAX_SAVED_VIEWS} saved views are allowed`)
  .refine((views) => new Set(views.map((v) => v.id)).size === views.length, {
    message: 'Saved view ids must be unique',
  });

const putBodySchema = z.object({
  visibleColumns: z.array(columnKeySchema),
  columnOrder: z.array(columnKeySchema),
  // Optional: absent → keep the stored list; present (even []) → replace it.
  savedViews: savedViewsSchema.optional(),
});

/**
 * Build the persisted SavedView list. Unknown column keys are dropped; for ids
 * already stored the stored createdAt is kept, for new ids the server stamps
 * createdAt (the client clock is never trusted).
 */
function buildSavedViews(
  incoming: z.infer<typeof savedViewsSchema>,
  existing: readonly SavedView[],
): SavedView[] {
  const storedCreatedAt = new Map<string, string>();
  for (const v of existing) {
    if (v && typeof v.id === 'string' && typeof v.createdAt === 'string') {
      storedCreatedAt.set(v.id, v.createdAt);
    }
  }
  const nowIso = new Date().toISOString();
  const keep = (keys: readonly string[]) =>
    keys.filter((k) => VALID_COLUMN_KEYS.has(k)) as ColumnKey[];
  return incoming.map((v) => ({
    id: v.id,
    name: v.name,
    visibleColumns: keep(v.visibleColumns),
    columnOrder: keep(v.columnOrder),
    filters: v.filters as unknown as FilterSet,
    createdAt: storedCreatedAt.get(v.id) ?? nowIso,
  }));
}

// ── Response envelope helper ──────────────────────────────────────────────────

function prefResponse(
  preferences: UserDashboardPreference,
  droppedKeys: readonly ColumnKey[],
  warnings: readonly string[],
) {
  return NextResponse.json({
    data: {
      preferences,
      droppedKeys,
      warnings,
    },
    error: null,
    meta: { schemaVersion: preferences.schemaVersion },
  });
}

// ── GET /api/dashboard/preferences ───────────────────────────────────────────

/**
 * GET /api/dashboard/preferences
 *
 * Returns the authenticated user's dashboard column preferences.
 * If the stored document references stale column keys (dropped from the
 * registry), the cleaned document is written back to the DB (E2E Scenario 4
 * per WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md §10) and `droppedKeys`
 * is returned to the client so the UI can surface a notice.
 *
 * Auth: required (session.user.id).
 * Errors: 401 if unauthenticated.
 */
async function handleGET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', data: null, meta: {} }, { status: 401 });
  }

  const userId = session.user.id;

  const row = await db.userDashboardPreference.findUnique({
    where: { userId },
    select: { schemaVersion: true, payload: true },
  });

  const result = deserializePreferencesFromDb(row ?? null);

  // E2E Scenario 4: write back cleaned preferences if stale keys were dropped.
  // This ensures subsequent GETs receive a clean document without old keys.
  if (result.droppedKeys.length > 0) {
    const { schemaVersion, payload } = serializePreferencesForDb(result.preferences);
    await db.userDashboardPreference.upsert({
      where: { userId },
      update: { schemaVersion, payload, updatedAt: new Date() },
      create: { userId, schemaVersion, payload },
    });
  }

  return prefResponse(result.preferences, result.droppedKeys, result.warnings);
}

// ── PUT /api/dashboard/preferences ───────────────────────────────────────────

/**
 * PUT /api/dashboard/preferences
 *
 * Validates and persists the user's dashboard column preferences.
 *
 * Body: { visibleColumns: ColumnKey[], columnOrder: ColumnKey[], savedViews?: SavedView[] }
 * The body is validated via Zod — any unknown ColumnKey returns 400, as does
 * an invalid savedViews list (>10 views, empty/>64-char name, duplicate ids,
 * malformed filters). savedViews is replaced only when present; when absent the
 * stored list is preserved. Top-level `filters` is never sent by the client and
 * is always preserved from the stored row.
 *
 * Response shape: same as GET — { data: { preferences, droppedKeys, warnings }, error, meta }
 *
 * Auth: required (session.user.id).
 * Errors: 401 if unauthenticated, 400 if body invalid.
 */
async function handlePUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', data: null, meta: {} }, { status: 401 });
  }

  const userId = session.user.id;

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', data: null, meta: {} },
      { status: 400 },
    );
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(', ')}`,
        data: null,
        meta: {},
      },
      { status: 400 },
    );
  }

  const { visibleColumns, columnOrder, savedViews } = parsed.data;

  // Read existing preferences to preserve filters + savedViews
  const existingRow = await db.userDashboardPreference.findUnique({
    where: { userId },
    select: { schemaVersion: true, payload: true },
  });
  const existing = deserializePreferencesFromDb(existingRow ?? null);

  // Build the updated preferences document
  const rawUpdate = {
    schemaVersion: existing.preferences.schemaVersion,
    visibleColumns,
    columnOrder,
    filters: existing.preferences.filters,
    // #367: replace only when the field is present; otherwise keep stored list.
    savedViews:
      savedViews !== undefined
        ? buildSavedViews(savedViews, existing.preferences.savedViews)
        : existing.preferences.savedViews,
  };

  // Run through migration/cleaning to ensure the document is valid
  const result = migratePreferences(rawUpdate);

  const { schemaVersion, payload } = serializePreferencesForDb(result.preferences);
  await db.userDashboardPreference.upsert({
    where: { userId },
    update: { schemaVersion, payload, updatedAt: new Date() },
    create: { userId, schemaVersion, payload },
  });

  return prefResponse(result.preferences, result.droppedKeys, result.warnings);
}

export const GET = withApiRoute('/api/dashboard/preferences', handleGET);
export const PUT = withApiRoute('/api/dashboard/preferences', handlePUT);
