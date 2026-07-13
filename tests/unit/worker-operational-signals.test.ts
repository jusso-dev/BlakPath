import { describe, expect, it } from 'vitest';
import { queueFailureSignal } from '../../worker/operational-signals';

describe('worker operational signals', () => {
  it('marks retryable failures without paging', () => {
    expect(queueFailureSignal({ attemptsMade: 2, opts: { attempts: 5 } })).toEqual({
      signal: 'queue_job_failure',
      alert: false,
      attemptsMade: 2,
      maxAttempts: 5,
    });
  });

  it('marks the final failure as an actionable exhausted-job signal', () => {
    expect(queueFailureSignal({ attemptsMade: 5, opts: { attempts: 5 } })).toEqual({
      signal: 'queue_job_exhausted',
      alert: true,
      attemptsMade: 5,
      maxAttempts: 5,
    });
  });
});
