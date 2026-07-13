import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { changeMemberStatus } from '@/domains/memberships';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { requireRecentAuth, STEP_UP_WINDOWS } from '@/lib/auth/session';

const changeStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'revoked']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireRecentAuth(STEP_UP_WINDOWS.privileged);
    const { id } = await params;
    const body = changeStatusSchema.parse(await request.json().catch(() => null));
    await withRequestTenant(() => changeMemberStatus(id, body.status));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
