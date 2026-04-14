/**
 * Playwright global teardown — runs ONCE after all tests.
 * Cleans up the test database.
 */

import path from 'path';
import fs from 'fs';

const WEB_APP_DIR = path.resolve(__dirname, '..');
const TEST_DB_PATH = path.join(WEB_APP_DIR, 'prisma', 'test.db');

export default async function globalTeardown() {
  // Clean up test database files
  for (const ext of ['', '-journal', '-wal', '-shm']) {
    const f = TEST_DB_PATH + ext;
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        // Ignore — file may still be locked briefly
      }
    }
  }
}
