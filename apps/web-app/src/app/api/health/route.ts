import { NextResponse } from 'next/server';
import { statSync, statfsSync } from 'node:fs';
import path from 'node:path';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Health check for container orchestration + uptime monitoring, with lightweight
 * database observability (DB health review 001).
 *
 * Contract: returns 200 `{ status: 'ok' }` when the DB is reachable, 503
 * `{ status: 'error' }` when it is not. The `db` object adds non-fatal
 * observability (size, read latency, disk pressure). Observability failures
 * NEVER flip the status — only DB connectivity does. We intentionally time a
 * READ, not a write, so the every-30s health probe adds zero write-lock load.
 */

/** Resolve the SQLite file path from a `file:` DATABASE_URL, if applicable. */
function sqliteFilePath(): string | null {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('file:')) return null;
  return path.resolve(url.slice('file:'.length));
}

export async function GET() {
  const startedAt = Date.now();
  try {
    // Connectivity + read-latency probe (the only signal that gates status).
    await db.$queryRaw`SELECT 1`;
    const readLatencyMs = Date.now() - startedAt;

    const dbInfo: Record<string, unknown> = { connectivity: 'ok', readLatencyMs };

    // ── Non-fatal observability ──────────────────────────────────────────────
    const filePath = sqliteFilePath();
    if (filePath) {
      try {
        const sizeBytes = statSync(filePath).size;
        dbInfo.sizeBytes = sizeBytes;
        dbInfo.sizeMb = Math.round((sizeBytes / (1024 * 1024)) * 10) / 10;
        // Soft warning band so dashboards/alerts can act before the ~1-2GB
        // operational backup envelope is reached.
        dbInfo.sizeWarning = sizeBytes > 1024 * 1024 * 1024; // > 1 GB
      } catch {
        // file not found / not readable — skip silently
      }
      try {
        const dir = process.env.DATA_DIR ?? path.dirname(filePath);
        const fsStat = statfsSync(dir);
        const totalBytes = fsStat.blocks * fsStat.bsize;
        const freeBytes = fsStat.bavail * fsStat.bsize;
        const usedPct = totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 100) : null;
        dbInfo.diskFreeMb = Math.round(freeBytes / (1024 * 1024));
        dbInfo.diskUsedPct = usedPct;
        dbInfo.diskWarning = usedPct != null && usedPct > 80;
      } catch {
        // statfs unsupported / dir missing — skip silently
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: dbInfo,
    });
  } catch {
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
