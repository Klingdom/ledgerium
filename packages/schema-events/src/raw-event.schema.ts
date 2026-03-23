import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0' as const;

export const RawEventTypeSchema = z.enum([
  'tab_activated',
  'url_changed',
  'page_loaded',
  'spa_route_changed',
  'click',
  'dblclick',
  'input_changed',
  'form_submitted',
  'element_focused',
  'element_blurred',
  'session_start',
  'session_pause',
  'session_resume',
  'session_stop',
  'user_annotation',
]);

export const RawCaptureEventSchema = z.object({
  raw_event_id: z.string().uuid(),
  session_id: z.string(),
  t_ms: z.number().int().nonnegative(),
  t_wall: z.string().datetime(),
  event_type: RawEventTypeSchema,
  tab_id: z.number().optional(),
  url: z.string().optional(),
  url_normalized: z.string().optional(),
  page_title: z.string().optional(),
  target_selector: z.string().optional(),
  target_label: z.string().optional(),
  target_role: z.string().optional(),
  target_element_type: z.string().optional(),
  is_sensitive_target: z.boolean().default(false),
  value_present: z.boolean().optional(),
  annotation_text: z.string().optional(),
  schema_version: z.literal('1.0.0'),
});

export type RawCaptureEvent = z.infer<typeof RawCaptureEventSchema>;

export function validateRawEvent(data: unknown): RawCaptureEvent {
  return RawCaptureEventSchema.parse(data);
}
