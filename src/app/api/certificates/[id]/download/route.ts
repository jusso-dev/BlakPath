import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { getDownloadUrl } from '@/domains/certificates';

/**
 * GET /api/certificates/[id]/download — mint a short-lived presigned URL for a
 * signed, non-revoked certificate PDF and redirect to it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const { url } = await withRequestTenant(() => getDownloadUrl(id));
    return NextResponse.redirect(url);
  } catch (error) {
    return toErrorResponse(error);
  }
}
