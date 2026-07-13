import { getDownloadUrl } from '@/domains/evidence';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const download = await withRequestTenant(() => getDownloadUrl(id));
    return Response.redirect(download.url, 302);
  } catch (error) {
    return toErrorResponse(error);
  }
}
