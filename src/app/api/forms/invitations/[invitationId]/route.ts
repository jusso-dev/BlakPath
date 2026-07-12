import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { revokeInvitation } from '@/domains/forms';

/**
 * DELETE /api/forms/invitations/[invitationId] — revoke an invitation.
 *
 * A revoked link can no longer be used to complete the form. Runs inside a
 * DB-verified tenant context; the service enforces permission.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
): Promise<Response> {
  try {
    const { invitationId } = await params;
    const invitation = await withRequestTenant(() => revokeInvitation(invitationId));
    return NextResponse.json({ invitation });
  } catch (error) {
    return toErrorResponse(error);
  }
}
