import type { TenantContext } from '@/lib/tenancy/context';
import type { Permission } from './catalog';
import { AuthorizationError } from './errors';

/**
 * Pure authorisation evaluation.
 *
 * Nothing in this file touches the database or the network. It takes an already
 * DB-verified TenantContext (whose `permissions` set was resolved by
 * tenancy/resolve.ts) and answers questions about it. Keeping this layer pure
 * makes it exhaustively unit-testable and safe to call from RSCs, route
 * handlers, server actions and jobs alike.
 *
 * Two independent gates protect every sensitive action:
 *  1. Capability   — does the actor hold the permission key? (hasPermission)
 *  2. Integrity    — separation-of-duties / conflict-of-interest guards, which
 *                    hold even for actors who DO have the capability (e.g. you
 *                    may hold `decision:finalise` yet still not finalise a
 *                    decision you are conflicted on, or approve your own
 *                    elevated access).
 *
 * A minimal `Subject` shape is accepted everywhere instead of the full
 * TenantContext so these helpers can also be exercised in isolation and reused
 * by jobs that carry only a permission set.
 */

/** The minimum an actor must expose to be evaluated. */
export interface Subject {
  readonly userId: string;
  readonly permissions: ReadonlySet<string>;
}

/** Does the subject hold this exact permission? */
export function hasPermission(subject: Subject, key: Permission): boolean {
  return subject.permissions.has(key);
}

/** Does the subject hold AT LEAST ONE of these permissions? */
export function hasAny(subject: Subject, keys: readonly Permission[]): boolean {
  for (const key of keys) {
    if (subject.permissions.has(key)) return true;
  }
  return false;
}

/** Does the subject hold ALL of these permissions? */
export function hasAll(subject: Subject, keys: readonly Permission[]): boolean {
  for (const key of keys) {
    if (!subject.permissions.has(key)) return false;
  }
  return true;
}

/**
 * Throw unless the subject holds the permission. The thrown message is generic
 * and never reveals what the resource is or whether it exists.
 */
export function requirePermission(subject: Subject, key: Permission): void {
  if (!subject.permissions.has(key)) {
    throw new AuthorizationError('PERMISSION_DENIED');
  }
}

/** Throw unless the subject holds at least one of the permissions. */
export function requireAny(subject: Subject, keys: readonly Permission[]): void {
  if (!hasAny(subject, keys)) {
    throw new AuthorizationError('PERMISSION_DENIED');
  }
}

/** Throw unless the subject holds all of the permissions. */
export function requireAll(subject: Subject, keys: readonly Permission[]): void {
  if (!hasAll(subject, keys)) {
    throw new AuthorizationError('PERMISSION_DENIED');
  }
}

/* ---------------------------------------------------------------------------
 * Separation-of-duties / conflict guards
 * ------------------------------------------------------------------------- */

/**
 * Assert that two actor ids differ. Used wherever the same person must not
 * perform both sides of a two-person control — e.g. approving one's own
 * break-glass request, or finalising/signing off one's own proposal or review.
 *
 * Both ids are compared as opaque strings; an undefined/empty second id is
 * treated as "no distinct second actor" and therefore fails closed.
 */
export function assertDifferentActor(
  actorAId: string,
  actorBId: string | null | undefined,
): void {
  if (!actorBId || actorAId === actorBId) {
    throw new AuthorizationError(
      'SEPARATION_OF_DUTIES',
      'This action must be carried out by a different person.',
    );
  }
}

/**
 * Assert the actor has NOT declared (or been found to have) a conflict of
 * interest on the item in question. `conflictedUserIds` is the set of users who
 * are conflicted out of this application/decision/meeting item.
 */
export function assertNotConflicted(
  actorId: string,
  conflictedUserIds: ReadonlySet<string> | readonly string[],
): void {
  const conflicted =
    conflictedUserIds instanceof Set
      ? conflictedUserIds.has(actorId)
      : (conflictedUserIds as readonly string[]).includes(actorId);
  if (conflicted) {
    throw new AuthorizationError(
      'CONFLICT_OF_INTEREST',
      'You have a declared conflict of interest on this item.',
    );
  }
}

/* ---------------------------------------------------------------------------
 * Resource / contextual policies
 * ------------------------------------------------------------------------- */

/**
 * A Policy decides, for a specific resource instance, whether the subject may
 * act. Capability checks (hasPermission) answer "can this ROLE do X at all?";
 * policies answer "may this subject do X to THIS resource?" (e.g. read-assigned
 * only applies to applications actually assigned to the actor).
 *
 * Policies are pure predicates so they compose freely and test trivially. They
 * must fail closed: when in doubt, return false.
 */
export type Policy<Resource> = (subject: Subject, resource: Resource) => boolean;

/** A policy that always allows (use sparingly, e.g. for platform-wide reads). */
export function allow<Resource>(): Policy<Resource> {
  return () => true;
}

/** A policy that always denies. */
export function deny<Resource>(): Policy<Resource> {
  return () => false;
}

/** Combine policies with AND — every policy must allow. */
export function every<Resource>(
  ...policies: ReadonlyArray<Policy<Resource>>
): Policy<Resource> {
  return (subject, resource) => policies.every((policy) => policy(subject, resource));
}

/** Combine policies with OR — at least one policy must allow. */
export function some<Resource>(
  ...policies: ReadonlyArray<Policy<Resource>>
): Policy<Resource> {
  return (subject, resource) => policies.some((policy) => policy(subject, resource));
}

/** Negate a policy. */
export function not<Resource>(policy: Policy<Resource>): Policy<Resource> {
  return (subject, resource) => !policy(subject, resource);
}

/** Gate a policy behind a capability: only meaningful if the key is held. */
export function requiring<Resource>(
  key: Permission,
  policy: Policy<Resource>,
): Policy<Resource> {
  return (subject, resource) => hasPermission(subject, key) && policy(subject, resource);
}

/** Evaluate a policy against a resource; returns a boolean. */
export function can<Resource>(
  policy: Policy<Resource>,
  subject: Subject,
  resource: Resource,
): boolean {
  return policy(subject, resource);
}

/** Evaluate a policy and throw AuthorizationError if it denies. */
export function requirePolicy<Resource>(
  policy: Policy<Resource>,
  subject: Subject,
  resource: Resource,
): void {
  if (!policy(subject, resource)) {
    throw new AuthorizationError('POLICY_DENIED');
  }
}

/**
 * Convenience: build a Subject from a full TenantContext. The context's
 * permission set has already been DB-verified, so downstream pure checks can
 * trust it.
 */
export function subjectFromContext(ctx: TenantContext): Subject {
  return { userId: ctx.userId, permissions: ctx.permissions };
}
