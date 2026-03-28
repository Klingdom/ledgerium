import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import type { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const search = params.get('search') ?? '';
  const sortBy = params.get('sort') ?? 'created_at';
  const sortDir = (params.get('dir') ?? 'desc') as 'asc' | 'desc';
  const toolFilter = params.get('tool') ?? '';
  const status = params.get('status') ?? 'active';

  const where: Prisma.WorkflowWhereInput = {
    userId: session.user.id,
    status,
  };

  if (search) {
    where.title = { contains: search };
  }

  if (toolFilter) {
    where.toolsUsed = { contains: toolFilter };
  }

  const orderByField =
    sortBy === 'title' ? 'title' :
    sortBy === 'step_count' ? 'stepCount' :
    'createdAt';

  const results = await db.workflow.findMany({
    where,
    orderBy: { [orderByField]: sortDir },
  });

  return NextResponse.json({
    workflows: results.map((w) => ({
      ...w,
      toolsUsed: w.toolsUsed ? JSON.parse(w.toolsUsed) : [],
    })),
  });
}
