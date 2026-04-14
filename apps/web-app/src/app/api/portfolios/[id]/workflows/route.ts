import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/feature-gating';

const workflowIdsSchema = z.object({
  workflowIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Gate: portfolio workflow management is a Team+ (sharedLibrary) feature
  const access = checkFeatureAccess(user, 'sharedLibrary');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'sharedLibrary',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  // Verify the portfolio belongs to this user
  const portfolio = await db.portfolio.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = workflowIdsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workflowIds } = parsed.data;

  // Verify all workflows belong to this user
  const ownedWorkflows = await db.workflow.findMany({
    where: { id: { in: workflowIds }, userId: session.user.id },
    select: { id: true },
  });

  if (ownedWorkflows.length !== workflowIds.length) {
    return NextResponse.json(
      { error: 'One or more workflows not found or not owned by you' },
      { status: 403 },
    );
  }

  // Fetch existing join records to determine which are new
  const existing = await db.workflowPortfolio.findMany({
    where: { portfolioId: params.id, workflowId: { in: workflowIds } },
    select: { workflowId: true },
  });
  const existingIds = new Set(existing.map((r) => r.workflowId));
  const newIds = workflowIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await db.workflowPortfolio.createMany({
      data: newIds.map((workflowId) => ({
        workflowId,
        portfolioId: params.id,
      })),
    });
  }

  return NextResponse.json({ added: newIds.length }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Gate: portfolio workflow management is a Team+ (sharedLibrary) feature
  const deleteAccess = checkFeatureAccess(user, 'sharedLibrary');
  if (!deleteAccess.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'sharedLibrary',
        requiredPlan: deleteAccess.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  // Verify the portfolio belongs to this user
  const portfolio = await db.portfolio.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = workflowIdsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workflowIds } = parsed.data;

  // Verify all workflows belong to this user — mirror the POST ownership check
  const ownedWorkflows = await db.workflow.findMany({
    where: { id: { in: workflowIds }, userId: session.user.id },
    select: { id: true },
  });
  const ownedIds = new Set(ownedWorkflows.map((w) => w.id));
  const validIds = workflowIds.filter((id: string) => ownedIds.has(id));

  if (validIds.length === 0) {
    return NextResponse.json({ removed: 0 });
  }

  const result = await db.workflowPortfolio.deleteMany({
    where: {
      portfolioId: params.id,
      workflowId: { in: validIds },
    },
  });

  return NextResponse.json({ removed: result.count });
}
