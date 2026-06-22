import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * POST /api/workflows/:id/baseline — capture a "before" baseline snapshot of a
 * workflow's current comparison metrics, so it can be compared against the live
 * workflow later (Mode B: saved baseline). Append-only — each call stores a new
 * frozen snapshot. The client supplies the observed metrics it already shows.
 */

const BodySchema = z.object({
  label: z.string().trim().max(80).optional(),
  avgTimeMs: z.number().int().nonnegative().nullable().optional(),
  runs: z.number().int().nonnegative().nullable().optional(),
  stepCount: z.number().int().nonnegative().nullable().optional(),
  systemCount: z.number().int().nonnegative().optional(),
  healthOverall: z.number().min(0).max(100).optional(),
  healthGated: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, title: true },
  });
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid baseline payload' }, { status: 400 });
  }
  const b = parsed.data;

  const created = await db.workflowBaseline.create({
    data: {
      workflowId: workflow.id,
      userId: session.user.id,
      label: b.label?.trim() || null,
      avgTimeMs: b.avgTimeMs ?? null,
      runs: b.runs ?? null,
      stepCount: b.stepCount ?? null,
      systemCount: b.systemCount ?? 0,
      healthOverall: b.healthOverall ?? 0,
      healthGated: b.healthGated ?? false,
    },
  });

  return NextResponse.json({
    data: {
      id: created.id,
      workflowId: created.workflowId,
      label: created.label,
      workflowTitle: workflow.title,
      avgTimeMs: created.avgTimeMs,
      runs: created.runs,
      stepCount: created.stepCount,
      systemCount: created.systemCount,
      healthOverall: created.healthOverall,
      healthGated: created.healthGated,
      capturedAt: created.capturedAt,
    },
  });
}
