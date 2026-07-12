import { z } from 'zod';

/**
 * Input validation for the reviews domain (zod v4). Tenant id and actor id are
 * never accepted here — they come only from the DB-verified TenantContext.
 */

/** Create a review with the reviewer's observations. */
export const createReviewSchema = z.object({
  content: z.string().trim().min(1).max(20000),
});
export type CreateReviewInput = z.input<typeof createReviewSchema>;

/** Add a comment to a draft review. */
export const addReviewCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type AddReviewCommentInput = z.input<typeof addReviewCommentSchema>;
