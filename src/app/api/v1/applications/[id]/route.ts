import { NextResponse } from 'next/server';
import { apiErrorResponse, withApiKey } from '@/lib/http/api-route';
import { getApplication } from '@/domains/applications';

/**
 * GET /api/v1/applications/[id] — fetch one application via API key.
 *
 * `getApplication` enforces the read policy and audits the view. A key without
 * access gets a 403 (indistinguishable from "not found"), never the record.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const { application } = await withApiKey(request, () => getApplication(id));
    return NextResponse.json({
      id: application.id,
      reference: application.reference,
      applicantName: application.applicantName,
      status: application.status,
      priority: application.priority,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      createdAt: application.createdAt,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
