import type { Prisma } from '@prisma/client';

/**
 * Deterministic-read helpers for `WorkflowArtifact`.
 *
 * B-3 (docs/meta/SOP_BUILDER_REVIEW_001.md): multiple rows of the same
 * `artifactType` can legitimately exist for one workflow. The lazy template
 * backfill in `/api/workflows/[id]/route.ts` can (pre-iter fix) race two
 * concurrent GETs into both writing a full template set, and — independent
 * of that race — `docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md`
 * establishes append-only regeneration as the permanent model going forward:
 * new artifact rows are appended, existing rows are never mutated or deleted.
 *
 * A unique constraint on `(workflow_id, artifact_type)` would "fix" today's
 * race by forbidding the state the append-only model requires tomorrow. The
 * correct fix is for every read site to agree, deterministically, on which
 * row is current when more than one exists: the most recently created row.
 *
 * `createdAt` alone is not a sufficient tiebreak — SQLite's DATETIME column
 * resolution can produce identical timestamps for two writes issued within
 * the same tick (exactly what the concurrent-GET race produces). `id` is
 * included as a secondary sort key purely to make the ordering total and
 * therefore reproducible across repeated reads; it is not a claim about
 * insertion order (ids are random UUIDs).
 */

/** Prisma `orderBy` clause selecting the current artifact of a type first. */
export const LATEST_ARTIFACT_ORDER_BY: Prisma.WorkflowArtifactOrderByWithRelationInput[] = [
  { createdAt: 'desc' },
  { id: 'desc' },
];

/** The minimal shape `findLatestArtifact` needs from an artifact row. */
export interface ArtifactOrderingFields {
  id: string;
  artifactType: string;
  createdAt: Date;
}

/**
 * Deterministically select the current (most recently created) artifact of
 * `artifactType` from an array of rows for one workflow.
 *
 * This re-derives the ordering itself rather than trusting the array's
 * incoming order, so it is correct regardless of whether the query that
 * produced `artifacts` applied `LATEST_ARTIFACT_ORDER_BY` — it is safe to
 * use anywhere an `artifacts` array is filtered by type in place of a raw
 * `.find()`.
 *
 * Returns the same row across repeated calls on the same input (pure
 * function of `artifacts` + `artifactType`; no clock, no randomness).
 */
export function findLatestArtifact<T extends ArtifactOrderingFields>(
  artifacts: readonly T[],
  artifactType: string,
): T | undefined {
  let latest: T | undefined;
  for (const artifact of artifacts) {
    if (artifact.artifactType !== artifactType) continue;
    if (!latest) {
      latest = artifact;
      continue;
    }
    const candidateMs = artifact.createdAt.getTime();
    const latestMs = latest.createdAt.getTime();
    if (
      candidateMs > latestMs ||
      (candidateMs === latestMs && artifact.id > latest.id)
    ) {
      latest = artifact;
    }
  }
  return latest;
}
