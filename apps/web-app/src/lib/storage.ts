/**
 * Centralized storage path configuration.
 *
 * All persistent file operations MUST use these resolved paths.
 * In Docker, DATA_DIR should point to a mounted volume (e.g., /app/data).
 * In development, it defaults to ./data relative to the web-app root.
 *
 * Directory structure:
 *   DATA_DIR/
 *   ├── ledgerium.db       ← SQLite database
 *   └── uploads/            ← Raw uploaded JSON files
 *       └── {userId}/
 *           └── {uploadId}.json
 */

import path from 'path';
import fs from 'fs';

/** Resolved absolute path for all persistent data. */
export const DATA_DIR = path.resolve(
  process.env.DATA_DIR ?? path.join(process.cwd(), 'data'),
);

/** Resolved absolute path for uploaded files. */
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(DATA_DIR, 'uploads'),
);

/** Resolved absolute path for the SQLite database file. */
export const DB_PATH = path.resolve(
  process.env.DB_PATH ?? path.join(DATA_DIR, 'ledgerium.db'),
);

/**
 * Ensure all required data directories exist.
 * Safe to call multiple times (idempotent).
 * Should be called at app startup.
 */
export function ensureDataDirectories(): void {
  for (const dir of [DATA_DIR, UPLOAD_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Auto-initialize directories on module load.
// This runs once when the module is first imported (app startup).
ensureDataDirectories();
