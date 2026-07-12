/**
 * Reviews domain (Phase 4).
 *
 *   - `status`  — pure draft/finalised/reopen rules.
 *   - `schemas` — zod v4 input validation.
 *   - `service` — tenant-scoped, permission-checked, audited read/write path.
 */
export {
  REVIEW_STATUSES,
  canComment,
  canFinalise,
  canReopen,
  type ReviewStatus,
} from './status';

export {
  addReviewCommentSchema,
  createReviewSchema,
  type AddReviewCommentInput,
  type CreateReviewInput,
} from './schemas';

export {
  addReviewComment,
  createReview,
  finaliseReview,
  listReviewComments,
  listReviewsForApplication,
  reopenReview,
  type ReviewCommentRow,
  type ReviewRow,
} from './service';
