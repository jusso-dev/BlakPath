import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  addMember,
  listAssignableRoles,
  listManagedMembers,
} from '@/domains/memberships';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { requireRecentAuth, STEP_UP_WINDOWS } from '@/lib/auth/session';

const addMemberSchema = z.object({
  email: z.email(),
  roleId: z.uuid(),
});

export async function GET(): Promise<Response> {
  try {
    const [members, roles] = await withRequestTenant(async () =>
      Promise.all([listManagedMembers(), listAssignableRoles()]),
    );
    return NextResponse.json({ members, roles });
  } catch (error) {
    return toErrorResponse(error);
  }
}
export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireRecentAuth(STEP_UP_WINDOWS.privileged);
    const body = addMemberSchema.parse(await request.json().catch(() => null));
    const member = await withRequestTenant(() => addMember(body));
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
