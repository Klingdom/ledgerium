/**
 * Writes the HR sample recordings to docs/samples/hr-recordings/.
 *
 *   pnpm --filter @ledgerium/web-app samples:hr
 *
 * One uploadable bundle per workflow (<slug>.json, accepted by POST /api/upload
 * like an extension export) plus README.md, an index generated from the same
 * data. Output is deterministic; the test in scripts/lib/hr-sample-recordings
 * fails if the committed files drift from what this script produces.
 */
import fs from 'fs';
import path from 'path';
import { renderHrSampleFiles } from './lib/hr-sample-recordings/render-files';

const OUT_DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'samples', 'hr-recordings');

function main(): void {
  const files = renderHrSampleFiles();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const expected = new Set(Object.keys(files));
  for (const existing of fs.readdirSync(OUT_DIR)) {
    if (!expected.has(existing)) fs.rmSync(path.join(OUT_DIR, existing));
  }
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT_DIR, name), content);
  }
  console.log(`Wrote ${expected.size} files to ${OUT_DIR}`);
}

main();
