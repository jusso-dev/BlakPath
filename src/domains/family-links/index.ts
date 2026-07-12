/**
 * Family-links domain (Phase 4).
 *
 *   - `status`  — pure requested/approved/disputed/withdrawn rules.
 *   - `schemas` — zod v4 input validation.
 *   - `service` — tenant-scoped, permission-checked, audited path with
 *     separation of duties on approval (approver ≠ requester).
 */
export {
  FAMILY_LINK_STATUSES,
  canDecide,
  canWithdraw,
  isDecided,
  type FamilyLinkStatus,
} from './status';

export {
  decideFamilyLinkSchema,
  requestFamilyLinkSchema,
  type DecideFamilyLinkInput,
  type RequestFamilyLinkInput,
} from './schemas';

export {
  approveFamilyLink,
  disputeFamilyLink,
  listFamilyLinks,
  requestFamilyLink,
  withdrawFamilyLink,
  type FamilyLinkRow,
} from './service';
