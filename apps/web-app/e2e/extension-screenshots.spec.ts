/**
 * Extension documentation screenshots.
 *
 * Opens a static HTML harness that renders each extension screen state
 * with mock data, then captures screenshots at side-panel dimensions.
 *
 * Run with:
 *   cd apps/web-app && npx playwright test e2e/extension-screenshots.spec.ts --config=e2e/extension-screenshots.config.ts
 *
 * Output: docs/extension-screenshots/
 */

import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import http from 'http';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/extension-screenshots');

/** Side panel dimensions — Chrome side panel is typically ~400px wide */
const SIDE_PANEL_VIEWPORT = { width: 400, height: 600 };

const SCREENS = [
  { hash: 'idle', name: '01-idle-screen', description: 'Home screen — ready to start recording' },
  { hash: 'arming', name: '02-arming-screen', description: 'Starting a new recording session' },
  { hash: 'recording_empty', name: '03-recording-empty', description: 'Recording active — waiting for first interaction' },
  { hash: 'recording', name: '04-recording-active', description: 'Recording in progress with captured steps' },
  { hash: 'paused', name: '05-paused-screen', description: 'Recording paused' },
  { hash: 'stopping', name: '06-stopping-screen', description: 'Processing recorded workflow' },
  { hash: 'error', name: '07-error-screen', description: 'Error state' },
];

let server: http.Server;
let baseUrl: string;

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Serve the extension-app directory so CSS and harness HTML load correctly
  const extensionRoot = path.resolve(__dirname, '../../extension-app');
  server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost`);
    const filePath = path.join(extensionRoot, url.pathname);
    const ext = path.extname(filePath);
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    };
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

for (const screen of SCREENS) {
  test(`screenshot: ${screen.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: SIDE_PANEL_VIEWPORT,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/e2e/screenshot-harness.html#${screen.hash}`, {
      waitUntil: 'networkidle',
    });

    // Wait for React to mount via the harness ready signal
    await page.waitForFunction(() => (window as any).__HARNESS_READY === true, null, {
      timeout: 15_000,
    });

    // Small extra wait for CSS/animations to settle
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${screen.name}.png`),
      fullPage: false,
    });

    await context.close();
  });
}
