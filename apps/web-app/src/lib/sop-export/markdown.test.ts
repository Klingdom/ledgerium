import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPagesByType } from '@/content/registry';
import { validateContent } from '@/lib/seo/validate';
import { ALL_PAGES } from '@/content/registry';
import type { SopTemplatePage } from '@/content/types';
import { renderSopTemplateMarkdown } from './markdown';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGES = getPagesByType('sopTemplate').filter((p) => p.published) as SopTemplatePage[];

describe('renderSopTemplateMarkdown — registry sanity', () => {
  it('exercises all 17 published SOP template pages', () => {
    expect(PAGES.length).toBe(17);
  });
});

// ─── T1 / T2 — byte identity ─────────────────────────────────────────────────

describe('renderSopTemplateMarkdown — determinism (T1, T2)', () => {
  it('repeat-call byte identity for every published page', () => {
    for (const page of PAGES) {
      const a = renderSopTemplateMarkdown(page);
      const b = renderSopTemplateMarkdown(page);
      expect(a).toBe(b);
    }
  });

  it('cross-instance identity: rendering a deep clone produces identical bytes', () => {
    for (const page of PAGES) {
      const clone = structuredClone(page) as SopTemplatePage;
      expect(renderSopTemplateMarkdown(clone)).toBe(renderSopTemplateMarkdown(page));
    }
  });
});

// ─── T3a — wall-clock independence ───────────────────────────────────────────

describe('renderSopTemplateMarkdown — wall-clock independence (T3a)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces identical output regardless of the system clock', () => {
    for (const page of PAGES) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));
      const early = renderSopTemplateMarkdown(page);

      vi.setSystemTime(new Date('2031-12-31T23:59:59Z'));
      const late = renderSopTemplateMarkdown(page);

      vi.useRealTimers();
      expect(early).toBe(late);
    }
  });
});

// ─── T3b — forbidden-API source scan ─────────────────────────────────────────

