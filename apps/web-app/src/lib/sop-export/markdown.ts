import type { SopTemplatePage } from '@/content/types';
import { pageUrl } from '@/lib/seo/url';

/**
 * Phase-1 SOP template exporter: renders a `SopTemplatePage` registry entry
 * to a fillable Markdown document.
 *
 * ─── DETERMINISM CONTRACT (Ledgerium core invariant) ─────────────────────────
 * `renderSopTemplateMarkdown` MUST return byte-identical output for identical
 * input, forever — in every process, on every OS, under every `TZ`/`LANG`, at
 * any wall-clock time. To hold that guarantee, this file and everything it
 * imports for rendering purposes NEVER reads the live system clock or an RNG,
 * NEVER performs locale- or ICU-dependent formatting or comparison, NEVER
 * applies Unicode string normalization, and NEVER relies on a platform-
 * specific line-ending constant. Concretely (see `lib/sop-export/*.test.ts`
 * for the source-text gate that enforces this list by name):
 *
 *   - The only date in the document is `page.updatedAt`, formatted by string
 *     split (see `formatUpdated` below) — the same shape as
 *     `components/seo/Blocks.tsx`'s `formatUpdated`, deliberately duplicated
 *     rather than imported so this pure lib does not couple to a React
 *     component file. Duplication is cheaper than coupling here.
 *   - No locale-aware date/number formatting or locale-aware string
 *     comparison of any kind — output would depend on the host's ICU build
 *     or platform default locale.
 *   - No Unicode string normalization — normalized-form output depends on
 *     the runtime's Unicode version. Source bytes (including the corpus's
 *     existing U+2019/U+2014 smart quotes and em dashes) pass through
 *     verbatim.
 *   - No sorting of any array. Registry array order (`sopSections`,
 *     `exampleProcedure`, `commonMistakes`) IS the output order — no
 *     re-ordering, ever.
 *   - Every line join is a single line-feed character (LF only), matching
 *     the precedent in `app/llms.txt/route.ts`. No BOM. Exactly one
 *     trailing newline.
 *   - Holds no module-level mutable state across calls (no caches, no
 *     memoisation).
 *
 * Markdown-significant characters in registry content (`#`, `>`, `-`, `*`,
 * `+`, a leading digit-dot, `|`, backtick) are GATE-ENFORCED by a build-time
 * test (mirroring `lib/seo/validate.ts`'s pure-data-validation precedent),
 * never silently transformed here — a transform would be a second, lossy
 * source of truth for content that must match the page it was derived from.
 *
 * ─── SCOPE ────────────────────────────────────────────────────────────────
 * Derives ONLY from: h1, sopSections, exampleProcedure, commonMistakes,
 * whoUsesIt, whenToUseIt, honestLimitation, updatedAt, originalDataPoint,
 * relatedWorkflowSlug, slug, type. Deliberately excludes page-SEO fields
 * (metaTitle, metaDescription, shortAnswer, keyTakeaways, mechanismIntro,
 * faqs, howLedgeriumGenerates, secondaryKeywords, eyebrow) — including them
 * would turn a template into a page dump and make this a near-duplicate of
 * the HTML page it should be driving traffic to.
 *
 * Never throws for any `SopTemplatePage` that satisfies the type. Empty
 * arrays render as the corresponding section with only a fill-in blank; they
 * do not omit the section — the document's skeleton must be stable across
 * all published pages, or the artifact is not a template.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Deterministic "Month YYYY" from an ISO date (YYYY-MM-DD). Deliberately
 *  duplicated from `components/seo/Blocks.tsx`'s `formatUpdated` — see the
 *  module doc-comment above. */
function formatUpdated(iso: string): string {
  const [y, m] = iso.split('-');
  const name = MONTH_NAMES[Number(m) - 1];
  return name ? `${name} ${y}` : iso;
}

function howToUseLines(): string[] {
  return [
    '## How to use this template',
    '',
    "- Fields written as `[fill in: ...]` are blanks — replace each one with the value for your process.",
    "- Lines starting with `>` are guidance, not part of the SOP — delete them once you've filled in the real content.",
    '- Recording this process in Ledgerium generates a filled-in version of this SOP automatically.',
    '',
  ];
}

function documentControlLines(): string[] {
  return [
    '## Document control',
    '',
    '- Process owner: [fill in: process owner]',
    '- Version: [fill in: version]',
    '- Effective date: [fill in: effective date]',
    '- Last reviewed: [fill in: last reviewed date]',
    '- Approved by: [fill in: approver name or title]',
    '',
  ];
}

function appliesToLines(page: Pick<SopTemplatePage, 'whoUsesIt' | 'whenToUseIt'>): string[] {
  return [
    '## Applies to / Use when',
    '',
    `> Who uses it: ${page.whoUsesIt}`,
    `> When to use it: ${page.whenToUseIt}`,
    '',
    '- Applies to: [fill in: who this applies to in your organization]',
    '- Use when: [fill in: when your team should follow this procedure]',
    '',
  ];
}

