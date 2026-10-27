/**
 * Builds a sample workflow recording (an uploadable session bundle) from a
 * short script of browser actions.
 *
 * The script is turned into RAW recorder events, the same shape the extension
 * content script emits, and then run through the real pipeline:
 *
 *   raw events -> policy-engine classifySensitivity (what capture.ts flags)
 *              -> normalization-engine normalizeSession
 *              -> segmentation-engine segmentEvents
 *
 * So the steps in a sample are derived, not hand-written: every derived step
 * cites the events it came from, exactly as a real recording does. Nothing
 * here reads the clock or a random source; the same script always yields the
 * same bundle, byte for byte.
 *
 * Values are never captured (a real recording records that a field changed,
 * not what was typed), so the samples carry no personal data.
 */
import { createHash } from 'crypto';
import { normalizeSession, NORMALIZATION_RULE_VERSION } from '../../../../../packages/normalization-engine/src/index';
import type { RawEvent, CanonicalEvent } from '../../../../../packages/normalization-engine/src/index';
import { segmentEvents } from '../../../../../packages/segmentation-engine/src/batch-segmenter';
import { SEGMENTATION_RULE_VERSION } from '../../../../../packages/segmentation-engine/src/rules';
import type { SegmentableEvent, DerivedStep } from '../../../../../packages/segmentation-engine/src/types';
import { classifySensitivity } from '../../../../../packages/policy-engine/src/sensitivity';

/** One browser action in a sample script. */
export type SampleAction =
  /** Load a page (a full navigation). `domain` may differ from the last page. */
  | { kind: 'open'; domain: string; route: string; page: string }
  /** In-app route change on the current domain (single-page app). */
  | { kind: 'route'; route: string; page: string }
  | { kind: 'click'; label: string; role?: string }
  /** Focus a field and change it. `elementType` defaults to `text`. */
  | { kind: 'fill'; label: string; elementType?: string }
  /** Choose an option in a dropdown. */
  | { kind: 'pick'; label: string }
  | { kind: 'submit'; label: string }
  /** A system confirmation shown after an action. */
  | { kind: 'toast'; label: string }
  | { kind: 'modal'; label: string }
  /** The person stops to read or think. Gaps over 45s split a step. */
  | { kind: 'wait'; ms: number };

export interface SampleScript {
  /** File name and session-id suffix, e.g. `approve-pto-request`. */
  slug: string;
  /** The recording's activity name as a person would type it. */
  title: string;
  /** HR area, used to group the catalog. */
  category: string;
  /** One sentence: what the recording shows and why it is useful. */
  summary: string;
  actions: SampleAction[];
}

export const SAMPLE_RECORDER_VERSION = 'sample-hr-1.0.0';
const SCHEMA_VERSION = '1.0.0';

/**
 * Time from an action's last event to the next action's first event, in ms.
 * Moving between fields of a form (tab, or a click into the next field) takes
 * under a second, so consecutive fields stay one step; the segmenter starts a
 * new step when the target changes after a pause of 2s or more.
 */
const DWELL_MS: Record<Exclude<SampleAction['kind'], 'wait'>, number> = {
  open: 3_500,
  route: 2_500,
  click: 2_500,
  fill: 800,
  pick: 800,
  submit: 1_500,
  toast: 1_200,
  modal: 1_500,
};

