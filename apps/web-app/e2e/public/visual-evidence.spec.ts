/**
 * visual-evidence.spec.ts (public surface)
 *
 * WHY THIS EXISTS (row #221)
 *
 * Loop 32 built visual evidence for the dashboard and I reported loop 25's
 * contrast work as "verified visually". MR-027 checked the coverage and I had
 * overstated it: `dashboard-v2` contains 31 of the 828 `--content-tertiary`
 * sites (3.7%) and **0 of the 91 `.btn-primary`** ones. The single most visible
 * thing loop 25 changed — white-on-green at 3.76:1, raised to 5.48:1, on the
 * signup call to action — had never been looked at.
 *
 * The public surface is where that button lives (27 files under app/(public)),
 * and it is also what a logged-out visitor sees first.
 *
 * Same posture as the dashboard spec: evidence, not pixel-diffing. See that
 * file for why baselines are not used here.
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'test-results', 'visual');

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'pricing', path: '/pricing' },
] as const;

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

for (const theme of ['dark', 'light'] as const) {
  for (const pageDef of PAGES) {
    test(`visual evidence: ${pageDef.name} (${theme} theme)`, async ({ page }) => {
      // Drive the app's own theme mechanism — setting the class directly is
      // overwritten by useTheme's mount effect, which silently produced two
      // identical screenshots at loop 32.
      if (theme === 'light') {
        await page.addInitScript(() => {
          localStorage.setItem('ledgerium-theme', 'light');
        });
      }

      await page.goto(pageDef.path, { waitUntil: 'networkidle' });

      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass, `expected the ${theme} theme to be applied`).toContain(theme);

      // The reason this spec exists: assert the primary CTA is actually on the
      // captured page, so a screenshot cannot "cover" the button by omitting it.
      await expect(
        page.getByRole('link', { name: /start free|go to app/i }).first(),
        'primary CTA missing — this screenshot would not evidence the .btn-primary fix',
      ).toBeVisible();

      const file = resolve(OUT_DIR, `public-${pageDef.name}-${theme}.png`);
      const buffer = await page.screenshot({ path: file, fullPage: true });
      expect(buffer.byteLength, `${file} looks empty`).toBeGreaterThan(20_000);
    });
  }
}
