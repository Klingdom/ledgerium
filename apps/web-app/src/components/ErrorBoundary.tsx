'use client';

/**
 * A React error boundary that degrades a surface instead of the whole route.
 *
 * Backlog row #92 (PIB-P06). `DashboardV2Shell` had no boundary, so an uncaught
 * exception anywhere beneath it — one malformed workflow reaching `WorkflowRow`,
 * a tooltip, a menu — took the entire dashboard route to the Next.js 500 page.
 * A user with forty working workflows and one bad one saw nothing at all.
 *
 * Two placements, deliberately different in scope:
 *
 *  - around the dashboard shell, so a failure in the surrounding chrome still
 *    leaves the user something they can act on;
 *  - around each row, so one bad row costs that row and nothing else. This is
 *    the placement that turns a blank page into a list with one gap in it.
 *
 * ## What is reported, and what is not
 *
 * `componentDidCatch` emits `ui_error_boundary_triggered` carrying the surface
 * and the error's CONSTRUCTOR NAME — `TypeError`, `RangeError` — and never its
 * message or stack. That is not squeamishness: messages in this codebase
 * routinely interpolate the thing that broke, and the thing that broke is a
 * workflow title, a step label, or a field name captured from a user's screen.
 * A crash report is exactly the path by which recorded content would leak into
 * analytics, and the PostHog posture here is no-content.
 *
 * The cost is real and worth naming: an error name alone will rarely be enough
 * to diagnose a specific failure. It is enough to answer "is this happening,
 * where, and how often", which is what a boundary is for. Anything more should
 * go to a server-side error reporter that is not PostHog.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { track } from '@/lib/analytics';

/**
 * Closed union of the surfaces that can degrade independently. Closed on
 * purpose: a free-form string would drift into describing the error, which is
 * the leak this module exists to prevent.
 */
export type ErrorBoundarySurface = 'dashboard_shell' | 'workflow_row';

/**
 * The payload derived from a caught error. Pure and separately testable —
 * web-app has no jsdom or React Testing Library, so the reporting decision is
 * extracted here where it can be asserted directly rather than through a render.
 */
export interface BoundaryErrorReport {
  readonly surface: ErrorBoundarySurface;
  /** Constructor name only. Never the message, never the stack. */
  readonly errorName: string;
}

/**
 * Derive what gets reported from whatever was thrown.
 *
 * `throw` accepts any value, so this must survive strings, plain objects,
 * `null`, and objects with a hostile `name`. Anything it cannot classify
 * becomes `'UnknownError'` rather than being coerced into a string, because
 * coercing an unknown throw is precisely how a message ends up in the payload.
 */
export function describeBoundaryError(
  error: unknown,
  surface: ErrorBoundarySurface,
): BoundaryErrorReport {
  let errorName = 'UnknownError';

  if (error instanceof Error && typeof error.name === 'string' && error.name.trim() !== '') {
    errorName = error.name.trim();
  }

  // A name is an identifier, not prose. Anything longer than a generous
  // identifier, or containing whitespace, is not a constructor name — it is
  // someone's message wearing one. Reject rather than truncate: a truncated
  // message is still a message.
  if (errorName.length > 40 || /\s/.test(errorName)) {
    errorName = 'UnknownError';
  }

  return { surface, errorName };
}

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /**
   * Rendered in place of `children` after a failure. Receives a `retry` that
   * clears the error state, so a transient fault does not require a page
   * reload. Must be valid in its parent's context — the row boundary's
   * fallback has to be a `<tr>`, or the table breaks in a second, stranger way.
   */
  readonly fallback: (retry: () => void) => ReactNode;
  readonly surface: ErrorBoundarySurface;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const report = describeBoundaryError(error, this.props.surface);
    track({ event: 'ui_error_boundary_triggered', ...report });

    // Full detail to the server log, which is not a third party and is where
    // an engineer can actually act on it.
    console.error(`[ErrorBoundary:${this.props.surface}]`, error, info.componentStack);
  }

  private retry(): void {
    this.setState({ hasError: false });
  }

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback(this.retry) : this.props.children;
  }
}
