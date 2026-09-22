/**
 * Playwright global setup — runs ONCE before all tests.
 *
 * 1. Creates a fresh test SQLite database
 * 2. Runs Prisma migrations
 * 3. Seeds test users via external script
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const WEB_APP_DIR = path.resolve(__dirname, '..');
const TEST_DB_PATH = path.join(WEB_APP_DIR, 'prisma', 'test.db');

export default async function globalSetup() {
  // Row #214 — refuse to run against a server we are about to strand.
  //
  // Step 1 below DELETES prisma/test.db. playwright.config.ts sets
  // `reuseExistingServer: !process.env.CI`, so locally Playwright will reuse a
  // server left over from another invocation — and that server's Prisma client
  // still holds the file we just unlinked. Every auth query then reads a
  // database with no seeded rows; the symptom is free-auth.setup.ts failing with
  // "Invalid email or password", roughly three runs in eight, with no hint of
  // the real cause.
  //
  // Verified before writing this: a probe placed in this function found NO
  // server responding during a normal single run — global setup runs first and
  // the webServer boots after — so this can only fire when a second invocation
  // overlaps, which is exactly the case that corrupts the run. CI starts clean
  // and disables reuse, so the check is skipped there.
  if (!process.env.CI) {
    let alreadyServing = false;
    try {
      const res = await fetch('http://localhost:3098/api/health', {
        signal: AbortSignal.timeout(2000),
      });
      alreadyServing = res.status < 500;
    } catch {
      // Connection refused / timeout is the GOOD path: nothing is listening.
      alreadyServing = false;
    }
    if (alreadyServing) {
      throw new Error(
        'A server is already listening on port 3098.' +
          '\n\nThis run is about to delete prisma/test.db and re-seed it. That server holds' +
          '\nthe current database file, so it would keep serving a deleted one and every' +
          '\nlogin would fail with "Invalid email or password" (backlog row #214).' +
          '\n\nStop the other Playwright run or dev server on 3098, then re-run.',
      );
    }
  }

  // 1. Remove stale test database
  for (const ext of ['', '-journal', '-wal', '-shm']) {
    const f = TEST_DB_PATH + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  const env = {
    ...process.env,
    DATABASE_URL: 'file:./test.db',
  };

  // 2. Run Prisma db push to create schema
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: WEB_APP_DIR,
    env,
    stdio: 'pipe',
  });

  // 3. Seed test users via script file
  execSync('node e2e/seed-test-db.js', {
    cwd: WEB_APP_DIR,
    env,
    stdio: 'inherit',
  });

  // 4. Create .auth directory for storage state
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
}
