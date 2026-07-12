import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { listDeliveries } from '@/domains/webhooks';

/** GET /api/webhooks/[id]/deliveries — recent delivery attempts for an endpoint. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const items = await withRequestTenant(() => listDeliveries(id));
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}
