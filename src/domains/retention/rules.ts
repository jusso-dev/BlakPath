/**
 * Retention rules — pure and testable.
 *
 * The single place that decides whether a record is past its retention period
 * and not otherwise protected. No IO: the sweep worker feeds it dates and hold
 * state and acts on the boolean.
 *
 * PRODUCT INVARIANT: retention manages the LIFECYCLE of records. It never scores
 * or determines a person's Aboriginality. The immutable audit trail is never a
 * retention target.
 */

export const RETENTION_RESOURCE_TYPES = [
  'application',
  'evidence',
  'form_response',
] as const;
export type RetentionResourceType = (typeof RETENTION_RESOURCE_TYPES)[number];

export const RETENTION_ACTIONS = ['purge', 'anonymise'] as const;
export type RetentionAction = (typeof RETENTION_ACTIONS)[number];

export function isRetentionResourceType(value: string): value is RetentionResourceType {
  return (RETENTION_RESOURCE_TYPES as readonly string[]).includes(value);
}

/** The cutoff instant: records dated strictly before this are past retention. */
export function retentionCutoff(retentionDays: number, now: Date): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

/** Is a record (dated `recordDate`) past its retention period at `now`? */
export function isExpired(recordDate: Date, retentionDays: number, now: Date): boolean {
  return recordDate.getTime() < retentionCutoff(retentionDays, now).getTime();
}

/**
 * The retention decision for one record: act only when it is past retention AND
 * not under a legal hold. Fails safe — a held record is never actioned.
 */
export function dueForRetention(input: {
  recordDate: Date;
  retentionDays: number;
  isHeld: boolean;
  now: Date;
}): boolean {
  if (input.isHeld) return false;
  return isExpired(input.recordDate, input.retentionDays, input.now);
}
