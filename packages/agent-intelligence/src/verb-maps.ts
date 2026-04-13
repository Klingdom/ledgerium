/**
 * Canonical mapping tables for the Agent Intelligence transformation pipeline.
 *
 * These maps are replicated from @ledgerium/intelligence-engine stepFingerprinter
 * to keep agent-intelligence self-contained and avoid importing internal module
 * details. Keep in sync with stepFingerprinter.ts when updating either.
 *
 * Maps:
 * - VERB_MAP: raw word → canonical verb
 * - OBJECT_MAP: raw word → canonical object
 * - SYSTEM_MAP: raw domain/label → canonical system name
 * - EVENT_TYPE_VERB_MAP: canonical event type → implied verb
 * - VERB_TO_ACTION_TYPE: canonical verb → agent action type string
 * - CATEGORY_TO_AUTOMATION: GroupingReason → default AutomationType
 * - VERB_TO_SKILL_TYPE: canonical verb → SkillType
 * - SYSTEM_CAPABILITIES: canonical system → known capability list
 */

import type { AutomationType, SkillType } from './types.js';
import type { GroupingReason } from '@ledgerium/process-engine';

// ─── Verb map ─────────────────────────────────────────────────────────────────

/**
 * Maps raw words found in step titles to canonical verbs.
 * Source of truth for intent parsing across the pipeline.
 */
export const VERB_MAP: Record<string, string> = {
  // Click / press
  click: 'click', clicked: 'click', clicking: 'click',
  press: 'click', pressed: 'click', tap: 'click', tapped: 'click',
  // Select / choose
  select: 'select', selected: 'select', choose: 'select', chose: 'select', pick: 'select',
  // Navigation
  navigate: 'navigate', navigated: 'navigate', go: 'navigate',
  open: 'open', opened: 'open',
  visit: 'navigate', visited: 'navigate', browse: 'navigate',
  // Data entry
  enter: 'enter', entered: 'enter', type: 'enter', typed: 'enter',
  input: 'enter', fill: 'fill', filled: 'fill', write: 'enter',
  // Submit / send
  submit: 'submit', submitted: 'submit',
  send: 'send', sent: 'send',
  post: 'send', posted: 'send',
  // File operations
  upload: 'upload', uploaded: 'upload',
  download: 'download', downloaded: 'download',
  attach: 'attach', attached: 'attach',
  export: 'export', exported: 'export',
  import: 'import', imported: 'import',
  save: 'save', saved: 'save',
  // CRUD
  create: 'create', created: 'create', add: 'create', added: 'create', new: 'create',
  update: 'update', updated: 'update', edit: 'edit', edited: 'edit', modify: 'update',
  delete: 'delete', deleted: 'delete', remove: 'delete', removed: 'delete',
  // Review / verification
  review: 'review', reviewed: 'review',
  check: 'verify', checked: 'verify',
  verify: 'verify', verified: 'verify',
  confirm: 'verify', confirmed: 'verify',
  approve: 'approve', approved: 'approve',
  reject: 'reject', rejected: 'reject',
  // Search / filter
  search: 'search', searched: 'search', find: 'search', found: 'search',
  lookup: 'search', filter: 'filter', filtered: 'filter', sort: 'sort',
  // Communication
  email: 'email', emailed: 'email',
  notify: 'notify',
  message: 'message',
  forward: 'forward',
  reply: 'reply',
  // Configuration
  configure: 'configure', setup: 'configure', set: 'configure',
  enable: 'enable', disable: 'disable', toggle: 'toggle',
  // Misc
  wait: 'wait', scroll: 'scroll', expand: 'expand', collapse: 'collapse',
  close: 'close', closed: 'close', dismiss: 'close',
  copy: 'copy', copied: 'copy', paste: 'paste',
  drag: 'drag', drop: 'drop',
  login: 'login', logout: 'logout', sign: 'sign',
  print: 'print', share: 'share', publish: 'publish',
  annotate: 'annotate', annotated: 'annotate',
  generate: 'generate', generated: 'generate',
  refresh: 'refresh', reload: 'refresh',
  assign: 'assign', assigned: 'assign',
  resolve: 'resolve', resolved: 'resolve',
  escalate: 'escalate', escalated: 'escalate',
};

