/**
 * POST /api/admin/normalize-emails
 *
 * One-time (idempotent, re-runnable) backfill that lowercases/trims existing
 * `User.email` rows so pre-fix mixed-case accounts can self-serve
 * forgot-password (login + forgot-password both now look up via
 * `normalizeEmail()`; a mixed-case row stored before that fix is otherwise
 * unreachable by the self-serve flow).
 *
 * Auth: interactive admin session OR the time-windowed HMAC ops token
 * (x-ops-token), mirroring /api/admin/email-test and
 * /api/admin/password-reset-link. 404-cloaked otherwise.
 *
 * Body: { apply?: boolean }  (default false = dry-run, zero writes)
 *
 * Collision safety: a row is a COLLISION if its normalized email equals the
 * (normalized) email of a DIFFERENT existing user — normalizing it would
 * violate the `User.email` unique constraint / silently merge two accounts.
 * Colliding rows are NEVER written, in dry-run or apply mode; they are always
 * reported separately so an operator can resolve them manually.
 *
 * Idempotent: a second `apply` run finds zero rows needing normalization
 * (every previously-safe row is now already normalized).
 *
 * @module api/admin/normalize-emails/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { normalizeEmail } from '@/lib/email-normalize';

const OPS_TOKEN_LABEL = 'admin-normalize-emails.v1';
const OPS_TOKEN_WINDOW_TOLERANCE = 2;

function expectedOpsToken(secret: string, windowMinute: number): string {
  return createHmac('sha256', secret).update(`${OPS_TOKEN_LABEL}:${windowMinute}`).digest('hex');
}

function opsTokenAuthorized(request: NextRequest, nowMs: number): boolean {
  const provided = request.headers.get('x-ops-token');
  const secret = process.env.NEXTAUTH_SECRET;
  if (!provided || !secret) return false;
  const providedBuf = Buffer.from(provided);
  const nowMinute = Math.floor(nowMs / 60000);
  for (let back = 0; back <= OPS_TOKEN_WINDOW_TOLERANCE; back++) {
    const expectedBuf = Buffer.from(expectedOpsToken(secret, nowMinute - back));
    if (providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

function notFound(): NextResponse {
  return NextResponse.json({ data: null, error: { code: 'not_found', message: 'Not Found' } }, { status: 404 });
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CollisionRow {
  id: string;
  email: string;
  conflictsWith: string;
}

interface SafeRow {
  id: string;
  email: string;
  normalized: string;
}

interface UserIdEmail {
  id: string;
  email: string;
}

/**
 * Partition users into (a) rows that are already normalized, (b) rows that
 * need normalization but are SAFE (their normalized form does not collide
 * with any other user), and (c) rows that COLLIDE with another user once
 * normalized (never written).
 *
 * A "collision" bucket is built over the WHOLE user table (not just the
 * subset needing normalization) so a not-yet-normalized row is correctly
 * flagged as colliding even against an already-normalized different user.
 */
function partitionUsers(users: UserIdEmail[]): { safe: SafeRow[]; collisions: CollisionRow[] } {
  const normalizedToUsers = new Map<string, UserIdEmail[]>();
  for (const u of users) {
    const norm = normalizeEmail(u.email);
    const bucket = normalizedToUsers.get(norm);
    if (bucket) bucket.push(u);
    else normalizedToUsers.set(norm, [u]);
  }

  const safe: SafeRow[] = [];
  const collisions: CollisionRow[] = [];

  for (const u of users) {
    const normalized = normalizeEmail(u.email);
    if (u.email === normalized) continue; // already normalized — nothing to do

    const others = (normalizedToUsers.get(normalized) ?? []).filter((o) => o.id !== u.id);
    if (others.length > 0) {
      collisions.push({
        id: u.id,
        email: u.email,
        conflictsWith: others.map((o) => o.email).join(', '),
      });
    } else {
      safe.push({ id: u.id, email: u.email, normalized });
    }
  }

  return { safe, collisions };
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const nowMs = Date.now();

  const session = await auth();
  if (!canAccessAdmin(session) && !opsTokenAuthorized(request, nowMs)) {
    return notFound();
  }

  let apply = false;
  try {
    const body = (await request.json()) as { apply?: unknown };
    if (body && typeof body.apply === 'boolean') apply = body.apply;
  } catch {
    // no/invalid body → default dry-run
  }

  try {
    const users = await db.user.findMany({ select: { id: true, email: true } });
    const { safe, collisions } = partitionUsers(users);
    const needNormalization = safe.length + collisions.length;

    if (!apply) {
      const sample = safe.slice(0, 10).map((s) => ({ id: s.id, from: s.email, to: s.normalized }));
      return NextResponse.json({
        data: {
          totalUsers: users.length,
          needNormalization,
          safeToNormalize: safe.length,
          collisions,
          sample,
        },
        error: null,
      });
    }

    let updated = 0;
    for (const row of safe) {
      await db.user.update({ where: { id: row.id }, data: { email: row.normalized } });
      updated += 1;
    }

    return NextResponse.json({
      data: {
        updated,
        skippedCollisions: collisions.length,
        collisions,
      },
      error: null,
    });
  } catch (err) {
    console.error('[admin/normalize-emails POST]', err);
    return NextResponse.json(
      { data: null, error: { code: 'internal_error', message: 'Failed to normalize emails' } },
      { status: 500 },
    );
  }
}
