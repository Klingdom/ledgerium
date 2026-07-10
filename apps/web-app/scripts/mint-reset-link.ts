/**
 * mint-reset-link.ts — mint a valid, single-use password-reset link for a user,
 * out-of-band, when transactional email delivery is unavailable.
 *
 * Uses the EXACT token scheme the app expects (SHA-256 hash of a 32-byte random
 * token; only the hash is stored — never the raw token), so the printed URL
 * validates against /reset-password with no code changes.
 *
 * SAFETY:
 *   - Requires an explicit DATABASE_URL (will NOT silently write to a dev DB).
 *   - Prints the target DB before writing so you can confirm it is production.
 *   - Aborts if the user does not exist. Invalidates prior unused tokens first
 *     (mirrors forgot-password/route.ts).
 *
 * USAGE (run against production):
 *   DATABASE_URL="<prod url>" NEXT_PUBLIC_SITE_URL="https://ledgerium.ai" \
 *     npx tsx scripts/mint-reset-link.ts samantha.myers@equipmentshare.com
 *
 * The printed URL is single-use and expires (default 24h). Send it to the user
 * from your own inbox. Context: SITE_STATE_REVIEW_002 forgot-password delivery gap.
 */

import { randomBytes, createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const EXPIRY_HOURS = 24;

async function main(): Promise<void> {
  const rawEmailArg = process.argv[2];
  if (!rawEmailArg) {
    console.error('Usage: tsx scripts/mint-reset-link.ts <email>');
    process.exit(1);
  }
  // Normalize identically to forgot-password/route.ts so the lookup matches.
  const email = rawEmailArg.toLowerCase().trim();

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error(
      '[abort] DATABASE_URL is not set. Set it to the PRODUCTION database URL so the ' +
        'token is created where the user account lives, e.g.:\n' +
        '  DATABASE_URL="<prod>" npx tsx scripts/mint-reset-link.ts ' +
        email,
    );
    process.exit(1);
  }

  const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://ledgerium.ai';

  // Show the operator which DB is about to be written to (host/file only).
  const target = databaseUrl.startsWith('file:')
    ? databaseUrl
    : (() => {
        try {
          const u = new URL(databaseUrl);
          return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
        } catch {
          return '(unparseable url)';
        }
      })();
  console.log(`[info] Target database: ${target}`);
  console.log(`[info] Site URL:        ${siteUrl}`);
  console.log(`[info] Email:           ${email}`);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(
        `[abort] No account found for "${email}" in this database. ` +
          'Confirm the spelling and that DATABASE_URL points at production.',
      );
      process.exit(1);
    }

    // Invalidate any existing unused tokens for this email (matches the app).
    await prisma.passwordResetToken.updateMany({
      where: { email: user.email, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { email: user.email, tokenHash, expiresAt },
    });

    const resetUrl = `${siteUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email,
    )}`;

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  Reset link minted (single-use, expires in ' + EXPIRY_HOURS + 'h):');
    console.log('\n  ' + resetUrl + '\n');
    console.log('  Send this to the user from your own inbox.');
    console.log('══════════════════════════════════════════════════════════\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[error]', err);
  process.exit(1);
});
