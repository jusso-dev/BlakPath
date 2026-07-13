import { NextResponse } from 'next/server';
import { completeUpload } from '@/domains/evidence';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const evidence = await withRequestTenant(() => completeUpload(id));
    return NextResponse.json({ evidence });
  } catch (error) {
    return toErrorResponse(error);
  }
}