// ─── Object map ───────────────────────────────────────────────────────────────

/**
 * Maps raw words found in step titles to canonical business/UI objects.
 */
export const OBJECT_MAP: Record<string, string> = {
  // UI elements
  button: 'button', btn: 'button', link: 'link', tab: 'tab',
  menu: 'menu', dropdown: 'dropdown', modal: 'modal', dialog: 'modal',
  popup: 'modal', form: 'form', field: 'field', input: 'field',
  checkbox: 'checkbox', radio: 'radio', toggle: 'toggle', switch: 'toggle',
  textarea: 'text_area', page: 'page', panel: 'panel', sidebar: 'sidebar',
  header: 'header', footer: 'footer', table: 'table', row: 'row', cell: 'cell',
  // Business objects
  email: 'email', message: 'message', notification: 'notification',
  report: 'report', document: 'document', doc: 'document', file: 'file',
  spreadsheet: 'spreadsheet', csv: 'csv', pdf: 'pdf',
  invoice: 'invoice', order: 'order', ticket: 'ticket', case: 'case',
  customer: 'customer', client: 'customer', contact: 'contact',
  user: 'user', account: 'account', profile: 'profile',
  project: 'project', task: 'task', item: 'item', record: 'record',
  payment: 'payment', transaction: 'transaction', receipt: 'receipt',
  template: 'template', draft: 'draft',
  comment: 'comment', note: 'note', annotation: 'annotation',
  attachment: 'attachment', image: 'image', photo: 'image',
  dashboard: 'dashboard', chart: 'chart', graph: 'chart',
  setting: 'setting', preference: 'setting', config: 'setting',
  filter: 'filter', search: 'search', query: 'search',
  // Additional business objects
  status: 'status', priority: 'priority', category: 'category',
  date: 'date', amount: 'amount', total: 'total',
  vendor: 'vendor', supplier: 'vendor',
  product: 'product', service: 'service',
  contract: 'contract', agreement: 'contract',
  workflow: 'workflow', process: 'process',
  data: 'data', list: 'list', view: 'view',
};

// ─── System map ───────────────────────────────────────────────────────────────

/**
 * Maps raw domain strings, URL fragments, and application labels to
 * canonical system names. Used for intent enrichment and activity grouping.
 */
export const SYSTEM_MAP: Record<string, string> = {
  // Google Workspace
  gmail: 'gmail', 'mail.google.com': 'gmail',
  'google drive': 'google_drive', 'drive.google.com': 'google_drive',
  'google docs': 'google_docs', 'docs.google.com': 'google_docs',
  'google sheets': 'google_sheets', 'sheets.google.com': 'google_sheets',
  'google calendar': 'google_calendar', 'calendar.google.com': 'google_calendar',
  'google forms': 'google_forms', 'forms.google.com': 'google_forms',
  // Collaboration
  slack: 'slack', 'app.slack.com': 'slack',
  jira: 'jira', 'atlassian.net': 'jira',
  confluence: 'confluence',
  notion: 'notion', 'notion.so': 'notion',
  airtable: 'airtable', 'airtable.com': 'airtable',
  // CRM / Sales
  salesforce: 'salesforce', 'force.com': 'salesforce', 'lightning.force.com': 'salesforce',
  hubspot: 'hubspot', 'app.hubspot.com': 'hubspot',
  // Development
  github: 'github', 'github.com': 'github',
  gitlab: 'gitlab', 'gitlab.com': 'gitlab',
  'azure devops': 'azure_devops', 'dev.azure.com': 'azure_devops',
  // Project management
  trello: 'trello', 'trello.com': 'trello',
  asana: 'asana', 'app.asana.com': 'asana',
  monday: 'monday', 'monday.com': 'monday',
  // Support
  zendesk: 'zendesk', 'zendesk.com': 'zendesk',
  intercom: 'intercom', 'app.intercom.com': 'intercom',
  freshdesk: 'freshdesk', 'freshdesk.com': 'freshdesk',
  servicenow: 'servicenow', 'service-now.com': 'servicenow',
  // Finance
  stripe: 'stripe', 'dashboard.stripe.com': 'stripe',
  shopify: 'shopify', 'admin.shopify.com': 'shopify',
  quickbooks: 'quickbooks', 'app.qbo.intuit.com': 'quickbooks',
  netsuite: 'netsuite', 'netsuite.com': 'netsuite',
  xero: 'xero', 'xero.com': 'xero',
  // Microsoft 365
  outlook: 'outlook', 'outlook.office.com': 'outlook', 'outlook.live.com': 'outlook',
  teams: 'ms_teams', 'teams.microsoft.com': 'ms_teams',
  sharepoint: 'sharepoint',
  // Social
  linkedin: 'linkedin', 'linkedin.com': 'linkedin',
  twitter: 'twitter', 'x.com': 'twitter',
  // Design
  figma: 'figma', 'figma.com': 'figma',
  // ERP
  sap: 'sap', 'sap.com': 'sap',
  workday: 'workday', 'workday.com': 'workday',
};

