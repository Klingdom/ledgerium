/**
 * Onboarding state management for Ledgerium AI.
 *
 * Tracks which onboarding steps the user has completed, persisted
 * in localStorage. Used to show/hide the getting-started checklist
 * and guide users to their first value moment.
 */

const STORAGE_KEY = 'ledgerium_onboarding';

export interface OnboardingState {
  /** Whether the user has dismissed the onboarding checklist */
  isDismissed: boolean;
  /** Completed step IDs */
  completedSteps: string[];
  /** When onboarding was first shown */
  startedAt: string | null;
  /** When all steps were completed (or dismissed) */
  completedAt: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  isDismissed: false,
  completedSteps: [],
  startedAt: null,
  completedAt: null,
};

// ─── Onboarding steps definition ─────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  isCompleted: (state: OnboardingState, context: OnboardingContext) => boolean;
}

export interface OnboardingContext {
  workflowCount: number;
  hasExtensionKey: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'install_extension',
    title: 'Install the browser extension',
    description: 'Record workflows directly from your browser with the Ledgerium Chrome extension.',
    actionLabel: 'Install guide',
    actionHref: '/install-extension',
    isCompleted: (_state, ctx) => ctx.hasExtensionKey,
  },
  {
    id: 'first_workflow',
    title: 'Record or upload your first workflow',
    description: 'Capture a real workflow or upload a sample to see Ledgerium in action.',
    actionLabel: 'Upload a workflow',
    actionHref: '/upload',
    isCompleted: (_state, ctx) => ctx.workflowCount > 0,
  },
  {
    id: 'view_sop',
    title: 'Explore your generated SOP',
    description: 'See how Ledgerium turns workflow behavior into structured procedure documentation.',
    actionLabel: 'View your workflows',
    actionHref: '/dashboard',
    isCompleted: (state) => state.completedSteps.includes('view_sop'),
  },
  {
    id: 'view_process_map',
    title: 'Review your process map',
    description: 'Understand the flow, decisions, and handoffs in your workflow.',
    actionLabel: 'View your workflows',
    actionHref: '/dashboard',
    isCompleted: (state) => state.completedSteps.includes('view_process_map'),
  },
];

// ─── State access ────────────────────────────────────────────────────────────

export function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function completeStep(stepId: string): void {
  const state = getOnboardingState();
  if (state.completedSteps.includes(stepId)) return;
  state.completedSteps = [...state.completedSteps, stepId];
  if (!state.startedAt) state.startedAt = new Date().toISOString();
  saveOnboardingState(state);
}

export function dismissOnboarding(): void {
  const state = getOnboardingState();
  state.isDismissed = true;
  state.completedAt = new Date().toISOString();
  saveOnboardingState(state);
}

export function isOnboardingComplete(state: OnboardingState, context: OnboardingContext): boolean {
  return ONBOARDING_STEPS.every(step => step.isCompleted(state, context));
}

export function getCompletionCount(state: OnboardingState, context: OnboardingContext): number {
  return ONBOARDING_STEPS.filter(step => step.isCompleted(state, context)).length;
}
