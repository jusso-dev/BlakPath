import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { importMeetingsFromIcs } from '@/domains/meetings';

/** Reject absurdly large uploads before parsing (1 MiB is ample for meetings). */
const MAX_ICS_BYTES = 1024 * 1024;

/**
 * POST /api/calendar/import — create committee meetings from an uploaded `.ics`
 * document. Body is the raw calendar text. Requires `meeting:create`.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const text = await request.text();
    if (text.length === 0) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    if (text.length > MAX_ICS_BYTES) {
      return NextResponse.json({ error: 'Calendar file too large' }, { status: 413 });
    }
    const result = await withRequestTenant(() => importMeetingsFromIcs(text));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
