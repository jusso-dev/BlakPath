import { NextResponse } from 'next/server';
import { withRequestTenant } from '@/lib/http/tenant-route';
import { requireRecentAuth, STEP_UP_WINDOWS } from '@/lib/auth/session';
import { breakGlassErrorResponse } from '@/lib/http/platform-route';
import { approveBreakGlass } from '@/domains/break-glass';

/**
 * POST /api/break-glass/[id]/approve — a tenant approver (break-glass:approve,
 * different from the requester) approves the grant. Requires step-up.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireRecentAuth(STEP_UP_WINDOWS.privileged);
    const { id } = await params;
    const row = await withRequestTenant(() => approveBreakGlass(id));
    return NextResponse.json({ id: row.id, status: row.status });
  } catch (error) {
    return breakGlassErrorResponse(error);
  }
}
