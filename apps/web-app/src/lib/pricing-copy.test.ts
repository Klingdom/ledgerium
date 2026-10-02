/**
 * Row #305 (+ #34, #310): every pricing / security statement is true today, and
 * public copy cannot carry a forward-dated promise; Starter's health-score copy
 * agrees with lib/plans.ts.
 *
 * The date rule is CLOCK-FREE. The earlier version compared copy to a fixed
 * reference date, so it only caught dates already lapsed on the day someone last
 * bumped the constant. A promise to ship "in Q1 2027" is wrong the moment it is
 * written (it commits the company to a date the code does not know), so the rule
 * rejects the promise itself, whatever the date.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PLAN_FEATURES } from '@/lib/plans';
import { PRICING_CONFIG } from '@/lib/config';
import { DEFAULT_PURGE_AFTER_DAYS } from '@/lib/workflow-retention';

const MONTH =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
/** A dated point or period: "Q3 2026", "H1 2027", "October 2026", or a bare year. */
const DATE_TOKEN = String.raw`(?:[QH][1-4]\s*(?:of\s+)?20\d{2}|${MONTH}\.?\s+(?:of\s+)?20\d{2}|\b20\d{2}\b(?!-\d))`;
/** Verbs that promise something will exist or happen. */
const PROMISE_VERB =
  '(?:launch(?:ing|es)?|coming|available|ships?|shipping|arriv(?:e|es|ing)|rolling out|releas(?:e|es|ing)|goes? live|planned|expected|scheduled)';

/** Verb, then up to 40 non-sentence characters, then a date token. */
const PROMISE_RE = new RegExp(String.raw`\b${PROMISE_VERB}\b[^.\n]{0,40}?${DATE_TOKEN}`, 'gi');
/** A quarter / half-year is a delivery period, never a fact: flag it wherever it stands. */
const PERIOD_RE = /\b[QH][1-4]\s*(?:of\s+)?20\d{2}\b/gi;
/** Retrospective phrasing ("as of July 2026") states a past fact, not a promise. */
const RETROSPECTIVE_RE = /(as of|last updated|updated|verified)\s*$/i;

export interface AllowedDatedCopy {
  /** Exact matched snippet that is permitted. */
  text: string;
  /** Person/role accountable for keeping it true. */
  owner: string;
  /** Why a dated statement is acceptable here. */
  reason: string;
}

/**
 * Explicit exceptions. Every entry needs an owner and a reason, and the test
 * below fails if an entry no longer matches anything (so it cannot rot).
 * Empty on purpose: no public copy today needs one.
 */
export const ALLOWED_DATED_COPY: readonly AllowedDatedCopy[] = [];

/** Forward-dated promises in `text`, minus allowlisted snippets. No clock is read. */
export function findForwardDatedPromises(
  text: string,
  allowlist: readonly AllowedDatedCopy[] = ALLOWED_DATED_COPY,
): string[] {
  const hits = new Set<string>();
  for (const re of [PROMISE_RE, PERIOD_RE]) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      if (RETROSPECTIVE_RE.test(text.slice(Math.max(0, start - 16), start))) continue;
      hits.add(m[0]);
    }
  }
  return [...hits].filter((h) => !allowlist.some((a) => a.text === h));
}

const SRC = path.resolve(__dirname, '..');
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const rel = (...p: string[]) => path.join(SRC, ...p);
const SCANNED = [
  rel('components', 'PricingCards.tsx'),
  rel('app', 'api', 'billing', 'checkout', 'route.ts'),
  rel('lib', 'checkout-error.ts'),
  rel('lib', 'config.ts'),
  ...walk(rel('app', '(public)')),
];