describe('lib/sop-export source scan — forbidden non-deterministic APIs (T3b)', () => {
  const FORBIDDEN_PATTERNS: RegExp[] = [
    /Date\.now\(/,
    /new Date\(/,
    /Math\.random/,
    /Intl\./,
    /toLocale\w*\(/,
    /\.normalize\(/,
    /localeCompare/,
    /os\.EOL/,
  ];

  function moduleSourceFiles(): string[] {
    return readdirSync(__dirname)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .map((name) => join(__dirname, name));
  }

  it('contains none of the forbidden non-deterministic APIs', () => {
    const failures: string[] = [];
    for (const file of moduleSourceFiles()) {
      const text = readFileSync(file, 'utf-8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(text)) {
          failures.push(`${file}: matched forbidden pattern ${pattern}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('sanity: the scan actually discovers the module source files', () => {
    const files = moduleSourceFiles();
    expect(files.length).toBeGreaterThanOrEqual(4); // types.ts, filename.ts, markdown.ts, render.ts
  });
});

// ─── T4 — golden fixture (frozen, reviewable documentation) ─────────────────

describe('renderSopTemplateMarkdown — golden fixtures (T4)', () => {
  it('invoice-approval-sop-template renders byte-exact expected output', () => {
    const page = PAGES.find((p) => p.slug === 'invoice-approval-sop-template');
    expect(page).toBeDefined();
    expect(renderSopTemplateMarkdown(page!)).toMatchInlineSnapshot(`
      "<!--
      Generated from a Ledgerium SOP template.
      Fill in the [bracketed] fields for your process, or delete this block before publishing.
      -->

      # Invoice approval SOP template

      ## How to use this template

      - Fields written as \`[fill in: ...]\` are blanks — replace each one with the value for your process.
      - Lines starting with \`>\` are guidance, not part of the SOP — delete them once you've filled in the real content.
      - Recording this process in Ledgerium generates a filled-in version of this SOP automatically.

      ## Document control

      - Process owner: [fill in: process owner]
      - Version: [fill in: version]
      - Effective date: [fill in: effective date]
      - Last reviewed: [fill in: last reviewed date]
      - Approved by: [fill in: approver name or title]

      ## Applies to / Use when

      > Who uses it: Accounts payable clerks, approvers, and the controller who owns payment controls. Auditors reference it when testing approvals.
      > When to use it: Use it when onboarding AP staff, standardizing approvals across the team, or preparing evidence of a payment-control process for an audit.

      - Applies to: [fill in: who this applies to in your organization]
      - Use when: [fill in: when your team should follow this procedure]

      ## Purpose

      > Why the procedure exists and the control it enforces over payments.

      [fill in: purpose details]

      ## Scope

      > Which invoices and entities the procedure covers, and what is out of scope.

      [fill in: scope details]

      ## Roles

      > Who submits, who approves at each threshold, and who posts for payment.

      [fill in: roles details]

      ## Procedure

      > The ordered steps from receipt to posting, including the PO match and threshold check.

      [fill in: procedure details]

      ## Exceptions

      > How to handle rejections, missing POs, and out-of-threshold amounts.

      [fill in: exceptions details]

      ## Records

      > What evidence is kept and where, for audit and reference.

      [fill in: records details]

      ## Worked example — steps from a real recording

      > Example steps from a real recording — replace with your own.

      1. **Receive and log the invoice** — Enter or import the invoice into the accounting system.
      2. **Match to the purchase order** — Confirm the invoice matches an approved PO and receipt.
      3. **Check coding and limit** — Verify cost coding and that the amount is within the approver’s limit.
      4. **Route for approval** — Send to the correct approver by amount, department, or vendor.
      5. **Approve and post** — The approver signs off and the invoice is posted for payment.
      6. [fill in: step]
      7. [fill in: step]

      ## Review checklist — common mistakes to avoid

      - [ ] Leaving approval thresholds out, so routing is ambiguous
      - [ ] Documenting only approval and omitting the rejection loop
      - [ ] Letting the SOP describe an ideal flow that no longer matches the system

      ## Limitations of this template

      A template is a starting structure. To reflect your real thresholds and routing, you still fill it in or, better, generate it from a recording of a real approval.

      ---
      Template: https://ledgerium.ai/sop-templates/invoice-approval-sop-template · Generated automatically from a real recording, or fill in by hand.

      Template last updated: June 2026
      From Ledgerium recordings: A generic template documents the happy path. A Ledgerium-generated invoice approval SOP includes the real exception and rework loop captured from the recording, which is where most approval delay actually lives.
      See the full recorded workflow: https://ledgerium.ai/workflow-library/invoice-approval-workflow
      "
    `);
  });

  it('customer-onboarding-sop-template renders byte-exact expected output', () => {
    const page = PAGES.find((p) => p.slug === 'customer-onboarding-sop-template');
    expect(page).toBeDefined();
    expect(renderSopTemplateMarkdown(page!)).toMatchInlineSnapshot(`
      "<!--
      Generated from a Ledgerium SOP template.
      Fill in the [bracketed] fields for your process, or delete this block before publishing.
      -->

      # Customer onboarding SOP template

      ## How to use this template

      - Fields written as \`[fill in: ...]\` are blanks — replace each one with the value for your process.
      - Lines starting with \`>\` are guidance, not part of the SOP — delete them once you've filled in the real content.
      - Recording this process in Ledgerium generates a filled-in version of this SOP automatically.

      ## Document control

      - Process owner: [fill in: process owner]
      - Version: [fill in: version]
      - Effective date: [fill in: effective date]
      - Last reviewed: [fill in: last reviewed date]
      - Approved by: [fill in: approver name or title]

      ## Applies to / Use when

      > Who uses it: Customer success and onboarding specialists, implementation managers, and the ops lead who owns time-to-value. Sales references it at the deal handoff.
      > When to use it: Use it when onboarding new CS hires, standardizing activation across the team, or reducing time-to-value for new customers.

      - Applies to: [fill in: who this applies to in your organization]
      - Use when: [fill in: when your team should follow this procedure]

      ## Purpose

      > Why the procedure exists and the activation outcome it drives.

      [fill in: purpose details]

      ## Scope

      > Which customer types and plans the procedure covers.

      [fill in: scope details]

      ## Roles

      > Who provisions, configures, runs kickoff, and confirms activation.

      [fill in: roles details]

      ## Procedure

      > The ordered steps from signed deal to confirmed first value.

      [fill in: procedure details]

      ## Exceptions

      > How to handle delayed access, billing issues, and stalled activations.

      [fill in: exceptions details]

      ## Records

      > What is logged in the CRM and where activation is confirmed.

      [fill in: records details]

      ## Worked example — steps from a real recording

      > Example steps from a real recording — replace with your own.

      1. **Receive the signed deal** — Trigger onboarding from the closed opportunity in the CRM.
      2. **Provision the account** — Create the account and set up access in the product console.
      3. **Configure and bill** — Apply configuration and connect billing to the plan.
      4. **Run kickoff and handoff** — Hand from sales to success and confirm the first goal.
      5. **Confirm activation** — Verify the customer reached first value and close onboarding.
      6. [fill in: step]
      7. [fill in: step]

      ## Review checklist — common mistakes to avoid

      - [ ] Treating onboarding as one team’s task when it spans several
      - [ ] Omitting the handoff points where customers wait longest
      - [ ] Letting the checklist describe a flow nobody follows

      ## Limitations of this template

      A template is a starting structure. Your real handoffs and systems are captured best by recording an actual onboarding rather than filling in a blank outline.

      ---
      Template: https://ledgerium.ai/sop-templates/customer-onboarding-sop-template · Generated automatically from a real recording, or fill in by hand.

      Template last updated: June 2026
      From Ledgerium recordings: A generated onboarding SOP captures the cross-team handoffs where new customers actually wait, which a template written from one team’s view usually leaves out.
      See the full recorded workflow: https://ledgerium.ai/workflow-library/customer-onboarding-workflow
      "
    `);
  });
});

// ─── T5 — fillability ────────────────────────────────────────────────────────

describe('renderSopTemplateMarkdown — fillability (T5)', () => {
  it('contains at least sopSections.length occurrences of the fill-in placeholder', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      const count = (out.match(/\[fill in:/g) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(page.sopSections.length);
    }
  });

  it('never juxtaposes "](" — the placeholder/link-syntax collision invariant', () => {
    for (const page of PAGES) {
      expect(renderSopTemplateMarkdown(page)).not.toContain('](');
    }
  });
});

// ─── T6 — content sourcing, in order ────────────────────────────────────────

describe('renderSopTemplateMarkdown — content sourcing in registry order (T6)', () => {
  it('every sopSections heading appears as a "## " heading, in registry order', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      let cursor = 0;
      for (const section of page.sopSections) {
        const needle = `## ${section.heading}`;
        const idx = out.indexOf(needle, cursor);
        expect(idx, `"${needle}" not found in order for ${page.slug}`).toBeGreaterThanOrEqual(0);
        cursor = idx + needle.length;
      }
    }
  });

  it('every exampleProcedure title appears in the Procedure section, in order', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      const procedureStart = out.indexOf('## Worked example — steps from a real recording');
      expect(procedureStart).toBeGreaterThanOrEqual(0);
      let cursor = procedureStart;
      for (const step of page.exampleProcedure) {
        const needle = `**${step.title}**`;
        const idx = out.indexOf(needle, cursor);
        expect(idx, `"${needle}" not found in order for ${page.slug}`).toBeGreaterThanOrEqual(0);
        cursor = idx + needle.length;
      }
    }
  });

  it('every commonMistakes entry appears as a "- [ ] " checklist item', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      for (const mistake of page.commonMistakes) {
        expect(out).toContain(`- [ ] ${mistake}`);
      }
    }
  });

  it('honestLimitation appears verbatim', () => {
    for (const page of PAGES) {
      expect(renderSopTemplateMarkdown(page)).toContain(page.honestLimitation);
    }
  });

  it('every exampleProcedure step with a `system` renders a "(System: ...)" suffix', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      for (const step of page.exampleProcedure) {
        if (step.system) {
          expect(out).toContain(`(System: ${step.system})`);
        }
      }
    }
  });
});

