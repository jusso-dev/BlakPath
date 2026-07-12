/**
 * Break-glass domain (Phase 7) — emergency, time-boxed, cross-tenant READ
 * access with separation of duties and full audit.
 */
export {
  BREAK_GLASS_STATUSES,
  canApprove,
  canDeny,
  canActivate,
  canRevoke,
  isLive,
  isTerminal,
  type BreakGlassStatus,
} from './status';

export {
  denyBreakGlassSchema,
  requestBreakGlassSchema,
  type DenyBreakGlassInput,
  type RequestBreakGlassInput,
} from './schemas';

export {
  BreakGlassError,
  activateBreakGlass,
  approveBreakGlass,
  denyBreakGlass,
  listBreakGlassRequests,
  requestBreakGlass,
  resolveBreakGlassContext,
  revokeBreakGlass,
  type BreakGlassRow,
} from './service';
