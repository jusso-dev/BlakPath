/**
 * Family-link status rules — pure and testable.
 *
 * A link is `requested` when recorded, then `approved` or `disputed` by an
 * authorised human (never the requester — separation of duties is enforced in
 * the service), or `withdrawn` by the requester before any decision.
 */

export const FAMILY_LINK_STATUSES = [
  'requested',
  'approved',
  'disputed',
  'withdrawn',
] as const;
export type FamilyLinkStatus = (typeof FAMILY_LINK_STATUSES)[number];

/** Approve/dispute are only possible while the link is still requested. */
export function canDecide(status: FamilyLinkStatus): boolean {
  return status === 'requested';
}

/** The requester may withdraw only before a decision is made. */
export function canWithdraw(status: FamilyLinkStatus): boolean {
  return status === 'requested';
}

/** Has the link reached a decided (approved/disputed) state? */
export function isDecided(status: FamilyLinkStatus): boolean {
  return status === 'approved' || status === 'disputed';
}