// ─── Event type → verb map ────────────────────────────────────────────────────

/**
 * Maps canonical event types to implied verbs.
 * Used as fallback when the step title doesn't contain a recognized verb.
 */
export const EVENT_TYPE_VERB_MAP: Record<string, string> = {
  'interaction.click': 'click',
  'interaction.select': 'select',
  'interaction.input_change': 'enter',
  'interaction.submit': 'submit',
  'interaction.upload_file': 'upload',
  'interaction.download_file': 'download',
  'interaction.keyboard_shortcut': 'click',
  'interaction.drag_started': 'drag',
  'interaction.drag_completed': 'drag',
  'navigation.open_page': 'navigate',
  'navigation.route_change': 'navigate',
  'navigation.tab_activated': 'navigate',
  'navigation.app_context_changed': 'navigate',
  'session.annotation_added': 'annotate',
  'system.modal_opened': 'open',
  'system.modal_closed': 'close',
};

// ─── Verb → action type ───────────────────────────────────────────────────────

/**
 * Maps canonical verbs to agent action type strings.
 * Action types are coarser than verbs — used by agent planners to select tools.
 */
export const VERB_TO_ACTION_TYPE: Record<string, string> = {
  click: 'click',
  select: 'click',
  navigate: 'navigate',
  open: 'navigate',
  enter: 'type',
  fill: 'type',
  submit: 'submit',
  send: 'send',
  upload: 'upload',
  download: 'download',
  attach: 'upload',
  export: 'download',
  import: 'upload',
  save: 'click',
  create: 'click',
  update: 'type',
  edit: 'type',
  delete: 'click',
  review: 'verify',
  verify: 'verify',
  confirm: 'verify',
  approve: 'click',
  reject: 'click',
  search: 'type',
  filter: 'click',
  sort: 'click',
  email: 'send',
  notify: 'send',
  message: 'send',
  forward: 'send',
  reply: 'send',
  configure: 'click',
  enable: 'click',
  disable: 'click',
  toggle: 'click',
  wait: 'wait',
  scroll: 'scroll',
  close: 'click',
  copy: 'click',
  paste: 'type',
  drag: 'drag',
  drop: 'drag',
  login: 'navigate',
  logout: 'navigate',
  print: 'click',
  share: 'send',
  publish: 'click',
  annotate: 'type',
  generate: 'click',
  refresh: 'click',
  assign: 'click',
  resolve: 'click',
  escalate: 'click',
};

// ─── Category → automation type ───────────────────────────────────────────────

/**
 * Default automation classification per GroupingReason category.
 * These are the base values; step-level overrides apply on top.
 */
export const CATEGORY_TO_AUTOMATION: Record<GroupingReason, AutomationType> = {
  click_then_navigate: 'full_automation',
  fill_and_submit: 'ai_assisted',
  repeated_click_dedup: 'full_automation',
  single_action: 'full_automation',
  data_entry: 'ai_assisted',
  send_action: 'ai_assisted',
  file_action: 'full_automation',
  error_handling: 'manual_only',
  annotation: 'manual_only',
};

