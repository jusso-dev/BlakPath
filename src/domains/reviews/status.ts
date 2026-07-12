/**
 * Review status rules — pure and testable.
 *
 * A review is `draft` while being written and commented on, then `finalised`
 * to lock it into the committee record. A finalised review can be `reopened`
 * back to draft by an authorised human. Nothing here decides an application.
 */

export const REVIEW_STATUSES = ['draft', 'finalised'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Comments may only be added while a review is still a draft. */
export function canComment(status: ReviewStatus): boolean {
  return status === 'draft';
}

/** Only a draft review can be finalised. */
export function canFinalise(status: ReviewStatus): boolean {
  return status === 'draft';
}

/** Only a finalised review can be reopened. */
export function canReopen(status: ReviewStatus): boolean {
  return status === 'finalised';
}
