import { NextResponse } from 'next/server';
import { db } from '@/db';

/**
 * GET /api/health
 *
 * Lightweight health check endpoint for container orchestration,
 * load balancers, and uptime monitoring.
 *
 * Checks:
 * - Application is running
 * - Database is accessible
 */
export async function GET() {
  try {
    // Verify database connectivity with minimal query
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
