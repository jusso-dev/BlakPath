import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { createEndpoint, listEndpoints } from '@/domains/webhooks';

/**
 * Webhook endpoint management (staff, `tenant:configure`).
 * - GET  — list endpoints (includes the signing secret so it can be configured).
 * - POST — register an endpoint; the generated signing secret is returned.
 */
export async function GET(): Promise<Response> {
  try {
    const items = await withRequestTenant(() => listEndpoints());
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const endpoint = await withRequestTenant(() =>
      createEndpoint(body as { url: string; events: string[] }),
    );
    return NextResponse.json({
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      secret: endpoint.secret,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
