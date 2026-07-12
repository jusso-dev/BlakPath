import { z } from 'zod';
import { BOARD_COLUMNS, BOARD_PRIORITIES } from './board';

/** Input validation for the work-board (tasks) domain (zod v4). */

/** Create a task. Only a title is required; everything else is optional. */
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(BOARD_PRIORITIES).optional(),
  assigneeUserId: z.uuid().optional(),
  applicationId: z.uuid().optional(),
  dueAt: z.coerce.date().optional(),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

/** Edit a task. All fields optional, but at least one must be present. */
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.enum(BOARD_PRIORITIES).optional(),
    assigneeUserId: z.uuid().optional(),
    applicationId: z.uuid().optional(),
    dueAt: z.coerce.date().optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: 'Provide at least one field to update.',
  });
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

/** Assign (or clear, with null) a task's assignee. */
export const assignTaskSchema = z.object({
  assigneeUserId: z.uuid().nullable(),
});
export type AssignTaskInput = z.input<typeof assignTaskSchema>;

/**
 * Move a task to a column, optionally between two neighbours already in that
 * column. `beforeId`/`afterId` identify the cards the drop landed between.
 */
export const moveTaskSchema = z.object({
  status: z.enum(BOARD_COLUMNS),
  beforeId: z.uuid().optional(),
  afterId: z.uuid().optional(),
});
export type MoveTaskInput = z.input<typeof moveTaskSchema>;
