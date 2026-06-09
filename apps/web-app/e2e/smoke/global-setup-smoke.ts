/**
 * Playwright global setup for the SMOKE gate — runs once before the webServer
 * and all projects.
 *
 *   1. Ensures prisma/smoke.db has the current schema (idempotent; throwaway db)
 *   2. Seeds one authenticated user (via plain-JS script, no app modules)
 *   3. Ensures the e2e/.auth dir exists for the saved storageState
 *
 * The authed Analysis-view spec creates its workflow at runtime via
 * POST /api/sample-workflow (server-side ensureSampleWorkflow), so nothing here
 * imports the app/process engine.
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const WEB_APP_DIR = path.resolve(__dirname, '..', '..');

export default async function globalSetupSmoke() {
  const env = { ...process.env, DATABASE_URL: 'file:./smoke.db' };

  // 1. Schema (resolves to prisma/smoke.db — same file the webServer reads).
  execSync('npx prisma db push --skip-generate', { cwd: WEB_APP_DIR, env, stdio: 'pipe' });

  // 2. Seed the single smoke user.
  execSync('node e2e/smoke/seed-smoke-user.js', { cwd: WEB_APP_DIR, env, stdio: 'inherit' });

  // 3. Auth dir for storageState.
  const authDir = path.join(WEB_APP_DIR, 'e2e', '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
}
