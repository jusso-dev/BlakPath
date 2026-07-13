import { NextResponse } from 'next/server';
import { requestFurtherEvidence, type RequestEvidenceInput } from '@/domains/evidence';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const input = (await request.json()) as RequestEvidenceInput;
    const evidenceRequest = await withRequestTenant(() =>
      requestFurtherEvidence(id, input),
    );
    return NextResponse.json({ evidenceRequest }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
