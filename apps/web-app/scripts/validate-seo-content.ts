/**
 * Build-time SEO content quality gate.
 *
 * Run: pnpm --filter @ledgerium/web-app validate:seo
 * Exits non-zero on any blocking error. Intended to run in CI before `next build`.
 */

import { ALL_PAGES } from '../src/content/registry';
import { validateContent } from '../src/lib/seo/validate';

function main(): void {
  const { errors, warnings } = validateContent(ALL_PAGES);

  if (warnings.length > 0) {
    console.warn(`\n[validate:seo] ${warnings.length} warning(s):`);
    for (const w of warnings) console.warn(`  ⚠ ${w}`);
  }

  if (errors.length > 0) {
    console.error(`\n[validate:seo] FAILED with ${errors.length} blocking error(s):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  console.log(`\n[validate:seo] OK — ${ALL_PAGES.length} pages passed the quality gate.`);
}

main();