// ─── T7 — exclusion of page-SEO fields ──────────────────────────────────────

describe('renderSopTemplateMarkdown — page-SEO field exclusion (T7)', () => {
  it('omits metaTitle, metaDescription, shortAnswer, mechanismIntro, howLedgeriumGenerates, and every faqs[].a', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      expect(out).not.toContain(page.metaTitle);
      expect(out).not.toContain(page.metaDescription);
      expect(out).not.toContain(page.shortAnswer);
      if (page.mechanismIntro) expect(out).not.toContain(page.mechanismIntro);
      expect(out).not.toContain(page.howLedgeriumGenerates);
      for (const faq of page.faqs) {
        expect(out).not.toContain(faq.a);
      }
    }
  });
});

// ─── T8 — encoding ───────────────────────────────────────────────────────────

describe('renderSopTemplateMarkdown — encoding (T8)', () => {
  it('is a stable UTF-8 round-trip with no BOM', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      expect(Buffer.from(out, 'utf8').toString('utf8')).toBe(out);
      expect(out.charCodeAt(0)).not.toBe(0xfeff);
    }
  });

  it('preserves the corpus smart quote (U+2019) verbatim on invoice-approval', () => {
    const page = PAGES.find((p) => p.slug === 'invoice-approval-sop-template')!;
    const out = renderSopTemplateMarkdown(page);
    expect(out).toContain('’');
  });
});

