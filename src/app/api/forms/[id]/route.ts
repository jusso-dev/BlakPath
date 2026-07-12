import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import {
  getForm,
  listInvitations,
  listResponses,
  updateForm,
  type UpdateFormInput,
} from '@/domains/forms';

/**
 * GET   /api/forms/[id] — the form plus its invitations and responses.
 * PATCH /api/forms/[id] — edit the form (title/description/fields).
 *
 * Both run inside a DB-verified tenant context; the service enforces permission.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const data = await withRequestTenant(async () => ({
      form: await getForm(id),
      invitations: await listInvitations(id),
      responses: await listResponses(id),
    }));
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateFormInput;
    const form = await withRequestTenant(() => updateForm(id, body));
    return NextResponse.json({ form });
  } catch (error) {
    return toErrorResponse(error);
  }
}
