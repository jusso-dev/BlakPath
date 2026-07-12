import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { listHolds, placeHold, type PlaceHoldInput } from '@/domains/retention';

/** Legal holds. GET list / POST place ({ resourceType, resourceId, reason }). */
export async function GET(): Promise<Response> {
  try {
    const items = await withRequestTenant(() => listHolds());
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const row = await withRequestTenant(() => placeHold(body as PlaceHoldInput));
    return NextResponse.json({ id: row.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
