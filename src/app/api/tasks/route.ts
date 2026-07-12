import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { createTask, listTasks, type CreateTaskInput } from '@/domains/tasks';

/**
 * GET  /api/tasks — list the tenant's live board tasks.
 * POST /api/tasks — create a task (JSON body). Both run inside a DB-verified
 * tenant context and are permission-checked in the service layer.
 */
export async function GET(): Promise<Response> {
  try {
    const rows = await withRequestTenant(() => listTasks());
    return NextResponse.json({ tasks: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as CreateTaskInput;
    const row = await withRequestTenant(() => createTask(body));
    return NextResponse.json({ task: row }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
