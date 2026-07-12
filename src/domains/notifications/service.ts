import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { notifications } from '@/db/schema';
import { scopeFor } from '@/db/tenant-db';
import { addJob, QueueName } from '@/lib/queues';
export { renderNotificationEmail } from './templates';

/**
 * Notifications service.
 *
 * A notification is a durable, in-app record that something needs a member's
 * attention. Creating one also enqueues a Notification job so the worker can
 * deliver an email copy that simply points the member back into the app — never
 * a bearer link.
 *
 * These functions run from BOTH domain services and the worker, so they use
 * `scopeFor(organisationId)` (an explicit tenant scope) rather than the ambient
 * `currentScope()`, which does not exist in the worker.
 */

export type NotificationRow = typeof notifications.$inferSelect;

export interface CreateNotificationInput {
  organisationId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Insert a notification row and enqueue its email-delivery job. The job is keyed
 * by the notification id so a retry cannot double-schedule delivery.
 */
export async function createNotification(
  input: CreateNotificationInput,
  correlationId: string,
): Promise<NotificationRow> {
  const scope = scopeFor(input.organisationId);
  const id = uuidv7();
  const inserted = await scope.db
    .insert(notifications)
    .values(
      scope.insertValues({
        id,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
      }),
    )
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('Expected a notification row to be returned from the database.');
  }

  await addJob(
    QueueName.Notification,
    'deliver',
    {
      organisationId: input.organisationId,
      correlationId,
      notificationId: id,
    },
    { jobId: id },
  );

  return row;
}

/** Convenience wrapper matching the `queue*` naming used elsewhere. */
export function queueNotification(
  input: CreateNotificationInput,
  correlationId: string,
): Promise<NotificationRow> {
  return createNotification(input, correlationId);
}

/** Mark that an email copy has been dispatched for a notification. */
export async function markEmailed(
  organisationId: string,
  notificationId: string,
): Promise<void> {
  const scope = scopeFor(organisationId);
  await scope.db
    .update(notifications)
    .set({ emailedAt: new Date() })
    .where(
      and(
        eq(notifications.organisationId, organisationId),
        eq(notifications.id, notificationId),
      ),
    );
}
