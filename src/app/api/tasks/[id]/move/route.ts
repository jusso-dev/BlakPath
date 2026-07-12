import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { moveTask, type MoveTaskInput } from '@/domains/tasks';

/**
 * POST /api/tasks/[id]/move — move a task to a column and slot it between its
 * dropped neighbours. Body: `{ status, beforeId?, afterId? }`. Runs inside a
 * DB-verified tenant context; the service enforces permission.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const body = (await request.json()) as MoveTaskInput;
    const row = await withRequestTenant(() => moveTask(id, body));
    return NextResponse.json({ task: row });
  } catch (error) {
    return toErrorResponse(error);
  }
}
