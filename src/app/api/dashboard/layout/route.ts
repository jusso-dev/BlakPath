import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { getDashboardLayout, saveDashboardLayout } from '@/domains/dashboard';

/**
 * GET/PUT the current user's dashboard widget order.
 *
 * A member may always arrange their own dashboard, so this is gated only by an
 * active tenant context (via `withRequestTenant`), not a data permission.
 */
const bodySchema = z.object({
  order: z.array(z.string().min(1).max(64)).max(50),
});

export async function GET(): Promise<Response> {
  try {
    const order = await withRequestTenant(() => getDashboardLayout());
    return NextResponse.json({ order });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid layout' }, { status: 400 });
    }
    await withRequestTenant(() => saveDashboardLayout(parsed.data.order));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
