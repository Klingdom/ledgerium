/**
 * Row #309 (1) - every React Flow canvas is a fixed LIGHT canvas, stated
 * explicitly.
 *
 * Why this is an invariant and not a style choice: React Flow's `colorMode`
 * puts a `light` / `dark` class on the canvas root. This app's `.light` class
 * (globals.css) is the light THEME, so that one prop decides which token set
 * every node, edge label and lane header inside the canvas resolves, plus
 * whether the canvas, controls and minimap are white or dark. The canvas
 * colours (mapColors.ts, edges, HandoffEdge, minimap) are literals measured
 * against white, so the only coherent rule is "light, always". A canvas that
 * leaves the prop off gets the library default - which happens to be 'light'
 * today and stops being a decision anyone made; one that passes 'dark' or
 * 'system' would draw those literals on a dark surface.
 *
 * The scan walks apps/web-app/src for every non-test file that renders
 * `<ReactFlow`, so a fifth canvas is covered the day it is added.
 *
 * Not inspected: a canvas rendered through a wrapper component that is not
 * itself named `ReactFlow` (e.g. `const Flow = ReactFlow; <Flow />`); a
 * `colorMode` supplied by spreading props (`{...rest}`); a ReactFlow tag
 * assembled by `React.createElement`; and whether the class actually reaches
 * the DOM (that is what the e2e spec map-dark-theme.spec.ts measures).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..', '..'); // apps/web-app/src

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(p, out);
    } else if (/\.(tsx|jsx|ts|js)$/.test(name) && !/\.(test|spec)\.[tj]sx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** Remove block and line comments so a commented-out prop cannot satisfy the scan. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

/**
 * The attribute text of each `<ReactFlow ...>` opening tag, with everything
 * inside `{...}` expressions blanked out, so only top-level props remain.
 */
function reactFlowTopLevelProps(code: string): string[] {
  const tags: string[] = [];
  const re = /<ReactFlow(?![A-Za-z0-9_])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    let depth = 0;
    let top = '';
    for (let i = m.index + m[0].length; i < code.length; i++) {
      const ch = code[i]!;
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (depth === 0 && ch === '>') break;
      if (depth === 0 && ch !== '}') top += ch;
    }
    tags.push(top);
  }
  return tags;
}

const files = walk(SRC)
  .map((p) => ({ path: p, rel: relative(SRC, p).replace(/\\/g, '/'), code: stripComments(readFileSync(p, 'utf8')) }))
  .filter((f) => /<ReactFlow(?![A-Za-z0-9_])/.test(f.code));

describe('every React Flow canvas pins colorMode="light" (row #309)', () => {
  it('finds the canvases (an empty scan would pass vacuously)', () => {
    const names = files.map((f) => f.rel);
    expect(names.length, `scanned: ${names.join(', ')}`).toBeGreaterThanOrEqual(4);
    for (const known of ['DfgFrequencyMap', 'WorkflowCanvas', 'WorkflowSwimlaneCanvas', 'WorkflowVariantStoryMap']) {
      expect(names.some((n) => n.endsWith(`${known}.tsx`)), `${known}.tsx not found by the scan`).toBe(true);
    }
  });

  for (const f of files) {
    it(`${f.rel} passes colorMode="light" as a literal prop on every <ReactFlow>`, () => {
      const tags = reactFlowTopLevelProps(f.code);
      expect(tags.length).toBeGreaterThan(0);
      for (const props of tags) {
        expect(props, `<ReactFlow> in ${f.rel} must set colorMode="light"`).toMatch(/\bcolorMode="light"/);
      }
    });
  }

  it('globals.css defines --wf-node-bg only for the light theme (a dark value would be unreachable)', () => {
    const css = readFileSync(join(SRC, 'app', 'globals.css'), 'utf8');
    const rootStart = css.indexOf(':root {');
    const rootEnd = css.indexOf('\n}', rootStart);
    expect(rootStart).toBeGreaterThan(-1);
    expect(css.slice(rootStart, rootEnd)).not.toMatch(/--wf-node-bg\s*:/);
    const lightStart = css.indexOf('.light {');
    expect(css.slice(lightStart, css.indexOf('\n}', lightStart))).toMatch(/--wf-node-bg\s*:/);
  });
});
