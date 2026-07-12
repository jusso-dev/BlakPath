import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { deleteEndpoint } from '@/domains/webhooks';

/** DELETE /api/webhooks/[id] — deactivate and remove a webhook endpoint. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    await withRequestTenant(() => deleteEndpoint(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
