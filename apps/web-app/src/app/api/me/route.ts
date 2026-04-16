import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  return NextResponse.json({ plan: user?.plan ?? 'free' });
}
