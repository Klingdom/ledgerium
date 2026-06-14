/**
 * reportVerdict — deterministic, observed-only executive verdict generator.
 *
 * Produces 2–4 plain-English sentences that state the report's answer up-front
 * (the "decision-grade lead", R-B). It is a PURE template engine:
 *   - NO Date.now(), NO Math.random(), NO LLM, NO network, NO env reads.
 *   - Same input → byte-identical output (hydration-safe; SSR === client).
 *   - Observed-only: every number comes from a real engine field. When a figure
 *     is absent it is omitted — never fabricated, never defaulted to a guess.
 *
 * Honesty contract:
 *   - Single-run (runCount < 2): exactly ONE sentence that says so. The function
 *     NEVER emits variance / variant / consistency figures for a single run.
 *   - Multi-run: up to three sentences — consistency, variants, top action —
 *     each emitted only when its backing data is present.
 *
 * The engine threshold for "high variance" is HIGH_VARIANCE_CV_THRESHOLD = 0.5
 * (packages/intelligence-engine/src/types.ts). The CV band words below disclose
 * that boundary in plain language.
 */

/** Coefficient-of-variation interpretation band. The 0.5 boundary is the engine's
 *  HIGH_VARIANCE_CV_THRESHOLD; ≥ 0.5 reads as "highly variable". */
export type CvBand =
  | 'highly consistent'
  | 'consistent'
  | 'moderate variation'
  | 'highly variable';

/** Map a coefficient of variation to its honest band word.
 *  < 0.25 highly consistent · 0.25–<0.5 consistent (low-moderate) ·
 *  exactly the engine threshold 0.5 and above → variation language. */
export function cvBand(cv: number): CvBand {
  if (cv < 0.25) return 'highly consistent';
  if (cv < 0.5) return 'consistent';
  if (cv < 0.75) return 'moderate variation';
  return 'highly variable';
}

export interface ReportVerdictInput {
  /** Number of recorded runs in the analyzed cohort. < 2 ⇒ single-run path. */
  runCount: number;
  /** variance.sequenceStability (0–1), or null/undefined when unavailable. */
  sequenceStability?: number | null | undefined;
  /** variance.durationVariance.coefficientOfVariation, or null when unavailable. */
  coefficientOfVariation?: number | null | undefined;
  /** variants.variantCount (distinct observed paths), or null. */
  variantCount?: number | null | undefined;
  /** Run count of the dominant (standard) path, or null. */
  dominantPathRunCount?: number | null | undefined;
  /** Top bottleneck, if any. percentOfCycleTime is 0–100 (durationRatio share). */
  topBottleneck?:
    | {
        title: string;
        percentOfCycleTime: number;
      }
    | null
    | undefined;
  /** Standardization signal used when there is no usable bottleneck.
   *  Present only for multi-variant, low-stability processes. */
  standardizationOpportunity?:
    | {
        variantCount: number;
        dominantPathPercent: number; // 0–100 share of runs on the standard path
      }
    | null
    | undefined;
}

function isFiniteNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Round half-up to an integer percent without any locale/Date dependency. */
function pct(value0to100: number): number {
  return Math.round(value0to100);
}

/**
 * Build the executive verdict: 2–4 plain-English sentences for the report lead.
 * Deterministic and observed-only. Single-run returns exactly one sentence.
 */
export function buildReportVerdict(input: ReportVerdictInput): string[] {
  const runCount = isFiniteNum(input.runCount) ? input.runCount : 0;

  // ── Single-run path — one honest sentence; never any multi-run figures. ──────
  if (runCount < 2) {
    return [
      'Recorded once — record this workflow again to compare runs and unlock variance, variants, and trends.',
    ];
  }

  const sentences: string[] = [];

  // ── Sentence 1 — consistency (sequence stability + CV band) ──────────────────
  const stability = input.sequenceStability;
  const cv = input.coefficientOfVariation;
  if (isFiniteNum(stability) || isFiniteNum(cv)) {
    const parts: string[] = [];
    if (isFiniteNum(stability)) {
      parts.push(
        `${pct(stability * 100)}% of ${runCount} runs follow the same path`,
      );
    }
    if (isFiniteNum(cv)) {
      const band = cvBand(cv);
      // Disclose the band word + the raw CV so the reader can see the number too.
      parts.push(
        parts.length > 0
          ? `run timing is ${band} (CV ${cv.toFixed(2)})`
          : `Run timing is ${band} (CV ${cv.toFixed(2)})`,
      );
    }
    // Capitalize the lead clause when stability led.
    let sentence = parts.join(', and ');
    if (isFiniteNum(stability)) {
      sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }
    sentences.push(`${sentence}.`);
  }

  // ── Sentence 2 — variants (count + dominant-path coverage) ───────────────────
  const variantCount = input.variantCount;
  if (isFiniteNum(variantCount) && variantCount >= 1) {
    if (variantCount === 1) {
      sentences.push(`All ${runCount} runs follow a single path.`);
    } else {
      const dom = input.dominantPathRunCount;
      if (isFiniteNum(dom) && dom > 0) {
        sentences.push(
          `${variantCount} distinct paths were observed; the dominant path covers ${dom} of ${runCount} runs.`,
        );
      } else {
        sentences.push(
          `${variantCount} distinct paths were observed across ${runCount} runs.`,
        );
      }
    }
  }

  // ── Sentence 3 — top action (bottleneck OR standardization) ──────────────────
  const bn = input.topBottleneck;
  if (bn != null && isFiniteNum(bn.percentOfCycleTime) && bn.title.trim().length > 0) {
    sentences.push(
      `The biggest opportunity is "${bn.title.trim()}", which takes ${pct(
        bn.percentOfCycleTime,
      )}% of cycle time — optimize or automate it first.`,
    );
  } else {
    const so = input.standardizationOpportunity;
    if (
      so != null &&
      isFiniteNum(so.variantCount) &&
      so.variantCount >= 2 &&
      isFiniteNum(so.dominantPathPercent)
    ) {
      sentences.push(
        `With ${so.variantCount} paths and only ${pct(
          so.dominantPathPercent,
        )}% of runs on the standard path, standardizing the process is the biggest opportunity.`,
      );
    }
  }

  // Guarantee at least one sentence even if multi-run data is sparse.
  if (sentences.length === 0) {
    sentences.push(
      `Analyzed across ${runCount} runs — record more runs to surface consistency, variants, and the top opportunity.`,
    );
  }

  return sentences;
}
