/**
 * Work-board primitives — pure, no IO.
 *
 * The column set and priority set the Kanban board is built from, plus the
 * fractional-rank arithmetic that lets a drag-and-drop reorder slot a card
 * between two others without renumbering the whole column.
 *
 * Keeping this module pure means every branch is exhaustively unit-testable and
 * it can be imported from client components, the service and tests alike.
 *
 * PRODUCT INVARIANT: a board organises human work. A column or priority never
 * scores, ranks or determines a person's Aboriginality — `done` means a task is
 * finished, nothing more.
 */

/** The board columns, left to right. Mirrors the `board_task_status` enum. */
export const BOARD_COLUMNS = ['todo', 'in_progress', 'blocked', 'done'] as const;

/** The task priorities, low to urgent. Mirrors the `board_task_priority` enum. */
export const BOARD_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];
export type BoardPriority = (typeof BOARD_PRIORITIES)[number];

/** Is this the terminal (finished) column? */
export function isDoneColumn(status: BoardColumn): boolean {
  return status === 'done';
}

/**
 * Compute a fractional position for a card dropped between two neighbours.
 *
 *   - both given  → the midpoint, so the card slots cleanly between them;
 *   - only before → just after it (`before + 1`);
 *   - only after  → just before it (`after - 1`);
 *   - neither     → `0`, the natural start of an empty column.
 */
export function positionBetween(before?: number, after?: number): number {
  if (before !== undefined && after !== undefined) {
    return (before + after) / 2;
  }
  if (before !== undefined) {
    return before + 1;
  }
  if (after !== undefined) {
    return after - 1;
  }
  return 0;
}
