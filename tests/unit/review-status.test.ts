import { describe, expect, it } from 'vitest';
import {
  REVIEW_STATUSES,
  canComment,
  canFinalise,
  canReopen,
} from '@/domains/reviews/status';
import { createReviewSchema, addReviewCommentSchema } from '@/domains/reviews/schemas';

describe('review status rules', () => {
  it('draft can be commented on and finalised, not reopened', () => {
    expect(canComment('draft')).toBe(true);
    expect(canFinalise('draft')).toBe(true);
    expect(canReopen('draft')).toBe(false);
  });

  it('finalised can be reopened, not commented or re-finalised', () => {
    expect(canComment('finalised')).toBe(false);
    expect(canFinalise('finalised')).toBe(false);
    expect(canReopen('finalised')).toBe(true);
  });

  it('has exactly the two lifecycle states', () => {
    expect([...REVIEW_STATUSES]).toEqual(['draft', 'finalised']);
  });
});

describe('review schemas', () => {
  it('createReview requires non-empty content', () => {
    expect(createReviewSchema.safeParse({ content: '' }).success).toBe(false);
    expect(createReviewSchema.safeParse({ content: 'Observed X.' }).success).toBe(true);
  });

  it('addReviewComment requires a non-empty body', () => {
    expect(addReviewCommentSchema.safeParse({ body: '' }).success).toBe(false);
    expect(addReviewCommentSchema.safeParse({ body: 'Noted.' }).success).toBe(true);
  });
});