describe('findForwardDatedPromises (clock-free)', () => {
  it('flags the restored Q3 2026 promise strings', () => {
    expect(findForwardDatedPromises('Multi-user invites are launching Q3 2026.')).not.toEqual([]);
    expect(findForwardDatedPromises('arrive with the Q3 2026 multi-user release')).not.toEqual([]);
  });
  it('flags a future-dated promise regardless of the date', () => {
    expect(findForwardDatedPromises('SSO is coming in March 2031')).not.toEqual([]);
    expect(findForwardDatedPromises('Audit trail available by 2029')).not.toEqual([]);
    expect(findForwardDatedPromises('On-prem ships in H1 2027')).not.toEqual([]);
  });
  it('does not flag undated promises or retrospective phrasing', () => {
    expect(findForwardDatedPromises('SSO — coming soon')).toEqual([]);
    expect(findForwardDatedPromises('As of July 2026, X is Y')).toEqual([]);
    expect(findForwardDatedPromises('Annual billing saves 17%')).toEqual([]);
  });
  it('honours an allowlist entry (and only that exact snippet)', () => {
    const allow = [{ text: 'coming in March 2031', owner: 'pm', reason: 'contractual' }];
    expect(findForwardDatedPromises('SSO is coming in March 2031', allow)).toEqual([]);
    expect(findForwardDatedPromises('SSO is coming in April 2031', allow)).not.toEqual([]);
  });
  it('every allowlist entry has an owner and a reason', () => {
    for (const a of ALLOWED_DATED_COPY) {
      expect(a.owner.trim()).not.toBe('');
      expect(a.reason.trim()).not.toBe('');
    }
  });
});

describe('#305/#310: no forward-dated promise in user-facing pricing, security + public copy', () => {
  it('scans a non-trivial file set', () => {
    expect(SCANNED.length).toBeGreaterThan(10);
  });
  for (const file of SCANNED) {
    it(`${path.relative(SRC, file).split(path.sep).join('/')} promises no date`, () => {
      expect(findForwardDatedPromises(readFileSync(file, 'utf8'))).toEqual([]);
    });
  }
  it('every allowlist entry still matches something (no stale exceptions)', () => {
    const all = SCANNED.map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const a of ALLOWED_DATED_COPY) expect(all).toContain(a.text);
  });
});

describe('#34: Starter health-score copy agrees with lib/plans.ts', () => {
  const pageSrc = readFileSync(rel('app', '(public)', 'pricing', 'page.tsx'), 'utf8');
  const listsHealthScores = (id: string) =>
    PRICING_CONFIG.plans.find((p) => p.id === id)!.features.some((f) => /health scores?/i.test(f));

  it('Starter and Free card feature lists match the healthScores entitlement', () => {
    expect(PLAN_FEATURES.starter.features.healthScores).toBe(true);
    expect(PLAN_FEATURES.free.features.healthScores).toBe(false);
    expect(listsHealthScores('starter')).toBe(true);
    expect(listsHealthScores('free')).toBe(false);
  });
  it('comparison table row matches the entitlement for free and starter', () => {
    const row = pageSrc.match(/label: 'Process health scores',\s*free: (true|false), starter: (true|false)/);
    expect(row).not.toBeNull();
    expect(row![1] === 'true').toBe(PLAN_FEATURES.free.features.healthScores);
    expect(row![2] === 'true').toBe(PLAN_FEATURES.starter.features.healthScores);
  });
  it('FAQ does not make health scores part of a Team+-only intelligence layer', () => {
    expect(PLAN_FEATURES.starter.features.intelligenceLayer).toBe(false);
    expect(PLAN_FEATURES.solo.features.intelligenceLayer).toBe(true);
    const faq = pageSrc.match(/q: 'What is the intelligence layer\?',\s*a: '([^']*)'/)![1]!;
    expect(faq).not.toMatch(/process health scores\. It turns/);
    expect(faq).toMatch(/Starter includes basic process health scores/);
    expect(faq).toMatch(/Available on Solo and above./);
  });
});

/* ───────────────────────── #313: docs + AI-SOP wording ───────────────────────── */

const readSrc = (...p: string[]) => readFileSync(rel(...p), 'utf8');
const PUBLIC_FILES = walk(rel('app', '(public)'));

/** Whole npm package names of LLM SDKs (exact or scoped), never substrings. */
const LLM_PACKAGE_RE =
  /^(?:@anthropic-ai\/[^/]+|@anthropic\/[^/]+|openai|@openai\/[^/]+|@google\/generative-ai|@google\/genai|@google-cloud\/vertexai|cohere-ai|@mistralai\/[^/]+|@langchain\/[^/]+|langchain|ai|@ai-sdk\/[^/]+|@aws-sdk\/client-bedrock-runtime|ollama|groq-sdk|replicate)$/;
export const isLlmPackage = (name: string): boolean => LLM_PACKAGE_RE.test(name);
/** Hosts a raw fetch() to a model API would name. */
const MODEL_HOST_RE =
  /api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com|api\.cohere\.(?:ai|com)|api\.mistral\.ai|api\.groq\.com|openrouter\.ai\/api|api\.x\.ai|bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com|aiplatform\.googleapis\.com/i;
