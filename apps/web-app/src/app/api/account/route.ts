import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    email: user.email,
    name: user.name,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    uploadCount: user.uploadCount,
    createdAt: user.createdAt,
  });
}
