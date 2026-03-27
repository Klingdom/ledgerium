import { z } from 'zod';

export const CanonicalEventTypeSchema = z.enum([
  // Navigation
  'navigation.open_page',
  'navigation.route_change',
  'navigation.tab_activated',
  'navigation.app_context_changed',
  // Interaction
  'interaction.click',
  'interaction.select',
  'interaction.input_change',
  'interaction.submit',
  'interaction.upload_file',
  'interaction.download_file',
  'interaction.keyboard_shortcut',
  'interaction.drag_started',
  'interaction.drag_completed',
  // Workflow
  'workflow.wait',
  // Session lifecycle
  'session.started',
  'session.paused',
  'session.resumed',
  'session.stopped',
  'session.annotation_added',
  // System — policy / transparency
  'system.redaction_applied',
  'system.capture_blocked',
  // System — window / visibility
  'system.window_blurred',
  'system.window_focused',
  'system.visibility_changed',
  // System — UI state changes (observed via MutationObserver)
  'system.modal_opened',
  'system.modal_closed',
  'system.toast_shown',
  'system.loading_started',
  'system.loading_finished',
  'system.error_displayed',
  'system.status_changed',
  // Derived
  'derived.step_boundary_detected',
  'derived.activity_group_created',
  'derived.variant_detected',
]);

export const PageContextSchema = z.object({
  url: z.string(),
  urlNormalized: z.string(),
  domain: z.string(),
  routeTemplate: z.string(),
  pageTitle: z.string(),
  applicationLabel: z.string(),
  moduleLabel: z.string().optional(),
});

export const TargetSummarySchema = z.object({
  selector: z.string().optional(),
  selectorConfidence: z.number().min(0).max(1).optional(),
  label: z.string().optional(),
  role: z.string().optional(),
  elementType: z.string().optional(),
  isSensitive: z.boolean(),
  sensitivityClass: z.string().optional(),
});

export const NormalizationMetaSchema = z.object({
  sourceEventId: z.string(),
  sourceEventType: z.string(),
  normalizationRuleVersion: z.string(),
  redactionApplied: z.boolean(),
  redactionReason: z.string().optional(),
});

export const CanonicalEventSchema = z.object({
  event_id: z.string().uuid(),
  schema_version: z.literal('1.0.0'),
  session_id: z.string(),
  t_ms: z.number().int().nonnegative(),
  t_wall: z.string().datetime(),
  event_type: CanonicalEventTypeSchema,
  actor_type: z.enum(['human', 'system', 'recorder']),
  page_context: PageContextSchema.optional(),
  target_summary: TargetSummarySchema.optional(),
  normalization_meta: NormalizationMetaSchema,
  annotation_text: z.string().optional(),
});

export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;

export function validateCanonicalEvent(data: unknown): CanonicalEvent {
  return CanonicalEventSchema.parse(data);
}

export function isNavigationEvent(e: CanonicalEvent): boolean {
  return e.event_type.startsWith('navigation.');
}

export function isInteractionEvent(e: CanonicalEvent): boolean {
  return e.event_type.startsWith('interaction.');
}

export function isSessionEvent(e: CanonicalEvent): boolean {
  return e.event_type.startsWith('session.');
}

export function isSystemEvent(e: CanonicalEvent): boolean {
  return e.event_type.startsWith('system.');
}

export function isDerivedEvent(e: CanonicalEvent): boolean {
  return e.event_type.startsWith('derived.');
}
