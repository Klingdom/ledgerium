import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/feature-gating';

const PORTFOLIO_TYPES = ['folder', 'project', 'business_unit', 'department', 'custom'] as const;

const updatePortfolioSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  type: z.enum(PORTFOLIO_TYPES).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().trim().max(50).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Detect if setting newParentId would create a cycle in the portfolio tree.
// Walks up the parent chain from newParentId — if we reach targetId, it's circular.
async function wouldCreateCycle(
  targetId: string,
  newParentId: string,
): Promise<boolean> {
  let current: string | null = newParentId;
  const visited = new Set<string>();

  while (current !== null) {
    if (current === targetId) return true;
    if (visited.has(current)) break; // broken chain guard
    visited.add(current);

    const row: { parentId: string | null } | null = await db.portfolio.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = row?.parentId ?? null;
  }

  return false;
}

export async function GET(
  _req: NextRequest,
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

  // Gate: portfolio access is a Team+ (sharedLibrary) feature
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

  const portfolio = await db.portfolio.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      workflows: {
        include: {
          workflow: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              confidence: true,
              stepCount: true,
              durationMs: true,
              isFavorite: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  const workflows = portfolio.workflows.map((wp) => wp.workflow);

  const { workflows: _wf, ...portfolioBase } = portfolio;

  return NextResponse.json({ portfolio: portfolioBase, workflows });
}

export async function PATCH(
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

  // Gate: portfolio management is a Team+ (sharedLibrary) feature
  const patchAccess = checkFeatureAccess(user, 'sharedLibrary');
  if (!patchAccess.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'sharedLibrary',
        requiredPlan: patchAccess.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  const portfolio = await db.portfolio.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updatePortfolioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid portfolio data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, description, type, color, icon, parentId, sortOrder } = parsed.data;

  // Prevent circular parent reference
  if (parentId !== undefined && parentId !== null) {
    if (parentId === params.id) {
      return NextResponse.json(
        { error: 'A portfolio cannot be its own parent' },
        { status: 422 },
      );
    }

    const isCyclic = await wouldCreateCycle(params.id, parentId);
    if (isCyclic) {
      return NextResponse.json(
        { error: 'Setting this parent would create a circular reference' },
        { status: 422 },
      );
    }

    // Validate the new parent belongs to this user
    const parent = await db.portfolio.findFirst({
      where: { id: parentId, userId: session.user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: 'Parent portfolio not found' }, { status: 404 });
    }
  }

  // Check name uniqueness at target level if name or parentId is changing
  const effectiveName = name ?? portfolio.name;
  const effectiveParentId = parentId !== undefined ? parentId : portfolio.parentId;
  if (name !== undefined || parentId !== undefined) {
    const duplicate = await db.portfolio.findFirst({
      where: {
        userId: session.user.id,
        name: effectiveName,
        parentId: effectiveParentId,
        id: { not: params.id },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: 'A portfolio with this name already exists at this level' },
        { status: 409 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (type !== undefined) data.type = type;
  if (color !== undefined) data.color = color;
  if (icon !== undefined) data.icon = icon;
  if (parentId !== undefined) data.parentId = parentId;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const updated = await db.portfolio.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ portfolio: updated });
}

export async function DELETE(
  _req: NextRequest,
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

  // Gate: portfolio management is a Team+ (sharedLibrary) feature
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

  const portfolio = await db.portfolio.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  // WorkflowPortfolio join records deleted via cascade.
  // Children portfolios: parentId set to null via SetNull.
  // Workflows themselves are NOT deleted.
  await db.portfolio.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
