import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { getOrganisationStats } from '@/domains/dashboard';

/**
 * GET /api/dashboard/stats — the organisation's work-pipeline stats and the
 * derived "needs attention" list. Permission-checked (`report:view` OR
 * `application:read-any`) and tenant-scoped via `withRequestTenant`. Read-only.
 */
export async function GET(): Promise<Response> {
  try {
    const data = await withRequestTenant(() => getOrganisationStats());
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
