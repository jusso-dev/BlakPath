/**
 * Work-board (tasks) domain.
 *
 *   - `board`   — pure column/priority constants and fractional-rank arithmetic.
 *   - `schemas` — zod v4 input validation.
 *   - `service` — tenant-scoped, permission-checked, audited board mutations.
 */
export {
  BOARD_COLUMNS,
  BOARD_PRIORITIES,
  isDoneColumn,
  positionBetween,
  type BoardColumn,
  type BoardPriority,
} from './board';

export {
  assignTaskSchema,
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
  type AssignTaskInput,
  type CreateTaskInput,
  type MoveTaskInput,
  type UpdateTaskInput,
} from './schemas';

export {
  assignTask,
  completeTask,
  createTask,
  deleteTask,
  listBoardTasks,
  listTasks,
  moveTask,
  updateTask,
  type BoardTaskView,
  type TaskRow,
} from './service';
