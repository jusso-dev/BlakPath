import type { Job } from 'bullmq';
import type { Logger } from 'pino';
import { QueueName, type TenantJob } from '@/lib/queues';
import { processEvidenceScan } from '@/domains/evidence';

/**
 * Processor registry for the BlakPath background worker.
 *
 * Security intent: processors run privileged, out-of-band work. Two rules are
 * non-negotiable and encoded here:
 *   1. The software NEVER determines Aboriginality. No processor may score,
 *      rank, predict, infer, auto-approve or auto-reject. Authority stays with
 *      authorised humans in the organisation.
 *   2. Fail secure. In particular, evidence must NOT be released from
 *      quarantine unless a malware scan has positively passed. If the scanner
 *      (ClamAV) is unavailable, the job MUST fail (and be retried) — it must
 *      never default to "clean".
 *
 * Every job carries `organisationId` (see `TenantJob`); real processors must
 * establish a verified TenantContext before touching any data.
 *
 * Phase-1: these are thin, REAL stubs. They log structured operational context
 * and acknowledge the job so queues drain and the system is observable end to
 * end. Full implementations (ClamAV scan, certificate/export rendering, SMTP
 * delivery, audit verification, retention sweeps, webhooks) land in later
 * phases and will import domain services from `@/lib/*`.
 */

/** A single job processor. Receives the BullMQ job and a scoped logger. */
export type ProcessorFn = (job: Job<TenantJob>, logger: Logger) => Promise<void>;

/**
 * Build a phase-1 stub processor that logs and acknowledges. It deliberately
 * does no domain work; it exists so queues are wired, observable and drain
 * cleanly before the real processors land. It never contains identity logic and
 * never opens a fail-open path.
 */
function stubProcessor(queue: QueueName, note: string): ProcessorFn {
  return async (job, logger) => {
    logger.info(
      {
        queue,
        jobId: job.id,
        jobName: job.name,
        organisationId: job.data.organisationId,
        correlationId: job.data.correlationId,
        attemptsMade: job.attemptsMade,
      },
      `[stub] ${queue}: ${note}`,
    );
    // ACK by resolving. No side effects, no identity logic, no fail-open paths.
  };
}

/**
 * Real malware-scan processor. Validates the tenant-bound job payload, then runs
 * the fail-secure evidence scan lifecycle (quarantine → clean|infected|rejected).
 * A scanner outage causes the underlying service to THROW, so BullMQ retries and
 * the object is never promoted unscanned.
 */
const malwareScanProcessor: ProcessorFn = async (job, logger) => {
  const { organisationId, correlationId } = job.data;
  const evidenceId = (job.data as { evidenceId?: unknown }).evidenceId;
  if (typeof evidenceId !== 'string' || evidenceId.length === 0) {
    // A malformed payload is a bug, not a transient fault — do not retry forever.
    logger.error({ jobId: job.id }, 'malware-scan job missing evidenceId — dropping');
    return;
  }
  logger.info(
    { jobId: job.id, organisationId, evidenceId, attemptsMade: job.attemptsMade },
    'scanning evidence',
  );
  await processEvidenceScan({ organisationId, correlationId, evidenceId });
};

/**
 * Map of queue name -> processor. The bootstrap creates one BullMQ Worker per
 * entry, so this registry is the single source of truth for what the worker
 * runs. Adding a real processor later is a one-line swap here.
 */
export const PROCESSORS: Readonly<Record<QueueName, ProcessorFn>> = {
  [QueueName.MalwareScan]: malwareScanProcessor,
  [QueueName.Email]: stubProcessor(QueueName.Email, 'email delivery not yet implemented'),
  [QueueName.Notification]: stubProcessor(
    QueueName.Notification,
    'notification dispatch not yet implemented',
  ),
  [QueueName.AuditVerify]: stubProcessor(
    QueueName.AuditVerify,
    'audit verification not yet implemented',
  ),
  [QueueName.Retention]: stubProcessor(
    QueueName.Retention,
    'retention sweep not yet implemented',
  ),
  [QueueName.Export]: stubProcessor(
    QueueName.Export,
    'export generation not yet implemented',
  ),
  [QueueName.Webhook]: stubProcessor(
    QueueName.Webhook,
    'webhook delivery not yet implemented',
  ),
};

/** All registered queue names, for iteration during worker bootstrap. */
export const REGISTERED_QUEUES = Object.keys(PROCESSORS) as QueueName[];
