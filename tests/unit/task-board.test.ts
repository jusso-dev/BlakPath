import { describe, expect, it } from 'vitest';
import {
  BOARD_COLUMNS,
  BOARD_PRIORITIES,
  isDoneColumn,
  positionBetween,
} from '@/domains/tasks/board';
import {
  assignTaskSchema,
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from '@/domains/tasks/schemas';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID_B = '11111111-1111-4111-8111-111111111111';

describe('positionBetween', () => {
  it('returns the midpoint when both neighbours are given', () => {
    expect(positionBetween(2, 4)).toBe(3);
    expect(positionBetween(0, 1)).toBe(0.5);
  });

  it('returns before + 1 when only the before neighbour is given', () => {
    expect(positionBetween(5, undefined)).toBe(6);
  });

  it('returns after - 1 when only the after neighbour is given', () => {
    expect(positionBetween(undefined, 5)).toBe(4);
  });

  it('returns 0 when neither neighbour is given', () => {
    expect(positionBetween()).toBe(0);
    expect(positionBetween(undefined, undefined)).toBe(0);
  });
});

describe('isDoneColumn', () => {
  it('is true only for the done column', () => {
    expect(isDoneColumn('done')).toBe(true);
    expect(isDoneColumn('todo')).toBe(false);
    expect(isDoneColumn('in_progress')).toBe(false);
    expect(isDoneColumn('blocked')).toBe(false);
  });
});

describe('board constants', () => {
  it('list the four columns and four priorities in order', () => {
    expect(BOARD_COLUMNS).toEqual(['todo', 'in_progress', 'blocked', 'done']);
    expect(BOARD_PRIORITIES).toEqual(['low', 'normal', 'high', 'urgent']);
  });
});

describe('createTaskSchema', () => {
  it('accepts a bare title', () => {
    const result = createTaskSchema.safeParse({ title: 'Follow up with applicant' });
    expect(result.success).toBe(true);
  });

  it('accepts full valid input and coerces dueAt to a Date', () => {
    const result = createTaskSchema.safeParse({
      title: 'Review evidence',
      description: 'Check the uploaded documents',
      priority: 'high',
      assigneeUserId: UUID,
      applicationId: UUID_B,
      dueAt: '2026-08-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueAt).toBeInstanceOf(Date);
    }
  });

  it('rejects an empty title', () => {
    expect(createTaskSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects a title over 200 characters', () => {
    expect(createTaskSchema.safeParse({ title: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects an unknown priority', () => {
    expect(createTaskSchema.safeParse({ title: 'x', priority: 'critical' }).success).toBe(
      false,
    );
  });

  it('rejects a non-uuid assignee', () => {
    expect(
      createTaskSchema.safeParse({ title: 'x', assigneeUserId: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});

describe('updateTaskSchema', () => {
  it('accepts a single field', () => {
    expect(updateTaskSchema.safeParse({ priority: 'urgent' }).success).toBe(true);
  });

  it('rejects an empty object (at least one field required)', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });
});

describe('assignTaskSchema', () => {
  it('accepts a uuid assignee', () => {
    expect(assignTaskSchema.safeParse({ assigneeUserId: UUID }).success).toBe(true);
  });

  it('accepts null to clear the assignee', () => {
    expect(assignTaskSchema.safeParse({ assigneeUserId: null }).success).toBe(true);
  });

  it('rejects a non-uuid value', () => {
    expect(assignTaskSchema.safeParse({ assigneeUserId: 'nope' }).success).toBe(false);
  });
});

describe('moveTaskSchema', () => {
  it('accepts a status with neighbour ids', () => {
    const result = moveTaskSchema.safeParse({
      status: 'in_progress',
      beforeId: UUID,
      afterId: UUID_B,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a status with no neighbours', () => {
    expect(moveTaskSchema.safeParse({ status: 'done' }).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(moveTaskSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('rejects a non-uuid neighbour', () => {
    expect(moveTaskSchema.safeParse({ status: 'todo', beforeId: 'x' }).success).toBe(
      false,
    );
  });
});