/** One `##` section per `sopSections[i]`, in registry order. `detail` is
 *  instruction ("Why the procedure exists…"), so it renders as a guidance
 *  blockquote followed by a blank the reader fills in — this is the
 *  mechanism that makes the artifact fillable rather than a dump. */
function sopSectionsLines(page: Pick<SopTemplatePage, 'sopSections'>): string[] {
  const lines: string[] = [];
  for (const section of page.sopSections) {
    lines.push(`## ${section.heading}`);
    lines.push('');
    lines.push(`> ${section.detail}`);
    lines.push('');
    lines.push(`[fill in: ${section.heading.toLowerCase()} details]`);
    lines.push('');
  }
  return lines;
}

/** Always-present Procedure section, independent of whatever `sopSections`
 *  happens to contain (one of the 17 published templates uses "Close
 *  checklist" rather than a literal "Procedure" heading at that position —
 *  keying this section off registry heading text would be fragile and
 *  content-authoring-dependent, so it is rendered as its own fixed section
 *  instead). Pre-seeds `exampleProcedure` as a numbered list, then appends
 *  two blank numbered slots continuing the same sequence: an empty procedure
 *  is useless, a silently-prefilled one risks shipping another company's
 *  steps, and a clearly-labelled example plus blanks is both useful and
 *  honest. */
function procedureLines(page: Pick<SopTemplatePage, 'exampleProcedure'>): string[] {
  const lines: string[] = [
    '## Worked example — steps from a real recording',
    '',
    '> Example steps from a real recording — replace with your own.',
    '',
  ];
  page.exampleProcedure.forEach((step, i) => {
    const systemSuffix = step.system ? ` (System: ${step.system})` : '';
    lines.push(`${i + 1}. **${step.title}** — ${step.detail}${systemSuffix}`);
  });
  const nextStep = page.exampleProcedure.length + 1;
  lines.push(`${nextStep}. [fill in: step]`);
  lines.push(`${nextStep + 1}. [fill in: step]`);
  lines.push('');
  return lines;
}

/** GFM checkboxes render as checkboxes in Notion/GitHub and read fine as
 *  `- [ ]` in plain text — this converts a negative page list into a working
 *  QA gate. */
function checklistLines(page: Pick<SopTemplatePage, 'commonMistakes'>): string[] {
  const lines: string[] = ['## Review checklist — common mistakes to avoid', ''];
  for (const mistake of page.commonMistakes) {
    lines.push(`- [ ] ${mistake}`);
  }
  lines.push('');
  return lines;
}

function limitationsLines(page: Pick<SopTemplatePage, 'honestLimitation'>): string[] {
  return ['## Limitations of this template', '', page.honestLimitation, ''];
}

/**
 * Footer: the link-back mechanism (an attribution line every forwarded copy
 * carries) and the citable fact (`originalDataPoint`) in one place. The
 * attribution line is the VERBATIM copy from
 * docs/meta/SEO_AEO_CONTENT_STRATEGY_001/sop_export_copy.md §5, with the
 * real page URL substituted for the `[slug]` placeholder shown in that copy
 * doc. `pageUrl()` (lib/seo/url.ts) is the single source of truth for the
 * page's own canonical URL, and for the related-workflow URL below — never
 * hand-composed.
 */
function footerLines(
  page: Pick<SopTemplatePage, 'type' | 'slug' | 'updatedAt' | 'originalDataPoint' | 'relatedWorkflowSlug'>,
): string[] {
  const lines: string[] = [
    '---',
    `Template: ${pageUrl(page)} · Generated automatically from a real recording, or fill in by hand.`,
    '',
    `Template last updated: ${formatUpdated(page.updatedAt)}`,
    `From Ledgerium recordings: ${page.originalDataPoint}`,
  ];
  if (page.relatedWorkflowSlug) {
    lines.push(`See the full recorded workflow: ${pageUrl({ type: 'workflow', slug: page.relatedWorkflowSlug })}`);
  }
  return lines;
}

/** Pure. Byte-deterministic. See DETERMINISM CONTRACT in this file's header. */
export function renderSopTemplateMarkdown(page: SopTemplatePage): string {
  const lines: string[] = [
    '<!--',
    'Generated from a Ledgerium SOP template.',
    'Fill in the [bracketed] fields for your process, or delete this block before publishing.',
    '-->',
    '',
    `# ${page.h1}`,
    '',
    ...howToUseLines(),
    ...documentControlLines(),
    ...appliesToLines(page),
    ...sopSectionsLines(page),
    ...procedureLines(page),
    ...checklistLines(page),
    ...limitationsLines(page),
    ...footerLines(page),
  ];

  return `${lines.join('\n')}\n`;
}
