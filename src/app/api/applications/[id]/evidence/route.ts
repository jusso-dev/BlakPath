import { NextResponse } from 'next/server';
import { requestUpload, type RequestUploadInput } from '@/domains/evidence';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const input = (await request.json()) as RequestUploadInput;
    const result = await withRequestTenant(() => requestUpload(id, input));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