/** Time between focusing a field and its value changing (typing or choosing). */
const ENTRY_MS: Record<string, number> = {
  text: 4_000,
  email: 5_000,
  url: 6_000,
  search: 3_000,
  number: 2_500,
  date: 3_000,
  time: 2_500,
  textarea: 14_000,
  select: 2_000,
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Turns a script into the raw events a recorder would have emitted. */
export function scriptToRawEvents(script: SampleScript, sessionId: string, startMs: number): RawEvent[] {
  const events: RawEvent[] = [];
  let t = startMs;
  let seq = 0;
  let url: string | undefined;
  let pageTitle: string | undefined;
  let domain: string | undefined;

  const push = (event: Omit<RawEvent, 'raw_event_id' | 'session_id' | 't_ms' | 't_wall' | 'schema_version'>): void => {
    seq += 1;
    events.push({
      raw_event_id: `${sessionId}-e${String(seq).padStart(3, '0')}`,
      session_id: sessionId,
      t_ms: t,
      t_wall: new Date(t).toISOString(),
      schema_version: SCHEMA_VERSION,
      ...event,
    });
  };

  const onPage = (): { url: string; page_title: string } => {
    if (url === undefined || pageTitle === undefined) {
      throw new Error(`Sample "${script.slug}": an action ran before any page was opened`);
    }
    return { url, page_title: pageTitle };
  };

  const target = (label: string, elementType: string, role: string) => {
    const selector = `#${slugify(label)}`;
    const sensitivity = classifySensitivity(elementType, selector, label);
    return {
      target_selector: selector,
      target_label: label,
      target_role: role,
      target_element_type: elementType,
      is_sensitive_target: sensitivity.isSensitive,
    };
  };

  push({ event_type: 'session_start' });
  t += 1_000;

  for (const action of script.actions) {
    switch (action.kind) {
      case 'wait':
        t += action.ms;
        continue;
      case 'open':
        domain = action.domain;
        url = `https://${action.domain}${action.route}`;
        pageTitle = action.page;
        push({ event_type: 'page_loaded', url, page_title: pageTitle });
        break;
      case 'route':
        if (domain === undefined) throw new Error(`Sample "${script.slug}": route before open`);
        url = `https://${domain}${action.route}`;
        pageTitle = action.page;
        push({ event_type: 'spa_route_changed', url, page_title: pageTitle });
        break;
      case 'click':
        push({ event_type: 'click', ...onPage(), ...target(action.label, 'button', action.role ?? 'button') });
        break;
      case 'fill': {
        const fields = { ...onPage(), ...target(action.label, action.elementType ?? 'text', 'textbox') };
        push({ event_type: 'element_focused', ...fields });
        t += ENTRY_MS[action.elementType ?? 'text'] ?? ENTRY_MS['text']!;
        push({ event_type: 'input_changed', ...fields, value_present: true });
        break;
      }
      case 'pick': {
        const fields = { ...onPage(), ...target(action.label, 'select', 'combobox') };
        push({ event_type: 'element_focused', ...fields });
        t += ENTRY_MS['select']!;
        push({ event_type: 'input_changed', ...fields, value_present: true });
        break;
      }
      case 'submit':
        push({ event_type: 'form_submitted', ...onPage(), ...target(action.label, 'form', 'form') });
        break;
      case 'toast':
        push({ event_type: 'toast_shown', ...onPage(), target_label: action.label, target_role: 'status' });
        break;
      case 'modal':
        push({ event_type: 'modal_opened', ...onPage(), target_label: action.label, target_role: 'dialog' });
        break;
    }
    t += DWELL_MS[action.kind];
  }

  push({ event_type: 'session_stop' });
  return events;
}

/**
 * The normalizer assigns random UUIDs; a sample must be reproducible, so each
 * event keeps the id of the raw event it came from (the same stable-id rule
 * the full-pipeline golden test uses).
 */
function stableId(event: CanonicalEvent): CanonicalEvent {
  return { ...event, event_id: event.normalization_meta.sourceEventId };
}

/** The projection the extension's bundle builder passes to the segmenter. */
function toSegmentable(events: CanonicalEvent[]): SegmentableEvent[] {
  return events.map((e) => ({
    event_id: e.event_id,
    session_id: e.session_id,
    t_ms: e.t_ms,
    event_type: e.event_type,
    normalization_meta: { sourceEventType: e.normalization_meta.sourceEventType },
    ...(e.page_context !== undefined && {
      page_context: {
        domain: e.page_context.domain,
        routeTemplate: e.page_context.routeTemplate,
        applicationLabel: e.page_context.applicationLabel,
        pageTitle: e.page_context.pageTitle,
      },
    }),
    ...(e.target_summary !== undefined && {
      target_summary: {
        ...(e.target_summary.label !== undefined && { label: e.target_summary.label }),
        ...(e.target_summary.role !== undefined && { role: e.target_summary.role }),
        ...(e.target_summary.elementType !== undefined && { elementType: e.target_summary.elementType }),
        ...(e.target_summary.selector !== undefined && { selector: e.target_summary.selector }),
      },
    }),
  }));
}

export interface SampleBundle {
  sessionJson: {
    sessionId: string;
    activityName: string;
    startedAt: string;
    endedAt: string;
    state: 'stopped';
    pauseIntervals: never[];
    schemaVersion: string;
    recorderVersion: string;
  };
  normalizedEvents: CanonicalEvent[];
  derivedSteps: DerivedStep[];
  policyLog: unknown[];
  manifest: {
    sessionId: string;
    exportedAt: string;
    schemaVersion: string;
    recorderVersion: string;
    segmentationRuleVersion: string;
    normalizationRuleVersion: string;
    sample: { catalog: 'hr'; slug: string; category: string; summary: string };
    fileHashes: Record<string, string>;
  };
}

/** Builds the uploadable bundle for one script. Pure and deterministic. */
export function buildSampleBundle(script: SampleScript, startMs: number): SampleBundle {
  const sessionId = `sample-hr-${script.slug}`;
  const raw = scriptToRawEvents(script, sessionId, startMs);
  const normalized = normalizeSession(raw);
  if (normalized.warnings.length > 0) {
    throw new Error(`Sample "${script.slug}" normalizer warnings: ${normalized.warnings.join('; ')}`);
  }
  const events = normalized.events.map(stableId).sort((a, b) => a.t_ms - b.t_ms);
  const segmentation = segmentEvents(toSegmentable(events), sessionId);

  const first = raw[0]!;
  const last = raw[raw.length - 1]!;
  const sessionJson: SampleBundle['sessionJson'] = {
    sessionId,
    activityName: script.title,
    startedAt: first.t_wall,
    endedAt: last.t_wall,
    state: 'stopped',
    pauseIntervals: [],
    schemaVersion: SCHEMA_VERSION,
    recorderVersion: SAMPLE_RECORDER_VERSION,
  };
  const policyLog = normalized.policyLog;

  return {
    sessionJson,
    normalizedEvents: events,
    derivedSteps: segmentation.steps,
    policyLog,
    manifest: {
      sessionId,
      exportedAt: last.t_wall,
      schemaVersion: SCHEMA_VERSION,
      recorderVersion: SAMPLE_RECORDER_VERSION,
      segmentationRuleVersion: SEGMENTATION_RULE_VERSION,
      normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
      sample: { catalog: 'hr', slug: script.slug, category: script.category, summary: script.summary },
      fileHashes: {
        'session.json': sha256(JSON.stringify(sessionJson)),
        'normalized_events.json': sha256(JSON.stringify(events)),
        'derived_steps.json': sha256(JSON.stringify(segmentation.steps)),
        'policy_log.json': sha256(JSON.stringify(policyLog)),
      },
    },
  };
}
