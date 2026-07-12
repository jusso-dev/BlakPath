import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { createForm, listForms, type CreateFormInput } from '@/domains/forms';

/**
 * GET  /api/forms — list the tenant's forms.
 * POST /api/forms — create a form (JSON body). Both run inside a DB-verified
 * tenant context; the service layer enforces permission and audits the write.
 *
 * PRODUCT INVARIANT: a form only collects information a human provides. It never
 * determines a person's Aboriginality.
 */
export async function GET(): Promise<Response> {
  try {
    const forms = await withRequestTenant(() => listForms());
    return NextResponse.json({ forms });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as CreateFormInput;
    const form = await withRequestTenant(() => createForm(body));
    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
