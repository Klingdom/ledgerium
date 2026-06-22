/**
 * persona-costs — the role → fully-loaded hourly-cost catalog for ROI.
 *
 * The "cost of the persona doing the work" term in ROI = projected volume ×
 * level of effort × persona cost. Rates are DEFAULTS, surfaced as assumptions
 * and fully editable in the UI — never presented as Ledgerium-verified facts.
 *
 * Methodology: loaded hourly = base salary × ~1.30 overhead ÷ ~1,880 productive
 * hours/year (US mid-market). Sources: BLS OES 2023, SHRM 2024 benchmarks.
 * Localize via a country multiplier (not FX); refresh annually on BLS release.
 *
 * Pure module — a frozen constant + lookup helper. No I/O, no side effects.
 */

export interface PersonaRole {
  /** Stable machine key (snake_case). */
  key: string;
  /** Display label. */
  label: string;
  /** Fully-loaded $/hr — a DEFAULT assumption, user-overridable. */
  loadedHourlyRate: number;
}

/** Honest neutral fallback when no role is assigned. */
export const DEFAULT_PERSONA_KEY = 'knowledge_worker' as const;

/** US mid-market fully-loaded defaults. Order: ascending by rate. */
export const DEFAULT_PERSONA_CATALOG: ReadonlyArray<PersonaRole> = Object.freeze([
  { key: 'customer_support', label: 'Customer Support Rep', loadedHourlyRate: 32 },
  { key: 'ap_clerk', label: 'AP / AR Clerk', loadedHourlyRate: 35 },
  { key: 'hr_ops', label: 'HR / People Ops', loadedHourlyRate: 39 },
  { key: 'it_admin', label: 'IT Admin / Helpdesk', loadedHourlyRate: 44 },
  { key: 'procurement', label: 'Procurement Specialist', loadedHourlyRate: 45 },
  { key: 'ops_analyst', label: 'Ops Analyst', loadedHourlyRate: 50 },
  { key: 'finance_analyst', label: 'Finance Analyst', loadedHourlyRate: 52 },
  { key: 'knowledge_worker', label: 'Knowledge Worker', loadedHourlyRate: 55 },
  { key: 'compliance_officer', label: 'Compliance / Audit Officer', loadedHourlyRate: 59 },
  { key: 'revops_analyst', label: 'RevOps / Automation Analyst', loadedHourlyRate: 62 },
  { key: 'ops_manager', label: 'Ops Manager', loadedHourlyRate: 69 },
]);

/** Resolve a persona by key. Returns null for unknown keys (never imputes a rate). */
export function getPersonaByKey(
  key: string | null | undefined,
  catalog: ReadonlyArray<PersonaRole> = DEFAULT_PERSONA_CATALOG,
): PersonaRole | null {
  if (!key) return null;
  return catalog.find((p) => p.key === key) ?? null;
}

/** The default persona role object (Knowledge Worker). */
export function getDefaultPersona(
  catalog: ReadonlyArray<PersonaRole> = DEFAULT_PERSONA_CATALOG,
): PersonaRole {
  return getPersonaByKey(DEFAULT_PERSONA_KEY, catalog) ?? catalog[0]!;
}
