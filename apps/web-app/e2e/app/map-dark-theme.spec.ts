/**
 * Row #309 (2)+(3) - the workflow map views in BOTH app themes: one axe pass per
 * view, plus measured contrast for the colours that are resolved at runtime and
 * so cannot be checked from source (HandoffEdge, minimap, SwimlaneLaneHeader,
 * edge labels, the node tokens).
 *
 * The rule under test: every React Flow canvas is `colorMode="light"`, so the
 * canvas, its nodes and every mark on it are the LIGHT palette in the dark app
 * theme too. A regression to a dark node on a white canvas (or to dark text on
 * a dark canvas) shows up here as a failed ratio, not as a style opinion.
 * The source-level guard is src/components/workflow-view/reactflow-colormode.test.ts.
 *
 *   pnpm exec playwright test e2e/app/map-dark-theme.spec.ts --project=authenticated
 *
 * Seeds: POST /api/sample-workflow ("Create Purchase Order", SAP + Outlook: two
 * systems, so the swimlane and its HandoffEdge render) and the variant set
 * (Variants map / frequency map).
 */
import { test, expect, type Page } from '@playwright/test';
import { assertAxeCompliance } from '../helpers/axe';
import { forceTheme, expectThemeApplied, type Theme } from '../helpers/theme';

const FLOOR_TEXT = 4.5;
const FLOOR_GRAPHIC = 3;

interface Measured { label: string; fg: string; bg: string; ratio: number }

/** In-page contrast of every element matching `sel` that has its own text. */
async function measureText(page: Page, sel: string): Promise<Measured[]> {
  return page.evaluate((selector) => {
    type C = { r: number; g: number; b: number; a: number };
    const parse = (c: string): C => {
      const m = c.match(/[\d.]+/g)!.map(Number);
      return { r: m[0]!, g: m[1]!, b: m[2]!, a: m.length > 3 ? m[3]! : 1 };
    };
    const over = (f: C, b: C): C => ({
      r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1,
    });
    // Walk up only to the canvas root and start from white (the canvas pane, a
    // sibling <Background>, not an ancestor) so a transparent chain ends on the
    // canvas, not on the page theme behind it.
    const effBg = (el: Element | null): C => {
      const chain: C[] = [];
      for (let e = el; e && !e.classList.contains('react-flow'); e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c.a > 0) chain.push(c);
        if (c.a === 1) break;
      }
      let acc: C = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = chain.length - 1; i >= 0; i--) acc = over(chain[i]!, acc);
      return acc;
    };
    const lum = (c: C) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a: C, b: C) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const hex = (c: C) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    return Array.from(document.querySelectorAll(selector))
      .filter((el) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim()))
      .map((el) => {
        const bg = effBg(el);
        const fg = over(parse(getComputedStyle(el).color), bg);
        return { label: (el.textContent ?? '').trim().slice(0, 40), fg: hex(fg), bg: hex(bg), ratio: +ratio(fg, bg).toFixed(2) };
      });
  }, sel);
}

/** Contrast of an SVG paint (stroke / fill) against white (the canvas / minimap). */
async function measurePaint(page: Page, sel: string, prop: 'stroke' | 'fill'): Promise<Measured[]> {
  return page.evaluate(([selector, p]) => {
    const lum = (rgb: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!);
    };
    return Array.from(document.querySelectorAll(selector as string)).map((el) => {
      const v = getComputedStyle(el).getPropertyValue(p as string);
      const rgb = (v.match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number);
      const r = 1.05 / (lum(rgb) + 0.05);
      return { label: selector as string, fg: v, bg: 'rgb(255, 255, 255)', ratio: +r.toFixed(2) };
    });
  }, [sel, prop] as const);
}

function expectAll(rows: Measured[], floor: number, what: string): void {
  expect(rows.length, `${what}: nothing matched - the selector or the view is wrong`).toBeGreaterThan(0);
  const min = rows.reduce((a, r) => (r.ratio < a.ratio ? r : a));
  console.log(`[map-contrast] ${what}: n=${rows.length} min=${min.ratio}:1 ("${min.label}" ${min.fg} on ${min.bg})`);
  for (const r of rows) {
    expect(r.ratio, `${what}: "${r.label}" ${r.fg} on ${r.bg} is ${r.ratio}:1`).toBeGreaterThanOrEqual(floor);
  }
}

/** The canvas root carries `light`, its nodes resolve the LIGHT node token, and it paints white. */
async function expectLightCanvas(page: Page, what: string, root = '.react-flow'): Promise<void> {
  const info = await page.evaluate((rootSel) => {
    const rf = document.querySelector(rootSel);
    const node = rf?.querySelector('.react-flow__node') ?? null;
    return {
      hasRf: !!rf,
      cls: rf?.className ?? '',
      nodeBg: node ? getComputedStyle(node).getPropertyValue('--wf-node-bg').trim().toLowerCase() : null,
      // Probe point: bottom-left of the visible canvas. The toolbar and header
      // overlays sit along its top edge, so the top-left corner is not the canvas.
      probe: (() => {
        if (!rf) return null;
        const r = rf.getBoundingClientRect();
        return { x: Math.round(r.left + 8), y: Math.round(Math.min(r.bottom, window.innerHeight) - 8) };
      })(),
    };
  }, root);
  expect(info.hasRf, `${what}: no React Flow canvas rendered`).toBe(true);
  expect(info.cls, `${what}: canvas is not colorMode=light`).toMatch(/\blight\b/);
  expect(info.cls, `${what}: canvas carries the dark class`).not.toMatch(/\bdark\b/);
  // Sample a real painted pixel: the white comes from a pointer-events:none
  // <Background>/canvas fill that elementsFromPoint cannot see.
  const png = await page.screenshot({ clip: { x: info.probe!.x, y: info.probe!.y, width: 1, height: 1 } });
  const px = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
  }, png.toString('base64'));
  // >= 240 per channel, not === 255: the story and frequency maps draw a faint
  // dot grid (--border-subtle, ~#f6f7f9) that a 1px probe can land on. The page
  // theme behind the canvas is #161b22, so this still separates the two.
  expect(Math.min(...px), `${what}: the canvas must paint light, not the page theme (probe pixel ${px.join(',')})`).toBeGreaterThanOrEqual(240);
  if (info.nodeBg !== null) expect(info.nodeBg, `${what}: node body token`).toBe('#ffffff');
}