// ─── T9 — line discipline ────────────────────────────────────────────────────

describe('renderSopTemplateMarkdown — line discipline (T9)', () => {
  it('uses LF only, ends with exactly one trailing newline, and has no trailing whitespace', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      expect(out.includes('\r')).toBe(false);
      expect(out.endsWith('\n')).toBe(true);
      expect(out.endsWith('\n\n')).toBe(false);
      for (const line of out.split('\n')) {
        expect(/[ \t]+$/.test(line), `trailing whitespace on a line for ${page.slug}: "${line}"`).toBe(false);
      }
    }
  });
});

// ─── T11 — registry markdown-safety gate ────────────────────────────────────

describe('SOP template registry — markdown-safety gate (T11)', () => {
  const LEADING_UNSAFE = /^[#>\-*+`]/;
  const LEADING_ORDERED_LIST = /^\d+\.\s/;
  const CONTAINS_UNSAFE = /[|`]/;

  function checkField(id: string, field: string, value: string, failures: string[]): void {
    if (LEADING_UNSAFE.test(value) || LEADING_ORDERED_LIST.test(value)) {
      failures.push(`${id}.${field}: starts with a Markdown-significant character: "${value.slice(0, 20)}"`);
    }
    if (CONTAINS_UNSAFE.test(value)) {
      failures.push(`${id}.${field}: contains a Markdown-significant character (| or backtick): "${value.slice(0, 40)}"`);
    }
  }

  it('no field consumed by renderSopTemplateMarkdown starts with or contains a Markdown-significant character', () => {
    const failures: string[] = [];
    for (const page of PAGES) {
      const id = page.slug;
      checkField(id, 'h1', page.h1, failures);
      checkField(id, 'whoUsesIt', page.whoUsesIt, failures);
      checkField(id, 'whenToUseIt', page.whenToUseIt, failures);
      checkField(id, 'honestLimitation', page.honestLimitation, failures);
      checkField(id, 'originalDataPoint', page.originalDataPoint, failures);
      page.sopSections.forEach((s, i) => {
        checkField(id, `sopSections[${i}].heading`, s.heading, failures);
        checkField(id, `sopSections[${i}].detail`, s.detail, failures);
      });
      page.exampleProcedure.forEach((s, i) => {
        checkField(id, `exampleProcedure[${i}].title`, s.title, failures);
        checkField(id, `exampleProcedure[${i}].detail`, s.detail, failures);
        if (s.system) checkField(id, `exampleProcedure[${i}].system`, s.system, failures);
      });
      page.commonMistakes.forEach((m, i) => checkField(id, `commonMistakes[${i}]`, m, failures));
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

// ─── T14 — Gate-A no-regression ──────────────────────────────────────────────

describe('Gate A no-regression (T14)', () => {
  it('validateContent still returns zero errors after this change', () => {
    expect(validateContent(ALL_PAGES).errors).toEqual([]);
  });
});

// ─── T15 — structural floor ──────────────────────────────────────────────────

describe('renderSopTemplateMarkdown — structural floor (T15)', () => {
  it('always contains the fixed skeleton sections regardless of source array length', () => {
    for (const page of PAGES) {
      const out = renderSopTemplateMarkdown(page);
      expect(out).toContain('## Document control');
      expect(out).toContain('## Applies to / Use when');
      expect(out).toContain('## Worked example — steps from a real recording');
      expect(out).toContain('## Review checklist — common mistakes to avoid');
      expect(out).toContain('## Limitations of this template');
      expect(out).toContain('---');
      for (const section of page.sopSections) {
        expect(out).toContain(`## ${section.heading}`);
      }
    }
  });
});
