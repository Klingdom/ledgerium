'use client';

import { useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown, Pencil, AlertTriangle } from 'lucide-react';
import { track } from '@/lib/analytics';

type UsefulnessResponse = 'yes_as_is' | 'minor_edits' | 'major_rework' | 'not_useful';

interface SOPUsefulnessSurveyProps {
  workflowId: string;
}

interface ResponseOption {
  value: UsefulnessResponse;
  label: string;
  icon: React.ElementType;
  selectedClass: string;
}

const RESPONSE_OPTIONS: ResponseOption[] = [
  {
    value: 'yes_as_is',
    label: 'Yes, as-is',
    icon: ThumbsUp,
    selectedClass: 'bg-emerald-500 border-emerald-500 text-white',
  },
  {
    value: 'minor_edits',
    label: 'Minor edits needed',
    icon: Pencil,
    selectedClass: 'bg-emerald-300 border-emerald-300 text-emerald-900',
  },
  {
    value: 'major_rework',
    label: 'Major rework',
    icon: AlertTriangle,
    selectedClass: 'bg-amber-400 border-amber-400 text-amber-900',
  },
  {
    value: 'not_useful',
    label: 'Not useful',
    icon: ThumbsDown,
    selectedClass: 'bg-red-500 border-red-500 text-white',
  },
];

/**
 * Non-blocking SOP usefulness prompt.
 *
 * Renders after `sop_section_viewed` fires (30s dwell on SOP tab).
 * Shows once per workflow per session — tracked via a ref in the parent.
 * Fades out 2 seconds after a response is recorded.
 */
export function SOPUsefulnessSurvey({ workflowId }: SOPUsefulnessSurveyProps) {
  const [selected, setSelected] = useState<UsefulnessResponse | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  // Guard against double-submit within the component
  const hasResponded = useRef(false);

  function handleResponse(response: UsefulnessResponse) {
    if (hasResponded.current) return;
    hasResponded.current = true;
    setSelected(response);

    track({
      event: 'sop_usefulness_response',
      workflowId,
      response,
    });

    // Fade out after 2 seconds
    setTimeout(() => {
      setIsDismissed(true);
    }, 2000);
  }

  if (isDismissed) return null;

  return (
    <div
      className="mt-ds-6 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-ds-4 py-ds-3 transition-opacity duration-500"
      style={{ opacity: selected ? 0.5 : 1 }}
      role="region"
      aria-label="SOP usefulness survey"
    >
      {selected ? (
        <p className="text-ds-sm text-[var(--content-secondary)] text-center py-ds-1">
          Thanks for your feedback!
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-ds-3">
          <p className="text-ds-sm font-medium text-[var(--content-primary)] flex-shrink-0">
            Was this SOP useful?
          </p>
          <div className="flex flex-wrap gap-ds-2">
            {RESPONSE_OPTIONS.map(({ value, label, icon: Icon, selectedClass }) => (
              <button
                key={value}
                onClick={() => handleResponse(value)}
                className={`inline-flex items-center gap-1.5 rounded-ds-sm border px-ds-3 py-ds-2 text-ds-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                  selected === value
                    ? selectedClass
                    : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--content-secondary)] hover:border-[var(--border-default)] hover:text-[var(--content-primary)]'
                }`}
                aria-pressed={selected === value}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
