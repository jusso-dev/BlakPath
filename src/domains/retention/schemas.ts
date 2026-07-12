import { z } from 'zod';
import { RETENTION_ACTIONS, RETENTION_RESOURCE_TYPES } from './rules';

/** Input validation for retention management (zod v4). */

export const createPolicySchema = z.object({
  resourceType: z.enum(RETENTION_RESOURCE_TYPES),
  /** 1 day .. 10 years. */
  retentionDays: z.coerce.number().int().min(1).max(3650),
  action: z.enum(RETENTION_ACTIONS),
});
export type CreatePolicyInput = z.input<typeof createPolicySchema>;

export const placeHoldSchema = z.object({
  resourceType: z.enum(RETENTION_RESOURCE_TYPES),
  resourceId: z.uuid(),
  reason: z.string().trim().min(1).max(2000),
});
export type PlaceHoldInput = z.input<typeof placeHoldSchema>;
