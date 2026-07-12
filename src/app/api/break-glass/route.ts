import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import {
  breakGlassErrorResponse,
  requirePlatformOperator,
} from '@/lib/http/platform-route';
import {
  listBreakGlassRequests,
  requestBreakGlass,
  type RequestBreakGlassInput,
} from '@/domains/break-glass';

/**
 * - GET  — list this organisation's break-glass requests (tenant approver).
 * - POST — a PLATFORM operator requests emergency access to an organisation
 *          (requires step-up; the operator flag is verified against the DB).
 */
export async function GET(): Promise<Response> {
  try {
    const items = await withRequestTenant(() => listBreakGlassRequests());
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { userId } = await requirePlatformOperator();
    const body: unknown = await request.json();
    const row = await requestBreakGlass({
      requestedByUserId: userId,
      correlationId: globalThis.crypto.randomUUID(),
      input: body as RequestBreakGlassInput,
    });
    return NextResponse.json({ id: row.id, status: row.status });
  } catch (error) {
    return breakGlassErrorResponse(error);
  }
}
