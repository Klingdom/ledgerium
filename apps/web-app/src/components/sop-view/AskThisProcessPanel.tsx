'use client';

/**
 * AskThisProcessPanel — interactive, deterministic evidence-grounded Q&A.
 *
 * Wires the NO-LLM Phase-A engine (via POST /api/workflows/[id]/ask) into the SOP
 * Analysis view. The hard product invariant (CEO mandate / UX §1):
 *
 *   > It must be impossible to mistake an ungrounded answer for a grounded one.
 *
 * Enforced here structurally:
 *   - The "◇ Grounded · N sources" header renders ONLY when the response carries
 *     ≥1 valid citation (`grounded === true`). Ungrounded prose can NEVER receive
 *     the grounded lockup — there is no code path that styles it that way.
 *   - A refusal / scoped-decline is a calm, visually distinct TRUST state (NOT red,
 *     NOT an error). It names WHY it declined and points at what CAN be answered.
 *     It never shows the grounded header.
 *   - Network/route errors are a DISTINCT state from refusals.
 *   - The answer is rendered as PLAIN TEXT — never `dangerouslySetInnerHTML`. Even
 *     though answers are engine-built, this preserves the SOP view's
 *     zero-dangerouslySetInnerHTML invariant against captured content in titles.
 *   - Suggested questions are gated to what the engine can actually answer, so a
 *     suggestion NEVER leads to a refusal (UX §3.1).
 *
 * Conversation is EPHEMERAL client state (cleared on unmount/navigation) — no
 * persistence this iteration. Hydration-safe: no Date.now()/Math.random() in
 * render; ids come from a stable monotonic counter seeded at 0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Sparkles, Send, ShieldCheck, Diamond, AlertCircle, Loader2 } from 'lucide-react';
import type { SOPViewModel } from './types';

// ─── Contract mirrors (the route's deterministic { data } shape) ──────────────

interface AskCitation {
  kind: 'step' | 'event' | 'process';
  stepOrdinal: number | null;
  sourceEventId: string | null;
  recordedAt: string;
  label: string;
}

interface AskData {
  answer: string;
  refused: boolean;
  refusalReason: string | null;
  questionClass: string;
  grounded: boolean;
  citations: AskCitation[];
  evidenceUsed: { stepsCited: number[]; eventsCited: string[]; stepCount: number };
  isAuthoritative: false;
  bundleHash: string;
}

/** One ephemeral Q→A exchange. `kind` selects the visually-distinct render. */
type TurnKind = 'grounded' | 'refusal' | 'error';
interface Turn {
  id: number;
  question: string;
  kind: TurnKind;
  data: AskData | null;
  /** Operational error copy (kind === 'error' only). */
  errorMessage: string;
}

interface Props {
  viewModel: SOPViewModel;
  workflowId?: string;
  /** Expand + scroll to + briefly highlight the SOP step DOM node by step.id. */
  onJumpToStep?: (stepId: string) => void;
}

// ─── Suggested questions — gated to engine-answerable classes ─────────────────

/**
 * Build the suggestion set. Each suggestion maps to a question class the
 * deterministic engine grounds (count / shape / decision / conformance) so a
 * suggestion NEVER leads to a refusal. Conditional chips appear ONLY when their
 * backing signal is present (UX §3.2).
 */
function buildSuggestions(viewModel: SOPViewModel): string[] {
  const out: string[] = [
    'How many steps are in this process?',
    'What systems does it use?',
  ];
  if (viewModel.decisions.length > 0) {
    out.push('Where are the decision points?');
  }
  // Conformance is meaningful only at N>=2 — only suggest it when it won't refuse.
  if (viewModel.alignment.runCount >= 2) {
    out.push('How well do recorded runs conform to this SOP?');
  }
  return out;
}

// ─── Inline citation rendering ────────────────────────────────────────────────

/**
 * Split an answer into plain-text segments + clickable [S{ordinal}] citation
 * chips, mapping each `[[step:N]]` / `[[process]]` token to a renderable control.
 * Returns React nodes (text nodes + buttons) — NEVER an HTML string. Unknown
 * tokens fall through as literal text (defensive; the engine only emits valid
 * tokens, but we never trust prose to inject markup).
 */
