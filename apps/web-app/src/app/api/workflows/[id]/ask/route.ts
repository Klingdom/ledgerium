import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { extractSopIntelligence } from '@/lib/sopIntelligenceExtract';
import {
  buildAskContext,
  answerQuestion,
  type AskResult,
} from '@/lib/ask-this-process';
import type { SopIntelligenceInput } from '@/components/sop-view/adapters/sopIntelligence';
import type { SOP, ProcessMap } from '@ledgerium/process-engine';

/**
 * POST /api/workflows/[id]/ask — deterministic "Ask This Process" (Phase A).
 *
 * NO LLM. NO provider/BYOK/network egress. NO persistence (the conversation is
 * ephemeral client state this iteration). The route is a thin, deterministic
 * orchestrator over the pure Phase-A engine (`@/lib/ask-this-process`):
 *
 *   raw owned SOP artifact → buildAskContext(sop) → answerQuestion(question)
 *
 * HONESTY is the contract (ADR-001 / SECURITY_REVIEW §T4):
 *   - Tenant scoping is reused VERBATIM from the existing GET handler: a workflow
 *     is loaded ONLY by { id, userId: session.user.id }; a non-owned/missing
 *     workflow is a 404 (never a 403, matching the sibling routes).
 *   - cite-or-refuse: an ungrounded answer is structurally impossible to mistake
 *     for a grounded one — the engine downgrades any zero-citation affirmative
 *     answer to a first-class refusal. A refusal is a SUCCESSFUL 200, not an error.
 *   - A missing/malformed SOP artifact returns an honest insufficient-data refusal
 *     (200, refused: true) — NOT a 500.
 *
 * Envelope: { data, error, meta } per CLAUDE.md API Design. Deterministic-only
 * meta (no provider/model/latency in this NO-LLM iteration).
 */

/** Input bound — a sane max length guards against oversized payloads (T-input). */
const askSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

interface AskRouteData {
  answer: string;
  refused: boolean;
  refusalReason: AskResult['refusalReason'];
  questionClass: AskResult['questionClass'];
  grounded: boolean;
  citations: AskResult['citations'];
  evidenceUsed: {
    stepsCited: number[];
    eventsCited: string[];
    stepCount: number;
  };
  isAuthoritative: false;
  bundleHash: string;
}

/** The deterministic-only meta block for the NO-LLM Phase-A route. */
const ASK_META = { groundingDeterministic: true, llm: false } as const;

function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { data: null, error: { code, message, retryable: false }, meta: ASK_META },
    { status },
  );
}

/** Find a process_output-family artifact's parsed contentJson by type, or null. */
function parseArtifact<T>(
  artifacts: Array<{ artifactType: string; contentJson: string | null }>,
  artifactType: string,
): T | null {
  const found = artifacts.find((a) => a.artifactType === artifactType);
  if (!found?.contentJson) return null;
  try {
    return JSON.parse(found.contentJson) as T;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── Auth (T4: every request is tenant-scoped) ──────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Authentication required.', 401);
  }

  // ── Input validation + bound (reject empty / oversized) ────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse('INVALID_QUESTION', 'Request body must be valid JSON.', 400);
  }
  const parsed = askSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(
      'INVALID_QUESTION',
      'A question between 1 and 500 characters is required.',
      400,
    );
  }
  const { question } = parsed.data;

  // ── Ownership: reuse the existing { id, userId } predicate VERBATIM ─────────
  // Same scoping as the GET handler — a non-owned/missing workflow is a 404.
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      artifacts: true,
      processDefinition: {
        select: { intelligenceJson: true, runCount: true },
      },
    },
  });
  if (!workflow) {
    return errorResponse('WORKFLOW_NOT_FOUND', 'Workflow not found.', 404);
  }

  // ── Load the SAME raw SOP artifacts the SOP view consumes ──────────────────
  // The contextBuilder consumes the RAW engine `SOP` + `ProcessMap` (which carry
  // the `ordinal` + `sourceEventId` citation primitives) — NOT the client view
  // model. The page reads `sop` + `process_map` artifacts; we mirror that exactly.
  const artifacts = workflow.artifacts as Array<{
    artifactType: string;
    contentJson: string | null;
  }>;
  const sop = parseArtifact<SOP>(artifacts, 'sop');
  const processMap = parseArtifact<ProcessMap>(artifacts, 'process_map');

  const intelligence = toBundleIntelligence(
    extractSopIntelligence(
      (workflow as {
        processDefinition?: { intelligenceJson?: string | null; runCount?: number } | null;
      }).processDefinition,
    ),
  );

  // ── No SOP artifact → honest insufficient-data refusal (NOT a 500) ─────────
  if (!sop || !Array.isArray(sop.steps)) {
    const data: AskRouteData = {
      answer:
        "This recording doesn't have a processed SOP yet, so I have no evidence to ground an answer. Once it's analyzed, you'll be able to ask about its steps, systems, and decision points.",
      refused: true,
      refusalReason: 'insufficient_data',
      questionClass: 'unmatched',
      grounded: false,
      citations: [],
      evidenceUsed: { stepsCited: [], eventsCited: [], stepCount: 0 },
      isAuthoritative: false,
      bundleHash: '',
    };
    return NextResponse.json({ data, error: null, meta: ASK_META });
  }

  // ── Deterministic engine: build context → answer. NO LLM, NO network. ──────
  const { bundle, citationSet } = buildAskContext({ sop, processMap, intelligence });
  const result: AskResult = answerQuestion(question, bundle, citationSet);

  const stepsCited = result.citations
    .filter((c) => c.stepOrdinal !== null)
    .map((c) => c.stepOrdinal as number);
  const eventsCited = result.citations
    .filter((c) => c.sourceEventId !== null)
    .map((c) => c.sourceEventId as string);

  const data: AskRouteData = {
    answer: result.answer,
    refused: result.refused,
    refusalReason: result.refusalReason,
    questionClass: result.questionClass,
    // Grounded IFF the answer survived with ≥1 valid citation — the visual
    // signature of groundedness is gated on this, never on prose alone.
    grounded: !result.refused && result.citations.length > 0,
    citations: result.citations,
    evidenceUsed: {
      stepsCited: [...new Set(stepsCited)],
      eventsCited: [...new Set(eventsCited)],
      stepCount: new Set(stepsCited).size,
    },
    isAuthoritative: false,
    bundleHash: result.bundleHash,
  };

  return NextResponse.json({ data, error: null, meta: ASK_META });
}

/**
 * Adapt the defensively-typed `ExtractedSopIntelligence` (unknown alignment/drift
 * slices) into the `SopIntelligenceInput` the bundle builder expects. The engine
 * gates everything on N>=2 + presence, so passing the loosely-shaped slices
 * through is safe — a malformed slice degrades to the honest insufficient state.
 */
function toBundleIntelligence(
  extracted: ReturnType<typeof extractSopIntelligence>,
): SopIntelligenceInput | null {
  if (!extracted) return null;
  return {
    sopAlignment: (extracted.sopAlignment ?? null) as SopIntelligenceInput['sopAlignment'],
    documentationDrift:
      (extracted.documentationDrift ?? null) as SopIntelligenceInput['documentationDrift'],
    runCount: extracted.runCount,
  };
}
