import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { changeMemberRole, changeMemberStatus } from '@/domains/memberships';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { requireRecentAuth, STEP_UP_WINDOWS } from '@/lib/auth/session';

const changeMembershipSchema = z.union([
  z.object({
    operation: z.literal('status').optional(),
    status: z.enum(['active', 'suspended', 'revoked']),
  }),
  z.object({ operation: z.literal('role'), roleId: z.uuid() }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireRecentAuth(STEP_UP_WINDOWS.privileged);
    const { id } = await params;
    const body = changeMembershipSchema.parse(await request.json().catch(() => null));
    await withRequestTenant(() =>
      'status' in body
        ? changeMemberStatus(id, body.status)
        : changeMemberRole(id, body.roleId),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
