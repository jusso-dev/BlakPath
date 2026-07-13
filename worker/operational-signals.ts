import type { Job } from 'bullmq';
import type { TenantJob } from '@/lib/queues';

export interface QueueFailureSignal {
  signal: 'queue_job_failure' | 'queue_job_exhausted';
  alert: boolean;
  attemptsMade: number;
  maxAttempts: number;
}

/** Build a stable, machine-readable alert signal without including job payloads. */
export function queueFailureSignal(
  job: Pick<Job<TenantJob>, 'attemptsMade' | 'opts'> | undefined,
): QueueFailureSignal {
  const attemptsMade = job?.attemptsMade ?? 0;
  const configuredAttempts = job?.opts.attempts;
  const maxAttempts =
    typeof configuredAttempts === 'number' && configuredAttempts > 0
      ? configuredAttempts
      : 1;
  const exhausted = attemptsMade >= maxAttempts;
  return {
    signal: exhausted ? 'queue_job_exhausted' : 'queue_job_failure',
    alert: exhausted,
    attemptsMade,
    maxAttempts,
  };
}
