import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { revokeBreakGlass } from '@/domains/break-glass';

/** POST /api/break-glass/[id]/revoke — a tenant approver revokes the grant. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const row = await withRequestTenant(() => revokeBreakGlass(id));
    return NextResponse.json({ id: row.id, status: row.status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
