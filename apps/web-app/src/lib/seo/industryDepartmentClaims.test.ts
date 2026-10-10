/**
 * #422 (loop 219): the department and industry pages may not carry claims the
 * product cannot back.
 *
 * - The "no PHI" class is scanned on EVERY public surface (content pages, the
 *   (public) app routes and shared components): the extension records page
 *   titles, web addresses and short on-screen labels, which can carry patient
 *   names (security-reviewer, loop 219), so no page may say patient data is
 *   never captured.
 * - The other unbacked-claim phrases (unmeasured statistics, compliance
 *   outcomes, unmeasured ramp/rework outcomes, non-browser capture wording)
 *   are scanned in department.ts and industry.ts only. Limits: the same
 *   phrases still appear in persona.ts, workflow.ts, problem.ts,
 *   alternatives.ts, competitors.ts, answer.ts, ai-opportunity.ts,
 *   sop-template.ts, the home page and use-cases/compliance; those are
 *   tracked as their own backlog row, not covered here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGES = join(SRC, 'content', 'pages');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(tsx?)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

/** Absolute "patient data is not captured" claims. */
export const NO_PHI_CLAIMS: readonly RegExp[] = [
  /\bno PHI\b/i,
  /without exposing (PHI|patient)/i,
  /(does not|doesn't|never) (capture|record)s? (any )?(PHI|patient)/i,
];

/** Unbacked claims banned on the department and industry pages. */
export const UNBACKED_CLAIMS: readonly RegExp[] = [
  /audit[- ]?(ready|readiness)/i,
  /defensible/i,
  /wait time/i,
  /most (\w+ )?cycle time is/i,
  /supports?\s+(HIPAA|SOX|KYC|AML|SOC 2)/i,
  /(provides|stronger)\s+(audit )?(evidence|support)/i,
  /ramps?\b[^.]{0,25}faster|faster ramp|shortens[^.]{0,15}ramp/i,
  /reduces? rework|data stays consistent/i,
  /real steps across your|across your admin systems/i,
  /from the recorded flow|records how the work is actually done/i,
];

export function findClaims(text: string, patterns: readonly RegExp[]): string[] {
  return patterns.flatMap((re) => {
    const m = text.match(re);
    return m ? [m[0]] : [];
  });
}

describe('#422: claim scanners (mutants)', () => {
  it('each NO_PHI pattern catches its shape', () => {
    expect(findClaims('It records no PHI.', NO_PHI_CLAIMS)).toEqual(['no PHI']);
    expect(findClaims('documented without exposing patient data', NO_PHI_CLAIMS)).toHaveLength(1);
    expect(findClaims('Ledgerium never captures patient records', NO_PHI_CLAIMS)).toHaveLength(1);
    expect(findClaims('titles can contain patient details', NO_PHI_CLAIMS)).toEqual([]);
  });

  it('each UNBACKED pattern catches its shape and spares the corrected copy', () => {
    const mutants = [
      'Audit-ready procedures', 'a defensible record', 'most cycle time is wait time',
      'supports SOX reviews', 'provides audit evidence', 'ramps new agents faster',
      'reduces rework', 'real steps across your systems', 'from the recorded flow',
    ];
    for (const m of mutants) expect(findClaims(m, UNBACKED_CLAIMS).length, m).toBeGreaterThan(0);
    expect(findClaims('can be used as input to a team’s own HIPAA reviews', UNBACKED_CLAIMS)).toEqual([]);
  });
});

describe('#422: no public surface claims patient data is never captured', () => {
  const files = [
    ...walk(PAGES),
    ...walk(join(SRC, 'app', '(public)')),
    ...walk(join(SRC, 'components')),
  ];

  it('scans a non-trivial file set', () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain(join(PAGES, 'industry.ts'));
  });

  it.each(files)('%s', (f) => {
    expect(findClaims(readFileSync(f, 'utf8'), NO_PHI_CLAIMS)).toEqual([]);
  });
});

describe('#422: department and industry pages carry no unbacked claims', () => {
  it.each(['department.ts', 'industry.ts'])('%s', (name) => {
    expect(findClaims(readFileSync(join(PAGES, name), 'utf8'), UNBACKED_CLAIMS)).toEqual([]);
  });
});

describe('#422: the healthcare capture statement matches the extension code', () => {
  const industry = readFileSync(join(PAGES, 'industry.ts'), 'utf8');
  const capture = readFileSync(
    resolve(SRC, '..', '..', 'extension-app', 'src', 'content', 'capture.ts'),
    'utf8',
  );

  it('the patient-data FAQ answers honestly that it can', () => {
    expect(industry).toMatch(/q: 'Does Ledgerium capture patient data or PHI\?',\s*a: 'It can\. Ledgerium records page titles/);
  });

  it('"never screenshots" holds: the content script takes no screenshot or DOM snapshot', () => {
    expect(industry).toMatch(/never screenshots or typed field values/);
    expect(capture).not.toMatch(/captureVisibleTab|html2canvas|outerHTML/);
  });

  it('"never typed field values" holds: inputs record only that a value was present', () => {
    expect(capture).toMatch(/value_present/);
  });
});
