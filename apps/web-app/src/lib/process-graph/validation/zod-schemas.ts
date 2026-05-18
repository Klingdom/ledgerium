/**
 * Path E — Runtime Validation Schemas (iter 076 / PATHE-P01)
 *
 * Zod schemas that mirror the entity interfaces in `types/entities.ts`. Used by
 * the JSON round-trip adapter (`parseProcessGraphJson`) and by API-route input
 * validation in subsequent PATHE iterations (PATHE-P11 onwards).
 *
 * The closed-union schemas enumerate every member of the corresponding
 * TypeScript union — adding a new member to the union requires adding it here
 * (the catalog tests verify both sides stay in sync).
 *
 * **Pure module**: zero I/O, deterministic parsing.
 *
 * @see ../types/closed-unions.ts — TypeScript closed unions
 * @see ../types/entities.ts — entity interfaces this file mirrors
 */

import { z } from 'zod';

import { CONDITION_TYPES } from '../catalog/condition-types.js';
import { DECISION_TYPES } from '../catalog/decision-types.js';
import { EDGE_TYPES } from '../catalog/edge-types.js';
import { NODE_TYPES } from '../catalog/node-types.js';
import { VARIANT_LABELS } from '../catalog/variant-labels.js';

// ── Closed-union schemas (enum-style) ─────────────────────────────────────────

// z.enum requires a non-empty tuple of literal strings. We cast through unknown
// because the catalog arrays are typed as `ReadonlyArray<T>`; the runtime
// values are exact literals and Zod's enum validates them at parse time.
export const nodeTypeSchema = z.enum(NODE_TYPES as unknown as [string, ...string[]]);
export const edgeTypeSchema = z.enum(EDGE_TYPES as unknown as [string, ...string[]]);
export const decisionTypeSchema = z.enum(
  DECISION_TYPES as unknown as [string, ...string[]],
);
export const conditionTypeSchema = z.enum(
  CONDITION_TYPES as unknown as [string, ...string[]],
);
export const variantLabelSchema = z.enum(
  VARIANT_LABELS as unknown as [string, ...string[]],
);

export const processGraphSchemaVersionSchema = z.enum(['1.0', '2.0']);

// ── EvidencePointer ──────────────────────────────────────────────────────────

export const evidencePointerSchema = z.object({
  workflowRunId: z.string(),
  stepIndex: z.number().int().nonnegative(),
  timestamp: z.number(),
  reviewedAt: z.number().nullable(),
});

// ── ProcessNode ──────────────────────────────────────────────────────────────

export const processNodeSchema = z.object({
  id: z.string().min(1),
  processGraphId: z.string().min(1),
  nodeType: nodeTypeSchema,
  rawLabel: z.string(),
  normalizedLabel: z.string().nullable(),
  applicationLabel: z.string().nullable(),
  routeTemplate: z.string().nullable(),
  confidenceScore: z.number().min(0).max(1),
  isInferred: z.boolean(),
  observationCount: z.number().int().nonnegative(),
  rawEvidence: z.array(evidencePointerSchema),
});

// ── ProcessEdge ──────────────────────────────────────────────────────────────

export const processEdgeSchema = z.object({
  id: z.string().min(1),
  processGraphId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  edgeType: edgeTypeSchema,
  runFrequency: z.number().int().nonnegative(),
  runFrequencyPct: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  isInferred: z.boolean(),
  rawEvidence: z.array(evidencePointerSchema),
});

// ── Condition ────────────────────────────────────────────────────────────────

export const conditionSchema = z.object({
  id: z.string().min(1),
  decisionPointId: z.string().min(1),
  description: z.string(),
  conditionType: conditionTypeSchema,
  confidenceScore: z.number().min(0).max(1),
  isInferred: z.boolean(),
  rawEvidence: z.array(evidencePointerSchema),
});

// ── DecisionPoint ────────────────────────────────────────────────────────────

export const decisionPointSchema = z.object({
  id: z.string().min(1),
  processGraphId: z.string().min(1),
  nodeId: z.string().min(1),
  decisionType: decisionTypeSchema,
  conditions: z.array(conditionSchema),
  confidenceScore: z.number().min(0).max(1),
  isInferred: z.boolean(),
  rawEvidence: z.array(evidencePointerSchema),
});

// ── Variant ──────────────────────────────────────────────────────────────────

export const variantSchema = z.object({
  id: z.string().min(1),
  processGraphId: z.string().min(1),
  variantHash: z.string().length(16),
  variantLabel: variantLabelSchema,
  runCount: z.number().int().nonnegative(),
  runFrequencyPct: z.number().min(0).max(1),
  meanDurationMs: z.number().nullable(),
  stepCount: z.number().int().nonnegative(),
  nodeSequence: z.array(z.string()),
  rawEvidence: z.array(evidencePointerSchema),
});

// ── ProcessGraph (root) ──────────────────────────────────────────────────────

export const processGraphSchema = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  graphVersion: z.number().int().positive(),
  graphSchemaVersion: processGraphSchemaVersionSchema,
  runCount: z.number().int().nonnegative(),
  computedAtMs: z.number(),
  nodes: z.array(processNodeSchema),
  edges: z.array(processEdgeSchema),
  decisionPoints: z.array(decisionPointSchema),
  variants: z.array(variantSchema),
  isInferred: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
});

// ── ProcessEvidenceReview ────────────────────────────────────────────────────

export const processEvidenceReviewActionSchema = z.enum([
  'mark_reviewed',
  'expand_evidence',
  'act_on_recommendation',
]);

export const processEvidenceReviewSchema = z.object({
  id: z.string().min(1),
  evidencePointerId: z.string().min(1),
  workflowRunId: z.string().min(1),
  stepIndex: z.number().int().nonnegative(),
  reviewedBy: z.string().min(1),
  reviewedAtMs: z.number(),
  reviewAction: processEvidenceReviewActionSchema,
  retentionUntilMs: z.number(),
  planTierAtReview: z.string().min(1),
  createdAtMs: z.number(),
});
