import type { AuditAction } from '@/domains/audit/events';
import type { Permission } from '@/lib/permissions/catalog';

/**
 * The application workflow — a pure, exhaustively testable state machine.
 *
 * This module owns the ONLY definition of which status transitions are legal
 * and what each transition requires. It touches neither the database nor the
 * network, so the service layer (service.ts) can trust it as the single source
 * of truth for "may this matter move from A to B?" and unit tests can cover
 * every edge without a running Postgres.
 *
 * PRODUCT INVARIANT: these are PROCESS states. No transition here — including
 * `record_decision` — makes or encodes a determination of Aboriginality. It
 * records that authorised humans moved the matter forward. There is deliberately
 * no "approve"/"reject"/"score" action; the outcome itself is captured by the
 * decisions domain (Phase 5) as a human act.
 */

/** Every application status, in rough lifecycle order. Mirrors the pg enum. */
export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'intake_review',
  'awaiting_evidence',
  'in_review',
  'ready_for_committee',
  'in_committee',
  'decided',
  'withdrawn',
  'closed',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses from which no further workflow action is possible. */
export const TERMINAL_STATUSES = Object.freeze(new Set<ApplicationStatus>(['closed']));

/**
 * "Active" statuses: an application that is live and may still be withdrawn.
 * Excludes the terminal/ended states (`decided`, `withdrawn`, `closed`).
 */
export const ACTIVE_STATUSES = Object.freeze(
  new Set<ApplicationStatus>([
    'draft',
    'submitted',
    'intake_review',
    'awaiting_evidence',
    'in_review',
    'ready_for_committee',
    'in_committee',
  ]),
);

/** Every workflow action that can move an application between statuses. */
export type ApplicationAction =
  | 'submit'
  | 'begin_intake'
  | 'request_evidence'
  | 'provide_evidence'
  | 'start_review'
  | 'ready_for_committee'
  | 'schedule_committee'
  | 'record_decision'
  | 'withdraw'
  | 'reopen'
  | 'close';

/** Definition of a single transition. */
export interface TransitionDef {
  /** Statuses this action may be applied from. */
  readonly from: readonly ApplicationStatus[];
  /** The status the application moves to. */
  readonly to: ApplicationStatus;
  /**
   * Permission keys, ANY of which authorises the action. The service enforces
   * these against the actor's verified permission set (see service.ts); the
   * workflow itself only declares them.
   */
  readonly permissions: readonly Permission[];
  /** The audit action recorded when this transition succeeds. */
  readonly audit: AuditAction;
}

/**
 * The transition table. Kept explicit and flat so a reviewer can read the whole
 * lifecycle — and its separation-of-duties boundaries — by eye.
 */
export const TRANSITIONS = Object.freeze({
  submit: {
    from: ['draft'],
    to: 'submitted',
    permissions: ['application:create', 'application:read-own'],
    audit: 'application.submitted',
  },
  begin_intake: {
    from: ['submitted'],
    to: 'intake_review',
    permissions: ['application:update-intake'],
    audit: 'workflow.transitioned',
  },
  request_evidence: {
    from: ['intake_review', 'in_review'],
    to: 'awaiting_evidence',
    permissions: ['evidence:request'],
    audit: 'workflow.transitioned',
  },
  provide_evidence: {
    from: ['awaiting_evidence'],
    to: 'in_review',
    permissions: ['evidence:upload-own', 'application:update-intake'],
    audit: 'workflow.transitioned',
  },
  start_review: {
    from: ['intake_review'],
    to: 'in_review',
    permissions: ['application:update-intake', 'application:assign'],
    audit: 'workflow.transitioned',
  },
  ready_for_committee: {
    from: ['in_review'],
    to: 'ready_for_committee',
    permissions: ['review:finalise'],
    audit: 'workflow.transitioned',
  },
  schedule_committee: {
    from: ['ready_for_committee'],
    to: 'in_committee',
    permissions: ['meeting:agenda-manage'],
    audit: 'workflow.transitioned',
  },
  record_decision: {
    from: ['in_committee'],
    to: 'decided',
    permissions: ['decision:finalise'],
    audit: 'workflow.transitioned',
  },
  withdraw: {
    from: [
      'draft',
      'submitted',
      'intake_review',
      'awaiting_evidence',
      'in_review',
      'ready_for_committee',
      'in_committee',
    ],
    to: 'withdrawn',
    permissions: ['application:read-own', 'application:update-intake'],
    audit: 'application.withdrawn',
  },
  reopen: {
    // `closed` is archival and final — reopening applies only to withdrawn or
    // decided matters, never a closed one.
    from: ['withdrawn', 'decided'],
    to: 'intake_review',
    permissions: ['application:update-intake'],
    audit: 'application.reopened',
  },
  close: {
    from: ['decided', 'withdrawn'],
    to: 'closed',
    permissions: ['retention:manage', 'application:update-intake'],
    audit: 'workflow.transitioned',
  },
} as const satisfies Record<ApplicationAction, TransitionDef>);

/** Raised when a workflow action is not legal from the current status. */
export class ApplicationWorkflowError extends Error {
  readonly code = 'INVALID_TRANSITION';
  constructor(
    readonly action: ApplicationAction,
    readonly from: ApplicationStatus,
  ) {
    super(`Cannot ${action} an application in status "${from}".`);
    this.name = 'ApplicationWorkflowError';
  }
}

/** Is `status` a terminal (no-further-action) status? */
export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** May this action be applied from this status? Pure predicate; never throws. */
export function canTransition(
  action: ApplicationAction,
  from: ApplicationStatus,
): boolean {
  return (TRANSITIONS[action].from as readonly ApplicationStatus[]).includes(from);
}

/**
 * The status resulting from applying `action` at `from`. Throws
 * {@link ApplicationWorkflowError} when the transition is not legal — callers
 * must treat a throw as "this move is not allowed from here".
 */
export function nextStatus(
  action: ApplicationAction,
  from: ApplicationStatus,
): ApplicationStatus {
  if (!canTransition(action, from)) {
    throw new ApplicationWorkflowError(action, from);
  }
  return TRANSITIONS[action].to;
}

/** Permission keys (any-of) that authorise `action`. */
export function permissionsForAction(action: ApplicationAction): readonly Permission[] {
  return TRANSITIONS[action].permissions;
}

/** Every action legally available from `from`, in declared order. */
export function availableActions(from: ApplicationStatus): ApplicationAction[] {
  return (Object.keys(TRANSITIONS) as ApplicationAction[]).filter((action) =>
    canTransition(action, from),
  );
}
