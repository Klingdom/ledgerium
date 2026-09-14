/**
 * What, if anything, the app chrome should say about a reverse trial.
 *
 * WHY A PURE MODULE
 * -----------------
 * `apps/web-app` has no jsdom or testing-library, so component rendering is
 * not directly testable here. The established pattern in this codebase is to
 * lift the decision out of the component and test that — the component then
 * only maps a returned state onto markup, which is the part least likely to
 * be wrong in an interesting way.
 *
 * DESIGN CONSTRAINTS (from the trial UX review, 2026-09)
 * -----------------------------------------------------
 * The trial previously ended in total silence: no badge, no countdown, no
 * notice, on any surface. That is worse than having no trial at all, because
 * it creates an expectation and then breaks it without explanation.
 *
 * But the correction must not overshoot into pressure:
 *
 *   - No ticking countdown. Days, never hours or minutes.
 *   - No urgency colour early. The chip stays neutral for most of the window
 *     and only shifts tone near the end, when the information is genuinely
 *     actionable rather than merely alarming.
 *   - Nothing shown to someone who never had a trial. They should not be told
 *     about a thing they never received.
 *   - Nothing shown once someone has actually subscribed. A paying customer
 *     being told about a trial is noise at best and a refund prompt at worst.
 *   - The roll-down is stated plainly and honestly: features change, data is
 *     never deleted, and the free tier is permanent.
 */

/** The trial slice of `GET /api/account`. */
export interface TrialState {
  isActive: boolean;
  hasLapsed: boolean;
  daysRemaining: number;
  plan: string | null;
}

/** Visual weight. Deliberately only two — there is no "danger" trial state. */
export type TrialChipTone = 'neutral' | 'attention';

export interface TrialChipState {
  /** Render nothing when false. */
  show: boolean;
  label: string;
  tone: TrialChipTone;
  /** Longer explanation for a title/tooltip. Empty when nothing is shown. */
  detail: string;
  href: string;
}

const HIDDEN: TrialChipState = { show: false, label: '', tone: 'neutral', detail: '', href: '' };

/**
 * Days at or below which the chip changes tone.
 *
 * Three, not seven: the review's explicit line was that escalating early is
 * manufactured urgency, since nothing the user can do differs on day 10 from
 * day 5. Three days is the point at which "decide soon" is true rather than
 * merely persuasive.
 */
export const TRIAL_ATTENTION_DAYS = 3;

/**
 * Whether the account has a real paid subscription, as opposed to trial-granted
 * access. `trialing` is excluded: a Stripe-side trial is not a paid state, and
 * treating it as one would hide the chip from exactly the people it is for.
 */
function isPayingSubscriber(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === 'active' || subscriptionStatus === 'past_due';
}

/**
 * Decide the chip.
 *
 * @param trial   the `reverseTrial` slice from /api/account, or null while loading
 * @param subscriptionStatus the account's Stripe subscription status
 */
export function trialChipState(
  trial: TrialState | null | undefined,
  subscriptionStatus: string | null | undefined,
): TrialChipState {
  if (!trial) return HIDDEN;

  // A paying customer is not a trial user, whatever the trial columns still
  // say. The grant may well still be live — it simply stops being the thing
  // worth telling them about.
  if (isPayingSubscriber(subscriptionStatus)) return HIDDEN;

  if (trial.isActive) {
    const days = trial.daysRemaining;
    const unit = days === 1 ? 'day' : 'days';
    return {
      show: true,
      label: `Trial · ${days} ${unit} left`,
      tone: days <= TRIAL_ATTENTION_DAYS ? 'attention' : 'neutral',
      detail:
        // "The full Solo plan", not "every paid feature": the grant is Solo
        // (REVERSE_TRIAL_PLAN), and Team/Growth/Enterprise include features
        // Solo does not. Caught in brand-voice review before ship.
        `You have the full Solo plan until your trial ends. ` +
        `After that your account stays on the free plan — nothing you have recorded is deleted.`,
      href: '/pricing',
    };
  }

  if (trial.hasLapsed) {
    return {
      show: true,
      label: 'Trial ended',
      tone: 'attention',
      // Names what actually changed rather than implying loss of data. The
      // honest version is more reassuring than a vague one, and it is also
      // the only version that stays true.
      detail:
        `Your trial has ended and your account is on the free plan. ` +
        `Your recordings and SOPs are still here; the paid features are paused.`,
      href: '/pricing',
    };
  }

  // Never had a trial — say nothing.
  return HIDDEN;
}