for (const theme of ['dark', 'light'] as Theme[]) {
  test.describe(`workflow map views, ${theme} app theme`, () => {
    let poId = '';
    let variantsId = '';

    test.beforeAll(async ({ request }) => {
      const po = await request.post('/api/sample-workflow');
      expect(po.ok(), 'sample-workflow seed').toBeTruthy();
      poId = (await po.json()).id;
      const v = await request.post('/api/sample-variants');
      expect(v.ok(), 'sample-variants seed').toBeTruthy();
      variantsId = (await v.json()).id;
    });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('ledgerium_analytics_consent', 'essential'));
      await forceTheme(page, theme);
      await page.setViewportSize({ width: 1440, height: 900 });
    });

    async function open(page: Page, id: string, mode: string): Promise<void> {
      await page.goto(`/workflows/${id}`, { waitUntil: 'networkidle' });
      await expectThemeApplied(page, theme);
      const btn = page.getByTestId(`workflow-mode-${mode}`);
      await btn.waitFor({ state: 'visible', timeout: 30_000 });
      await btn.click();
      await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(1200); // fitView settle
    }

    test('flow map: light canvas, node and edge contrast, axe', async ({ page }) => {
      test.setTimeout(120_000);
      await open(page, poId, 'flow');
      await expectLightCanvas(page, 'flow');
      expectAll(await measureText(page, '.react-flow__node p, .react-flow__node span'), FLOOR_TEXT, 'flow node text');
      expectAll(await measurePaint(page, '.react-flow__edge-path', 'stroke'), FLOOR_GRAPHIC, 'flow edge stroke');
      await page.getByRole('button', { name: /minimap/i }).click();
      await page.locator('.react-flow__minimap').waitFor({ state: 'visible' });
      await assertAxeCompliance(page, `flow map (${theme})`, 0);
    });

    test('swimlane map: HandoffEdge, SwimlaneLaneHeader, minimap, axe', async ({ page }) => {
      test.setTimeout(120_000);
      await open(page, poId, 'swimlane');
      await expectLightCanvas(page, 'swimlane');
      // SwimlaneLaneHeader: text on its ~4% lane tint over the canvas.
      expectAll(await measureText(page, '.react-flow__node-laneHeader span'), FLOOR_TEXT, 'SwimlaneLaneHeader text');
      // HandoffEdge: badge text on its fill, and the edge itself as a graphic.
      expectAll(await measureText(page, '.react-flow__edgelabel-renderer span'), FLOOR_TEXT, 'HandoffEdge badge text');
      expectAll(await measurePaint(page, '.react-flow__edge-path', 'stroke'), FLOOR_GRAPHIC, 'swimlane edge stroke');
      expectAll(await measureText(page, '.react-flow__node p, .react-flow__node span'), FLOOR_TEXT, 'swimlane node text');
      // Minimap: drawn on its own white panel; the node rectangles are the
      // information, measured as graphics against that white.
      await page.getByRole('button', { name: /minimap/i }).click();
      await page.locator('.react-flow__minimap').waitFor({ state: 'visible' });
      const miniBg = await page.evaluate(() => getComputedStyle(document.querySelector('.react-flow__minimap')!).backgroundColor);
      expect(miniBg, 'minimap panel background').toBe('rgb(255, 255, 255)');
      const mini = (await measurePaint(page, '.react-flow__minimap-node', 'fill')).filter((r) => !/rgba\(0, 0, 0, 0\)|transparent/.test(r.fg));
      expectAll(mini, FLOOR_GRAPHIC, 'minimap node fill');
      await assertAxeCompliance(page, `swimlane map (${theme})`, 0);
    });

    test('variants map and frequency map: light canvas, axe', async ({ page }) => {
      test.setTimeout(120_000);
      await open(page, variantsId, 'variants');
      await page.getByTestId('variants-story-map').waitFor({ state: 'visible', timeout: 30_000 });
      await expectLightCanvas(page, 'variants map', '[data-testid="variants-story-map"] .react-flow');
      expectAll(await measureText(page, '.react-flow__node p, .react-flow__node span'), FLOOR_TEXT, 'variants map node text');
      await assertAxeCompliance(page, `variants map (${theme})`, 0);

      await page.getByTestId('variants-view-frequency').click();
      await page.waitForTimeout(1500);
      await expectLightCanvas(page, 'frequency map');
      expectAll(await measurePaint(page, '.react-flow__edge-path', 'stroke'), FLOOR_GRAPHIC, 'frequency edge stroke');
      await assertAxeCompliance(page, `frequency map (${theme})`, 0);
    });

    test('systems map: axe', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(`/workflows/${poId}`, { waitUntil: 'networkidle' });
      const btn = page.getByTestId('workflow-mode-systems');
      await btn.waitFor({ state: 'visible', timeout: 30_000 });
      await btn.click();
      await page.waitForTimeout(1500);
      await assertAxeCompliance(page, `systems map (${theme})`, 0);
    });
  });
}
