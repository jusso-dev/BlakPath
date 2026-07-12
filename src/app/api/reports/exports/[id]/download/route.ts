import { NextResponse } from 'next/server';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';
import { getExportDownloadUrl } from '@/domains/reporting';

/** GET /api/reports/exports/[id]/download — redirect to a ready export's CSV. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const { url } = await withRequestTenant(() => getExportDownloadUrl(id));
    return NextResponse.redirect(url);
  } catch (error) {
    return toErrorResponse(error);
  }
}
