import { describe, it, expect } from 'vitest';
import { inviteRefusal, isAcceptableInvite } from './team-roles';

describe('inviteRefusal / isAcceptableInvite (#273)', () => {
  it.each(['superadmin', '', 'OWNER', 'Admin', null, undefined, 5])('refuses out-of-set role %j', (role) => {
    expect(inviteRefusal({ role }, 'owner')).toBe('invalid_role');
    expect(isAcceptableInvite({ role }, 'owner')).toBe(false);
  });
  it.each(['admin', 'member', 'viewer'])('accepts %s regardless of inviter role', (role) => {
    for (const r of ['owner', 'admin', null, undefined]) expect(inviteRefusal({ role }, r)).toBeNull();
  });
  it('owner invite needs a current owner inviter', () => {
    expect(inviteRefusal({ role: 'owner' }, 'owner')).toBeNull();
    for (const r of ['admin', 'member', 'viewer', null, undefined]) {
      expect(inviteRefusal({ role: 'owner' }, r)).toBe('owner_not_from_owner');
    }
  });
});
