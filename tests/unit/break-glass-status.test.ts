import { describe, expect, it } from 'vitest';
import {
  BREAK_GLASS_STATUSES,
  canActivate,
  canApprove,
  canDeny,
  canRevoke,
  isLive,
  isTerminal,
} from '@/domains/break-glass/status';
import {
  denyBreakGlassSchema,
  requestBreakGlassSchema,
} from '@/domains/break-glass/schemas';
import { assertDifferentActor } from '@/lib/permissions/check';
import { AuthorizationError } from '@/lib/permissions/errors';

describe('break-glass state machine', () => {
  it('gates each transition to the right prior state', () => {
    expect(canApprove('requested')).toBe(true);
    expect(canDeny('requested')).toBe(true);
    expect(canApprove('approved')).toBe(false);
    expect(canActivate('approved')).toBe(true);
    expect(canActivate('requested')).toBe(false);
    expect(canRevoke('approved')).toBe(true);
    expect(canRevoke('active')).toBe(true);
    expect(canRevoke('denied')).toBe(false);
  });

  it('marks denied/expired/revoked terminal', () => {
    for (const s of ['denied', 'expired', 'revoked'] as const) {
      expect(isTerminal(s)).toBe(true);
    }
    for (const s of ['requested', 'approved', 'active'] as const) {
      expect(isTerminal(s)).toBe(false);
    }
  });

  it('isLive requires active AND unexpired', () => {
    const now = new Date(Date.UTC(2026, 6, 1));
    const future = new Date(now.getTime() + 60_000);
    const past = new Date(now.getTime() - 60_000);
    expect(isLive('active', future, now)).toBe(true);
    expect(isLive('active', past, now)).toBe(false);
    expect(isLive('active', null, now)).toBe(true);
    expect(isLive('approved', future, now)).toBe(false);
  });

  it('lists every status', () => {
    expect([...BREAK_GLASS_STATUSES]).toEqual([
      'requested',
      'approved',
      'denied',
      'active',
      'expired',
      'revoked',
    ]);
  });
});

describe('separation of duties (approver != requester)', () => {
  it('rejects the requester approving their own grant', () => {
    expect(() => assertDifferentActor('op-1', 'approver-2')).not.toThrow();
    expect(() => assertDifferentActor('op-1', 'op-1')).toThrow(AuthorizationError);
  });
});

describe('break-glass schemas', () => {
  it('validates a request and enforces expiry bounds', () => {
    const base = {
      organisationId: '018f5b3a-0000-7000-8000-000000000000',
      supportCaseRef: 'SUP-123',
      purpose: 'Investigate a stuck upload',
      scope: 'read the applicant’s evidence metadata',
    };
    expect(requestBreakGlassSchema.safeParse(base).success).toBe(true);
    expect(requestBreakGlassSchema.parse(base).expiresInMinutes).toBe(60);
    expect(
      requestBreakGlassSchema.safeParse({ ...base, expiresInMinutes: 999 }).success,
    ).toBe(false);
    expect(
      requestBreakGlassSchema.safeParse({ ...base, organisationId: 'x' }).success,
    ).toBe(false);
    expect(denyBreakGlassSchema.safeParse({ reason: '' }).success).toBe(false);
  });
});
