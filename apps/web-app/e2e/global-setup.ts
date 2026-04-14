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
