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

// ── Zod schema for PUT body validation ────────────────────────────────────────

const VALID_COLUMN_KEYS = new Set<string>(listColumnKeys());

const columnKeySchema = z.string().refine(
  (key): key is ColumnKey => VALID_COLUMN_KEYS.has(key),
  { message: 'Unknown column key' },
) as z.ZodType<ColumnKey>;

const putBodySchema = z.object({
  visibleColumns: z.array(columnKeySchema),
  columnOrder: z.array(columnKeySchema),
});

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
export async function GET(_req: NextRequest) {
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
 * Body: { visibleColumns: ColumnKey[], columnOrder: ColumnKey[] }
 * The body is validated via Zod — any unknown ColumnKey returns 400.
 * The full preference document (including filters and savedViews from any
 * existing stored row) is preserved; only visibleColumns + columnOrder are
 * updated by this endpoint.
 *
 * Response shape: same as GET — { data: { preferences, droppedKeys, warnings }, error, meta }
 *
 * Auth: required (session.user.id).
 * Errors: 401 if unauthenticated, 400 if body invalid.
 */
export async function PUT(req: NextRequest) {
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

  const { visibleColumns, columnOrder } = parsed.data;

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
    savedViews: existing.preferences.savedViews,
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