// ─── Verb → skill type ────────────────────────────────────────────────────────

/**
 * Maps canonical verbs to the SkillType required to execute them.
 * Used for agent capability matching and task routing.
 */
export const VERB_TO_SKILL_TYPE: Record<string, SkillType> = {
  click: 'navigation',
  select: 'navigation',
  navigate: 'navigation',
  open: 'navigation',
  enter: 'data_entry',
  fill: 'data_entry',
  submit: 'data_entry',
  send: 'communication',
  email: 'communication',
  notify: 'communication',
  message: 'communication',
  forward: 'communication',
  reply: 'communication',
  upload: 'file_operation',
  download: 'file_operation',
  attach: 'file_operation',
  export: 'file_operation',
  import: 'file_operation',
  save: 'file_operation',
  create: 'data_entry',
  update: 'data_entry',
  edit: 'data_entry',
  delete: 'data_entry',
  review: 'verification',
  verify: 'verification',
  confirm: 'verification',
  approve: 'decision',
  reject: 'decision',
  search: 'data_extraction',
  filter: 'data_extraction',
  sort: 'data_extraction',
  configure: 'integration',
  enable: 'integration',
  disable: 'integration',
  toggle: 'integration',
  wait: 'monitoring',
  scroll: 'navigation',
  copy: 'data_extraction',
  paste: 'data_entry',
  drag: 'navigation',
  drop: 'navigation',
  login: 'navigation',
  logout: 'navigation',
  annotate: 'data_entry',
  generate: 'data_extraction',
  refresh: 'monitoring',
  assign: 'decision',
  resolve: 'decision',
  escalate: 'decision',
};

// ─── System capabilities ──────────────────────────────────────────────────────

/**
 * Maps canonical system names to their known capabilities.
 * Used for tool-mapping in later pipeline phases.
 */
export const SYSTEM_CAPABILITIES: Record<string, string[]> = {
  gmail: ['send_email', 'read_email', 'download_attachment', 'search_email', 'compose_email'],
  google_drive: ['upload_file', 'download_file', 'share_file', 'create_folder'],
  google_docs: ['edit_document', 'export_document', 'share_document', 'comment'],
  google_sheets: ['edit_spreadsheet', 'export_csv', 'import_data', 'create_formula'],
  google_calendar: ['create_event', 'update_event', 'invite_attendees', 'set_reminder'],
  slack: ['send_message', 'create_channel', 'upload_file', 'mention_user', 'reply_thread'],
  jira: ['create_ticket', 'update_status', 'assign_ticket', 'add_comment', 'search_issues'],
  confluence: ['create_page', 'update_page', 'add_comment', 'search_content'],
  salesforce: ['create_record', 'update_record', 'search_records', 'generate_report', 'send_email'],
  hubspot: ['create_contact', 'update_deal', 'send_email', 'log_activity'],
  zendesk: ['create_ticket', 'update_ticket', 'assign_ticket', 'close_ticket', 'send_message'],
  netsuite: ['create_invoice', 'approve_invoice', 'create_po', 'run_report', 'update_record'],
  quickbooks: ['create_invoice', 'record_payment', 'generate_report', 'import_data'],
  github: ['create_pr', 'review_pr', 'merge_pr', 'create_issue', 'update_issue'],
  trello: ['create_card', 'move_card', 'update_card', 'assign_member'],
  asana: ['create_task', 'update_task', 'assign_task', 'complete_task'],
  outlook: ['send_email', 'read_email', 'create_meeting', 'search_email'],
  ms_teams: ['send_message', 'create_meeting', 'share_file', 'mention_user'],
  sharepoint: ['upload_document', 'download_document', 'create_list', 'update_permissions'],
  stripe: ['create_payment', 'refund_payment', 'view_transaction', 'generate_report'],
  shopify: ['create_order', 'update_order', 'manage_product', 'process_refund'],
  figma: ['edit_design', 'comment', 'export_asset', 'share_design'],
  workday: ['update_hr_record', 'approve_request', 'run_report', 'manage_schedule'],
  sap: ['create_po', 'approve_po', 'run_report', 'manage_inventory'],
};
