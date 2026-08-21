import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    processDefinition: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from '@/db';
import { getAuditEligibility } from './audit-eligibility';

const USER_ID = 'user_audit_test';

function mockDefinitions(rows: Array<{ id: string; canonicalName: string; runCount: number }>) {
  vi.mocked(db.processDefinition.findMany).mockResolvedValue(rows as never);
}

describe('getAuditEligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is not eligible when the user has zero recorded processes', async () => {
    mockDefinitions([]);

    const result = await getAuditEligibility(USER_ID);

    expect(result.eligible).toBe(false);
    expect(result.processes).toEqual([]);
    expect(result.minRunsRequired).toBe(5);
  });

  it('is NOT eligible when every process is below the 5-run gate — the single most important qualification test', async () => {
    mockDefinitions([
      { id: 'p1', canonicalName: 'Invoice Approval', runCount: 2 },
      { id: 'p2', canonicalName: 'Onboarding Checklist', runCount: 4 },
    ]);

    const result = await getAuditEligibility(USER_ID);

    expect(result.eligible).toBe(false);
    expect(result.processes.every((p) => !p.qualifies)).toBe(true);
  });

  it('is eligible when exactly one process meets the gate, even with others below it', async () => {
    mockDefinitions([
      { id: 'p1', canonicalName: 'Invoice Approval', runCount: 2 },
      { id: 'p2', canonicalName: 'Refund Processing', runCount: 5 },
    ]);

    const result = await getAuditEligibility(USER_ID);

    expect(result.eligible).toBe(true);
    const refund = result.processes.find((p) => p.id === 'p2');
    expect(refund?.qualifies).toBe(true);
    const invoice = result.processes.find((p) => p.id === 'p1');
    expect(invoice?.qualifies).toBe(false);
  });

  it('treats 4 runs as NOT qualifying and 5 runs as qualifying — exact boundary lock', async () => {
    mockDefinitions([
      { id: 'below', canonicalName: 'Below Gate', runCount: 4 },
      { id: 'at', canonicalName: 'At Gate', runCount: 5 },
    ]);

    const result = await getAuditEligibility(USER_ID);

    expect(result.processes.find((p) => p.id === 'below')?.qualifies).toBe(false);
    expect(result.processes.find((p) => p.id === 'at')?.qualifies).toBe(true);
    expect(result.eligible).toBe(true);
  });

  it('queries only the requesting user\'s process definitions', async () => {
    mockDefinitions([]);

    await getAuditEligibility(USER_ID);

    expect(db.processDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });

  it('is deterministic — same input produces the same eligibility verdict', async () => {
    mockDefinitions([{ id: 'p1', canonicalName: 'Process', runCount: 5 }]);

    const first = await getAuditEligibility(USER_ID);
    const second = await getAuditEligibility(USER_ID);

    expect(first.eligible).toBe(second.eligible);
    expect(first.processes).toEqual(second.processes);
  });
});
