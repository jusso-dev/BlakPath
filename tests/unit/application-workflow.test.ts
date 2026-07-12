import { describe, expect, it } from 'vitest';
import {
  ACTIVE_STATUSES,
  APPLICATION_STATUSES,
  ApplicationWorkflowError,
  TERMINAL_STATUSES,
  TRANSITIONS,
  availableActions,
  canTransition,
  isTerminal,
  nextStatus,
  permissionsForAction,
  type ApplicationAction,
  type ApplicationStatus,
} from '@/domains/applications/workflow';
import { isPermission } from '@/lib/permissions/catalog';

const STATUS_SET = new Set<ApplicationStatus>(APPLICATION_STATUSES);
const ACTIONS = Object.keys(TRANSITIONS) as ApplicationAction[];

describe('application workflow — table integrity', () => {
  it('every transition references only real statuses', () => {
    for (const action of ACTIONS) {
      const def = TRANSITIONS[action];
      for (const from of def.from) {
        expect(STATUS_SET.has(from)).toBe(true);
      }
      expect(STATUS_SET.has(def.to)).toBe(true);
    }
  });

  it('every transition is gated by at least one catalogued permission', () => {
    for (const action of ACTIONS) {
      const perms = permissionsForAction(action);
      expect(perms.length).toBeGreaterThan(0);
      for (const key of perms) {
        expect(isPermission(key)).toBe(true);
      }
    }
  });

  it('declares no determination/scoring action', () => {
    for (const action of ACTIONS) {
      expect(action).not.toMatch(/approve|reject|score|rank|determine|eligib/i);
    }
  });

  it('active and terminal status sets are disjoint and within the enum', () => {
    for (const s of ACTIVE_STATUSES) {
      expect(STATUS_SET.has(s)).toBe(true);
      expect(TERMINAL_STATUSES.has(s)).toBe(false);
    }
    for (const s of TERMINAL_STATUSES) expect(STATUS_SET.has(s)).toBe(true);
  });
});

describe('application workflow — transitions', () => {
  it('submit moves draft → submitted', () => {
    expect(canTransition('submit', 'draft')).toBe(true);
    expect(nextStatus('submit', 'draft')).toBe('submitted');
  });

  it('records the full happy path to a decision', () => {
    let status: ApplicationStatus = 'draft';
    const path: Array<[ApplicationAction, ApplicationStatus]> = [
      ['submit', 'submitted'],
      ['begin_intake', 'intake_review'],
      ['start_review', 'in_review'],
      ['ready_for_committee', 'ready_for_committee'],
      ['schedule_committee', 'in_committee'],
      ['record_decision', 'decided'],
      ['close', 'closed'],
    ];
    for (const [action, expected] of path) {
      status = nextStatus(action, status);
      expect(status).toBe(expected);
    }
    expect(isTerminal(status)).toBe(true);
  });

  it('supports the request/provide evidence loop', () => {
    expect(nextStatus('request_evidence', 'in_review')).toBe('awaiting_evidence');
    expect(nextStatus('provide_evidence', 'awaiting_evidence')).toBe('in_review');
  });

  it('rejects illegal transitions with a non-crashing error', () => {
    expect(canTransition('record_decision', 'draft')).toBe(false);
    expect(() => nextStatus('record_decision', 'draft')).toThrow(
      ApplicationWorkflowError,
    );
    try {
      nextStatus('record_decision', 'draft');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationWorkflowError);
      const wf = error as ApplicationWorkflowError;
      expect(wf.code).toBe('INVALID_TRANSITION');
      expect(wf.action).toBe('record_decision');
      expect(wf.from).toBe('draft');
    }
  });

  it('allows withdrawal from any active status but not from terminal ones', () => {
    for (const s of ACTIVE_STATUSES) {
      expect(canTransition('withdraw', s)).toBe(true);
    }
    expect(canTransition('withdraw', 'decided')).toBe(false);
    expect(canTransition('withdraw', 'closed')).toBe(false);
  });

  it('permits reopening an ended application into intake_review', () => {
    expect(nextStatus('reopen', 'withdrawn')).toBe('intake_review');
    expect(nextStatus('reopen', 'decided')).toBe('intake_review');
  });

  it('offers no actions from a closed (terminal) application', () => {
    expect(availableActions('closed')).toEqual([]);
  });

  it('availableActions only returns legal moves', () => {
    for (const status of APPLICATION_STATUSES) {
      for (const action of availableActions(status)) {
        expect(canTransition(action, status)).toBe(true);
      }
    }
  });
});
