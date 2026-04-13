import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { z } from 'zod';

const PORTFOLIO_TYPES = ['folder', 'project', 'business_unit', 'department', 'custom'] as const;
const MAX_PORTFOLIOS_PER_USER = 100;

const createPortfolioSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(PORTFOLIO_TYPES).optional(),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().trim().max(50).optional(),
  parentId: z.string().uuid().optional(),
});

// Build a recursive tree from a flat list of portfolios.
// Each portfolio may have a workflowCount attached.
type FlatPortfolio = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: string;
  color: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  workflowCount: number;
};

type PortfolioNode = FlatPortfolio & { children: PortfolioNode[] };

function buildTree(flat: FlatPortfolio[]): PortfolioNode[] {
  const map = new Map<string, PortfolioNode>();
  for (const p of flat) {
    map.set(p.id, { ...p, children: [] });
  }
  const roots: PortfolioNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Sort each level by sortOrder then name
  const sortLevel = (nodes: PortfolioNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const n of nodes) sortLevel(n.children);
  };
  sortLevel(roots);
  return roots;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await db.portfolio.findMany({
    where: { userId: session.user.id },
    include: { workflows: { select: { workflowId: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const flat: FlatPortfolio[] = raw.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description,
    type: p.type,
    color: p.color,
    icon: p.icon,
    parentId: p.parentId,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    workflowCount: p.workflows.length,
  }));

  const portfolios = buildTree(flat);

  return NextResponse.json({ portfolios });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createPortfolioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid portfolio data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, type, description, color, icon, parentId } = parsed.data;

  // Enforce per-user limit
  const count = await db.portfolio.count({ where: { userId: session.user.id } });
  if (count >= MAX_PORTFOLIOS_PER_USER) {
    return NextResponse.json(
      { error: `Portfolio limit reached (${MAX_PORTFOLIOS_PER_USER})` },
      { status: 422 },
    );
  }

  // Validate parentId belongs to this user
  if (parentId) {
    const parent = await db.portfolio.findFirst({
      where: { id: parentId, userId: session.user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: 'Parent portfolio not found' }, { status: 404 });
    }
  }

  // Check for duplicate name at the same level (unique constraint: userId + name + parentId)
  const existing = await db.portfolio.findFirst({
    where: {
      userId: session.user.id,
      name,
      parentId: parentId ?? null,
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'A portfolio with this name already exists at this level' },
      { status: 409 },
    );
  }

  const portfolio = await db.portfolio.create({
    data: {
      userId: session.user.id,
      name,
      type: type ?? 'folder',
      description: description ?? null,
      color: color ?? '#6366f1',
      icon: icon ?? null,
      parentId: parentId ?? null,
    },
  });

  return NextResponse.json({ portfolio }, { status: 201 });
}