const PROTECTED_CLAIM =
  'Public copy says no model writes or rewrites SOPs (security page "No AI rewriting"; pricing "rather than rewritten by AI"; docs "rule-based recommendations"). Revisit that copy before merging.';

describe('#313: the docs page is under the forward-dated-promise scan', () => {
  it('docs/page.tsx is in SCANNED', () => {
    expect(SCANNED).toContain(rel('app', '(public)', 'docs', 'page.tsx'));
  });
});

describe('#313: docs page agrees with lib/plans.ts on Enterprise features', () => {
  const docs = readSrc('app', '(public)', 'docs', 'page.tsx');
  const unbuilt = [['SSO'], ['audit trail'], ['on-premise']] as const;

  it('the unbuilt features exist only as plan flags (Roadmap until something enforces them)', () => {
    for (const k of ['sso', 'auditTrail', 'complianceExports', 'customRetention'] as const) {
      expect(PLAN_FEATURES.enterprise.features[k]).toBe(true); // flag only
      expect(PLAN_FEATURES.growth.features[k]).toBe(false);
    }
  });
  it('docs never lists SSO / audit trail / on-premise / custom retention as present', () => {
    expect(docs).not.toMatch(/SSO, RBAC, audit trail, on-premise option, custom/);
    expect(docs).not.toMatch(/\['SSO & RBAC'/);
    for (const [label] of unbuilt) {
      const rows = docs.split(/\r?\n/).filter((l) => l.trim().toLowerCase().startsWith(`['${label.toLowerCase()}`));
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r).toMatch(/Roadmap/);
    }
    expect(docs).toMatch(/On the roadmap: SSO, audit trail &amp; compliance\s+exports, on-premise deployment, custom retention/);
  });
  it('docs claims only the two enforced roles as enforced (#315; enforcement fix is #316)', () => {
    expect(docs).toMatch(/Team roles: owner and admin/);
    expect(docs).not.toMatch(/Role-based team access \(owner, admin, member, viewer\)/);
    expect(docs).toMatch(/Owner and Admin permissions are enforced today/);
    expect(docs).toMatch(/\['Member', 'Roadmap:/);
    expect(docs).toMatch(/\['Viewer', 'Roadmap:/);
    expect(docs).not.toMatch(/\['Member', 'Record workflows/);
    expect(docs).not.toMatch(/\['Viewer', 'Read-only access/);
  });
  it('docs owner/admin/team claims match the team routes (#321 truth table)', () => {
    // Enforced today (routes under app/api/teams/**, lib/team-roles.ts): owner and admin may
    // invite, revoke invites, remove members and change roles; only an owner may grant,
    // change or remove an owner. No team-delete route, no team billing route, no team library.
    const teamRoutes = readSrc('app', 'api', 'teams', 'route.ts');
    expect(teamRoutes).not.toMatch(/export const (DELETE|PATCH|PUT)/);
    expect(existsSync(rel('app', 'api', 'teams', '[id]', 'route.ts'))).toBe(false);
    expect(readSrc('lib', 'team-roles.ts')).toMatch(/targetRole === 'owner' && actorRole !== 'owner'/);
    expect(docs).toMatch(/\['Owner', 'Invite and remove members, revoke invites, assign any role including Owner'\]/);
    expect(docs).toMatch(/\['Admin', 'Invite and remove members, revoke invites, assign roles up to Admin \(cannot grant, change or remove an Owner\)'\]/);
    expect(docs).not.toMatch(/delete the team|manage billing|manage all workflows/i);
    // No team library exists: nothing reads team shares, so no role may be said to view one.
    expect(docs).toMatch(/<H3>6\.4 Shared workflow library<\/H3>\s*<P>\s*Roadmap: /);
    expect(docs).not.toMatch(/6\.4 Shared workflow library \(roadmap\)/);
    expect(docs).not.toMatch(/appropriate role/i);
    expect(docs).not.toMatch(/recordings are visible in the shared team/);
    const joinPage = readSrc('app', '(app)', 'teams', 'join', 'page.tsx');
    expect(joinPage).not.toMatch(/access shared workflows/);
  });
  it('docs plan table has a Solo column and matches plan limits', () => {
    expect(docs).toMatch(/<TH>Solo<\/TH>/);
    expect(PLAN_FEATURES.team.maxSeats).toBe(5);
    expect(PLAN_FEATURES.team.maxRecorders).toBe(3);
    // maxRecorders is read by no enforcement path (#315), so no page may state a recorder limit.
    expect(docs).toMatch(/'5 users', '15 users'/);
    expect(docs).not.toMatch(/\d+ recorders/);
    expect(PLAN_FEATURES.growth.maxSeats).toBe(15);
    expect(PLAN_FEATURES.growth.maxRecorders).toBe(10);
  });
});

describe('#313: pricing, docs and security all say "Roadmap" for unbuilt Enterprise features', () => {
  const pages = {
    pricing: readSrc('app', '(public)', 'pricing', 'page.tsx'),
    docs: readSrc('app', '(public)', 'docs', 'page.tsx'),
    security: readSrc('app', '(public)', 'security', 'page.tsx'),
  };
  it('each page renders the Roadmap label', () => {
    for (const src of Object.values(pages)) expect(src).toMatch(/Roadmap|on the roadmap/i);
  });
  it('no page renders "coming soon" as visible text', () => {
    for (const src of Object.values(pages)) {
      // identifiers like 'coming-soon' (hyphenated) are code, not copy
      expect(src).not.toMatch(/coming soon/i);
    }
  });
  it('security badge for SSO / custom retention / on-prem is Roadmap', () => {
    expect(pages.security).toMatch(/status: 'roadmap'/);
    expect(pages.security).not.toMatch(/'coming-soon'/);
    expect(pages.security).toMatch(/>\s*Roadmap\s*</);
  });
});

describe('#313: SOP generation is deterministic, and every public page says so', () => {
  // Traced truth: renderSOP (packages/process-engine/src/sopTemplates.ts) and
  // buildSOP (sopBuilder.ts) are template/rule rendering over captured events;
  // agent-intelligence declares "deterministic and rule-based (no LLM calls)";
  // no LLM SDK is a dependency of any package that produces SOP text.
  const repo = path.resolve(SRC, '..', '..', '..');
  it('no LLM SDK is a dependency of the root, any app, or any package (whole package names)', () => {
    const manifests: string[][] = [['package.json'], ['apps', 'web-app', 'package.json'], ['apps', 'extension-app', 'package.json']];
    for (const d of readdirSync(path.join(repo, 'packages'))) manifests.push(['packages', d, 'package.json']);
    let seen = 0;
    for (const m of manifests) {
      let raw: string;
      try {
        raw = readFileSync(path.join(repo, ...m), 'utf8');
      } catch {
        continue;
      }
      seen++;
      const j = JSON.parse(raw) as Record<string, Record<string, string> | undefined>;
      const names = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].flatMap((k) =>
        Object.keys(j[k] ?? {}),
      );
      expect(
        names.filter(isLlmPackage),
        `${m.join('/')} depends on an LLM SDK. ${PROTECTED_CLAIM}`,
      ).toEqual([]);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('isLlmPackage matches whole names, not substrings', () => {
    for (const n of ['@anthropic-ai/sdk', 'openai', 'cohere-ai', '@mistralai/mistralai', 'ai']) expect(isLlmPackage(n)).toBe(true);
    for (const n of ['coherent', 'openai-compatible-docs-theme', 'react', 'mistral-wind']) expect(isLlmPackage(n)).toBe(false);
  });

  it('no non-test source references a model API host', () => {
    const roots: string[][] = [['apps', 'web-app', 'src'], ['apps', 'extension-app', 'src']];
    for (const d of readdirSync(path.join(repo, 'packages'))) roots.push(['packages', d, 'src']);
    const files: string[] = [];
    for (const r of roots) {
      try {
        walk(path.join(repo, ...r), files);
      } catch {
        /* package without src */
      }
    }
    expect(files.length).toBeGreaterThan(100);
    for (const f of files) {
      expect(
        readFileSync(f, 'utf8').match(MODEL_HOST_RE),
        `${path.relative(repo, f)} references a model API host. ${PROTECTED_CLAIM}`,
      ).toBeNull();
    }
  });

  const allPublic = PUBLIC_FILES.map((f) => ({ f, text: readFileSync(f, 'utf8') }));
  const CLAIMS_AI_WROTE_IT = /AI[- ]generated SOPs?|SOPs? (is|are|was) (written|generated|created) (by|with) AI|AI[- ]written|AI[- ]powered SOP/i;

  it('no public page says SOPs are AI-generated / AI-written', () => {
    for (const { f, text } of allPublic) {
      expect(text.match(CLAIMS_AI_WROTE_IT), path.relative(SRC, f)).toBeNull();
    }
  });
  it('pricing and security both say SOPs are not rewritten by AI (agree)', () => {
    const pricing = readSrc('app', '(public)', 'pricing', 'page.tsx');
    const security = readSrc('app', '(public)', 'security', 'page.tsx');
    expect(security).toMatch(/No AI rewriting/);
    expect(pricing).toMatch(/rather than rewritten by AI/);
    expect(pricing).toMatch(/Evidence-linked SOPs/);
    expect(pricing).toMatch(/An evidence-linked SOP/);
  });
  it('docs labels recommendations as rule-based, not AI-generated', () => {
    const docs = readSrc('app', '(public)', 'docs', 'page.tsx');
    expect(docs).not.toMatch(/AI-generated/i);
    expect(docs).toMatch(/rule-based recommendations/);
  });
});

/* ───────── #315: claims pinned to the code that enforces (or does not) them ───────── */

describe('#315: public copy does not overclaim beyond enforcement', () => {
  const security = readSrc('app', '(public)', 'security', 'page.tsx');
  const publicText = PUBLIC_FILES.map((f) => ({ f, text: readFileSync(f, 'utf8') }));

  it('#319: deletion copy states the real policy: soft delete, then a purge 30 days later', () => {
    const route = readSrc('app', 'api', 'workflows', '[id]', 'route.ts');
    expect(route).toMatch(/Soft delete[\s\S]{0,120}status: 'deleted'/);
    expect(route).not.toMatch(/workflow\.delete\(/);
    // The 30 in the copy is the code's default retention, not a second number.
    expect(DEFAULT_PURGE_AFTER_DAYS).toBe(30);
    expect(readSrc('app', 'api', 'admin', 'retention', 'purge', 'route.ts')).toMatch(/purgeExpiredWorkflows/);
    // Scan EVERY public page, terms included.
    expect(publicText.length).toBeGreaterThan(20);
    expect(publicText.some(({ f }) => /security[\\/]page\.tsx$/.test(f))).toBe(true);
    expect(publicText.some(({ f }) => /terms[\\/]page\.tsx$/.test(f))).toBe(true);
    for (const { f, text } of publicText) {
      expect(text, f).not.toMatch(/export and deletion/i);
      expect(text, f).not.toMatch(/retained, not purged/i);
      expect(text, f).not.toMatch(/delete your data any time/i);
      // Any "permanently removed" must carry the real window.
      expect(text, f).not.toMatch(/permanently removed(?! after 30 days)/i);
      expect(text, f).not.toMatch(/purged from our/i);
      expect(text, f).not.toMatch(/within 30 days/i);
      // "permanently deleted/erased" appears only in the terms termination clause (account closure), never about workflows.
      if (!/[\\/]terms[\\/]/.test(f)) expect(text, f).not.toMatch(/permanently (deleted|erased)/i);
    }
    const terms = readSrc('app', '(public)', 'terms', 'page.tsx');
    expect(security).toMatch(/Per-workflow export; deleted workflows are permanently removed after 30 days/);
    expect(terms).toMatch(/You can export your data and delete workflows at any time; deleted workflows are permanently removed after 30 days/);
    expect(readSrc('app', '(public)', 'privacy', 'page.tsx')).toMatch(/deleted workflows are permanently removed after 30 days/);
    expect(readSrc('app', '(public)', 'privacy', 'extension', 'page.tsx')).toMatch(/deleted workflows are permanently removed after 30 days/);
    expect(readSrc('app', '(public)', 'docs', 'page.tsx')).toMatch(/Deleted workflows can.{1,2}t be restored from the app and are permanently removed after 30 days/);
    expect(security).toMatch(/'Same input, same output'/);
    expect(security).not.toMatch(/Reproducible processing/);
  });

  it('#319: no account-deletion route exists, so no public page may claim self-serve account erasure', () => {
    const account = readSrc('app', 'api', 'account', 'route.ts');
    expect(account).not.toMatch(/export const (DELETE|POST)/);
    for (const { f, text } of publicText) {
      expect(text, f).not.toMatch(/delete your account (instantly|immediately)|account (is|will be) (erased|deleted) (instantly|immediately)/i);
    }
  });

  it('PDF is window.print() with no plan check, so no page sells PDF as a paid/clean export', () => {
    const shell = readSrc('components', 'sop-view', 'SOPPageShell.tsx');
    const handlePrint = shell.slice(shell.indexOf('const handlePrint'), shell.indexOf('// ── Loading'));
    expect(handlePrint).toMatch(/window\.print\(\)/);
    expect(handlePrint).not.toMatch(/hasFeature|requireFeature|checkFeatureAccess|cleanExports|watermark/i);
    for (const f of [['app', '(public)', 'pricing', 'page.tsx'], ['lib', 'config.ts']]) {
      expect(readSrc(...f), f.join('/')).not.toMatch(/Clean exports[^'\n]*PDF/);
    }
  });

  it('the markdown and JSON export gates the copy describes exist in code', () => {
    expect(readSrc('app', 'api', 'workflows', '[id]', 'export-markdown', 'route.ts')).toMatch(/hasFeature\(plan, 'cleanExports'\)/);
    expect(readSrc('app', 'api', 'workflows', '[id]', 'export-json', 'route.ts')).toMatch(/requireFeature\(user, 'cleanExports'\)/);
  });

  it('no page claims four enforced roles', () => {
    for (const { f, text } of publicText) {
      expect(text, path.relative(SRC, f)).not.toMatch(/Role-based team access \(owner, admin, member, viewer\)/);
    }
    expect(readSrc('lib', 'config.ts')).not.toMatch(/Role-based team access/);
  });

  it('no public page states a recorder limit (maxRecorders is read by no enforcement path)', () => {
    for (const { f, text } of publicText) expect(text, path.relative(SRC, f)).not.toMatch(/\d+ recorders/i);
  });

  it('no public page says AI-powered', () => {
    for (const { f, text } of publicText) expect(text, path.relative(SRC, f)).not.toMatch(/AI[- ]powered/i);
  });

  it('security page has no "Audit Trail" card while audit trail is Roadmap', () => {
    expect(security).not.toMatch(/title: 'Audit Trail'/);
  });

  it('docs screenshot alt says six tiers', () => {
    const docs = readSrc('app', '(public)', 'docs', 'page.tsx');
    expect(docs).not.toMatch(/five tiers/i);
    expect(docs).toMatch(/six tiers: Free, Starter, Solo, Team, Growth, and Enterprise/);
  });
});

/* ───────── #314: positioning, "deterministic and evidence-linked", not "AI-produced" ───────── */

describe('#314: no user-facing copy claims AI authorship', () => {
  // No model runs anywhere (see #313 tripwire above): SOPs, scores and recommendations are rules
  // and templates. "AI" is allowed only where literally true: the brand name "Ledgerium AI",
  // "readiness for AI", "no AI ...", and descriptions of OTHER tools.
  const AUTHORSHIP_RE = new RegExp(
    [
      String.raw`AI[- ](?:powered|generated|driven|written|authored|produced|created|based)\b`,
      String.raw`AI Insights?\b`,
      String.raw`AI[- ]analys[ie]s\b`,
      String.raw`AI[- ]recommendations?\b`,
      String.raw`\b(?:generated|written|authored|produced|created|rewritten|powered|driven) (?:by|with) (?:an? )?AI\b`,
      String.raw`\bAI tools\b`,
    ].join('|'),
    'gi',
  );

  interface AllowedAiCopy {
    /** Exact matched snippet (case-insensitive) permitted in files matching `file`. */
    text: string;
    file: RegExp;
    reason: string;
  }
  /** Each entry needs a reason; the test below fails if one stops matching anything. */
  const ALLOWED_AI_COPY: readonly AllowedAiCopy[] = [
    { text: 'rewritten by AI', file: new RegExp("pricing/page[.]tsx$"), reason: 'Negation: "rather than rewritten by AI" says Ledgerium does NOT use AI to write SOPs (pinned by the #313 test).' },
    { text: 'rewritten by AI', file: new RegExp("[(]public[)]/page[.]tsx$"), reason: 'Negation: "nothing was rewritten by AI" on the home page says no AI touched the sample SOP.' },
    { text: 'AI-generated', file: new RegExp("compare/scribe/page[.]tsx$"), reason: 'Competitor comparison: describes Scribe Optimize maps, not Ledgerium.' },
    { text: 'AI-based', file: new RegExp("compare/scribe/page[.]tsx$"), reason: 'Competitor comparison: describes Scribe Optimize, not Ledgerium.' },
    { text: 'AI-based', file: new RegExp("content/pages/alternatives[.]ts$"), reason: 'Competitor comparison: describes Scribe Optimize agents, not Ledgerium.' },
  ];

  const publicDir = path.resolve(SRC, '..', 'public');
  const userFacing = [
    ...walk(SRC).filter((f) => !/__tests__|[.]fixtures[.]/.test(f)),
    ...readdirSync(publicDir).filter((f) => f.endsWith('.html')).map((f) => path.join(publicDir, f)),
  ];
  /** Source lines that are not comments (comments are not user-facing copy). */
  const copyLines = (file: string) =>
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => !/^\s*(?:\/\/|\*|\/\*|\{\/\*)/.test(l));
  const hitsIn = (file: string): string[] =>
    copyLines(file).flatMap((l) => [...l.matchAll(AUTHORSHIP_RE)].map((m) => m[0]))
      .filter((h) => !ALLOWED_AI_COPY.some((a) => a.file.test(file.split(path.sep).join("/")) && a.text.toLowerCase() === h.toLowerCase()));

  it('scans a non-trivial file set (src + public html)', () => {
    expect(userFacing.length).toBeGreaterThan(200);
  });
  it('the rule catches the claims it exists to catch', () => {
    for (const bad of ['AI-powered insights', 'AI-generated SOPs', 'Get AI Insights', 'AI analysis', 'written by AI', 'generated with AI']) {
      expect(bad.match(AUTHORSHIP_RE), bad).not.toBeNull();
    }
    for (const ok of ['Ledgerium AI', 'readiness for AI', 'AI-readiness scores', 'No AI rewriting', 'ready for AI automation']) {
      expect(ok.match(AUTHORSHIP_RE), ok).toBeNull();
    }
  });
  it('no user-facing file claims AI authorship (outside the allowlist)', () => {
    const offenders = userFacing
      .map((f) => ({ f: path.relative(SRC, f), hits: hitsIn(f) }))
      .filter((o) => o.hits.length > 0);
    expect(offenders, 'AI-authorship claim in user-facing copy; no model runs (see #313). Reword to deterministic / evidence-linked, or allowlist with a reason.').toEqual([]);
  });
  it('every allowlist entry has a reason and still matches something', () => {
    for (const a of ALLOWED_AI_COPY) {
      expect(a.reason.trim()).not.toBe('');
      const used = userFacing.some((f) => a.file.test(f.split(path.sep).join("/")) && copyLines(f).some((l) => l.toLowerCase().includes(a.text.toLowerCase())));
      expect(used, `stale allowlist entry: ${a.text}`).toBe(true);
    }
  });
});

describe('#314: no unpurchasable plan carries a popularity badge', () => {
  const checkout = readSrc('app', 'api', 'billing', 'checkout', 'route.ts');
  const blocked = [...(checkout.match(/BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = new Set<PaidPlanType>\(\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const POPULARITY_RE = /Most Popular|Best Value|Best Seller|Recommended plan|Most Chosen/i;

  it('Team is still blocked at checkout (402) — the reason the badge is gone', () => {
    expect(blocked).toContain('team');
  });
  it('neither the pricing cards nor the pricing page renders a popularity badge', () => {
    expect(readSrc('components', 'PricingCards.tsx')).not.toMatch(POPULARITY_RE);
    expect(readSrc('app', '(public)', 'pricing', 'page.tsx')).not.toMatch(POPULARITY_RE);
  });
  it('no plan in PRICING_CONFIG carries a badge/popular field', () => {
    for (const p of PRICING_CONFIG.plans) {
      expect(Object.keys(p).filter((k) => /badge|popular/i.test(k)), p.id).toEqual([]);
    }
  });
});

describe('#314: the Free export watermark does not imply AI authorship', () => {
  it('footer text attributes to Ledgerium, with the plan gate intact', () => {
    const route = readSrc('app', 'api', 'workflows', '[id]', 'export-markdown', 'route.ts');
    const texts = [...route.matchAll(/WATERMARK_(?:PREPEND|APPEND) =\s*'([^']*)'/g)].map((m) => m[1]!);
    expect(texts.length).toBe(2);
    for (const t of texts) {
      expect(t).toMatch(/Ledgerium/);
      expect(t).not.toMatch(/Ledgerium AI|by AI/);
    }
    expect(route).toMatch(/hasFeature\(plan, 'cleanExports'\)/);
  });
});