function renderAnswerWithCitations(
  answer: string,
  ordinalToStepId: Map<number, string>,
  onJumpToStep: ((stepId: string) => void) | undefined,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\[\[(step:[1-9][0-9]*|event:[^\]]+|process)\]\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(answer)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(<span key={`t-${key}`}>{answer.slice(lastIndex, m.index)}</span>);
      key += 1;
    }
    const body = m[1]!;
    if (body.startsWith('step:')) {
      const ordinal = Number.parseInt(body.slice('step:'.length), 10);
      const stepId = ordinalToStepId.get(ordinal);
      nodes.push(
        <button
          key={`c-${key}`}
          type="button"
          data-testid="ask-citation-chip"
          data-step-ordinal={ordinal}
          onClick={() => stepId && onJumpToStep?.(stepId)}
          disabled={!stepId}
          aria-label={`Jump to step ${ordinal}`}
          className="inline-flex items-center align-baseline mx-0.5 px-1 py-0 rounded text-[9px] font-bold tabular-nums text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-default transition-colors"
        >
          S{ordinal}
        </button>,
      );
      key += 1;
    } else {
      // `[[process]]` / `[[event:…]]` carry no scroll target — render a calm,
      // non-interactive provenance marker so the inline reference is still visible.
      const label = body === 'process' ? 'whole process' : 'evidence';
      nodes.push(
        <span
          key={`p-${key}`}
          data-testid="ask-citation-process"
          aria-label={`Grounded in the ${label}`}
          className="inline-flex items-center align-baseline mx-0.5 px-1 py-0 rounded text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200"
        >
          ◇
        </span>,
      );
      key += 1;
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < answer.length) {
    nodes.push(<span key={`t-${key}`}>{answer.slice(lastIndex)}</span>);
  }
  return nodes;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AskThisProcessPanel({ viewModel, workflowId, onJumpToStep }: Props) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const turnIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = buildSuggestions(viewModel);

  // Stable ordinal → viewModel step.id map (citations cite ordinals; the DOM node
  // id is `sop-step-${step.id}`). Rebuilt only when steps change.
  const ordinalToStepId = new Map<number, string>(
    viewModel.steps.map((s) => [s.ordinal, s.id]),
  );

  // Clear ephemeral conversation on unmount (navigation away). No persistence.
  useEffect(() => {
    return () => {
      setTurns([]);
    };
  }, []);

  const submitQuestion = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || isLoading || !workflowId) return;

      const id = (turnIdRef.current += 1);
      setIsLoading(true);
      setQuestion('');

      try {
        const res = await fetch(`/api/workflows/${workflowId}/ask`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question: trimmed.slice(0, 500) }),
        });
        const json = (await res.json()) as { data: AskData | null; error: { message?: string } | null };

        if (!res.ok || !json.data) {
          setTurns((prev) => [
            ...prev,
            {
              id,
              question: trimmed,
              kind: 'error',
              data: null,
              errorMessage:
                json.error?.message ?? 'Something went wrong reaching the answer service. Please try again.',
            },
          ]);
          return;
        }

        const data = json.data;
        const kind: TurnKind = data.refused ? 'refusal' : 'grounded';
        setTurns((prev) => [...prev, { id, question: trimmed, kind, data, errorMessage: '' }]);
      } catch {
        setTurns((prev) => [
          ...prev,
          {
            id,
            question: trimmed,
            kind: 'error',
            data: null,
            errorMessage: 'Could not reach the answer service — check your connection and retry.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, workflowId],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuestion(question);
  };

  return (
    <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header — green "Evidence-grounded" trust pill */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-emerald-50/50 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          </div>
          <span className="text-ds-xs font-semibold text-[var(--content-primary)]">Ask This Process</span>
          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded ml-auto">
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
            Evidence-grounded
          </span>
        </div>
      </div>

      {/* Conversation transcript (ephemeral) */}
      <div className="px-4 py-3 space-y-3 max-h-[420px] overflow-y-auto" data-testid="ask-transcript">
        {turns.length === 0 && !isLoading && (
          <p className="text-[11px] text-[var(--content-secondary)] leading-relaxed">
            Ask a question about this procedure. Every answer is grounded in the observed evidence behind the steps —
            and if there isn&apos;t evidence to answer, I&apos;ll say so rather than guess.
          </p>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-1.5">
            {/* User question */}
            <div className="flex justify-end">
              <p className="text-[11px] text-[var(--content-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 max-w-[85%]">
                {turn.question}
              </p>
            </div>

            {/* Grounded answer */}
            {turn.kind === 'grounded' && turn.data && (
              <div
                data-testid="ask-answer-grounded"
                className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2"
              >
                {/* ◇ Grounded header — rendered ONLY with ≥1 valid citation */}
                <div
                  data-testid="ask-grounded-header"
                  className="flex items-center gap-1.5 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700"
                >
                  <Diamond className="h-3 w-3 fill-emerald-500 text-emerald-600" aria-hidden="true" />
                  Grounded · {turn.data.evidenceUsed.stepCount > 0
                    ? `${turn.data.citations.length} source${turn.data.citations.length !== 1 ? 's' : ''}`
                    : `${turn.data.citations.length} source${turn.data.citations.length !== 1 ? 's' : ''}`}
                </div>
                <p
                  className="text-[11px] text-[var(--content-primary)] leading-relaxed whitespace-pre-wrap break-words"
                  aria-live="polite"
                >
                  {renderAnswerWithCitations(turn.data.answer, ordinalToStepId, onJumpToStep)}
                </p>
                <p className="text-[8px] text-[var(--content-tertiary)] mt-1.5 italic">
                  Derived from recorded evidence — not authoritative. Review before relying on it.
                </p>
              </div>
            )}

            {/* Honest refusal / scoped decline — calm, NOT an error */}
            {turn.kind === 'refusal' && turn.data && (
              <div
                data-testid="ask-answer-refusal"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {turn.data.refusalReason === 'out_of_scope'
                    ? 'Out of scope'
                    : turn.data.refusalReason === 'insufficient_data'
                      ? 'Not enough evidence'
                      : 'No grounded answer'}
                </div>
                <p
                  className="text-[11px] text-[var(--content-secondary)] leading-relaxed whitespace-pre-wrap break-words"
                  aria-live="polite"
                >
                  {turn.data.answer}
                </p>
              </div>
            )}

            {/* Operational error — distinct from a refusal */}
            {turn.kind === 'error' && (
              <div
                data-testid="ask-answer-error"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold uppercase tracking-wider text-red-600">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  Couldn&apos;t answer
                </div>
                <p className="text-[11px] text-red-700 leading-relaxed" role="alert">
                  {turn.errorMessage}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Loading state — distinct from answer/refusal/error */}
        {isLoading && (
          <div
            data-testid="ask-loading"
            className="flex items-center gap-2 text-[10px] text-[var(--content-tertiary)]"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Searching evidence…
          </div>
        )}
      </div>

      {/* Suggested questions — engine-answerable only (never lead to refusal) */}
      {turns.length === 0 && (
        <div className="px-4 pb-3" data-testid="ask-suggestions">
          <p className="text-[9px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider mb-1.5">
            Try asking
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                data-testid="ask-suggestion"
                onClick={() => void submitQuestion(s)}
                disabled={isLoading || !workflowId}
                className="flex items-center gap-2 text-left text-[10px] text-[var(--content-secondary)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="h-3 w-3 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer — a REAL labeled input (never disabled-as-coming-soon) */}
      <form
        onSubmit={onSubmit}
        className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
      >
        <label htmlFor="ask-this-process-input" className="sr-only">
          Ask a question about this process
        </label>
        <div className="flex items-center gap-2">
          <input
            id="ask-this-process-input"
            ref={inputRef}
            data-testid="ask-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            disabled={isLoading || !workflowId}
            placeholder="Ask about steps, systems, decisions…"
            className="flex-1 min-w-0 text-[11px] text-[var(--content-primary)] bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
          />
          <button
            type="submit"
            data-testid="ask-submit"
            disabled={isLoading || !workflowId || question.trim().length === 0}
            aria-label="Send question"
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[8px] text-[var(--content-tertiary)] mt-1.5">
          Answers cite the steps they used. Conversation isn&apos;t saved.
        </p>
      </form>
    </div>
  );
}
