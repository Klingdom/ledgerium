/**
 * Row #324: no public or in-app copy may claim teams share a workflow library.
 *
 * Truth (loop 135 role table, pinned in pricing-copy.test.ts): a team is a member
 * roster plus invites. Every workflow belongs to one user; nothing reads
 * `WorkflowShare` rows, so no teammate can see another's workflow. Sharing works
 * only by public link.
 *
 * RULE. A line of user-facing source fails if it (a) names a "shared / team / workflow
 * library" a team has, or (b) says someone shares a library, or (c) says teams share
 * workflows with colleagues, UNLESS the line or one of the two lines either side says
 * "roadmap" (the claim is explicitly forward-looking). Comments are not copy.
 *
 * Plan-table labels are a separate decision (MR-058: a plan promise on waitlist-only
 * plans; the CEO decides). They are listed in PENDING_PLAN_LABELS with an owner and
 * reason, and the test fails if an entry stops matching, so none can rot.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');
const WEB = path.resolve(SRC, '..');

const CLAIM_RES: readonly RegExp[] = [
  // (a) a "shared library" / "team library" / "shared workflow library" noun phrase
  /\b(?:shared|team)\s+(?:team\s+|workflow\s+)?librar(?:y|ies)\b|\bshared\s+workflow\s+librar/i,
  // (b) "share a workflow library", "share workflow libraries"
  /\bshar(?:e|es|ed|ing)\b[^.\n]{0,30}\blibrar(?:y|ies)\b/i,
  // (c) teams "share workflows with colleagues"
  /\bshare\s+workflows?\s+with\s+(?:colleagues|teammates)\b/i,
];

export interface PendingPlanLabel {
  file: string; // path relative to apps/web-app, forward slashes
  text: string; // exact line fragment
  owner: string;
  reason: string;
}
export const PENDING_PLAN_LABELS: readonly PendingPlanLabel[] = [
  { file: 'src/lib/config.ts', text: 'No shared team library', owner: 'CEO', reason: 'Plan-limit label; MR-058 §3 plan-promise decision (same class as the pricing badge).' },
  { file: 'src/lib/config.ts', text: 'Shared team workspace & library', owner: 'CEO', reason: 'Team plan feature bullet; MR-058 §3 plan-promise decision.' },
  { file: 'src/app/(public)/pricing/page.tsx', text: 'Team library & portfolios', owner: 'CEO', reason: 'Comparison-table row backed by the sharedLibrary entitlement flag; MR-058 §3.' },
  { file: 'src/app/(public)/docs/page.tsx', text: "'Shared team library', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes'", owner: 'CEO', reason: 'Plan table row; contradicts docs 6.4 on the same page, pending the MR-058 §3 decision.' },
];

/** Offending lines (1-based) of `text` for `file`, after the roadmap and pending-label exemptions. */
export function findTeamLibraryClaims(
  text: string,
  file = '',
  pending: readonly PendingPlanLabel[] = PENDING_PLAN_LABELS,
): { line: number; text: string }[] {
  const lines = text.split(/\r?\n/);
  const out: { line: number; text: string }[] = [];
  lines.forEach((l, i) => {
    if (/^\s*(?:\/\/|\*|\/\*|\{\/\*)/.test(l)) return;
    if (!CLAIM_RES.some((re) => re.test(l))) return;
    if (pending.some((p) => p.file === file && l.includes(p.text))) return;
    const near = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
    if (/roadmap/i.test(near)) return;
    out.push({ line: i + 1, text: l.trim() });
  });
  return out;
}

function walk(dir: string, exts: RegExp, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const FILES = [
  ...walk(path.join(SRC, 'app'), /\.tsx?$/),
  ...walk(path.join(SRC, 'components'), /\.tsx?$/),
  ...walk(path.join(SRC, 'content'), /\.tsx?$/),
  path.join(SRC, 'lib', 'config.ts'),
  ...walk(path.join(WEB, 'public'), /\.html$/),
];
const relWeb = (f: string) => path.relative(WEB, f).split(path.sep).join('/');

describe('findTeamLibraryClaims (the rule)', () => {
  it('flags the claims it exists to catch', () => {
    for (const bad of [
      'Teams allow multiple users to share a workflow library, record together',
      'Create a team to share workflows with colleagues and collaborate',
      'Team workspaces and shared libraries are part of the Team plan.',
      'Shared team library',
      'share workflow libraries across your organization',
    ]) {
      expect(findTeamLibraryClaims(bad).length, bad).toBe(1);
    }
  });
  it('allows the product\'s own library and explicit roadmap statements', () => {
    for (const ok of [
      'The workflow library you get after your first recording',
      'Save it to your library, search it later, share it with your team.',
      'Workflow Library',
      'SharePoint sites differ by library structure',
    ]) {
      expect(findTeamLibraryClaims(ok), ok).toEqual([]);
    }
    expect(findTeamLibraryClaims('A shared team library is on the roadmap.')).toEqual([]);
    expect(findTeamLibraryClaims('Roadmap: today a team has a roster.\nA shared team library, where\nteammates view each other.')).toEqual([]);
  });
  it('does not treat a pending plan label as exempt in another file', () => {
    const pending = [{ file: 'a.ts', text: 'Shared team library', owner: 'x', reason: 'y' }];
    expect(findTeamLibraryClaims('Shared team library', 'a.ts', pending)).toEqual([]);
    expect(findTeamLibraryClaims('Shared team library', 'b.ts', pending).length).toBe(1);
  });
});

describe('#324: no page claims teams share a workflow library', () => {
  it('scans a non-trivial file set (app, components, content, config, public html)', () => {
    expect(FILES.length).toBeGreaterThan(150);
    expect(FILES.some((f) => /docs[\\/]page\.tsx$/.test(f))).toBe(true);
    expect(FILES.some((f) => /teams[\\/]page\.tsx$/.test(f))).toBe(true);
    expect(FILES.some((f) => /pricing[\\/]page\.tsx$/.test(f))).toBe(true);
    expect(FILES.some((f) => f.endsWith('docs.html'))).toBe(true);
  });
  it('no scanned file carries a team-library claim (outside roadmap statements and pending plan labels)', () => {
    const offenders = FILES.flatMap((f) =>
      findTeamLibraryClaims(readFileSync(f, 'utf8'), relWeb(f)).map((h) => `${relWeb(f)}:${h.line} ${h.text.slice(0, 100)}`),
    );
    expect(offenders, 'No team library exists (nothing reads team shares). Say what is true or mark it Roadmap.').toEqual([]);
  });
  it('every pending plan label has an owner and reason and still matches something', () => {
    for (const p of PENDING_PLAN_LABELS) {
      expect(p.owner.trim()).not.toBe('');
      expect(p.reason.trim()).not.toBe('');
      expect(readFileSync(path.join(WEB, p.file), 'utf8'), `stale pending label: ${p.text}`).toContain(p.text);
    }
  });
});
