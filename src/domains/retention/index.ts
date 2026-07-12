/**
 * Retention domain (Phase 7).
 *
 *   - `rules`   — pure expiry / hold / due-for-retention predicates.
 *   - `schemas` — zod v4 policy + hold validation.
 *   - `service` — tenant-scoped management (retention:manage) + sweep enqueue.
 *   - `sweep`   — the worker-side purge/anonymise pass (fail-safe, audited).
 */
export {
  RETENTION_ACTIONS,
  RETENTION_RESOURCE_TYPES,
  dueForRetention,
  isExpired,
  isRetentionResourceType,
  retentionCutoff,
  type RetentionAction,
  type RetentionResourceType,
} from './rules';

export {
  createPolicySchema,
  placeHoldSchema,
  type CreatePolicyInput,
  type PlaceHoldInput,
} from './schemas';

export {
  createPolicy,
  deletePolicy,
  listHolds,
  listPolicies,
  placeHold,
  queueRetentionSweep,
  releaseHold,
  type LegalHoldRow,
  type RetentionPolicyRow,
} from './service';

export { processRetentionSweep, type SweepInput } from './sweep';
