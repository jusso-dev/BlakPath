/**
 * Break-glass state machine — pure and testable.
 *
 * Emergency cross-tenant access is deliberately hard: a platform operator
 * REQUESTS scoped, time-boxed access; a DIFFERENT person inside the target
 * organisation APPROVES (or denies) it; the operator then ACTIVATES it; and it
 * can be REVOKED or simply EXPIRES. Every hop is separately gated and audited.
 *
 * PRODUCT INVARIANT: break-glass grants temporary READ access for a stated
 * support purpose. It never confers determination power and never bypasses the
 * audit trail — actions taken under it are flagged as break-glass.
 */

export const BREAK_GLASS_STATUSES = [
  'requested',
  'approved',
  'denied',
  'active',
  'expired',
  'revoked',
] as const;
export type BreakGlassStatus = (typeof BREAK_GLASS_STATUSES)[number];

/** A requested grant may be approved or denied (by someone in the tenant). */
export function canApprove(status: BreakGlassStatus): boolean {
  return status === 'requested';
}
export function canDeny(status: BreakGlassStatus): boolean {
  return status === 'requested';
}
/** Only an approved grant may be activated (by the requester). */
export function canActivate(status: BreakGlassStatus): boolean {
  return status === 'approved';
}
/** An approved or active grant may be revoked. */
export function canRevoke(status: BreakGlassStatus): boolean {
  return status === 'approved' || status === 'active';
}
/** Terminal states — no further transitions. */
export function isTerminal(status: BreakGlassStatus): boolean {
  return status === 'denied' || status === 'expired' || status === 'revoked';
}

/** Is a grant currently LIVE (active and not past its expiry)? */
export function isLive(
  status: BreakGlassStatus,
  expiresAt: Date | null,
  now: Date,
): boolean {
  if (status !== 'active') return false;
  return !expiresAt || expiresAt.getTime() > now.getTime();
}
