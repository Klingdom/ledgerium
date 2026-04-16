/**
 * Alert computation logic — shared between the admin alerts route (GET/POST)
 * and the cron check endpoint.
 *
 * Kept in a lib file (not in the route) so Next.js does not treat it as an
 * HTTP export, which would cause type errors under strict route constraints.
 */

import { db } from '@/db';

export type AlertSeverity = 'P1' | 'P2' | 'P3';
export type AlertStatus = 'ok' | 'firing' | 'insufficient_data';

export interface AlertResult {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number | null;
  threshold: number | null;
  checkedAt: string;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Evaluate all 8 alert conditions against the AnalyticsEvent table and return
 * an AlertResult for each. This function is read-only / side-effect-free.
 */
export async function computeAlerts(): Promise<AlertResult[]> {
  const checkedAt = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyticsEvent = (db as any).analyticsEvent;

  // ── 1. upload_success_rate_low (P1) ─────────────────────────────────────
  const cutoff2h = hoursAgo(2);
  const [uploadedCount2h, failedCount2h] = await Promise.all([
    analyticsEvent.count({ where: { eventName: 'workflow_uploaded', createdAt: { gte: cutoff2h } } }) as Promise<number>,
    analyticsEvent.count({ where: { eventName: 'upload_failed', createdAt: { gte: cutoff2h } } }) as Promise<number>,
  ]);
  const totalUpload2h = uploadedCount2h + failedCount2h;
  let uploadSuccessRateAlert: AlertResult;
  if (totalUpload2h === 0) {
    uploadSuccessRateAlert = {
      id: 'upload_success_rate_low',
      severity: 'P1',
      status: 'insufficient_data',
      message: 'No upload events in the last 2 hours — cannot compute success rate',
      value: null,
      threshold: 0.95,
      checkedAt,
    };
  } else {
    const rate = uploadedCount2h / totalUpload2h;
    uploadSuccessRateAlert = {
      id: 'upload_success_rate_low',
      severity: 'P1',
      status: rate < 0.95 ? 'firing' : 'ok',
      message: `Upload success rate is ${Math.round(rate * 100)}% (last 2h)`,
      value: Math.round(rate * 1000) / 1000,
      threshold: 0.95,
      checkedAt,
    };
  }

  // ── 2. zero_uploads_24h (P1) ─────────────────────────────────────────────
  const cutoff24h = hoursAgo(24);
  const uploadedCount24h = await analyticsEvent.count({
    where: { eventName: 'workflow_uploaded', createdAt: { gte: cutoff24h } },
  }) as number;
  const zeroUploads24hAlert: AlertResult = {
    id: 'zero_uploads_24h',
    severity: 'P1',
    status: uploadedCount24h === 0 ? 'firing' : 'ok',
    message: uploadedCount24h === 0
      ? 'Zero workflow uploads in the last 24 hours'
      : `${uploadedCount24h} workflow upload(s) in the last 24 hours`,
    value: uploadedCount24h,
    threshold: 1,
    checkedAt,
  };

  // ── 3. processing_failure_spike (P1) ─────────────────────────────────────
  const cutoff1h = hoursAgo(1);
  const failedCount1h = await analyticsEvent.count({
    where: { eventName: 'upload_failed', createdAt: { gte: cutoff1h } },
  }) as number;
  const processingFailureSpikeAlert: AlertResult = {
    id: 'processing_failure_spike',
    severity: 'P1',
    status: failedCount1h > 3 ? 'firing' : 'ok',
    message: `${failedCount1h} upload failure(s) in the last 1 hour`,
    value: failedCount1h,
    threshold: 3,
    checkedAt,
  };

  // ── 4. activation_rate_drop (P2) ─────────────────────────────────────────
  const cutoff7d = daysAgo(7);
  const [signupUserGroups, sopViewUserGroups] = await Promise.all([
    analyticsEvent.groupBy({
      by: ['userId'],
      where: { eventName: 'signup_completed', createdAt: { gte: cutoff7d }, userId: { not: null } },
    }) as Promise<{ userId: string }[]>,
    analyticsEvent.groupBy({
      by: ['userId'],
      where: { eventName: 'sop_section_viewed', createdAt: { gte: cutoff7d }, userId: { not: null } },
    }) as Promise<{ userId: string }[]>,
  ]);
  const signupUsers7d = signupUserGroups.length;
  const sopViewUsers7d = sopViewUserGroups.length;
  let activationRateAlert: AlertResult;
  if (signupUsers7d === 0) {
    activationRateAlert = {
      id: 'activation_rate_drop',
      severity: 'P2',
      status: 'insufficient_data',
      message: 'No signups in the last 7 days — cannot compute activation rate',
      value: null,
      threshold: 0.20,
      checkedAt,
    };
  } else {
    const activationRate = sopViewUsers7d / signupUsers7d;
    activationRateAlert = {
      id: 'activation_rate_drop',
      severity: 'P2',
      status: activationRate < 0.20 ? 'firing' : 'ok',
      message: `Activation rate is ${Math.round(activationRate * 100)}% (last 7d, ${sopViewUsers7d}/${signupUsers7d} users)`,
      value: Math.round(activationRate * 1000) / 1000,
      threshold: 0.20,
      checkedAt,
    };
  }

  // ── 5. no_signups_48h (P2) ───────────────────────────────────────────────
  const cutoff48h = hoursAgo(48);
  const signupCount48h = await analyticsEvent.count({
    where: { eventName: 'signup_completed', createdAt: { gte: cutoff48h } },
  }) as number;
  const noSignups48hAlert: AlertResult = {
    id: 'no_signups_48h',
    severity: 'P2',
    status: signupCount48h === 0 ? 'firing' : 'ok',
    message: signupCount48h === 0
      ? 'Zero signups in the last 48 hours'
      : `${signupCount48h} signup(s) in the last 48 hours`,
    value: signupCount48h,
    threshold: 1,
    checkedAt,
  };

  // ── 6. payment_failure_rate (P2) ─────────────────────────────────────────
  const paymentFailedCount24h = await analyticsEvent.count({
    where: { eventName: 'payment_failed', createdAt: { gte: cutoff24h } },
  }) as number;
  const paymentFailureAlert: AlertResult = {
    id: 'payment_failure_rate',
    severity: 'P2',
    status: paymentFailedCount24h > 2 ? 'firing' : 'ok',
    message: `${paymentFailedCount24h} payment failure(s) in the last 24 hours`,
    value: paymentFailedCount24h,
    threshold: 2,
    checkedAt,
  };

  // ── 7. api_error_spike (P2) ───────────────────────────────────────────────
  const apiErrorCount1h = await analyticsEvent.count({
    where: { eventName: 'api_error', createdAt: { gte: cutoff1h } },
  }) as number;
  const apiErrorSpikeAlert: AlertResult = {
    id: 'api_error_spike',
    severity: 'P2',
    status: apiErrorCount1h > 10 ? 'firing' : 'ok',
    message: `${apiErrorCount1h} api_error event(s) in the last 1 hour`,
    value: apiErrorCount1h,
    threshold: 10,
    checkedAt,
  };

  // ── 8. sop_usefulness_low (P3) ────────────────────────────────────────────
  const sopUsefulnessEvents = await analyticsEvent.findMany({
    where: { eventName: 'sop_usefulness_response', createdAt: { gte: cutoff7d } },
    select: { properties: true },
  }) as { properties: string | null }[];
  const totalSopUseful = sopUsefulnessEvents.length;
  let sopUsefulnessAlert: AlertResult;
  if (totalSopUseful <= 5) {
    sopUsefulnessAlert = {
      id: 'sop_usefulness_low',
      severity: 'P3',
      status: 'insufficient_data',
      message: `Only ${totalSopUseful} sop_usefulness_response event(s) in the last 7 days — need more than 5 to evaluate`,
      value: null,
      threshold: 0.40,
      checkedAt,
    };
  } else {
    let positiveCount = 0;
    for (const event of sopUsefulnessEvents) {
      if (!event.properties) continue;
      try {
        const props = JSON.parse(event.properties) as Record<string, unknown>;
        const response = props['response'];
        if (response === 'yes_as_is' || response === 'minor_edits') {
          positiveCount++;
        }
      } catch {
        // Malformed JSON — skip this event
      }
    }
    const usefulnessRate = positiveCount / totalSopUseful;
    sopUsefulnessAlert = {
      id: 'sop_usefulness_low',
      severity: 'P3',
      status: usefulnessRate < 0.40 ? 'firing' : 'ok',
      message: `SOP usefulness rate is ${Math.round(usefulnessRate * 100)}% (${positiveCount}/${totalSopUseful} positive, last 7d)`,
      value: Math.round(usefulnessRate * 1000) / 1000,
      threshold: 0.40,
      checkedAt,
    };
  }

  return [
    uploadSuccessRateAlert,
    zeroUploads24hAlert,
    processingFailureSpikeAlert,
    activationRateAlert,
    noSignups48hAlert,
    paymentFailureAlert,
    apiErrorSpikeAlert,
    sopUsefulnessAlert,
  ];
}
